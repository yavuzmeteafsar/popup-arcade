import { drawText, textWidth } from './pixels.js';

export function palette() {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  return dark
    ? { ink: '#f2f2f2', soft: '#3a3a3a', faint: '#232323', bg: '#0d0d0d' }
    : { ink: '#111111', soft: '#d4d4d4', faint: '#ececec', bg: '#ffffff' };
}

export function strokeRect(ctx, x, y, w, h, size = 2) {
  ctx.fillRect(x, y, w, size);
  ctx.fillRect(x, y + h - size, w, size);
  ctx.fillRect(x, y, size, h);
  ctx.fillRect(x + w - size, y, size, h);
}

export function drawMessage(ctx, colors, { cx, top, title, lines = [], t = 0 }) {
  const width = Math.max(textWidth(title, 3), ...lines.map((l) => textWidth(l.text, 2))) + 32;
  const height = 21 + lines.length * 22 + 28;
  const left = Math.round(cx - width / 2);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = colors.ink;
  strokeRect(ctx, left, top, width, height);
  drawText(ctx, title, cx, top + 14, 3);
  lines.forEach(({ text, blink }, i) => {
    if (blink && Math.floor(t / 400) % 2) return;
    drawText(ctx, text, cx, top + 47 + i * 22, 2);
  });
}
