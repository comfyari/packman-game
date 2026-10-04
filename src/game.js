export const RAW_MAZE = [
  '#####################',
  '#.........#.........#',
  '#.###.###.#.###.###.#',
  '#o###.###.#.###.###o#',
  '#...................#',
  '#.###.#.#####.#.###.#',
  '#.....#...#...#.....#',
  '#####.###.#.###.#####',
  '#.........G.........#',
  '#.#.#.###...###.#.#.#',
  '...#...#G..G#...#....',
  '#.#.#.###...###.#.#.#',
  '#.........P.........#',
  '#####.###.#.###.#####',
  '#.....#...#...#.....#',
  '#.###.#.#####.#.###.#',
  '#o..#...........#..o#',
  '###.#.###.#.###.#.###',
  '#.....#...#...#.....#',
  '#.#######.#.#######.#',
  '#...................#',
  '#####################',
];

export const DIRS = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
const OPPOSITE = { up: 'down', right: 'left', down: 'up', left: 'right' };
const key = (x, y) => `${x},${y}`;

export function parseMaze(rows = RAW_MAZE) {
  const width = rows[0]?.length ?? 0;
  if (!width || rows.some(row => row.length !== width)) throw new Error('Maze rows must have equal, nonzero width');
  const pellets = new Map();
  const ghosts = [];
  let player = null;
  rows.forEach((row, y) => [...row].forEach((tile, x) => {
    if (!'#.o PG'.includes(tile)) throw new Error(`Invalid maze tile: ${tile}`);
    if (tile === '.' || tile === 'o') pellets.set(key(x, y), tile);
    if (tile === 'P') player = { x, y };
    if (tile === 'G') ghosts.push({ x, y });
  }));
  if (!player || ghosts.length !== 3) throw new Error('Maze needs one player and three ghost spawns');
  return { rows, width, height: rows.length, pellets, player, ghosts };
}

export class Game {
  constructor(random = Math.random) {
    this.random = random;
    this.best = 0;
    this.newRun();
  }

