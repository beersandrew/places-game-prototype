// game.js — pure state machine. No DOM. No side effects.

// --- Room Registry ---
// Source of truth for all room content. Lookup by ID.

const ROOMS = {
  elevator: {
    id: 'elevator',
    name: 'Elevator',
    description: 'A rickety elevator with a panel of unmarked buttons. One door leads out.',
    doors: [
      {
        label: 'Step through the door',
        destinations: [
          { condition: (state) => state.inventory.has('wire'), room: 'outside' },
          { room: 'classroom' },
        ],
      },
    ],
  },
  classroom: {
    id: 'classroom',
    name: 'Classroom',
    description: 'A small classroom with rows of desks, a chalkboard, and a globe on the teacher\'s desk.',
    doors: [
      {
        label: 'Leave the classroom',
        destinations: [
          { condition: (state) => state.tictactoe === 'won', room: 'toy room' },
          { room: 'fortune teller' },
        ],
      },
    ],
    actions: [
      {
        id: 'play_tictactoe',
        label: 'Play tic-tac-toe',
        available: (state) => state.tictactoe !== 'won',
        perform: (state) => ({ ...state, tictactoe: 'won' }),
      },
    ],
  },
  'toy room': {
    id: 'toy room',
    name: 'Toy Room',
    description: 'A bright room filled with toys. A large cardboard box sits in the center.',
    doors: [
      {
        label: 'Head through the door',
        destinations: [
          { condition: (state) => state.box === 'car', room: 'garage' },
          { room: 'fortune teller' },
        ],
      },
    ],
    actions: [
      {
        id: 'put_car_in_box',
        label: 'Put the car in the box',
        available: (state) => state.box !== 'car',
        perform: (state) => ({ ...state, box: 'car' }),
      },
    ],
  },
  garage: {
    id: 'garage',
    name: 'Garage',
    description: 'A cluttered garage with tools hanging on pegboards and a workbench covered in parts.',
    doors: [
      {
        label: 'Exit the garage',
        destinations: [
          { condition: (state) => state.inventory.has('wire'), room: 'elevator' },
          { room: 'fortune teller' },
        ],
      },
    ],
    actions: [
      {
        id: 'take_wire',
        label: 'Take the wire',
        available: (state) => !state.inventory.has('wire'),
        perform: (state) => {
          const newInventory = new Set(state.inventory);
          newInventory.add('wire');
          return { ...state, inventory: newInventory };
        },
      },
    ],
  },
  'fortune teller': {
    id: 'fortune teller',
    name: 'Fortune Teller',
    description: 'A dim tent draped in velvet. A crystal ball glows faintly on a small round table.',
    doors: [
      {
        label: 'Return through the curtain',
        destinations: [
          { room: 'elevator' },
        ],
      },
    ],
  },
  outside: {
    id: 'outside',
    name: 'Outside',
    description: 'Sunlight. Open air. You made it out.',
    doors: [],
  },
};

function getRoom(id) {
  return ROOMS[id] || null;
}

function getAllRoomIds() {
  return Object.keys(ROOMS);
}

/**
 * Given a door and the current game state, resolve which room it leads to.
 * Evaluates destination conditions in order; returns the first match.
 * Returns null if no destination matches.
 */
function resolveDoor(door, state) {
  for (const dest of door.destinations) {
    if (!dest.condition || dest.condition(state)) {
      return dest.room;
    }
  }
  return null;
}

/**
 * Get available doors for the current room, each annotated with its resolved
 * destination given the current state.
 * Returns an array of { label, destination } objects.
 */
function getAvailableDoors(state) {
  const room = ROOMS[state.currentRoom];
  if (!room) return [];
  return room.doors.map((door) => ({
    label: door.label,
    destination: resolveDoor(door, state),
  }));
}

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

/**
 * Resolve the destination room for the current room based on game state.
 * Returns the room name string, or 'end' for the game-ending transition.
 */
function resolveDestination(state) {
  switch (state.currentRoom) {
    case 'elevator':
      return state.inventory.has('wire') ? 'outside' : 'classroom';
    case 'classroom':
      return state.tictactoe === 'won' ? 'toy room' : 'fortune teller';
    case 'toy room':
      return state.box === 'car' ? 'garage' : 'fortune teller';
    case 'garage':
      return state.inventory.has('wire') ? 'elevator' : 'fortune teller';
    case 'fortune teller':
      return 'elevator';
    case 'outside':
      return 'end';
    default:
      return null;
  }
}

/**
 * Navigate through the door in the current room.
 * Returns a new state with currentRoom and visitedRooms updated.
 * If the game is already won or the room has no valid destination, returns the state unchanged.
 */
function navigate(state) {
  if (state.runState !== 'active') {
    return state;
  }

  const destination = resolveDestination(state);

  if (destination === null) {
    return state;
  }

  if (destination === 'end') {
    return state;
  }

  const newVisited = new Set(state.visitedRooms);
  newVisited.add(destination);

  const newState = {
    ...state,
    currentRoom: destination,
    visitedRooms: newVisited,
  };

  // End condition: reaching Outside wins the game
  if (destination === 'outside') {
    newState.runState = 'won';
  }

  return newState;
}

/**
 * Move to a specific room. Updates currentRoom and visitedRooms.
 * If destination is 'outside', sets runState to 'won'.
 * Pure: returns a new state object.
 */
function moveToRoom(state, room) {
  const newVisited = new Set(state.visitedRooms);
  newVisited.add(room);

  const newRunState = room === 'outside' ? 'won' : state.runState;

  return {
    ...state,
    currentRoom: room,
    visitedRooms: newVisited,
    runState: newRunState,
  };
}

/**
 * Returns true if the given room has been visited.
 */
function hasVisited(state, room) {
  return state.visitedRooms.has(room);
}

/**
 * Returns true if the run is still active.
 */
function isRunActive(state) {
  return state.runState === 'active';
}

/**
 * Returns the actions available in the player's current room given the current state.
 * Only includes actions whose available() check returns true.
 */
function getAvailableActions(state) {
  const room = ROOMS[state.currentRoom];
  if (!room || !room.actions) return [];
  return room.actions.filter((action) => action.available(state));
}

/**
 * Performs the named action in the current room. Returns new state.
 * Returns state unchanged if the action is not found or not available.
 */
function performAction(state, actionId) {
  const room = ROOMS[state.currentRoom];
  if (!room || !room.actions) return state;
  const action = room.actions.find((a) => a.id === actionId);
  if (!action || !action.available(state)) return state;
  return action.perform(state);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ROOMS, getRoom, getAllRoomIds, createInitialState, resolveDestination, navigate, moveToRoom, hasVisited, isRunActive, resolveDoor, getAvailableDoors, getAvailableActions, performAction };
}
