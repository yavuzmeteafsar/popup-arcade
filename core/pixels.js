const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  ':': ['.', '#', '.', '.', '.', '#', '.'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
};

export function blank(w, h) {
  return Array.from({ length: h }, () => '.'.repeat(w));
}

export function pad(grid, w, h) {
  const gw = grid[0].length;
  const gh = grid.length;
  const left = Math.floor((w - gw) / 2);
  const top = Math.floor((h - gh) / 2);
  const out = blank(w, h).map((row) => row.split(''));
  grid.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c === '#') out[y + top][x + left] = '#';
    });
  });
  return out.map((row) => row.join(''));
}

export function stack(top, bottom, gap) {
  const w = Math.max(top[0].length, bottom[0].length);
  return [...pad(top, w, top.length), ...blank(w, gap), ...pad(bottom, w, bottom.length)];
}

export function row(left, right, gap) {
  const h = Math.max(left.length, right.length);
  const l = pad(left, left[0].length, h);
  const r = pad(right, right[0].length, h);
  return l.map((line, i) => line + '.'.repeat(gap) + r[i]);
}

export function textGrid(text, spacing = 1) {
  const glyphs = [...text.toUpperCase()].map((ch) => FONT[ch] ?? FONT[' ']);
  return Array.from({ length: 7 }, (_, y) => glyphs.map((g) => g[y]).join('.'.repeat(spacing)));
}

function cells(list, size = 4) {
  const cell = ['###.', '#.#.', '###.', '....'];
  const out = blank(size * 4, size * 4).map((r) => r.split(''));
  for (const [cx, cy] of list) {
    cell.forEach((line, y) => {
      [...line].forEach((c, x) => {
        if (c === '#') out[cy * size + y][cx * size + x] = '#';
      });
    });
  }
  return out.map((r) => r.join(''));
}

const CABINET = [
  '.##############.',
  '.#............#.',
  '.#.##.####.##.#.',
  '.#............#.',
  '.##############.',
  '.#............#.',
  '.#.##########.#.',
  '.#.#........#.#.',
  '.#.#.#....#.#.#.',
  '.#.#..####..#.#.',
  '.#.#........#.#.',
  '.#.#........#.#.',
  '.#.##########.#.',
  '.#............#.',
  '################',
  '#..#...........#',
  '#..#....##.##..#',
  '#.###...##.##..#',
  '#..............#',
  '################',
  '.#............#.',
  '.#.....##.....#.',
  '.#............#.',
  '.##############.',
];

const CABINET_SMALL = [
  '############',
  '#.##.##.##.#',
  '############',
  '#..........#',
  '#.########.#',
  '#.#......#.#',
  '#.#.#..#.#.#',
  '#.#..##..#.#',
  '#.########.#',
  '#..........#',
  '############',
  '#.#..#.#...#',
  '####.......#',
  '############',
];

const KANGAROO = [
  '..........#.#...',
  '..........#.#...',
  '.........####...',
  '.........##.##..',
  '.........#####..',
  '........###.....',
  '.......####.#...',
  '.......#####....',
  '......######....',
  '.....#######....',
  '#...########....',
  '##.#########....',
  '.##########.....',
  '.....#####......',
  '.....##..##.....',
  '....###...###...',
]

const FLAGFIELD = [
  '................',
  '......#.........',
  '......####......',
  '......######....',
  '......########..',
  '......######....',
  '......####......',
  '......#.........',
  '......#.........',
  '....#####.......',
  '................',
  '###.###.###.###.',
  '###.###.###.###.',
  '###.###.###.###.',
  '................',
  '................',
]

const SNAKE = (() => {
  const out = blank(16, 16).map((r) => r.split(''));
  const fill = (x, y, w, h) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out[y + j][x + i] = '#';
  };
  const path = [[0, 2], [0, 3], [1, 3], [2, 3], [2, 2], [2, 1], [2, 0], [3, 0]];
  path.forEach(([c, r], k) => {
    fill(c * 4 + 1, r * 4 + 1, 3, 3);
    if (k === 0) return;
    const [pc, pr] = path[k - 1];
    if (pr === r) fill(Math.min(pc, c) * 4 + 4, r * 4 + 1, 1, 3);
    else fill(c * 4 + 1, Math.min(pr, r) * 4 + 4, 3, 1);
  });
  out[2][14] = '.';
  out[1][2] = '#';
  fill(1, 2, 3, 1);
  out[3][2] = '#';
  return out.map((r) => r.join(''));
})();

