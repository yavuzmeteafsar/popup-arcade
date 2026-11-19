import { games, upcoming } from './core/registry.js';
import { loadHighs, saveHighs } from './core/storage.js';
import { ICONS, gridToSVG, textGrid, wordmark } from './core/pixels.js';

const $ = (id) => document.getElementById(id);
const menuView = $('menu');
const gameView = $('game-view');
const gameList = $('game-list');
const titleEl = $('game-title');
const scoreEl = $('score');
const highEl = $('high');
const controlsEl = $('controls');
const canvas = $('canvas');

const highs = await loadHighs();
let activeGame = null;
let saveTimer = null;

const format = (game, value) => {
  if (value == null) return '—';
  return game.format ? game.format(value) : String(value);
};

const isBetter = (game, value, current) => {
  if (current == null) return true;
  return game.scoreOrder === 'asc' ? value < current : value > current;
};

function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  return saveHighs(highs);
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(flushSave, 500);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const DECORATIONS = [
  { icon: 'sparkle', left: 18, top: 14, twinkle: 0 },
  { icon: 'coin', left: 70, top: 58, twinkle: null },
  { icon: 'star', left: 130, top: 18, twinkle: null },
  { icon: 'sparkle', left: 112, top: 84, twinkle: 0.8 },
  { icon: 'heart', left: 22, top: 92, twinkle: null },
];

function renderHero() {
  $('brand').replaceChildren(gridToSVG(wordmark('stacked'), 3, 'Popup Arcade'));
  for (const side of ['left', 'right']) {
    const container = $(`deco-${side}`);
    const items = DECORATIONS.map((d) => {
      const svg = gridToSVG(ICONS[d.icon], 3);
      svg.style.top = `${d.top}px`;
      svg.style[side] = `${d.left}px`;
      if (d.twinkle != null) {
        svg.classList.add('twinkle');
        svg.style.animationDelay = `${side === 'left' ? d.twinkle : d.twinkle + 0.4}s`;
      }
      return svg;
    });
    container.replaceChildren(...items);
  }
}

function showView(view, direction) {
  const other = view === menuView ? gameView : menuView;
  other.hidden = true;
  view.hidden = false;
  view.classList.remove('enter-forward', 'enter-back');
  void view.offsetWidth;
  view.classList.add(direction === 'forward' ? 'enter-forward' : 'enter-back');
}

function bestLabel(game) {
  if (game.modes) {
    const parts = game.modes.map((m) => [m.label, highs[`${game.id}:${m.id}`]]);
    if (parts.every(([, v]) => v == null)) return 'No record yet';
    return parts.map(([label, v]) => `${label} ${format(game, v)}`).join(' · ');
  }
  const best = highs[game.id];
  return best == null ? 'No record yet' : `Best ${format(game, best)}`;
}

function renderMenu() {
  const cards = games.map((game) => {
    const card = el('button', 'game-card');
    card.type = 'button';
    card.setAttribute('aria-label', game.name);
    card.append(gridToSVG(ICONS[game.icon], 3), gridToSVG(textGrid(game.name), 2), el('span', 'best', bestLabel(game)));
    card.addEventListener('click', () => openGame(game));
    return card;
  });
  const soon = upcoming.map((game) => {
    const card = el('div', 'game-card is-soon');
    card.setAttribute('aria-label', `${game.name} (coming soon)`);
    card.append(gridToSVG(ICONS[game.icon], 3), gridToSVG(textGrid(game.name), 2), el('span', 'best', 'Coming soon'));
    return card;
  });
  gameList.replaceChildren(...cards, ...soon);
}

function setupCanvas(width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function createApi(game) {
  let mode = null;
  const key = () => (mode ? `${game.id}:${mode}` : game.id);
  const refreshHigh = () => {
    highEl.textContent = format(game, highs[key()]);
  };

  refreshHigh();
  scoreEl.textContent = format(game, 0);

  return {
    setMode(next) {
      mode = next;
      refreshHigh();
    },
    getHigh() {
      return highs[key()] ?? null;
    },
    setScore(value) {
      scoreEl.textContent = format(game, value);
    },
    submit(value) {
      if (!isBetter(game, value, highs[key()])) return false;
      highs[key()] = value;
      refreshHigh();
      scheduleSave();
      return true;
    },
    flush: flushSave,
  };
}

function openGame(game) {
  showView(gameView, 'forward');
  titleEl.replaceChildren(gridToSVG(textGrid(game.name), 2, game.name));
  controlsEl.textContent = game.controls ?? '';
  const ctx = setupCanvas(game.width, game.height);
  activeGame = game;
  game.start({ canvas, ctx, width: game.width, height: game.height }, createApi(game));
  canvas.focus();
}

function closeGame() {
  activeGame?.stop();
  activeGame = null;
  flushSave();
  renderMenu();
  showView(menuView, 'back');
}

$('back').addEventListener('click', closeGame);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushSave();
});

renderHero();
renderMenu();
