import { ICONS, drawGrid, drawText, textWidth } from '../core/pixels.js';
import { palette, strokeRect } from '../core/canvas-ui.js';

const WIDTH = 600;
const HEIGHT = 340;
const BOARD_SIZE = 288;
const BOARD_X = (WIDTH - BOARD_SIZE) / 2;
const BOARD_Y = 46;
const RESTART_DELAY = 350;
const MAX_TENTHS = 9999;

const MODES = {
  easy: { label: 'Easy', cols: 9, rows: 9, mines: 10, cell: 32, digit: 3, sprite: 2 },
  hard: { label: 'Hard', cols: 16, rows: 16, mines: 40, cell: 18, digit: 2, sprite: 1 },
};

const TABS = [
  { mode: 'easy', x: 16, y: 10, w: 72, h: 26 },
  { mode: 'hard', x: 96, y: 10, w: 72, h: 26 },
];

let lastMode = 'easy';

function createFlagfield({ canvas, ctx }, api) {
  const colors = palette();
  let mode;
  let cfg;
  let state;
  let mine;
  let adj;
  let revealed;
  let flagged;
  let revealedCount;
  let flags;
  let startAt;
  let tenths;
  let endAt;
  let exploded;
  let record;
  let hover = null;
  let pressed = null;
  let raf = 0;

  const index = (c, r) => r * cfg.cols + c;

  function neighbors(i) {
    const c = i % cfg.cols;
    const r = Math.floor(i / cfg.cols);
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc >= 0 && nc < cfg.cols && nr >= 0 && nr < cfg.rows) out.push(index(nc, nr));
      }
    }
    return out;
  }

  function newGame(nextMode = mode) {
    mode = nextMode;
    lastMode = mode;
    cfg = MODES[mode];
    const total = cfg.cols * cfg.rows;
    mine = new Array(total).fill(false);
    adj = new Array(total).fill(0);
    revealed = new Array(total).fill(false);
    flagged = new Array(total).fill(false);
    revealedCount = 0;
    flags = 0;
    tenths = 0;
    startAt = 0;
    endAt = 0;
    exploded = -1;
    record = false;
    hover = null;
    pressed = null;
    state = 'ready';
    api.setMode(mode);
    api.setScore(0);
  }

  function placeMines(safe) {
    const excluded = new Set([safe, ...neighbors(safe)]);
    const candidates = [];
    for (let i = 0; i < mine.length; i++) if (!excluded.has(i)) candidates.push(i);
    for (let k = 0; k < cfg.mines; k++) {
      const j = k + Math.floor(Math.random() * (candidates.length - k));
      [candidates[k], candidates[j]] = [candidates[j], candidates[k]];
      mine[candidates[k]] = true;
    }
    for (let i = 0; i < mine.length; i++) adj[i] = neighbors(i).filter((n) => mine[n]).length;
  }

  function flood(start) {
    const queue = [start];
    while (queue.length) {
      const i = queue.pop();
      if (revealed[i] || flagged[i]) continue;
      revealed[i] = true;
      revealedCount++;
      if (adj[i] === 0) for (const n of neighbors(i)) if (!revealed[n] && !mine[n]) queue.push(n);
    }
  }

  function reveal(i) {
    if (revealed[i] || flagged[i]) return;
    if (mine[i]) {
      lose(i);
      return;
    }
    flood(i);
  }

  function chord(i) {
    const around = neighbors(i);
    if (around.filter((n) => flagged[n]).length !== adj[i]) return;
    for (const n of around) {
      if (state !== 'playing') return;
      reveal(n);
    }
  }

  function open(i) {
    if (state === 'ready') {
      if (flagged[i]) return;
      placeMines(i);
      state = 'playing';
      startAt = performance.now();
    }
    if (state !== 'playing') return;
    if (revealed[i]) chord(i);
    else reveal(i);
    if (state === 'playing' && revealedCount === mine.length - cfg.mines) win();
  }

  function toggleFlag(i) {
    if ((state !== 'ready' && state !== 'playing') || revealed[i]) return;
    flagged[i] = !flagged[i];
    flags += flagged[i] ? 1 : -1;
  }

  function elapsedTenths(now) {
    return Math.min(MAX_TENTHS, Math.floor((now - startAt) / 100));
  }

  function win() {
    state = 'won';
    endAt = performance.now();
    tenths = elapsedTenths(endAt);
    for (let i = 0; i < mine.length; i++) if (mine[i]) flagged[i] = true;
    flags = cfg.mines;
    api.setScore(tenths);
    record = api.submit(tenths);
    api.flush();
  }

  function lose(i) {
    state = 'lost';
    endAt = performance.now();
    exploded = i;
  }

  function cellAt(x, y) {
    const c = Math.floor((x - BOARD_X) / cfg.cell);
    const r = Math.floor((y - BOARD_Y) / cfg.cell);
    if (c < 0 || r < 0 || c >= cfg.cols || r >= cfg.rows) return null;
    return index(c, r);
  }

  function tabAt(x, y) {
    return TABS.find((t) => x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h) ?? null;
  }

  function ended() {
    return state === 'won' || state === 'lost';
  }

  function canRestart() {
    return ended() && performance.now() - endAt >= RESTART_DELAY;
  }

  function drawSprite(grid, px, py, scale) {
    const w = grid[0].length * scale;
    const h = grid.length * scale;
    drawGrid(ctx, grid, Math.round(px + (cfg.cell - w) / 2), Math.round(py + (cfg.cell - h) / 2), scale);
  }

  function drawCross(px, py) {
    const s = cfg.cell;
    const step = Math.max(1, Math.floor(s / 9));
    for (let k = 2; k < s - 2; k += step) {
      ctx.fillRect(px + k, py + k, step, step);
      ctx.fillRect(px + s - k - step, py + k, step, step);
    }
  }

  function drawCell(i, t) {
    const c = i % cfg.cols;
    const r = Math.floor(i / cfg.cols);
    const px = BOARD_X + c * cfg.cell;
    const py = BOARD_Y + r * cfg.cell;
    const inner = cfg.cell - 2;
    const showMine = state === 'lost' && mine[i];
    const wrongFlag = state === 'lost' && flagged[i] && !mine[i];

    if (revealed[i] || showMine || wrongFlag) {
      ctx.fillStyle = colors.faint;
      strokeRect(ctx, px, py, cfg.cell, cfg.cell, 1);
      if (i === exploded) {
        ctx.fillStyle = colors.soft;
        ctx.fillRect(px + 1, py + 1, inner, inner);
      }
      ctx.fillStyle = colors.ink;
      if (showMine && !flagged[i]) drawSprite(ICONS.mineSmall, px, py, cfg.sprite);
      else if (showMine && flagged[i]) drawSprite(ICONS.flag, px, py, cfg.sprite);
      else if (wrongFlag) {
        drawSprite(ICONS.flag, px, py, cfg.sprite);
        drawCross(px, py);
      } else if (adj[i] > 0) {
        const label = String(adj[i]);
        const w = textWidth(label, cfg.digit);
        drawText(ctx, label, px + (cfg.cell - w) / 2, py + (cfg.cell - 7 * cfg.digit) / 2, cfg.digit, 'left');
      }
      return;
    }

    const isPressed = pressed === i && hover === i && !flagged[i] && !ended();
    if (isPressed) {
      ctx.fillStyle = colors.faint;
      strokeRect(ctx, px, py, cfg.cell, cfg.cell, 1);
      return;
    }

    const isHover = hover === i && !ended();
    ctx.fillStyle = isHover ? colors.soft : colors.ink;
    ctx.fillRect(px + 1, py + 1, inner, inner);
    if (flagged[i]) {
      ctx.fillStyle = isHover ? colors.ink : colors.bg;
      drawSprite(ICONS.flag, px, py, cfg.sprite);
    }
  }

  function drawTabs() {
    for (const tab of TABS) {
      const active = tab.mode === mode;
      ctx.fillStyle = colors.ink;
      if (active) ctx.fillRect(tab.x, tab.y, tab.w, tab.h);
      else strokeRect(ctx, tab.x, tab.y, tab.w, tab.h);
      ctx.fillStyle = active ? colors.bg : colors.ink;
      drawText(ctx, MODES[tab.mode].label, tab.x + tab.w / 2, tab.y + 6, 2);
    }
  }

  function drawStatus(t) {
    ctx.fillStyle = colors.ink;
    const right = WIDTH - 16;
    const y = 16;
    if (state === 'won') {
      const text = record && Math.floor(t / 400) % 2 === 0 ? 'New best!' : record ? '' : 'Cleared!';
      if (text) drawText(ctx, text, right, y, 2, 'right');
      return;
    }
    if (state === 'lost') {
      drawText(ctx, 'Boom! Space to retry', right, y, 2, 'right');
      return;
    }
    const count = String(cfg.mines - flags);
    const w = drawText(ctx, count, right, y, 2, 'right');
    drawGrid(ctx, ICONS.mineSmall, right - w - 26, y - 2, 2);
  }

  function draw(t) {
    if (state === 'playing') {
      const next = elapsedTenths(performance.now());
      if (next !== tenths) {
        tenths = next;
        api.setScore(tenths);
      }
    }
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawTabs();
    drawStatus(t);
    ctx.fillStyle = colors.ink;
    strokeRect(ctx, BOARD_X - 4, BOARD_Y - 4, BOARD_SIZE + 8, BOARD_SIZE + 8);
    for (let i = 0; i < mine.length; i++) drawCell(i, t);
  }

  function frame(t) {
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  function point(e) {
    return { x: e.offsetX, y: e.offsetY };
  }

  function onPointerDown(e) {
    const { x, y } = point(e);
    const tab = tabAt(x, y);
    if (tab) {
      newGame(tab.mode);
      return;
    }
    const i = cellAt(x, y);
    if (i == null) return;
    if (ended()) {
      if (canRestart()) newGame();
      return;
    }
    const flagIntent = e.button === 2 || (e.button === 0 && (e.shiftKey || e.altKey || e.ctrlKey));
    if (flagIntent) {
      toggleFlag(i);
      return;
    }
    if (e.button !== 0) return;
    pressed = i;
    hover = i;
    canvas.setPointerCapture?.(e.pointerId);
  }

  function onPointerUp(e) {
    if (pressed == null) return;
    const { x, y } = point(e);
    const i = cellAt(x, y);
    const target = pressed;
    pressed = null;
    if (i === target) open(i);
  }

  function onPointerMove(e) {
    const { x, y } = point(e);
    hover = cellAt(x, y);
  }

  function onPointerLeave() {
    hover = null;
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  function onKeyDown(e) {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyR') {
      e.preventDefault();
      if (e.repeat) return;
      if (e.code === 'KeyR' || canRestart()) newGame();
    }
  }

  newGame(lastMode);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
    },
  };
}

let instance = null;

export default {
  id: 'flagfield',
  name: 'Flagfield',
  icon: 'flagfield',
  width: WIDTH,
  height: HEIGHT,
  scoreOrder: 'asc',
  modes: [
    { id: 'easy', label: 'Easy' },
    { id: 'hard', label: 'Hard' },
  ],
  format: (tenths) => `${(tenths / 10).toFixed(1)}s`,
  controls: 'Click reveal · Right-click flag · Click a number to chord · R restart',
  start(surface, api) {
    instance?.destroy();
    instance = createFlagfield(surface, api);
  },
  stop() {
    instance?.destroy();
    instance = null;
  },
};
