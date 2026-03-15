const { ROOMS, getRoom, getAllRoomIds, createInitialState, resolveDestination, navigate, moveToRoom, hasVisited, isRunActive, resolveDoor, getAvailableDoors, getAvailableActions, performAction } = require('./game');

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

  test('resets state when returning to elevator without wire', () => {
    let state = createInitialState();
    state = navigate(state); // elevator → classroom
    state = performAction(state, 'play_tictactoe');
    state = navigate(state); // classroom → toy room
    state = navigate(state); // toy room → fortune teller (no car in box)
    expect(state.currentRoom).toBe('fortune teller');
    state = navigate(state); // fortune teller → elevator (no wire = reset)
    expect(state).toEqual(createInitialState());
  });

  test('does not reset when returning to elevator with wire', () => {
    let state = createInitialState();
    state = navigate(state); // elevator → classroom
    state = performAction(state, 'play_tictactoe');
    state = navigate(state); // classroom → toy room
    state = performAction(state, 'put_car_in_box');
    state = navigate(state); // toy room → garage
    state = performAction(state, 'take_wire');
    state = navigate(state); // garage → elevator (has wire, no reset)
    expect(state.currentRoom).toBe('elevator');
    expect(state.inventory.has('wire')).toBe(true);
    expect(state.tictactoe).toBe('won');
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

describe('resolveDoor', () => {
  test('returns room matching first true condition', () => {
    const door = ROOMS.elevator.doors[0];
    const state = { ...createInitialState(), inventory: new Set(['wire']) };
    expect(resolveDoor(door, state)).toBe('outside');
  });

  test('falls through to unconditional destination', () => {
    const door = ROOMS.elevator.doors[0];
    const state = createInitialState();
    expect(resolveDoor(door, state)).toBe('classroom');
  });

  test('returns null for empty destinations', () => {
    const emptyDoor = { label: 'test', destinations: [] };
    expect(resolveDoor(emptyDoor, createInitialState())).toBeNull();
  });

  test('door routing matches resolveDestination for every room/state combo', () => {
    // The doors-based routing should agree with the switch-based resolveDestination
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
      const room = ROOMS[s.currentRoom];
      if (room.doors.length > 0) {
        const doorDest = resolveDoor(room.doors[0], s);
        const switchDest = resolveDestination(s);
        expect(doorDest).toBe(switchDest);
      }
    }
  });
});

describe('getAvailableDoors', () => {
  test('returns one door for elevator', () => {
    const state = createInitialState();
    const doors = getAvailableDoors(state);
    expect(doors).toHaveLength(1);
    expect(doors[0].label).toBe('Step through the door');
    expect(doors[0].destination).toBe('classroom');
  });

  test('elevator door leads to outside when wire in inventory', () => {
    const state = { ...createInitialState(), inventory: new Set(['wire']) };
    const doors = getAvailableDoors(state);
    expect(doors[0].destination).toBe('outside');
  });

  test('classroom door leads to toy room when tictactoe won', () => {
    const state = { ...createInitialState(), currentRoom: 'classroom', tictactoe: 'won' };
    const doors = getAvailableDoors(state);
    expect(doors[0].destination).toBe('toy room');
  });

  test('classroom door leads to fortune teller by default', () => {
    const state = { ...createInitialState(), currentRoom: 'classroom' };
    const doors = getAvailableDoors(state);
    expect(doors[0].destination).toBe('fortune teller');
  });

  test('toy room door leads to garage when box has car', () => {
    const state = { ...createInitialState(), currentRoom: 'toy room', box: 'car' };
    const doors = getAvailableDoors(state);
    expect(doors[0].destination).toBe('garage');
  });

  test('fortune teller always leads to elevator', () => {
    const state = { ...createInitialState(), currentRoom: 'fortune teller' };
    const doors = getAvailableDoors(state);
    expect(doors).toHaveLength(1);
    expect(doors[0].destination).toBe('elevator');
  });

  test('outside has no doors', () => {
    const state = { ...createInitialState(), currentRoom: 'outside' };
    const doors = getAvailableDoors(state);
    expect(doors).toHaveLength(0);
  });

  test('returns empty array for unknown room', () => {
    const state = { ...createInitialState(), currentRoom: 'nonexistent' };
    const doors = getAvailableDoors(state);
    expect(doors).toHaveLength(0);
  });
});

describe('moveToRoom', () => {
  test('updates currentRoom to the given room', () => {
    const state = createInitialState();
    const next = moveToRoom(state, 'classroom');
    expect(next.currentRoom).toBe('classroom');
  });

  test('adds room to visitedRooms', () => {
    const state = createInitialState();
    const next = moveToRoom(state, 'garage');
    expect(next.visitedRooms.has('garage')).toBe(true);
    expect(next.visitedRooms.has('elevator')).toBe(true);
  });

  test('does not mutate original state', () => {
    const state = createInitialState();
    const next = moveToRoom(state, 'classroom');
    expect(state.currentRoom).toBe('elevator');
    expect(state.visitedRooms.has('classroom')).toBe(false);
    expect(next).not.toBe(state);
  });

  test('sets runState to won when moving to outside', () => {
    const state = createInitialState();
    const next = moveToRoom(state, 'outside');
    expect(next.runState).toBe('won');
    expect(next.currentRoom).toBe('outside');
  });

  test('keeps runState active for non-outside rooms', () => {
    const state = createInitialState();
    const next = moveToRoom(state, 'garage');
    expect(next.runState).toBe('active');
  });

  test('preserves other state fields', () => {
    const state = { ...createInitialState(), tictactoe: 'won', box: 'car' };
    const next = moveToRoom(state, 'toy room');
    expect(next.tictactoe).toBe('won');
    expect(next.box).toBe('car');
  });
});

describe('hasVisited', () => {
  test('returns true for the starting room', () => {
    const state = createInitialState();
    expect(hasVisited(state, 'elevator')).toBe(true);
  });

  test('returns false for an unvisited room', () => {
    const state = createInitialState();
    expect(hasVisited(state, 'classroom')).toBe(false);
  });

  test('returns true after moving to a room', () => {
    const state = createInitialState();
    const next = moveToRoom(state, 'classroom');
    expect(hasVisited(next, 'classroom')).toBe(true);
  });
});

describe('isRunActive', () => {
  test('returns true for a fresh game', () => {
    const state = createInitialState();
    expect(isRunActive(state)).toBe(true);
  });

  test('returns false when game is won', () => {
    const state = { ...createInitialState(), runState: 'won' };
    expect(isRunActive(state)).toBe(false);
  });
});

describe('getAvailableActions', () => {
  test('returns play_tictactoe in classroom when not yet won', () => {
    const state = { ...createInitialState(), currentRoom: 'classroom' };
    const actions = getAvailableActions(state);
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe('play_tictactoe');
    expect(actions[0].label).toBe('Play tic-tac-toe');
  });

  test('returns no actions in classroom when tictactoe already won', () => {
    const state = { ...createInitialState(), currentRoom: 'classroom', tictactoe: 'won' };
    const actions = getAvailableActions(state);
    expect(actions).toHaveLength(0);
  });

  test('returns put_car_in_box in toy room when box is empty', () => {
    const state = { ...createInitialState(), currentRoom: 'toy room' };
    const actions = getAvailableActions(state);
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe('put_car_in_box');
  });

  test('returns no actions in toy room when box has car', () => {
    const state = { ...createInitialState(), currentRoom: 'toy room', box: 'car' };
    const actions = getAvailableActions(state);
    expect(actions).toHaveLength(0);
  });

  test('returns take_wire in garage when wire not in inventory', () => {
    const state = { ...createInitialState(), currentRoom: 'garage' };
    const actions = getAvailableActions(state);
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe('take_wire');
  });

  test('returns no actions in garage when wire already taken', () => {
    const state = { ...createInitialState(), currentRoom: 'garage', inventory: new Set(['wire']) };
    const actions = getAvailableActions(state);
    expect(actions).toHaveLength(0);
  });

  test('returns empty array for rooms with no actions', () => {
    const state = { ...createInitialState(), currentRoom: 'elevator' };
    const actions = getAvailableActions(state);
    expect(actions).toHaveLength(0);
  });

  test('returns empty array for unknown room', () => {
    const state = { ...createInitialState(), currentRoom: 'nonexistent' };
    const actions = getAvailableActions(state);
    expect(actions).toHaveLength(0);
  });
});

describe('performAction', () => {
  test('play_tictactoe sets tictactoe to won', () => {
    const state = { ...createInitialState(), currentRoom: 'classroom' };
    const next = performAction(state, 'play_tictactoe');
    expect(next.tictactoe).toBe('won');
  });

  test('play_tictactoe does not mutate original state', () => {
    const state = { ...createInitialState(), currentRoom: 'classroom' };
    const next = performAction(state, 'play_tictactoe');
    expect(state.tictactoe).toBeNull();
    expect(next).not.toBe(state);
  });

  test('play_tictactoe returns state unchanged if already won', () => {
    const state = { ...createInitialState(), currentRoom: 'classroom', tictactoe: 'won' };
    const next = performAction(state, 'play_tictactoe');
    expect(next).toBe(state);
  });

  test('put_car_in_box sets box to car', () => {
    const state = { ...createInitialState(), currentRoom: 'toy room' };
    const next = performAction(state, 'put_car_in_box');
    expect(next.box).toBe('car');
  });

  test('put_car_in_box returns state unchanged if already done', () => {
    const state = { ...createInitialState(), currentRoom: 'toy room', box: 'car' };
    const next = performAction(state, 'put_car_in_box');
    expect(next).toBe(state);
  });

  test('take_wire adds wire to inventory', () => {
    const state = { ...createInitialState(), currentRoom: 'garage' };
    const next = performAction(state, 'take_wire');
    expect(next.inventory.has('wire')).toBe(true);
  });

  test('take_wire does not mutate original inventory', () => {
    const state = { ...createInitialState(), currentRoom: 'garage' };
    const next = performAction(state, 'take_wire');
    expect(state.inventory.has('wire')).toBe(false);
  });

  test('take_wire returns state unchanged if wire already taken', () => {
    const state = { ...createInitialState(), currentRoom: 'garage', inventory: new Set(['wire']) };
    const next = performAction(state, 'take_wire');
    expect(next).toBe(state);
  });

  test('returns state unchanged for unknown action ID', () => {
    const state = { ...createInitialState(), currentRoom: 'classroom' };
    const next = performAction(state, 'nonexistent_action');
    expect(next).toBe(state);
  });

  test('returns state unchanged for action in wrong room', () => {
    const state = { ...createInitialState(), currentRoom: 'elevator' };
    const next = performAction(state, 'play_tictactoe');
    expect(next).toBe(state);
  });

  test('returns state unchanged for unknown room', () => {
    const state = { ...createInitialState(), currentRoom: 'nonexistent' };
    const next = performAction(state, 'play_tictactoe');
    expect(next).toBe(state);
  });

  test('full winning path using actions and navigation', () => {
    let state = createInitialState();
    state = navigate(state); // elevator → classroom
    expect(state.currentRoom).toBe('classroom');

    state = performAction(state, 'play_tictactoe');
    expect(state.tictactoe).toBe('won');

    state = navigate(state); // classroom → toy room
    expect(state.currentRoom).toBe('toy room');

    state = performAction(state, 'put_car_in_box');
    expect(state.box).toBe('car');

    state = navigate(state); // toy room → garage
    expect(state.currentRoom).toBe('garage');

    state = performAction(state, 'take_wire');
    expect(state.inventory.has('wire')).toBe(true);

    state = navigate(state); // garage → elevator
    expect(state.currentRoom).toBe('elevator');

    state = navigate(state); // elevator → outside
    expect(state.currentRoom).toBe('outside');
    expect(state.runState).toBe('won');
  });
});
