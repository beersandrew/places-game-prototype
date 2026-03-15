const { ROOMS, getRoom, getAllRoomIds, createInitialState, resolveDestination, navigate, moveToRoom, hasVisited, isRunActive, resolveDoor, getAvailableDoors } = require('./game');

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

describe('resolveDestination', () => {
  test('elevator → classroom when no wire', () => {
    const state = createInitialState();
    expect(resolveDestination(state)).toBe('classroom');
  });

  test('elevator → outside when wire in inventory', () => {
    const state = { ...createInitialState(), inventory: new Set(['wire']) };
    expect(resolveDestination(state)).toBe('outside');
  });

  test('classroom → toy room when tictactoe won', () => {
    const state = { ...createInitialState(), currentRoom: 'classroom', tictactoe: 'won' };
    expect(resolveDestination(state)).toBe('toy room');
  });

  test('classroom → fortune teller when tictactoe not won', () => {
    const state = { ...createInitialState(), currentRoom: 'classroom' };
    expect(resolveDestination(state)).toBe('fortune teller');
  });

  test('toy room → garage when box contains car', () => {
    const state = { ...createInitialState(), currentRoom: 'toy room', box: 'car' };
    expect(resolveDestination(state)).toBe('garage');
  });

  test('toy room → fortune teller when box empty', () => {
    const state = { ...createInitialState(), currentRoom: 'toy room' };
    expect(resolveDestination(state)).toBe('fortune teller');
  });

  test('garage → elevator when wire in inventory', () => {
    const state = { ...createInitialState(), currentRoom: 'garage', inventory: new Set(['wire']) };
    expect(resolveDestination(state)).toBe('elevator');
  });

  test('garage → fortune teller when no wire', () => {
    const state = { ...createInitialState(), currentRoom: 'garage' };
    expect(resolveDestination(state)).toBe('fortune teller');
  });

  test('fortune teller → elevator always', () => {
    const state = { ...createInitialState(), currentRoom: 'fortune teller' };
    expect(resolveDestination(state)).toBe('elevator');
  });

  test('outside → end', () => {
    const state = { ...createInitialState(), currentRoom: 'outside' };
    expect(resolveDestination(state)).toBe('end');
  });

  test('unknown room returns null', () => {
    const state = { ...createInitialState(), currentRoom: 'nonexistent' };
    expect(resolveDestination(state)).toBeNull();
  });
});

describe('navigate', () => {
  test('moves player to resolved destination', () => {
    const state = createInitialState();
    const next = navigate(state);
    expect(next.currentRoom).toBe('classroom');
    expect(next.visitedRooms.has('classroom')).toBe(true);
  });

  test('does not mutate original state', () => {
    const state = createInitialState();
    const next = navigate(state);
    expect(state.currentRoom).toBe('elevator');
    expect(state.visitedRooms.has('classroom')).toBe(false);
    expect(next).not.toBe(state);
  });

  test('accumulates visited rooms', () => {
    let state = createInitialState();
    state = navigate(state); // elevator → classroom
    state = navigate(state); // classroom → fortune teller (tictactoe not won)
    expect(state.currentRoom).toBe('fortune teller');
    expect(state.visitedRooms).toEqual(new Set(['elevator', 'classroom', 'fortune teller']));
  });

  test('sets runState to won when reaching outside', () => {
    const state = {
      ...createInitialState(),
      currentRoom: 'elevator',
      inventory: new Set(['wire']),
    };
    const next = navigate(state);
    expect(next.currentRoom).toBe('outside');
    expect(next.runState).toBe('won');
  });

  test('returns state unchanged when navigating from outside (end)', () => {
    const state = {
      ...createInitialState(),
      currentRoom: 'outside',
      runState: 'won',
    };
    const next = navigate(state);
    expect(next).toBe(state);
  });

  test('returns state unchanged when game already won', () => {
    const state = { ...createInitialState(), runState: 'won' };
    const next = navigate(state);
    expect(next).toBe(state);
  });

  test('returns state unchanged for unknown room', () => {
    const state = { ...createInitialState(), currentRoom: 'nonexistent' };
    const next = navigate(state);
    expect(next).toBe(state);
  });

  test('full winning path works end to end', () => {
    let state = createInitialState();
    // elevator → classroom (no wire)
    state = navigate(state);
    expect(state.currentRoom).toBe('classroom');

    // win tictactoe, then classroom → toy room
    state = { ...state, tictactoe: 'won' };
    state = navigate(state);
    expect(state.currentRoom).toBe('toy room');

    // put car in box, then toy room → garage
    state = { ...state, box: 'car' };
    state = navigate(state);
    expect(state.currentRoom).toBe('garage');

    // get wire, then garage → elevator
    state = { ...state, inventory: new Set(['wire']) };
    state = navigate(state);
    expect(state.currentRoom).toBe('elevator');

    // elevator → outside (wire in inventory) — game won on arrival
    state = navigate(state);
    expect(state.currentRoom).toBe('outside');
    expect(state.runState).toBe('won');
  });
});

