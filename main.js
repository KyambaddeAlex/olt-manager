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
const locationNameInput = document.getElementById('location-name-input');
const coordinatesInput = document.getElementById('coordinates-input');
const currentLocationBtn = document.getElementById('current-location-btn');
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
const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

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
    emptyRow.innerHTML = '<td colspan="6">No saved configurations for this OLT yet.</td>';
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

coordinatesInput.addEventListener('blur', function() {
    const coordinates = parseCoordinates(coordinatesInput.value);
    if (coordinates) reverseGeocode(coordinates.latitude, coordinates.longitude, locationNameInput);
});

currentLocationBtn.addEventListener('click', useCurrentLocation);

function parseCoordinates(value) {
    const parts = value.split(',').map((part) => Number(part.trim()));
    if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) return null;
    const [latitude, longitude] = parts;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
}

function formatCoordinates(latitude, longitude) {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

async function reverseGeocode(latitude, longitude, locationInput = locationNameInput) {
    try {
        const params = new URLSearchParams({ latitude, longitude, localityLanguage: 'en' });
        const response = await fetch(`${REVERSE_GEOCODE_URL}?${params}`);
        if (!response.ok) throw new Error(`Reverse geocoding failed with status ${response.status}`);
        const place = await response.json();
        const locationName = place.locality || place.city || place.principalSubdivision || place.countryName;
        if (locationInput && locationName) locationInput.value = locationName;
    } catch (error) {
        console.warn('Could not determine a place name from these coordinates:', error);
    }
}

function useCurrentLocation({ locationInput = locationNameInput, coordinatesInputRef = coordinatesInput, button = currentLocationBtn } = {}) {
    if (!navigator.geolocation) {
        alert('Current location is not available in this browser. Enter coordinates manually.');
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = 'LOCATING...';
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        if (coordinatesInputRef) coordinatesInputRef.value = formatCoordinates(latitude, longitude);
        if (locationInput) await reverseGeocode(latitude, longitude, locationInput);
        if (button) {
            button.disabled = false;
            button.textContent = 'USE CURRENT LOCATION';
        }
    }, (error) => {
        console.warn('Could not get current location:', error);
        if (button) {
            button.disabled = false;
            button.textContent = 'USE CURRENT LOCATION';
        }
        alert('Could not access your current location. Please allow location access or enter coordinates manually.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

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
    const locationName = locationNameInput.value.trim();
    const coordinates = coordinatesInput.value.trim();
    
    // Validate inputs
    if (!oltName || !board || !port || !coreId || !locationName || !coordinates) {
        alert('Please fill in all fields');
        return;
    }
    
    // Create data object
    const configData = {
        board: board,
        port: port,
        coreId: coreId,
        locationName,
        coordinates,
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
            locationNameInput.value = '';
            coordinatesInput.value = '';
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
    row.dataset.board = data.board ?? '';
    row.dataset.port = data.port ?? '';

    ['board', 'port', 'coreId'].forEach((field) => {
        const cell = document.createElement('td');
        cell.className = `${field === 'coreId' ? 'coreid' : field}-cell`;
        cell.textContent = data[field] ?? '';
        row.appendChild(cell);
    });

    row.appendChild(createLocationCell(data));

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

function sortConfigRows() {
    const rows = [...configTableBody.querySelectorAll('tr:not(.empty-state)')];
    rows.sort((firstRow, secondRow) => {
        const boardDifference = Number(firstRow.dataset.board) - Number(secondRow.dataset.board);
        if (boardDifference !== 0) return boardDifference;
        return Number(firstRow.dataset.port) - Number(secondRow.dataset.port);
    });
    rows.forEach((row) => configTableBody.appendChild(row));
}

function createLocationCell(data) {
    const cell = document.createElement('td');
    cell.className = 'location-cell';

    const locationLink = document.createElement('a');
    locationLink.className = 'location-link';
    locationLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.coordinates || '')}`;
    locationLink.target = '_blank';
    locationLink.rel = 'noopener noreferrer';
    locationLink.title = 'Open location in Google Maps';

    const pin = document.createElement('span');
    pin.className = 'location-pin';
    pin.textContent = '📍';
    pin.setAttribute('aria-hidden', 'true');

    const details = document.createElement('div');
    details.className = 'location-details';

    const name = document.createElement('strong');
    name.className = 'location-name';
    name.textContent = data.locationName || 'Location not set';

    const coordinates = document.createElement('span');
    coordinates.className = 'coordinates-pill';
    coordinates.textContent = data.coordinates || 'Coordinates not set';

    details.append(name, coordinates);
    locationLink.append(pin, details);
    cell.append(locationLink);
    return cell;
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
        sortConfigRows();
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
        sortConfigRows();
    };

    activeConfigsRef.on('child_added', currentConfigListener);
    activeConfigsRef.on('child_removed', currentRemovedListener);
    activeConfigsRef.on('child_changed', currentChangedListener);

    activeConfigsRef.once('value').then((snapshot) => {
        if (!snapshot.exists() && !configTableBody.querySelector('.empty-state')) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-state';
            emptyRow.innerHTML = '<td colspan="6">No saved configurations for this OLT yet.</td>';
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
        coreId: row.querySelector('.coreid-cell').textContent,
        locationName: row.querySelector('.location-name').textContent,
        coordinates: row.querySelector('.coordinates-pill').textContent
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

    const locationCell = row.querySelector('.location-cell');
    locationCell.replaceChildren();
    locationCell.classList.add('editing');

    const locationNameInput = document.createElement('input');
    locationNameInput.className = 'inline-input';
    locationNameInput.type = 'text';
    locationNameInput.value = JSON.parse(row.dataset.original).locationName;
    locationNameInput.setAttribute('aria-label', 'Location Name');
    locationNameInput.dataset.field = 'locationName';

    const coordinatesInput = document.createElement('input');
    coordinatesInput.className = 'inline-input';
    coordinatesInput.type = 'text';
    coordinatesInput.value = JSON.parse(row.dataset.original).coordinates;
    coordinatesInput.setAttribute('aria-label', 'Coordinates');
    coordinatesInput.dataset.field = 'coordinates';

    const useCurrentLocationBtn = makeButton('Use Current', 'location-current-btn', () => {
        useCurrentLocation({
            locationInput: locationNameInput,
            coordinatesInputRef: coordinatesInput,
            button: useCurrentLocationBtn
        });
    });

    coordinatesInput.addEventListener('blur', function() {
        const coordinates = parseCoordinates(this.value);
        if (!coordinates) return;
        reverseGeocode(coordinates.latitude, coordinates.longitude, locationNameInput);
    });

    locationCell.append(locationNameInput, coordinatesInput, useCurrentLocationBtn);

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
    const locationName = row.querySelector('.location-cell input[data-field="locationName"]').value.trim();
    const coordinates = row.querySelector('.location-cell input[data-field="coordinates"]').value.trim();

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
    if (!locationName || !coordinates) {
        alert('Location name and coordinates are required.');
        return;
    }

    const saveButton = row.querySelector('.save-edit-btn');
    saveButton.disabled = true;
    db.ref(`${configPath(oltName)}/${key}`).update({
        board,
        port,
        coreId,
        locationName,
        coordinates,
        lastUpdate: new Date().toISOString()
    }).then(() => {
        row.querySelector('.board-cell').textContent = board;
        row.querySelector('.port-cell').textContent = port;
        row.dataset.board = board;
        row.dataset.port = port;
        row.querySelector('.coreid-cell').textContent = coreId;
        row.replaceChild(createLocationCell({ locationName, coordinates }), row.querySelector('.location-cell'));
        row.querySelector('.date-cell').textContent = formatDate(new Date().toISOString());
        row.querySelectorAll('.editing').forEach((cell) => cell.classList.remove('editing'));
        row.dataset.editing = 'false';
        delete row.dataset.original;
        renderActionButtons(row, key, oltName);
        sortConfigRows();
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
    row.replaceChild(createLocationCell(original), row.querySelector('.location-cell'));
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