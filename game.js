// game.js — pure state machine. No DOM. No side effects.

function createInitialState() {
  return {
    currentRoom: 'elevator',
    visitedRooms: new Set(['elevator']),
    tictactoe: null,
    box: null,
    inventory: new Set(),
    runState: 'active',
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createInitialState };
}
