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

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

// Handle OLT card click - switch to details view
document.querySelectorAll('.olt-card').forEach(card => {
    card.addEventListener('click', function() {
        // Get the OLT name from the clicked button
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
    
    // Get current OLT name
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
// LOAD REAL-TIME DATA
// ============================================

// Store the current listener reference to remove it when switching OLTs
let currentConfigListener = null;

// Function to load OLT data with real-time listener
function loadOLTData(oltName) {
    // Clear existing table body
    configTableBody.innerHTML = '';
    
    // Remove previous listener if exists
    if (currentConfigListener) {
        db.ref('olts/' + oltName + '/configs').off('child_added', currentConfigListener);
    }
    
    // Set up real-time listener for new data
    currentConfigListener = function(snapshot) {
        const data = snapshot.val();
        const key = snapshot.key;
        
        // Create table row with config data
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${data.board}</td>
            <td>${data.port}</td>
            <td>${data.coreId}</td>
            <td>${formatDate(data.lastUpdate)}</td>
            <td>
                <button class="delete-btn" data-key="${key}">Delete</button>
            </td>
        `;
        
        // Add delete functionality
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            deleteConfig(oltName, key);
        });
        
        // Append row to table body
        configTableBody.appendChild(row);
    };
    
    // Attach the real-time listener
    db.ref('olts/' + oltName + '/configs').on('child_added', currentConfigListener);
}

// Function to delete a configuration
function deleteConfig(oltName, key) {
    if (confirm('Are you sure you want to delete this configuration?')) {
        db.ref('olts/' + oltName + '/configs/' + key).remove()
            .then(() => {
                console.log('Configuration deleted successfully');
            })
            .catch((error) => {
                console.error('Error deleting configuration:', error);
                alert('Error deleting configuration. Please try again.');
            });
    }
}

// Helper function to format date
function formatDate(isoString) {
    if (!isoString) return 'N/A';
    
    const date = new Date(isoString);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-US', options);
}

// Handle child_removed to update UI when data is deleted
function setupRemoveListener(oltName) {
    db.ref('olts/' + oltName + '/configs').on('child_removed', function(snapshot) {
        const key = snapshot.key;
        // Find and remove the row with this key
        const deleteBtn = document.querySelector(`.delete-btn[data-key="${key}"]`);
        if (deleteBtn) {
            const row = deleteBtn.closest('tr');
            row.remove();
        }
    });
}

// Override loadOLTData to also set up remove listener
const originalLoadOLTData = loadOLTData;
loadOLTData = function(oltName) {
    // Clear existing table body
    configTableBody.innerHTML = '';
    
    // Remove previous listeners if exists
    if (currentConfigListener) {
        db.ref('olts/' + oltName + '/configs').off('child_added', currentConfigListener);
        db.ref('olts/' + oltName + '/configs').off('child_removed');
    }
    
    // Set up real-time listener for new data (child_added)
    currentConfigListener = function(snapshot) {
        const data = snapshot.val();
        const key = snapshot.key;
        
        // Create table row with config data
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${data.board}</td>
            <td>${data.port}</td>
            <td>${data.coreId}</td>
            <td>${formatDate(data.lastUpdate)}</td>
            <td>
                <button class="delete-btn" data-key="${key}">Delete</button>
            </td>
        `;
        
        // Add delete functionality
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            deleteConfig(oltName, key);
        });
        
        // Append row to table body
        configTableBody.appendChild(row);
    };
    
    // Set up listener for removed data (child_removed)
    function removeListener(snapshot) {
        const key = snapshot.key;
        // Find and remove the row with this key
        const deleteBtn = document.querySelector(`.delete-btn[data-key="${key}"]`);
        if (deleteBtn) {
            const row = deleteBtn.closest('tr');
            row.remove();
        }
    }
    
    // Attach both listeners
    db.ref('olts/' + oltName + '/configs').on('child_added', currentConfigListener);
    db.ref('olts/' + oltName + '/configs').on('child_removed', removeListener);
};
