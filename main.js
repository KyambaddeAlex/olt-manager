// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBWkVWisTE4RUQJxqNz7SnLG4sBt90UX7E",
    authDomain: "olt-manager-app.firebaseapp.com",
    databaseURL: "https://olt-manager-app-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "olt-manager-app",
    storageBucket: "olt-manager-app.firebasestorage.app",
    messagingSenderId: "877612202451",
    appId: "1:877612202451:web:d66c6e7599a57ee80dd726",
    measurementId: "G-MZCXGWFJND"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Database
const db = firebase.database();

// Global variable to track current OLT
let currentOLTName = "";

// DOM Elements
const dashboardView = document.getElementById('dashboard-view');
const detailsView = document.getElementById('details-view');
const selectedOltNameHeading = document.getElementById('selected-olt-name');
const boardSelect = document.getElementById('board-select');
const portSelect = document.getElementById('port-select');
const coreIdInput = document.getElementById('core-id-input');
const configTableBody = document.getElementById('config-table-body');
const backBtn = document.getElementById('back-btn');
const configForm = document.getElementById('config-form');

// Login / Access Control
const loginView = document.getElementById('login-view');
const loginForm = document.getElementById('login-form');
const accessCodeInput = document.getElementById('access-code');
const loginError = document.getElementById('login-error');
const accessModeBadge = document.getElementById('access-mode');
const detailsAccessMode = document.getElementById('details-access-mode');
const logoutBtn = document.getElementById('logout-btn');

const ADMIN_PASSCODE = 'Albombin';
const VIEWER_PASSCODE = 'Alex';

let isLoggedIn = false;
let isAdmin = false;

dashboardView.style.display = 'none';

// ============================================
// LOGIN / ACCESS CONTROL
// ============================================

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const passcode = accessCodeInput.value.trim();

    if (passcode === ADMIN_PASSCODE) {
        isLoggedIn = true;
        isAdmin = true;
        hideLogin();
    } else if (passcode === VIEWER_PASSCODE) {
        isLoggedIn = true;
        isAdmin = false;
        hideLogin();
    } else {
        loginError.hidden = false;
        accessCodeInput.value = '';
        accessCodeInput.focus();
    }
});

function hideLogin() {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';

    const modeLabel = isAdmin ? 'ADMIN' : 'VIEW ONLY';
    const badgeClass = isAdmin ? 'admin-badge' : 'viewer-badge';

    accessModeBadge.textContent = modeLabel;
    accessModeBadge.className = 'access-badge ' + badgeClass;
    detailsAccessMode.textContent = modeLabel;
    detailsAccessMode.className = 'access-badge ' + badgeClass;

    if (!isAdmin) {
        configForm.style.display = 'none';
    }
}

logoutBtn.addEventListener('click', function() {
    isLoggedIn = false;
    isAdmin = false;
    loginView.style.display = 'block';
    dashboardView.style.display = 'none';
    detailsView.style.display = 'none';
    currentOLTName = '';
    accessCodeInput.value = '';
    loginError.hidden = true;
    configForm.style.display = '';
    configTableBody.replaceChildren();
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'empty-state';
    emptyRow.innerHTML = '<td colspan="5">No saved configurations for this OLT yet.</td>';
    configTableBody.appendChild(emptyRow);
});

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

// Handle OLT card click - switch to details view
document.querySelectorAll('.olt-card').forEach(card => {
    card.addEventListener('click', function() {
        if (!isLoggedIn) return;
        const oltName = this.textContent.trim();
        
        // Update the selected OLT name heading
        selectedOltNameHeading.textContent = `OLT: ${oltName}`;
        
        // Store current OLT name
        currentOLTName = oltName;
        
        // Hide dashboard, show details
        dashboardView.style.display = 'none';
        detailsView.style.display = 'block';
        
        // Load data for this OLT
        loadOLTData(oltName);
    });
});

// Handle Back to Dashboard button click
backBtn.addEventListener('click', function() {
    // Hide details, show dashboard
    detailsView.style.display = 'none';
    dashboardView.style.display = 'block';
    
    // Clear current OLT name
    currentOLTName = "";
});

// ============================================
// FORM POPULATION
// ============================================

