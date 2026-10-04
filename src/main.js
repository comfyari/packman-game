import { Game, RAW_MAZE, DIRS } from './game.js';

const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
const ctx = canvas.getContext('2d');
const game = new Game();
const tile = 32;
const colors = ['#ff608c', '#6fe8ff', '#ffad5b', '#b696ff'];
let muted = false;
let audio = null;
let lastTime = 0;
let lastState = '';
let pelletSoundAt = 0;

try { game.best = Number(localStorage.getItem('pacnova-best')) || 0; } catch { /* storage is optional */ }

function sound(type) {
  if (muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const now = audio.currentTime;
    const tones = {
      pellet: [[440, 520, .045, .025]],
      power: [[360, 650, .28, .07], [720, 1000, .25, .04]],
      ghost: [[720, 240, .28, .08]],
      hit: [[310, 85, .4, .1]],
      level: [[530, 800, .24, .07], [800, 1200, .3, .06]],
      gameover: [[320, 150, .55, .08]],
    };
    for (const [start, end, duration, volume] of tones[type] || []) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type === 'hit' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(start, now);
      osc.frequency.exponentialRampToValueAtTime(end, now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + duration);
    }
  } catch { /* unsupported audio should never stop play */ }
}

function processEvents() {
  for (const event of game.events.splice(0)) {
    if (event === 'pellet') {
      const now = performance.now();
      if (now - pelletSoundAt > 90) { sound(event); pelletSoundAt = now; }
    } else sound(event);
  }
  try { localStorage.setItem('pacnova-best', String(game.best)); } catch { /* optional */ }
}

function syncUI() {
  $('score').textContent = String(game.score).padStart(6, '0');
  $('best').textContent = String(game.best).padStart(6, '0');
  $('level').textContent = String(game.level).padStart(2, '0');
  $('lives').textContent = Array(Math.max(0, game.lives)).fill('●').join(' ');
  $('lives').setAttribute('aria-label', `${game.lives} lives`);
  const progress = Math.round((1 - game.pellets.size / game.totalPellets) * 100);
  $('progressText').textContent = `${progress}%`;
  $('progressBar').style.width = `${progress}%`;
  $('powerTime').textContent = game.power > 0 ? `${game.power.toFixed(1)}s` : '—';
  $('powerBar').style.width = `${game.power / 7 * 100}%`;
  $('powerPanel').classList.toggle('active', game.power > 0);
  $('statusText').textContent = ({ ready: 'READY TO PLAY', playing: game.power > 0 ? 'POWER MODE' : 'IN THE MAZE', paused: 'PAUSED', gameover: 'RUN COMPLETE' })[game.state];
  $('pauseButton').textContent = game.state === 'paused' ? '▶' : 'Ⅱ';
  $('pauseButton').setAttribute('aria-label', game.state === 'paused' ? 'Resume game' : 'Pause game');
  if (game.state !== lastState) {
    const overlay = $('overlay');
    overlay.classList.toggle('hidden', game.state === 'playing');
    const copy = {
      ready: ['THE MAZE IS CALLING', 'Collect every spark. Outsmart the ghosts. Own the night.', 'START GAME'],
      paused: ['CATCH YOUR BREATH', 'The maze can wait. Your score is safe.', 'RESUME GAME'],
      gameover: ['RUN COMPLETE', `You scored ${game.score.toLocaleString()} points. The maze is ready for another run.`, 'PLAY AGAIN'],
    }[game.state];
    if (copy) {
      document.querySelector('.overlay-kicker').textContent = copy[0];
      $('overlayMessage').textContent = copy[1];
      $('playButton').firstChild.textContent = `${copy[2]} `;
    }
    lastState = game.state;
  }
}

