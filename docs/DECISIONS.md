# Design decisions

## 2026-10-04 — Browser-first, dependency-free implementation

Use HTML, CSS, canvas, and JavaScript modules. This keeps setup light, makes the game easy to open and review, and avoids runtime packages for a small arcade title. A local HTTP server is used because browser module loading is unreliable from `file://` URLs.

## 2026-10-04 — Separate simulation and presentation

Keep rules in `src/game.js` and browser input/rendering in `src/main.js`. This allows deterministic rule tests and later visual changes without rewriting game logic.

## 2026-10-04 — Local-only visual assets and audio

Draw the maze and characters with canvas and generate sound with Web Audio. Use system font fallbacks. The game has no external asset requests, so it remains playable without an internet connection.