// Populate Board select dropdown (1-8)
function populateBoardSelect() {
    // Clear existing options except the first default
    boardSelect.innerHTML = '<option value="">BOARD (1-8)</option>';
    
    // Add options 1-8
    for (let i = 1; i <= 8; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        boardSelect.appendChild(option);
    }
}

// Populate Port select dropdown (0-15)
function populatePortSelect() {
    // Clear existing options except the first default
    portSelect.innerHTML = '<option value="">PORT (0-15)</option>';
    
    // Add options 0-15
    for (let i = 0; i <= 15; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        portSelect.appendChild(option);
    }
}

// Initialize form dropdowns on page load
document.addEventListener('DOMContentLoaded', function() {
    populateBoardSelect();
    populatePortSelect();
});

// ============================================
// SAVE DATA FUNCTION
// ============================================

// Handle form submission - save data to Firebase
configForm.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!isAdmin) return;

    const oltName = currentOLTName;
    
    // Get form values
    const board = boardSelect.value;
    const port = portSelect.value;
    const coreId = coreIdInput.value;
    
    // Validate inputs
    if (!oltName || !board || !port || !coreId) {
        alert('Please fill in all fields');
        return;
    }
    
    // Create data object
    const configData = {
        board: board,
        port: port,
        coreId: coreId,
        lastUpdate: new Date().toISOString()
    };
    
    // Push to Firebase under olts/[oltName]/configs
    db.ref('olts/' + oltName + '/configs').push(configData)
        .then(() => {
            console.log('Data saved successfully');
            // Clear inputs after saving
            boardSelect.value = '';
            portSelect.value = '';
            coreIdInput.value = '';
        })
        .catch((error) => {
            console.error('Error saving data:', error);
            alert('Error saving data. Please try again.');
        });
});

// ============================================
// REAL-TIME DATA AND INLINE EDITING
// ============================================

let activeConfigsRef = null;
let currentConfigListener = null;
let currentRemovedListener = null;
let currentChangedListener = null;

function configPath(oltName) {
    return `olts/${oltName}/configs`;
}

function makeButton(text, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    button.addEventListener('click', handler);
    return button;
}

function renderActionButtons(row, key, oltName) {
    const actionCell = row.querySelector('.action-cell');
    if (isAdmin) {
        actionCell.replaceChildren(
            makeButton('Edit', 'edit-btn', () => enableEdit(row, key, oltName)),
            makeButton('Delete', 'delete-btn', () => deleteConfig(oltName, key))
        );
    } else {
        actionCell.replaceChildren();
    }
}

function createConfigRow(snapshot, oltName) {
    const data = snapshot.val() || {};
    const key = snapshot.key;
    const row = document.createElement('tr');
    row.dataset.key = key;

    ['board', 'port', 'coreId'].forEach((field) => {
        const cell = document.createElement('td');
        cell.className = `${field === 'coreId' ? 'coreid' : field}-cell`;
        cell.textContent = data[field] ?? '';
        row.appendChild(cell);
    });

    const dateCell = document.createElement('td');
    dateCell.className = 'date-cell';
    dateCell.textContent = formatDate(data.lastUpdate);
    row.appendChild(dateCell);

    const actionCell = document.createElement('td');
    actionCell.className = 'action-cell';
    row.appendChild(actionCell);
    renderActionButtons(row, key, oltName);
    return row;
}

function loadOLTData(oltName) {
    configTableBody.replaceChildren();

    if (activeConfigsRef) {
        activeConfigsRef.off('child_added', currentConfigListener);
        activeConfigsRef.off('child_removed', currentRemovedListener);
        activeConfigsRef.off('child_changed', currentChangedListener);
    }

    activeConfigsRef = db.ref(configPath(oltName));
    currentConfigListener = (snapshot) => {
        const emptyState = configTableBody.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        configTableBody.appendChild(createConfigRow(snapshot, oltName));
    };
    currentRemovedListener = (snapshot) => {
        const row = configTableBody.querySelector(`tr[data-key="${snapshot.key}"]`);
        if (row) row.remove();
    };
    currentChangedListener = (snapshot) => {
        const row = configTableBody.querySelector(`tr[data-key="${snapshot.key}"]`);
        if (!row || row.dataset.editing === 'true') return;
        const replacement = createConfigRow(snapshot, oltName);
        row.replaceWith(replacement);
    };

    activeConfigsRef.on('child_added', currentConfigListener);
    activeConfigsRef.on('child_removed', currentRemovedListener);
    activeConfigsRef.on('child_changed', currentChangedListener);

    activeConfigsRef.once('value').then((snapshot) => {
        if (!snapshot.exists() && !configTableBody.querySelector('.empty-state')) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-state';
            emptyRow.innerHTML = '<td colspan="5">No saved configurations for this OLT yet.</td>';
            configTableBody.appendChild(emptyRow);
        }
    });
}

