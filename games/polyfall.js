import { drawGrid, drawText } from '../core/pixels.js';
import { palette, strokeRect, drawMessage } from '../core/canvas-ui.js';

const WIDTH = 600;
const HEIGHT = 320;
const COLS = 14;
const ROWS = 14;
const HIDDEN = 3;
const CELL = 20;
const BOARD_X = 160;
const BOARD_Y = 20;
const LEFT_CX = 80;
const RIGHT_CX = 520;
const DAS = 150;
const ARR = 45;
const LOCK_DELAY = 500;
const MAX_LOCK_RESETS = 15;
const CLEAR_TIME = 300;
const SOFT_DROP_INTERVAL = 0.03;
const RESTART_DELAY = 350;
const LINE_SCORES = [0, 100, 300, 500, 800, 1200];

const SHAPES = {
  I3: ['...', '###', '...'],
  V3: ['#.', '##'],
  F: ['.##', '##.', '.#.'],
  I: ['.....', '.....', '#####', '.....', '.....'],
  L: ['....', '####', '#...', '....'],
  N: ['....', '##..', '.###', '....'],
  P: ['##.', '##.', '#..'],
  T: ['###', '.#.', '.#.'],
  U: ['#.#', '###', '...'],
  V: ['#..', '#..', '###'],
  W: ['#..', '##.', '.##'],
  X: ['.#.', '###', '.#.'],
  Y: ['....', '####', '.#..', '....'],
  Z: ['##.', '.#.', '.##'],
};

const TYPES = Object.keys(SHAPES);

const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [-2, 0], [2, 0], [0, -2]];

const rotateCW = (m) => m.map((_, y) => m.map((__, x) => m[m.length - 1 - x][y]).join(''));

const toCells = (m) => {
  const cells = [];
  m.forEach((row, y) => [...row].forEach((c, x) => c === '#' && cells.push([x, y])));
  return cells;
};

const ROTATIONS = Object.fromEntries(
  Object.entries(SHAPES).map(([type, shape]) => {
    const states = [shape];
    for (let i = 1; i < 4; i++) states.push(rotateCW(states[i - 1]));
    return [type, states.map(toCells)];
  }),
);

const patternGrid = (fn) =>
  Array.from({ length: 9 }, (_, y) => Array.from({ length: 9 }, (__, x) => (fn(x, y) ? '#' : '.')).join(''));

const edge = (x, y, t = 1) => x < t || y < t || x > 8 - t || y > 8 - t;
const inBox = (x, y, a, b) => x >= a && x <= b && y >= a && y <= b;

const PATTERN_LIST = [
  patternGrid(() => true),
  patternGrid((x, y) => edge(x, y) || (inBox(x, y, 2, 6) && !inBox(x, y, 3, 5)) || (x === 4 && y === 4)),
  patternGrid((x, y) => edge(x, y) || inBox(x, y, 3, 5)),
  patternGrid((x, y) => edge(x, y) || (x + y) % 3 === 0),
  patternGrid((x, y) => edge(x, y) || (x + y) % 2 === 0),
  patternGrid((x, y) => edge(x, y) || y % 2 === 0),
  patternGrid((x, y) => edge(x, y, 2)),
  patternGrid((x, y) => edge(x, y) || x % 2 === 0),
];

const PATTERNS = Object.fromEntries(TYPES.map((type, i) => [type, PATTERN_LIST[i % PATTERN_LIST.length]]));

const GHOST = patternGrid((x, y) => edge(x, y) && (x + y) % 2 === 0);

function gravityInterval(level) {
  return Math.max(1 / 60, Math.pow(0.8 - (level - 1) * 0.007, level - 1));
}

