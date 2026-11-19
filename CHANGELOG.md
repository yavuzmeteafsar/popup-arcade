# Changelog

## 1.0.0 — 2026-11-19

First release.

### Games
- **Hopproo**: endless runner with a pixel kangaroo. Hop over rocks and bushes, crouch under birds, fast-fall in the air, speed increases over time.
- **Polyfall**: falling-piece puzzle built only from 3-cell and 5-cell pieces (14 shapes) on a 14×14 square field. Ghost piece, hold, next preview, lock delay, levels and line-clear animation. Each piece type has its own pixel pattern.
- **Flagfield**: Easy (9×9, 10 mines) and Hard (16×16, 40 mines), safe first click, flags, chording. Best time is tracked per difficulty.

### Arcade
- Black and white pixel-art identity: arcade cabinet logo and wordmark, joystick toolbar icon (16/32/48 px), per-game icons and menu decorations, all generated from a single source (`core/pixels.js`).
- Game menu with best scores, shared score bar and high scores saved in `chrome.storage.local`.
- Light and dark mode, reduced-motion support.
- Coming soon: Pingpix, Snake, Highway.
