import { palette, drawMessage as drawBox } from '../core/canvas-ui.js';
import { drawGrid } from '../core/pixels.js';

const WIDTH = 600;
const HEIGHT = 180;
const GROUND_Y = 150;
const GRAVITY = 2800;
const JUMP_VELOCITY = 760;
const FAST_FALL = 3;
const START_SPEED = 360;
const MAX_SPEED = 900;
const ACCELERATION = 8;
const SCORE_RATE = 0.025;
const BIRD_MIN_SCORE = 300;
const RESTART_DELAY = 350;
const HITBOX_PADDING = 5;

const PLAYER = { x: 48, w: 40, h: 44, duckW: 52, duckH: 26, scale: 2 };
const OBSTACLES = [
  { kind: 'rock', w: 24, h: 18 },
  { kind: 'rock', w: 36, h: 28 },
  { kind: 'bush', w: 20, h: 34 },
  { kind: 'bush', w: 40, h: 30 },
  { kind: 'mixed', w: 58, h: 40 },
];

const norm = (rows) => {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, '.'));
};

const BODY = [
  '..............#.#...',
  '..............#.#...',
  '.............####...',
  '.............##.##..',
  '.............######.',
  '............####....',
  '...........####.....',
  '..........#####.....',
  '.........######.#...',
  '.........#######....',
  '........#######.....',
  '........#######.....',
  '.......########.....',
  '......#########.....',
  '#....##########.....',
  '##..###########.....',
  '.#############......',
  '..###########.......',
];

const LEGS_TUCKED = [
  '.......######.......',
  '.......###..##......',
  '.......##....###....',
  '......####...####...',
];

const LEGS_STRETCHED = [
  '.......######.......',
  '......####..........',
  '....####............',
  '..####..............',
];

const STAND_A = norm([...BODY, ...LEGS_TUCKED]);
const STAND_B = norm([...BODY, ...LEGS_STRETCHED]);

const CROUCH_A = norm([
  '...................#.#....',
  '...................#.#....',
  '..................#####...',
  '..................##.###..',
  '........###########.####..',
  '#.....###############.....',
  '##..#################.....',
  '.###################......',
  '..#################.......',
  '.......########...........',
  '.......###..###...........',
  '......####...####.........',
  '..........................',
]);

const CROUCH_B = norm([
  '...................#.#....',
  '...................#.#....',
  '..................#####...',
  '..................##.###..',
  '........###########.####..',
  '#.....###############.....',
  '##..#################.....',
  '.###################......',
  '..#################.......',
  '.......########...........',
  '......####................',
  '....####..................',
  '..........................',
]);

const DEAD_EYE = { stand: [15, 3], crouch: [20, 3] };
const BIRD = { w: 40, h: 24 };
const BIRD_BOTTOMS = [GROUND_Y - 12, GROUND_Y - 32, GROUND_Y - 70];

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const DUCK_KEYS = new Set(['ArrowDown', 'KeyS']);

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function intersects(a, b) {
  const p = HITBOX_PADDING;
  return (
    a.x + p < b.x + b.w - p &&
    a.x + a.w - p > b.x + p &&
    a.y + p < b.y + b.h - p &&
    a.y + a.h - p > b.y + p
  );
}