function roundedRect(x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawMaze(t) {
  ctx.fillStyle = '#080f27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#162044';
  ctx.lineWidth = 1;
  for (let y = 0; y < RAW_MAZE.length; y++) {
    for (let x = 0; x < RAW_MAZE[y].length; x++) {
      const px = x * tile, py = y * tile;
      if (RAW_MAZE[y][x] === '#') {
        roundedRect(px + 2, py + 2, tile - 4, tile - 4, 7, '#182858');
        roundedRect(px + 4, py + 4, tile - 8, tile - 8, 5, '#122044');
        ctx.strokeStyle = '#304e95';
        ctx.strokeRect(px + 7, py + 7, tile - 14, tile - 14);
      } else {
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#20335d';
        ctx.fill();
      }
    }
  }
  for (const [cell, kind] of game.pellets) {
    const [x, y] = cell.split(',').map(Number);
    const cx = x * tile + 16, cy = y * tile + 16;
    const radius = kind === 'o' ? 7 + Math.sin(t * .005) * 1.5 : 3;
    ctx.shadowBlur = kind === 'o' ? 22 : 8;
    ctx.shadowColor = kind === 'o' ? '#ff5cac' : '#ffdf65';
    ctx.fillStyle = kind === 'o' ? '#ff6cb9' : '#ffe58e';
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function actorPosition(actor, alpha) {
  let dx = actor.x - actor.fromX;
  if (Math.abs(dx) > 1) dx = Math.sign(-dx);
  return { x: (actor.fromX + dx * alpha) * tile + 16, y: (actor.fromY + (actor.y - actor.fromY) * alpha) * tile + 16 };
}

function drawPlayer(t) {
  const alpha = Math.min(1, game.playerAccumulator / Math.max(.095, .145 - (game.level - 1) * .006));
  const { x, y } = actorPosition(game.player, alpha);
  if (game.grace > 0 && Math.floor(t / 120) % 2 === 0 && game.state === 'playing') return;
  const angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[game.player.dir];
  const mouth = game.state === 'playing' ? .14 + (Math.sin(t * .023) + 1) * .19 : .27;
  ctx.shadowColor = '#ffdf65'; ctx.shadowBlur = 23;
  ctx.fillStyle = '#ffdf65'; ctx.beginPath();
  ctx.moveTo(x, y); ctx.arc(x, y, 13, angle + mouth, angle + Math.PI * 2 - mouth); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff7c7'; ctx.beginPath(); ctx.arc(x - 3, y - 5, 2, 0, Math.PI * 2); ctx.fill();
}

function drawGhost(ghost, t) {
  if (ghost.dormant > 0 && Math.floor(t / 170) % 2 === 0) return;
  const interval = game.power > 0 ? .3 : Math.max(.14, .225 - (game.level - 1) * .008);
  const { x, y } = actorPosition(ghost, Math.min(1, ghost.accumulator / interval));
  const color = game.power > 0 ? (game.power < 1.5 && Math.floor(t / 140) % 2 ? '#f4f2ff' : '#628aff') : colors[ghost.color];
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x - 12, y + 11); ctx.lineTo(x - 12, y - 2);
  ctx.arc(x, y - 2, 12, Math.PI, 0);
  ctx.lineTo(x + 12, y + 11); ctx.lineTo(x + 7, y + 7); ctx.lineTo(x + 3, y + 11);
  ctx.lineTo(x - 2, y + 7); ctx.lineTo(x - 7, y + 11); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(x - 4.5, y - 2, 3.3, 4.4, 0, 0, Math.PI * 2); ctx.ellipse(x + 4.5, y - 2, 3.3, 4.4, 0, 0, Math.PI * 2); ctx.fill();
  const eye = DIRS[ghost.dir];
  ctx.fillStyle = '#172143'; ctx.beginPath();
  ctx.arc(x - 4.5 + eye.x, y - 2 + eye.y, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 4.5 + eye.x, y - 2 + eye.y, 1.8, 0, Math.PI * 2); ctx.fill();
}

function frame(t) {
  const dt = lastTime ? (t - lastTime) / 1000 : 0;
  lastTime = t;
  game.tick(dt);
  processEvents();
  syncUI();
  drawMaze(t);
  for (const ghost of game.ghosts) drawGhost(ghost, t);
  drawPlayer(t);
  requestAnimationFrame(frame);
}

const directionKeys = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left', w: 'up', d: 'right', s: 'down', a: 'left' };
window.addEventListener('keydown', event => {
  const dir = directionKeys[event.key] || directionKeys[event.key.toLowerCase()];
  if (dir) { event.preventDefault(); game.setDirection(dir); if (game.state === 'ready') game.start(); }
  else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); game.start(); }
  else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') { event.preventDefault(); game.togglePause(); }
});
$('playButton').addEventListener('click', () => game.start());
$('pauseButton').addEventListener('click', () => game.togglePause());
$('soundButton').addEventListener('click', () => {
  muted = !muted;
  $('soundButton').textContent = muted ? '♪̸' : '♫';
  $('soundButton').setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  $('soundButton').setAttribute('aria-pressed', String(muted));
});
document.querySelectorAll('[data-dir]').forEach(button => button.addEventListener('pointerdown', event => {
  event.preventDefault();
  game.setDirection(button.dataset.dir);
  if (game.state === 'ready') game.start();
}));
let touchStart = null;
canvas.addEventListener('touchstart', event => {
  touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
}, { passive: true });
canvas.addEventListener('touchend', event => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.hypot(dx, dy) > 18) {
    game.setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    if (game.state === 'ready') game.start();
  }
  touchStart = null;
}, { passive: true });
requestAnimationFrame(frame);
