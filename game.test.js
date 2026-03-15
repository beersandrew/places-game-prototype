const { createInitialState } = require('./game');

describe('createInitialState', () => {
  test('returns correct initial state', () => {
    const state = createInitialState();
    expect(state.currentRoom).toBe('elevator');
    expect(state.visitedRooms).toEqual(new Set(['elevator']));
    expect(state.tictactoe).toBeNull();
    expect(state.box).toBeNull();
    expect(state.inventory).toEqual(new Set());
    expect(state.runState).toBe('active');
  });
});