function createHopproo({ canvas, ctx }, api) {
  const colors = palette();
  const keys = { down: false };
  let state = 'ready';
  let overAt = 0;
  let raf = 0;
  let last = 0;
  let player;
  let obstacles;
  let clouds;
  let pebbles;
  let speed;
  let distance;
  let score;
  let nextSpawn;
  let record;

  function reset() {
    player = { lift: 0, vy: 0 };
    obstacles = [];
    clouds = Array.from({ length: 3 }, (_, i) => ({ x: 120 + i * 210, y: rand(20, 70) }));
    pebbles = Array.from({ length: 18 }, () => ({ x: rand(0, WIDTH), y: GROUND_Y + rand(4, 14), w: rand(2, 6) }));
    speed = START_SPEED;
    distance = 0;
    score = 0;
    nextSpawn = 420;
    record = false;
    api.setScore(0);
  }

  function onGround() {
    return player.lift === 0;
  }

  function isDucking() {
    return keys.down && onGround();
  }

  function playerRect() {
    const ducking = isDucking();
    const w = ducking ? PLAYER.duckW : PLAYER.w;
    const h = ducking ? PLAYER.duckH : PLAYER.h;
    return { x: PLAYER.x, y: GROUND_Y - player.lift - h, w, h };
  }

  function jump() {
    if (!onGround()) return;
    player.vy = JUMP_VELOCITY;
  }

  function spawn() {
    const allowBirds = score >= BIRD_MIN_SCORE;
    if (allowBirds && Math.random() < 0.3) {
      const bottom = pick(BIRD_BOTTOMS);
      obstacles.push({ type: 'bird', x: WIDTH + 10, y: bottom - BIRD.h, w: BIRD.w, h: BIRD.h });
    } else {
      const ob = pick(OBSTACLES);
      obstacles.push({ type: ob.kind, x: WIDTH + 10, y: GROUND_Y - ob.h, w: ob.w, h: ob.h, seed: Math.floor(Math.random() * 1000) });
    }
    const latest = obstacles[obstacles.length - 1];
    nextSpawn = latest.w + speed * rand(0.75, 1.5) + 120;
  }

  function update(dt) {
    speed = Math.min(MAX_SPEED, speed + ACCELERATION * dt);
    const dx = speed * dt;
    distance += dx;

    const gravity = keys.down && !onGround() ? GRAVITY * FAST_FALL : GRAVITY;
    player.lift += player.vy * dt;
    player.vy -= gravity * dt;
    if (player.lift <= 0) {
      player.lift = 0;
      player.vy = 0;
    }

    nextSpawn -= dx;
    if (nextSpawn <= 0) spawn();

    for (const o of obstacles) o.x -= o.type === 'bird' ? dx + 30 * dt : dx;
    obstacles = obstacles.filter((o) => o.x + o.w > -10);

    for (const c of clouds) {
      c.x -= dx * 0.2;
      if (c.x < -60) {
        c.x = WIDTH + rand(20, 120);
        c.y = rand(20, 70);
      }
    }

    for (const p of pebbles) {
      p.x -= dx;
      if (p.x < -10) {
        p.x = WIDTH + rand(0, 40);
        p.y = GROUND_Y + rand(4, 14);
      }
    }

    const nextScore = Math.floor(distance * SCORE_RATE);
    if (nextScore !== score) {
      score = nextScore;
      api.setScore(score);
      if (api.submit(score)) record = true;
    }

    const rect = playerRect();
    if (obstacles.some((o) => intersects(rect, o))) gameOver();
  }

  function gameOver() {
    state = 'over';
    overAt = performance.now();
    api.flush();
  }

  function drawCloud(c) {
    ctx.fillStyle = colors.soft;
    ctx.fillRect(c.x, c.y + 6, 46, 8);
    ctx.fillRect(c.x + 10, c.y, 22, 8);
  }

  function drawGround() {
    ctx.fillStyle = colors.ink;
    ctx.fillRect(0, GROUND_Y, WIDTH, 1.5);
    for (const p of pebbles) ctx.fillRect(p.x, p.y, p.w, 1.5);
  }

  function drawPlayer() {
    const r = playerRect();
    const dead = state === 'over';
    const step = Math.floor(distance / 34) % 2;
    const airborne = !onGround();
    const crouching = isDucking() && !dead;
    let grid;
    if (crouching) grid = state === 'running' && step ? CROUCH_B : CROUCH_A;
    else grid = airborne || (state === 'running' && step) ? STAND_B : STAND_A;
    ctx.fillStyle = colors.ink;
    drawGrid(ctx, grid, Math.round(r.x), Math.round(r.y), PLAYER.scale);
    if (dead) {
      r.x = Math.round(r.x);
      r.y = Math.round(r.y);
      const [ex, ey] = crouching ? DEAD_EYE.crouch : DEAD_EYE.stand;
      ctx.fillStyle = colors.bg;
      ctx.fillRect(r.x + (ex - 1) * PLAYER.scale, r.y + (ey - 1) * PLAYER.scale, PLAYER.scale * 3, PLAYER.scale * 3);
      ctx.fillStyle = colors.ink;
      ctx.fillRect(r.x + ex * PLAYER.scale, r.y + ey * PLAYER.scale, PLAYER.scale, PLAYER.scale);
    }
  }

  function drawRock(x, w, h) {
    ctx.fillStyle = colors.ink;
    for (let y = 0; y < h; y += 2) {
      const k = 1 - Math.pow((h - y) / h, 2);
      const rw = Math.max(4, Math.round((w * Math.sqrt(k)) / 2) * 2);
      ctx.fillRect(Math.round(x + (w - rw) / 2), GROUND_Y - h + y, rw, 2);
    }
    ctx.fillStyle = colors.bg;
    ctx.fillRect(Math.round(x + w * 0.3), GROUND_Y - h + Math.round(h * 0.3), 4, 2);
    ctx.fillRect(Math.round(x + w * 0.3) - 2, GROUND_Y - h + Math.round(h * 0.3) + 2, 2, 2);
  }

  function drawBush(x, w, h, seed) {
    ctx.fillStyle = colors.ink;
    const blades = Math.max(3, Math.floor(w / 4));
    for (let i = 0; i < blades; i++) {
      const center = 1 - Math.abs(i - (blades - 1) / 2) / (blades / 2);
      const jitter = ((seed + i * 37) % 7) - 3;
      const bh = Math.max(8, Math.round(h * (0.55 + 0.45 * center) + jitter));
      const bx = Math.round(x + i * (w / blades));
      ctx.fillRect(bx, GROUND_Y - bh, 2, bh);
      ctx.fillRect(bx + (i % 2 ? 2 : -2), GROUND_Y - bh + 4, 2, 4);
    }
    ctx.fillRect(Math.round(x - 1), GROUND_Y - 6, Math.round(w + 2), 6);
  }

  function drawObstacle(o) {
    const x = Math.round(o.x);
    if (o.type === 'rock') drawRock(x, o.w, o.h);
    else if (o.type === 'bush') drawBush(x, o.w, o.h, o.seed);
    else {
      drawRock(x, Math.round(o.w * 0.55), Math.round(o.h * 0.6));
      drawBush(x + Math.round(o.w * 0.5), Math.round(o.w * 0.5), o.h, o.seed);
    }
  }

  function drawBird(o, t) {
    const flap = Math.floor(t / 160) % 2;
    ctx.fillStyle = colors.ink;
    ctx.fillRect(o.x + 8, o.y + 10, 26, 7);
    ctx.fillRect(o.x + 2, o.y + 8, 10, 6);
    ctx.fillRect(o.x - 4, o.y + 11, 6, 3);
    if (flap) ctx.fillRect(o.x + 14, o.y, 8, 11);
    else ctx.fillRect(o.x + 14, o.y + 16, 8, 8);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(o.x + 5, o.y + 9, 2, 2);
  }

  function drawMessage(title, lines, t) {
    drawBox(ctx, colors, { cx: WIDTH / 2, top: 30, title, lines, t });
  }

  function draw(t) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    clouds.forEach(drawCloud);
    drawGround();
    for (const o of obstacles) {
      if (o.type === 'bird') drawBird(o, t);
      else drawObstacle(o);
    }
    drawPlayer();

    if (state === 'ready') {
      drawMessage('Hopproo', [{ text: 'Press space to start', blink: true }], t);
    } else if (state === 'over') {
      const lines = [];
      if (record) lines.push({ text: 'New high score!', blink: true });
      lines.push({ text: 'Space to restart' });
      drawMessage('Game over', lines, t);
    }
  }

  function frame(t) {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    if (state === 'running') update(dt);
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  function primaryAction() {
    if (state === 'running') {
      jump();
      return;
    }
    if (state === 'over' && performance.now() - overAt < RESTART_DELAY) return;
    reset();
    state = 'running';
  }

  function onKeyDown(e) {
    if (JUMP_KEYS.has(e.code)) {
      e.preventDefault();
      if (e.repeat && state !== 'running') return;
      primaryAction();
    } else if (DUCK_KEYS.has(e.code)) {
      e.preventDefault();
      keys.down = true;
    }
  }

  function onKeyUp(e) {
    if (DUCK_KEYS.has(e.code)) keys.down = false;
  }

  function onPointerDown(e) {
    e.preventDefault();
    primaryAction();
  }

  function onBlur() {
    keys.down = false;
  }

  reset();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
}

let instance = null;

export default {
  id: 'hopproo',
  name: 'Hopproo',
  icon: 'hopproo',
  width: WIDTH,
  height: HEIGHT,
  scoreOrder: 'desc',
  controls: 'Space / ↑ hop · ↓ crouch (fast fall in the air)',
  start(surface, api) {
    instance?.destroy();
    instance = createHopproo(surface, api);
  },
  stop() {
    instance?.destroy();
    instance = null;
  },
};