const PONG = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 16 }, (__, x) => {
    const left = x >= 1 && x <= 2 && y >= 3 && y <= 8;
    const right = x >= 13 && x <= 14 && y >= 7 && y <= 12;
    const net = (x === 7 || x === 8) && y % 4 < 2;
    const ball = x >= 4 && x <= 5 && y >= 9 && y <= 10;
    return left || right || net || ball ? '#' : '.';
  }).join(''),
);

const CAR = [
  '..########..',
  '.##########.',
  '.#........#.',
  '.#........#.',
  '############',
  '############',
  '.##########.',
  '.##########.',
  '.#........#.',
  '############',
  '############',
  '.##########.',
  '..########..',
];

const HIGHWAY = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 16 }, (__, x) => {
    if ((x === 0 || x === 15) && y % 3 !== 2) return '#';
    const cx = x - 2;
    const cy = y - 1;
    return CAR[cy]?.[cx] === '#' ? '#' : '.';
  }).join(''),
);

const POLYFALL = cells([
  [1, 0], [0, 1], [1, 1], [2, 1], [1, 2],
  [3, 2], [3, 3], [2, 3],
]);

const JOYSTICK = [
  '....####....',
  '...######...',
  '...######...',
  '...######...',
  '....####....',
  '.....##.....',
  '.....##.....',
  '.....##.....',
  '.##########.',
  '############',
  '############',
  '############',
  '.##########.',
  '............',
];

export const ICONS = {
  cabinet: CABINET,
  cabinetSmall: CABINET_SMALL,
  joystick: JOYSTICK,
  hopproo: KANGAROO,
  polyfall: POLYFALL,
  flagfield: FLAGFIELD,
  snake: SNAKE,
  pingpix: PONG,
  highway: HIGHWAY,
  flag: ['..##...', '..####.', '..#####', '..####.', '..##...', '..#....', '..#....', '.####..'],
  mineSmall: ['....#....', '.#.###.#.', '..#####..', '.##.####.', '#########', '.#######.', '..#####..', '.#.###.#.', '....#....'],
  star: ['...#...', '...#...', '..###..', '#######', '..###..', '.##.##.', '.#...#.'],
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  coin: ['..####..', '.#....#.', '#..##..#', '#..##..#', '#..##..#', '#..##..#', '.#....#.', '..####..'],
  sparkle: ['..#..', '..#..', '##.##', '..#..', '..#..'],
};

export function wordmark(layout = 'stacked') {
  const text = textGrid('POPUP ARCADE');
  return layout === 'stacked' ? stack(CABINET, text, 4) : row(CABINET, stack(textGrid('POPUP'), textGrid('ARCADE'), 3), 6);
}

export function forEachRun(grid, fn) {
  grid.forEach((line, y) => {
    let x = 0;
    while (x < line.length) {
      if (line[x] !== '#') {
        x++;
        continue;
      }
      const start = x;
      while (x < line.length && line[x] === '#') x++;
      fn(start, y, x - start);
    }
  });
}

export function gridToSVG(grid, scale, label) {
  const NS = 'http://www.w3.org/2000/svg';
  const w = grid[0].length;
  const h = grid.length;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w * scale);
  svg.setAttribute('height', h * scale);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('fill', 'currentColor');
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  let d = '';
  forEachRun(grid, (x, y, len) => {
    d += `M${x} ${y}h${len}v1h-${len}z`;
  });
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  return svg;
}

export function drawGrid(ctx, grid, x, y, scale) {
  forEachRun(grid, (gx, gy, len) => {
    ctx.fillRect(x + gx * scale, y + gy * scale, len * scale, scale);
  });
}

export function drawText(ctx, text, x, y, scale, align = 'center') {
  const grid = textGrid(text);
  const w = grid[0].length * scale;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  drawGrid(ctx, grid, Math.round(left), Math.round(y), scale);
  return w;
}

export function textWidth(text, scale) {
  return textGrid(text)[0].length * scale;
}
