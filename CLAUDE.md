# CLAUDE.md

## Overview

This is the **places-game prototype** — a text adventure proving the game's core state machine and re-discovery logic. Vanilla JS, no frameworks, no build step. Hosted on GitHub Pages.

Design docs and narrative content live in a separate private repo.

## Stack

- Vanilla JS — no frameworks, no bundler
- `index.html` loads `game.js` and `ui.js` directly via script tags
- Tests use Jest (installed via npm)

## File Structure

```
index.html     ← game shell, loads game.js and ui.js via script tags
game.js        ← pure state machine (rooms, actions, navigation) — TESTED
ui.js          ← DOM rendering only — NOT tested
style.css      ← minimal styles
game.test.js   ← tests for game.js only
package.json   ← jest config
```

## Architecture Rule

`game.js` is a pure state machine. No DOM access. No side effects. Every function
takes state and returns new state. This is what ports to Unity.

`ui.js` reads game state and writes to the DOM. No game logic lives here.

This separation is load-bearing. Do not put game logic in `ui.js` or DOM calls
in `game.js`.

## Running Tests

```sh
npm test
```

## Game State Machine

### Six rooms in scope (prototype)

ELEVATOR, CLASSROOM, TOY ROOM, GARAGE, FORTUNE TELLER, OUTSIDE

### Door routing

| Room          | Condition          | Destination    |
|---------------|--------------------|----------------|
| Elevator      | wire in inventory  | Outside        |
| Elevator      | no wire            | Classroom      |
| Classroom     | tictactoe won      | Toy Room       |
| Classroom     | not won            | Fortune Teller |
| Toy Room      | car in box         | Garage         |
| Toy Room      | box empty          | Fortune Teller |
| Garage        | wire obtained      | Elevator       |
| Garage        | no wire            | Fortune Teller |
| Fortune Teller| always             | Elevator       |
| Outside       | —                  | end            |

### State flags

| Flag        | Values             | Set by                      |
|-------------|--------------------|-----------------------------|
| `tictactoe` | `null` / `'won'`   | action in Classroom         |
| `box`       | `null` / `'car'`   | action in Toy Room          |
| `inventory` | `Set<string>`      | contains `'wire'` after Garage action |

### The box mechanic

The Toy Room door routes based on the *contents* of the box, not a boolean.
`box: 'car'` → Garage. In the future, different items lead to different rooms.
This is the core places-game mechanic. Implement it as a content check, not a flag.

### Initial state shape

```js
{
  currentRoom: 'elevator',
  visitedRooms: new Set(['elevator']),
  tictactoe: null,
  box: null,
  inventory: new Set(),
  runState: 'active' // 'active' | 'won'
}
```