describe('Room Registry', () => {
  const EXPECTED_ROOMS = ['elevator', 'classroom', 'toy room', 'garage', 'fortune teller', 'outside'];

  test('ROOMS contains exactly the 6 prototype rooms', () => {
    expect(getAllRoomIds().sort()).toEqual(EXPECTED_ROOMS.sort());
  });

  test('getRoom returns a room object for each known ID', () => {
    for (const id of EXPECTED_ROOMS) {
      const room = getRoom(id);
      expect(room).not.toBeNull();
      expect(room.id).toBe(id);
      expect(typeof room.name).toBe('string');
      expect(room.name.length).toBeGreaterThan(0);
      expect(typeof room.description).toBe('string');
      expect(room.description.length).toBeGreaterThan(0);
    }
  });

  test('getRoom returns null for unknown ID', () => {
    expect(getRoom('nonexistent')).toBeNull();
  });

  test('every room has id, name, and description fields', () => {
    for (const id of getAllRoomIds()) {
      const room = ROOMS[id];
      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('name');
      expect(room).toHaveProperty('description');
    }
  });

  test('every room has a doors array', () => {
    for (const id of getAllRoomIds()) {
      const room = ROOMS[id];
      expect(Array.isArray(room.doors)).toBe(true);
    }
  });

  test('every door has a label and destinations array', () => {
    for (const id of getAllRoomIds()) {
      for (const door of ROOMS[id].doors) {
        expect(typeof door.label).toBe('string');
        expect(door.label.length).toBeGreaterThan(0);
        expect(Array.isArray(door.destinations)).toBe(true);
        expect(door.destinations.length).toBeGreaterThan(0);
      }
    }
  });

  test('every destination has a room field pointing to a valid room', () => {
    const roomIds = getAllRoomIds();
    for (const id of roomIds) {
      for (const door of ROOMS[id].doors) {
        for (const dest of door.destinations) {
          expect(typeof dest.room).toBe('string');
          expect(roomIds).toContain(dest.room);
        }
      }
    }
  });

  test('outside has no doors (end state)', () => {
    expect(ROOMS.outside.doors).toEqual([]);
  });

  test('room IDs in the registry match the IDs used by resolveDestination', () => {
    const destinations = new Set();
    const states = [
      createInitialState(),
      { ...createInitialState(), inventory: new Set(['wire']) },
      { ...createInitialState(), currentRoom: 'classroom', tictactoe: 'won' },
      { ...createInitialState(), currentRoom: 'classroom' },
      { ...createInitialState(), currentRoom: 'toy room', box: 'car' },
      { ...createInitialState(), currentRoom: 'toy room' },
      { ...createInitialState(), currentRoom: 'garage', inventory: new Set(['wire']) },
      { ...createInitialState(), currentRoom: 'garage' },
      { ...createInitialState(), currentRoom: 'fortune teller' },
    ];
    for (const s of states) {
      destinations.add(resolveDestination(s));
    }
    for (const dest of destinations) {
      if (dest !== 'end' && dest !== null) {
        expect(getRoom(dest)).not.toBeNull();
      }
    }
  });
});
