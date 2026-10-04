import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, parseMaze, RAW_MAZE } from '../src/game.js';

test('maze is rectangular and every collectible is reachable', () => {
  const maze = parseMaze();
  assert.equal(maze.width, 21);
  assert.equal(maze.height, 22);
  const queue = [maze.player];
  const visited = new Set();
  while (queue.length) {
    const { x, y } = queue.shift();
    const cell = `${x},${y}`;
    if (visited.has(cell) || RAW_MAZE[y]?.[x] === '#') continue;
    visited.add(cell);
    queue.push({ x: (x + 1) % maze.width, y });
    queue.push({ x: (x - 1 + maze.width) % maze.width, y });
    queue.push({ x, y: y + 1 }, { x, y: y - 1 });
  }
  for (const cell of maze.pellets.keys()) assert.ok(visited.has(cell), `unreachable pellet ${cell}`);
  for (const ghost of maze.ghosts) assert.ok(visited.has(`${ghost.x},${ghost.y}`));
  assert.equal([...maze.pellets.values()].filter(v => v === 'o').length, 4);
});

test('movement collects pellets and updates best score', () => {
  const game = new Game(() => 0.5);
  game.start();
  game.grace = 10;
  game.player.x = 2;
  game.player.y = 1;
  game.player.fromX = 2;
  game.player.fromY = 1;
  game.setDirection('right');
  game.tick(.1);
  game.tick(.1);
  assert.equal(game.player.x, 3);
  assert.equal(game.score, 10);
  assert.equal(game.best, 10);
});

test('power cells make ghosts edible and award combo points', () => {
  const game = new Game(() => 0.5);
  game.start();
  game.player.x = 1;
  game.player.y = 3;
  game.collect();
  assert.equal(game.power, 7);
  assert.equal(game.score, 50);
  const ghost = game.ghosts[0];
  ghost.dormant = 0;
  ghost.x = 1;
  ghost.y = 3;
  game.checkCollisions();
  assert.equal(game.score, 250);
  assert.equal(ghost.dormant, 2.5);
  assert.equal(game.lives, 3);
});

test('active ghost collision costs a life and last life ends the run', () => {
  const game = new Game(() => 0.5);
  game.start();
  game.grace = 0;
  game.ghosts[0].dormant = 0;
  game.ghosts[0].x = game.player.x;
  game.ghosts[0].y = game.player.y;
  game.checkCollisions();
  assert.equal(game.lives, 2);
  assert.equal(game.state, 'playing');
  game.lives = 1;
  game.grace = 0;
  game.ghosts[0].dormant = 0;
  game.ghosts[0].x = game.player.x;
  game.ghosts[0].y = game.player.y;
  game.checkCollisions();
  assert.equal(game.state, 'gameover');
  game.start();
  assert.equal(game.state, 'playing');
  assert.equal(game.lives, 3);
  assert.equal(game.score, 0);
});

test('pause freezes movement and timers', () => {
  const game = new Game(() => 0.5);
  game.start();
  game.power = 4;
  game.togglePause();
  game.tick(.1);
  assert.equal(game.power, 4);
  assert.equal(game.playerAccumulator, 0);
  game.togglePause();
  game.tick(.1);
  assert.ok(game.power < 4);
});

test('tunnel wraps and clearing the last pellet advances the level', () => {
  const game = new Game(() => 0.5);
  assert.equal(game.nextCell(0, 10, 'left').x, 20);
  assert.ok(game.canMove(0, 10, 'left'));
  game.start();
  game.pellets.clear();
  game.pellets.set('1,1', '.');
  game.player.x = 1;
  game.player.y = 1;
  game.collect();
  assert.equal(game.level, 2);
  assert.equal(game.pellets.size, game.totalPellets);
  assert.equal(game.score, 10);
});
