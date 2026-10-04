# PAC//NOVA — Software Design Document

**Status:** Living document · **Version:** 0.1 · **Updated:** 2026-10-04

## 1. Product vision

A fast, polished, single-player maze chase game for desktop and mobile browsers. It keeps the instantly readable collect/chase/escape loop while adding a modern visual system, smooth motion, responsive controls, local high scores, and lightweight synthesized sound.

The working title is **PAC//NOVA**. It is an original implementation with original visuals and sounds; no third-party game assets are required.

## 2. Audience and platform

- Casual players who want a complete round in a few minutes.
- Modern browsers on desktop, tablet, and phone.
- Keyboard and touch input; no account, installation, network, or build step.

## 3. Release scope

### v0.1 playable slice

1. Start, pause, resume, win, lose, and restart states.
2. Connected maze with pellets, four power cells, player spawn, and four ghost spawns.
3. Buffered cardinal movement, wall collision, tunnel wrap, and grid-aligned turns.
4. Four ghosts with distinct chase preferences and randomized variation.
5. Power mode: ghosts become vulnerable for a timed period, with escalating combo points.
6. Score, lives, level, pellet count, and locally saved best score.
7. Responsive canvas presentation, keyboard and touch controls, and optional synthesized audio.

### Deferred

Multiple authored mazes, accessibility settings beyond mute and reduced-motion support, achievements, and installable offline app support. See `ROADMAP.md`.

## 4. Core rules

- Collect every pellet and power cell to complete a level.
- Normal pellet: 10 points. Power cell: 50 points and 7 seconds of power mode.
- A powered player can eat a ghost. Ghost combo values are 200, 400, 800, then 1,600 points.
- Contact with an active ghost costs one life. Three starting lives. After a hit, actors reset and receive a 2.5-second grace period. Ghosts enter play in staggered waves.
- Clearing a maze advances the level, replenishes pellets, and modestly increases speed.
- Losing all lives ends the run. High score persists in local storage when available.
- Pausing freezes all game timers.

## 5. Experience and layout

- Top bar: title, sound control, pause control.
- Left status panel: score, best score, lives, level, collection progress, controls.
- Center: scalable square canvas with dark walls, luminous pathways, pellets, player, and ghosts.
- Right panel: short rules and power timer; collapses below the board on narrow screens.
- Start and end overlays sit over the game board with one primary action.
- UI text remains real HTML; the canvas is labeled and touch controls have button labels.

## 6. Technical design

```text
Browser events ──> src/main.js ──> Game in src/game.js
                     │                  │
                     ├─ Canvas renderer <┘
                     ├─ Web Audio effects
                     └─ localStorage best score
```

- `Game` is the authoritative simulation. It stores tile positions, directions, score, remaining pellets, ghosts, timers, and state.
- `tick(dt)` advances movement in fixed simulation steps. Rendering is independent through `requestAnimationFrame`.
- Maze is a text grid. The parser creates a mutable pellet set and validates dimensions/spawns.
- Collision uses tile coordinates; visual motion interpolates between moves.
- The presentation layer receives events from the engine for sound and UI updates.
- No runtime dependencies or asset downloads.

## 7. Quality targets

- Core game starts within one click/tap and works without a network connection once loaded.
- All pellets are reachable from player spawn; maze dimensions and spawn count are checked in tests.
- Paused state and overlays stop simulation. Restart creates fresh state.
- Responsive layout fits widths down to 320 px without horizontal scrolling.
- Best-score storage failures do not break play.

## 8. Risks and open choices

- Ghost behavior is intentionally approachable, not a frame-perfect recreation of a classic arcade AI.
- Canvas visual contrast, touch ergonomics, and balance should be checked in a live browser after implementation.
- Art direction and difficulty can be adjusted after the first playable review.

## 9. Change protocol

When game rules, scope, or architecture change: update this document in the same change; move the related item in `ROADMAP.md`; add an entry to `DECISIONS.md` for non-obvious tradeoffs. The roadmap log records each completed milestone.