function createPolyfall({ canvas, ctx }, api) {
  const colors = palette();
  const input = { left: false, right: false, down: false, dir: 0, das: 0, arr: 0 };
  let state = 'ready';
  let raf = 0;
  let last = 0;
  let overAt = 0;
  let board;
  let bag;
  let current;
  let nextType;
  let holdType;
  let canHold;
  let score;
  let lines;
  let level;
  let dropTimer;
  let lockTimer;
  let lockResets;
  let lowestY;
  let clearing;
  let record;

  const emptyRow = () => Array(COLS).fill(null);

  function takeNext() {
    if (!bag.length) {
      bag = [...TYPES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  }

  function cellsOf(type, rot, x, y) {
    return ROTATIONS[type][rot].map(([cx, cy]) => [x + cx, y + cy]);
  }

  function fits(type, rot, x, y) {
    return cellsOf(type, rot, x, y).every(
      ([cx, cy]) => cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS + HIDDEN && !board[cy][cx],
    );
  }

  function onGround() {
    return !fits(current.type, current.rot, current.x, current.y + 1);
  }

  function addScore(points) {
    if (!points) return;
    score += points;
    api.setScore(score);
    if (api.submit(score)) record = true;
  }

  function spawn(type) {
    const cells = ROTATIONS[type][0];
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const minX = Math.min(...xs);
    const width = Math.max(...xs) - minX + 1;
    current = { type, rot: 0, x: Math.floor((COLS - width) / 2) - minX, y: HIDDEN - (Math.max(...ys) + 1) };
    dropTimer = 0;
    lockTimer = 0;
    lockResets = 0;
    lowestY = current.y;
    if (!fits(type, 0, current.x, current.y)) gameOver();
  }

  function spawnNext() {
    spawn(nextType);
    nextType = takeNext();
    canHold = true;
  }

  function reset() {
    board = Array.from({ length: ROWS + HIDDEN }, emptyRow);
    bag = [];
    nextType = takeNext();
    holdType = null;
    score = 0;
    lines = 0;
    level = 1;
    clearing = null;
    record = false;
    api.setScore(0);
    spawnNext();
  }

  function afterManipulation() {
    if (onGround() && lockResets < MAX_LOCK_RESETS) {
      lockTimer = 0;
      lockResets++;
    }
  }

  function move(dx) {
    if (!fits(current.type, current.rot, current.x + dx, current.y)) return false;
    current.x += dx;
    afterManipulation();
    return true;
  }

  function rotate(dir) {
    const to = (current.rot + dir + 4) % 4;
    for (const [kx, ky] of KICKS) {
      if (fits(current.type, to, current.x + kx, current.y + ky)) {
        current.x += kx;
        current.y += ky;
        current.rot = to;
        afterManipulation();
        return;
      }
    }
  }

  function dropDistance() {
    let d = 0;
    while (fits(current.type, current.rot, current.x, current.y + d + 1)) d++;
    return d;
  }

  function hardDrop() {
    const d = dropDistance();
    current.y += d;
    addScore(d * 2);
    lock();
  }

  function hold() {
    if (!canHold) return;
    const type = current.type;
    if (holdType == null) {
      holdType = type;
      spawnNext();
    } else {
      const swap = holdType;
      holdType = type;
      spawn(swap);
    }
    canHold = false;
  }

  function lock() {
    const cells = cellsOf(current.type, current.rot, current.x, current.y);
    for (const [cx, cy] of cells) board[cy][cx] = current.type;
    if (cells.every(([, cy]) => cy < HIDDEN)) {
      gameOver();
      return;
    }
    const full = [];
    board.forEach((row, y) => row.every(Boolean) && full.push(y));
    current = null;
    if (full.length) clearing = { rows: full, t: 0 };
    else spawnNext();
  }

  function finishClear() {
    const { rows } = clearing;
    board = board.filter((_, y) => !rows.includes(y));
    while (board.length < ROWS + HIDDEN) board.unshift(emptyRow());
    lines += rows.length;
    addScore(LINE_SCORES[rows.length] * level);
    level = Math.floor(lines / 10) + 1;
    clearing = null;
    spawnNext();
  }

  function gameOver() {
    state = 'over';
    overAt = performance.now();
    api.flush();
  }

  function update(dt) {
    const ms = dt * 1000;
    if (clearing) {
      clearing.t += ms;
      if (clearing.t >= CLEAR_TIME) finishClear();
      return;
    }
    if (!current) return;

    if (input.dir !== 0) {
      input.das += ms;
      if (input.das >= DAS) {
        input.arr += ms;
        while (input.arr >= ARR) {
          input.arr -= ARR;
          if (!move(input.dir)) {
            input.arr = 0;
            break;
          }
        }
      }
    }

    const gravity = gravityInterval(level);
    const interval = input.down ? Math.min(SOFT_DROP_INTERVAL, gravity) : gravity;
    dropTimer += dt;
    while (dropTimer >= interval) {
      dropTimer -= interval;
      if (!fits(current.type, current.rot, current.x, current.y + 1)) {
        dropTimer = 0;
        break;
      }
      current.y++;
      if (input.down) addScore(1);
      if (current.y > lowestY) {
        lowestY = current.y;
        lockResets = 0;
      }
    }

    if (onGround()) {
      lockTimer += ms;
      if (lockTimer >= LOCK_DELAY) lock();
    } else {
      lockTimer = 0;
    }
  }

  function drawCell(px, py, pattern) {
    drawGrid(ctx, pattern, px + 1, py + 1, 2);
  }

  function drawPiece(type, rot, x, y, pattern) {
    for (const [cx, cy] of cellsOf(type, rot, x, y)) {
      if (cy < HIDDEN) continue;
      drawCell(BOARD_X + cx * CELL, BOARD_Y + (cy - HIDDEN) * CELL, pattern);
    }
  }

  function drawPreview(type, cx, cy) {
    const cells = ROTATIONS[type][0];
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = (Math.max(...xs) - minX + 1) * CELL;
    const h = (Math.max(...ys) - minY + 1) * CELL;
    const ox = Math.round(cx - w / 2);
    const oy = Math.round(cy - h / 2);
    for (const [x, y] of cells) drawCell(ox + (x - minX) * CELL, oy + (y - minY) * CELL, PATTERNS[type]);
  }

  function drawPanel(cx, label, type, dim) {
    ctx.fillStyle = colors.ink;
    drawText(ctx, label, cx, 26, 2);
    strokeRect(ctx, cx - 60, 50, 120, 76);
    if (type) {
      ctx.fillStyle = dim ? colors.soft : colors.ink;
      drawPreview(type, cx, 88);
    }
  }

  function drawStat(cx, label, value) {
    ctx.fillStyle = colors.ink;
    drawText(ctx, label, cx, 160, 2);
    drawText(ctx, String(value), cx, 184, 3);
  }

  function drawBoard(t) {
    ctx.fillStyle = colors.faint;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) ctx.fillRect(BOARD_X + c * CELL + 9, BOARD_Y + r * CELL + 9, 2, 2);
    }

    ctx.fillStyle = colors.ink;
    strokeRect(ctx, BOARD_X - 3, BOARD_Y - 3, COLS * CELL + 6, ROWS * CELL + 6);

    const dim = state === 'over';
    for (let r = HIDDEN; r < ROWS + HIDDEN; r++) {
      const py = BOARD_Y + (r - HIDDEN) * CELL;
      if (clearing?.rows.includes(r)) {
        if (Math.floor(clearing.t / 60) % 2 === 0) {
          ctx.fillStyle = colors.ink;
          ctx.fillRect(BOARD_X + 1, py + 1, COLS * CELL - 2, CELL - 2);
        }
        continue;
      }
      ctx.fillStyle = dim ? colors.soft : colors.ink;
      for (let c = 0; c < COLS; c++) {
        const type = board[r][c];
        if (type) drawCell(BOARD_X + c * CELL, py, PATTERNS[type]);
      }
    }

    if (current && (state === 'running' || state === 'paused')) {
      ctx.fillStyle = colors.ink;
      drawPiece(current.type, current.rot, current.x, current.y + dropDistance(), GHOST);
      drawPiece(current.type, current.rot, current.x, current.y, PATTERNS[current.type]);
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBoard(t);
    drawPanel(LEFT_CX, 'Hold', holdType, !canHold);
    drawStat(LEFT_CX, 'Level', level);
    drawPanel(RIGHT_CX, 'Next', nextType, false);
    drawStat(RIGHT_CX, 'Lines', lines);

    const box = (title, lines) => drawMessage(ctx, colors, { cx: WIDTH / 2, top: 110, title, lines, t });
    if (state === 'ready') box('Polyfall', [{ text: 'Press space to start', blink: true }]);
    else if (state === 'paused') box('Paused', [{ text: 'P to resume' }]);
    else if (state === 'over') {
      const msg = [];
      if (record) msg.push({ text: 'New high score!', blink: true });
      msg.push({ text: 'Space to restart' });
      box('Game over', msg);
    }
  }

  function frame(t) {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    if (state === 'running') update(dt);
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (state === 'over' && performance.now() - overAt < RESTART_DELAY) return;
    reset();
    state = 'running';
  }

  function setDir(dir) {
    input.dir = dir;
    input.das = 0;
    input.arr = 0;
  }

  const GAME_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'KeyX', 'KeyZ', 'KeyC', 'KeyP', 'ShiftLeft', 'ShiftRight',
  ]);

  function onKeyDown(e) {
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();

    if (state === 'ready' || state === 'over') {
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) start();
      return;
    }

    if (e.code === 'KeyP') {
      if (!e.repeat) state = state === 'paused' ? 'running' : 'paused';
      return;
    }

    if (e.code === 'ArrowLeft') input.left = true;
    if (e.code === 'ArrowRight') input.right = true;
    if (e.code === 'ArrowDown') input.down = true;

    if (state !== 'running' || !current || e.repeat) return;

    switch (e.code) {
      case 'ArrowLeft':
        setDir(-1);
        move(-1);
        break;
      case 'ArrowRight':
        setDir(1);
        move(1);
        break;
      case 'ArrowUp':
      case 'KeyX':
        rotate(1);
        break;
      case 'KeyZ':
        rotate(-1);
        break;
      case 'Space':
        hardDrop();
        break;
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        hold();
        break;
    }
  }

  function onKeyUp(e) {
    if (e.code === 'ArrowLeft') {
      input.left = false;
      if (input.dir === -1) setDir(input.right ? 1 : 0);
    } else if (e.code === 'ArrowRight') {
      input.right = false;
      if (input.dir === 1) setDir(input.left ? -1 : 0);
    } else if (e.code === 'ArrowDown') {
      input.down = false;
    }
  }

  function onBlur() {
    input.left = input.right = input.down = false;
    setDir(0);
    if (state === 'running') state = 'paused';
  }

  function onPointerDown(e) {
    e.preventDefault();
    if (state === 'ready' || state === 'over') start();
    else if (state === 'paused') state = 'running';
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
  id: 'polyfall',
  name: 'Polyfall',
  icon: 'polyfall',
  width: WIDTH,
  height: HEIGHT,
  scoreOrder: 'desc',
  controls: '← → move · ↑/X rotate · Z rotate back · ↓ soft · Space drop · C hold · P pause',
  start(surface, api) {
    instance?.destroy();
    instance = createPolyfall(surface, api);
  },
  stop() {
    instance?.destroy();
    instance = null;
  },
};