  newRun() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = 'ready';
    this.events = [];
    this.loadLevel();
  }

  loadLevel() {
    this.maze = parseMaze();
    this.pellets = new Map(this.maze.pellets);
    this.totalPellets = this.pellets.size;
    this.power = 0;
    this.combo = 0;
    this.resetActors();
  }

  resetActors() {
    const spawn = this.maze.player;
    this.player = { x: spawn.x, y: spawn.y, fromX: spawn.x, fromY: spawn.y, dir: 'left', wanted: 'left' };
    const positions = [this.maze.ghosts[0], this.maze.ghosts[1], this.maze.ghosts[2], { x: 10, y: 9 }];
    this.ghosts = positions.map((pos, i) => ({
      x: pos.x, y: pos.y, fromX: pos.x, fromY: pos.y,
      dir: ['left', 'right', 'up', 'down'][i], home: { ...pos }, color: i,
      dormant: 0.7 + i * 0.65, accumulator: 0,
    }));
    this.playerAccumulator = 0;
    this.grace = 2.5;
  }

  start() {
    if (this.state === 'ready' || this.state === 'paused') this.state = 'playing';
    else if (this.state === 'gameover') { this.newRun(); this.state = 'playing'; }
  }

  togglePause() {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
  }

  setDirection(dir) {
    if (DIRS[dir]) this.player.wanted = dir;
  }

  canMove(x, y, dir) {
    const next = this.nextCell(x, y, dir);
    const row = this.maze.rows[next.y];
    return Boolean(row && row[next.x] !== '#');
  }

  nextCell(x, y, dir) {
    const step = DIRS[dir];
    const nextX = x + step.x;
    return { x: (nextX + this.maze.width) % this.maze.width, y: y + step.y };
  }

  move(actor, dir) {
    actor.fromX = actor.x;
    actor.fromY = actor.y;
    const next = this.nextCell(actor.x, actor.y, dir);
    actor.x = next.x;
    actor.y = next.y;
    actor.dir = dir;
  }

  collect() {
    const cell = key(this.player.x, this.player.y);
    const pellet = this.pellets.get(cell);
    if (!pellet) return;
    this.pellets.delete(cell);
    this.score += pellet === 'o' ? 50 : 10;
    if (pellet === 'o') {
      this.power = 7;
      this.combo = 0;
      this.events.push('power');
    } else this.events.push('pellet');
    this.best = Math.max(this.best, this.score);
    if (this.pellets.size === 0) {
      this.events.push('level');
      this.level += 1;
      this.loadLevel();
      this.grace = 2;
    }
  }

  ghostTarget(ghost) {
    const p = this.player;
    if (ghost.color === 0) return { x: p.x, y: p.y };
    if (ghost.color === 1) {
      const d = DIRS[p.dir];
      return { x: p.x + d.x * 3, y: p.y + d.y * 3 };
    }
    if (ghost.color === 2) return { x: this.maze.width - 2 - p.x, y: p.y };
    const distance = Math.abs(ghost.x - p.x) + Math.abs(ghost.y - p.y);
    return distance < 5 ? { x: 1, y: this.maze.height - 2 } : { x: p.x, y: p.y };
  }

  moveGhost(ghost) {
    if (ghost.dormant > 0) return;
    const options = Object.keys(DIRS).filter(dir => this.canMove(ghost.x, ghost.y, dir));
    if (!options.length) return;
    const forward = options.filter(dir => dir !== OPPOSITE[ghost.dir]);
    const choices = forward.length ? forward : options;
    const target = this.ghostTarget(ghost);
    const ranked = choices.map(dir => {
      const cell = this.nextCell(ghost.x, ghost.y, dir);
      const distance = Math.abs(cell.x - target.x) + Math.abs(cell.y - target.y);
      return { dir, score: (this.power > 0 ? -distance : distance) + this.random() * 2.5 };
    });
    ranked.sort((a, b) => a.score - b.score);
    this.move(ghost, ranked[0].dir);
  }

  checkCollisions() {
    if (this.state !== 'playing') return;
    for (const ghost of this.ghosts) {
      if (ghost.dormant > 0 || ghost.x !== this.player.x || ghost.y !== this.player.y) continue;
      if (this.power > 0) {
        const points = 200 * (2 ** Math.min(this.combo, 3));
        this.score += points;
        this.best = Math.max(this.best, this.score);
        this.combo++;
        ghost.x = ghost.home.x;
        ghost.y = ghost.home.y;
        ghost.fromX = ghost.x;
        ghost.fromY = ghost.y;
        ghost.dormant = 2.5;
        this.events.push('ghost');
      } else if (this.grace <= 0) {
        this.lives--;
        this.events.push('hit');
        if (this.lives <= 0) {
          this.state = 'gameover';
          this.events.push('gameover');
        } else {
          this.power = 0;
          this.resetActors();
        }
        break;
      }
    }
  }

  tick(dt) {
    if (this.state !== 'playing') return;
    dt = Math.min(Math.max(dt, 0), 0.1);
    this.grace = Math.max(0, this.grace - dt);
    this.power = Math.max(0, this.power - dt);
    if (this.power === 0) this.combo = 0;
    const playerInterval = Math.max(0.095, 0.145 - (this.level - 1) * 0.006);
    const ghostInterval = Math.max(0.14, 0.225 - (this.level - 1) * 0.008);
    this.playerAccumulator += dt;
    if (this.playerAccumulator >= playerInterval) {
      this.playerAccumulator -= playerInterval;
      if (this.canMove(this.player.x, this.player.y, this.player.wanted)) this.player.dir = this.player.wanted;
      if (this.canMove(this.player.x, this.player.y, this.player.dir)) this.move(this.player, this.player.dir);
      this.collect();
      this.checkCollisions();
    }
    for (const ghost of this.ghosts) {
      if (this.state !== 'playing') break;
      ghost.dormant = Math.max(0, ghost.dormant - dt);
      ghost.accumulator += dt;
      const interval = this.power > 0 ? ghostInterval * 1.35 : ghostInterval;
      if (ghost.accumulator >= interval) {
        ghost.accumulator -= interval;
        this.moveGhost(ghost);
        this.checkCollisions();
      }
    }
  }
}
