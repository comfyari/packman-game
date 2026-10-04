# PAC//NOVA roadmap

**Updated:** 2026-10-04

| Milestone | Status | Acceptance check |
| --- | --- | --- |
| M0 — project foundation | Complete | Git repository, documented layout, SDD, roadmap, and run/test commands |
| M1 — playable core | Complete | Start, move, collect, collide, power up, win/lose, restart |
| M2 — presentation and controls | Complete | Responsive neon UI, keyboard/touch, sound toggle, persistence |
| M3 — verification and polish | Complete | Automated rules checks and live browser pass |
| M4 — expanded edition | Backlog | More mazes, settings, accessibility options, optional offline install |

## Progress log

- **2026-10-04:** Created project charter, living design, and local repository structure.
- **2026-10-04:** Implemented the playable maze, four ghost personalities, scoring, power mode, level progression, pause/restart, responsive interface, touch controls, sound toggle, and local best score.
- **2026-10-04:** Verified all collectibles and ghost spawns are reachable; six automated checks pass. Browser check confirmed rendering, start, restart, pause, and saved best score, with no console errors. Tuned ghost release timing after first play pass.

## Next decisions

- Tune ghost speed and power duration using playtesting.
- Decide whether later levels should use new authored mazes or procedural variants.
