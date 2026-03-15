// ui.js — DOM rendering only. No game logic.

let gameState = createInitialState();

function render(state) {
  const container = document.getElementById('game');
  container.innerHTML = '';

  if (state.runState === 'won') {
    const heading = document.createElement('h2');
    heading.textContent = getRoom(state.currentRoom).name;
    container.appendChild(heading);

    const desc = document.createElement('p');
    desc.textContent = getRoom(state.currentRoom).description;
    container.appendChild(desc);

    const winMsg = document.createElement('p');
    winMsg.className = 'win-message';
    winMsg.textContent = 'You made it out!';
    container.appendChild(winMsg);
    return;
  }

  const room = getRoom(state.currentRoom);

  const heading = document.createElement('h2');
  heading.textContent = room.name;
  container.appendChild(heading);

  const desc = document.createElement('p');
  desc.textContent = room.description;
  container.appendChild(desc);

  // Action buttons
  const actions = getAvailableActions(state);
  if (actions.length > 0) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';
    for (const action of actions) {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        gameState = performAction(gameState, action.id);
        render(gameState);
      });
      actionsDiv.appendChild(btn);
    }
    container.appendChild(actionsDiv);
  }

  // Door buttons
  const doors = getAvailableDoors(state);
  if (doors.length > 0) {
    const doorsDiv = document.createElement('div');
    doorsDiv.className = 'doors';
    for (const door of doors) {
      const btn = document.createElement('button');
      btn.className = 'door-btn';
      btn.textContent = door.label;
      btn.addEventListener('click', () => {
        gameState = navigate(gameState);
        render(gameState);
      });
      doorsDiv.appendChild(btn);
    }
    container.appendChild(doorsDiv);
  }
}

// Initialize on load
gameState = createInitialState();
render(gameState);
