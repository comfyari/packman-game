# PAC//NOVA

A modern, neon arcade maze game inspired by the familiar chase-and-collect formula. Runs in a browser with no install or external services.

## Run

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Use the arrow keys or WASD to move, `P` or Escape to pause, and Enter to start or restart. On touch screens, swipe the maze or use the direction pad.

## Project structure

```text
index.html             Game shell and accessible controls
src/game.js            Rules, maze, movement, collisions, scoring
src/main.js            Browser input, rendering, audio, persistence
src/styles.css         Responsive interface
tests/game.test.js     Rules and maze integrity checks
scripts/serve.py       Local development server
docs/SDD.md            Living software design document
docs/ROADMAP.md        Milestones and progress log
docs/DECISIONS.md      Architecture decisions
```

## Development

The game has no package dependencies. Run tests with a Node.js runtime:

```sh
node --test tests/*.test.js
```

Update `docs/SDD.md` and `docs/ROADMAP.md` when behavior or scope changes. Record consequential design decisions in `docs/DECISIONS.md`.