function enableEdit(row, key, oltName) {
    if (!isAdmin) return;
    if (row.dataset.editing === 'true') return;
    row.dataset.editing = 'true';
    row.dataset.original = JSON.stringify({
        board: row.querySelector('.board-cell').textContent,
        port: row.querySelector('.port-cell').textContent,
        coreId: row.querySelector('.coreid-cell').textContent
    });

    ['board', 'port', 'coreid'].forEach((field) => {
        const cell = row.querySelector(`.${field}-cell`);
        const input = document.createElement('input');
        input.className = 'inline-input';
        input.type = field === 'coreid' ? 'text' : 'number';
        input.min = field === 'board' ? '1' : '0';
        input.max = field === 'board' ? '8' : '15';
        input.value = cell.textContent;
        input.setAttribute('aria-label', field === 'coreid' ? 'Core ID' : field);
        cell.replaceChildren(input);
        cell.classList.add('editing');
    });

    const actionCell = row.querySelector('.action-cell');
    actionCell.replaceChildren(
        makeButton('Save', 'save-edit-btn', () => saveConfigEdit(key, row, oltName)),
        makeButton('Cancel', 'cancel-edit-btn', () => cancelEdit(row, key, oltName))
    );
    row.querySelector('.inline-input').focus();
}

function saveConfigEdit(key, row, oltName) {
    if (!isAdmin) return;
    const board = row.querySelector('.board-cell input').value.trim();
    const port = row.querySelector('.port-cell input').value.trim();
    const coreId = row.querySelector('.coreid-cell input').value.trim();

    if (!/^([1-8])$/.test(board)) {
        alert('Board must be a number between 1 and 8.');
        return;
    }
    if (!/^(?:[0-9]|1[0-5])$/.test(port)) {
        alert('Port must be a number between 0 and 15.');
        return;
    }
    if (!coreId) {
        alert('Core ID is required.');
        return;
    }

    const saveButton = row.querySelector('.save-edit-btn');
    saveButton.disabled = true;
    db.ref(`${configPath(oltName)}/${key}`).update({
        board,
        port,
        coreId,
        lastUpdate: new Date().toISOString()
    }).then(() => {
        row.querySelector('.board-cell').textContent = board;
        row.querySelector('.port-cell').textContent = port;
        row.querySelector('.coreid-cell').textContent = coreId;
        row.querySelector('.date-cell').textContent = formatDate(new Date().toISOString());
        row.querySelectorAll('.editing').forEach((cell) => cell.classList.remove('editing'));
        row.dataset.editing = 'false';
        delete row.dataset.original;
        renderActionButtons(row, key, oltName);
    }).catch((error) => {
        console.error('Error updating configuration:', error);
        saveButton.disabled = false;
        alert('Could not update this configuration. Please try again.');
    });
}

function cancelEdit(row, key, oltName) {
    const original = JSON.parse(row.dataset.original);
    row.querySelector('.board-cell').textContent = original.board;
    row.querySelector('.port-cell').textContent = original.port;
    row.querySelector('.coreid-cell').textContent = original.coreId;
    row.querySelectorAll('.editing').forEach((cell) => cell.classList.remove('editing'));
    row.dataset.editing = 'false';
    delete row.dataset.original;
    renderActionButtons(row, key, oltName);
}

function deleteConfig(oltName, key) {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    db.ref(`${configPath(oltName)}/${key}`).remove().catch((error) => {
        console.error('Error deleting configuration:', error);
        alert('Could not delete this configuration. Please try again.');
    });
}

function formatDate(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}