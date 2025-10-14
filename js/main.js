// main.js: The main entry point for the application.

import { initializeFirebase, saveState } from './firebase.js';
import { 
    getAppData, 
    getActiveTransactions,
    setInitialDayjs,
    setUiState, 
    addOrUpdateTransaction,
    deleteTransaction
} from './state.js';
import { renderDashboard } from './ui.js';
import { calculatePnl } from './calculations.js';

// This is configuration data, so it's okay to keep it here.
const strategyDetails = {
    'Long Call': { strikes: ['Strike'], risk: 'debit' },
    'Long Put': { strikes: ['Strike'], risk: 'debit' },
    'Short Call': { strikes: ['Strike'], risk: 'undefined' },
    'Short Put': { strikes: ['Strike'], risk: 'collateral' },
    'Long Call Spread': { strikes: ['Long Strike', 'Short Strike'], risk: 'debit' },
    'Long Put Spread': { strikes: ['Short Strike', 'Long Strike'], risk: 'debit' },
    'Short Call Spread': { strikes: ['Short Strike', 'Long Strike'], risk: 'spread' },
    'Short Put Spread': { strikes: ['Short Strike', 'Long Strike'], risk: 'spread' },
    'Calendar Spread': { strikes: ['Strike'], risk: 'debit', expirations: 2 },
    'Long Ratio Spread': { strikes: ['Long Strike', 'Short Strike'], ratio: true, risk: 'custom' },
    'Short Ratio Spread': { strikes: ['Short Strike', 'Long Strike'], ratio: true, risk: 'custom' },
    'Long Straddle': { strikes: ['Strike'], risk: 'debit' },
    'Short Straddle': { strikes: ['Strike'], risk: 'undefined' },
    'Long Strangle': { strikes: ['Put Strike', 'Call Strike'], risk: 'debit' },
    'Short Strangle': { strikes: ['Put Strike', 'Call Strike'], risk: 'undefined' },
    'Long Butterfly': { strikes: ['Low Strike', 'Mid Strike', 'High Strike'], risk: 'debit' },
    'Short Butterfly': { strikes: ['Low Strike', 'Mid Strike', 'High Strike'], risk: 'credit' },
    'Short Iron Condor': { strikes: ['Long Put', 'Short Put', 'Short Call', 'Long Call'], risk: 'spread' },
    'Short Iron Butterfly': { strikes: ['Long Put', 'Short Strike', 'Long Call'], risk: 'spread' }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    setInitialDayjs();
    setupEventListeners();
    initializeFirebase();
});


// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Modal Buttons
    const addTradeBtn = document.getElementById('addTradeBtn');
    const tradeModal = document.getElementById('tradeModal');
    const cancelBtn = document.getElementById('cancelBtn');

    addTradeBtn.addEventListener('click', () => tradeModal.classList.remove('hidden'));
    cancelBtn.addEventListener('click', () => tradeModal.classList.add('hidden'));

    // Trade Form Submission
    const tradeForm = document.getElementById('tradeForm');
    tradeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const tradeId = document.getElementById('trade_id').value;
        const type = document.getElementById('trade_type').value;
        const details = strategyDetails[type];
        const strikeContainer = document.getElementById('strike-price-container');
        const separateCommissionsCheckbox = document.getElementById('separate_commissions');
        const expiredCheckbox = document.getElementById('expired_worthless');

        const tradeData = {
            transaction_type: 'trade',
            ticker: document.getElementById('underlying_ticker').value.toUpperCase(),
            type: type,
            open: document.getElementById('open_date').value,
            close: document.getElementById('close_date').value,
            expiration: document.getElementById('expiration_date').value,
            strikes: Array.from(strikeContainer.querySelectorAll('input')).map(input => parseFloat(input.value)),
            quantity: parseInt(document.getElementById('quantity').value),
            entry_price: parseFloat(document.getElementById('entry_price').value),
            exit_price: parseFloat(document.getElementById('exit_price').value),
            max_risk: parseFloat(document.getElementById('max_risk').value) || 0,
            tags: document.getElementById('tags').value,
            notes: document.getElementById('notes').value,
            isExpired: expiredCheckbox.checked,
            ratio: details.ratio === true,
            // Add other fields from your form...
        };

        // Add PnL calculation
        tradeData.pnl = calculatePnl(tradeData);
        
        // If it's an existing trade, set the ID to ensure it updates instead of creates
        if (tradeId) {
            tradeData.id = parseInt(tradeId);
        }

        // Update the state
        addOrUpdateTransaction(tradeData);

        // Save the new state to Firebase
        saveState();

        // Hide the modal
        tradeModal.classList.add('hidden');
        tradeForm.reset();
    });

    // Activity Log Event Delegation (for edit/delete)
    const tradesBody = document.getElementById('recent-trades-body');
    tradesBody.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const itemId = parseInt(deleteButton.dataset.id);
            if (confirm('Are you sure you want to delete this item?')) {
                deleteTransaction(itemId);
                saveState();
            }
        }
        
        // Add logic for edit button here...
    });
    
    // Add other event listeners for filters, search, etc.
    // Example for trade filters:
    const tradeFilters = document.getElementById('trade-filters');
    tradeFilters.addEventListener('click', (e) => {
        const filterButton = e.target.closest('.filter-btn');
        if (filterButton) {
            const filter = filterButton.dataset.filter;
            setUiState('tradeTableFilter', filter);
            // Re-rendering is handled by Firebase, but if you want instant UI
            // feedback without waiting for the database, you can call renderDashboard()
            renderDashboard(); // We need to import this from ui.js
        }
    });
}