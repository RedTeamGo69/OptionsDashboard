// main.js: The main entry point for the application.

import { initializeFirebase, saveState } from './firebase.js';
import {
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
    // Modal Buttons & Forms
    const addTradeBtn = document.getElementById('addTradeBtn');
    const tradeModal = document.getElementById('tradeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const tradeForm = document.getElementById('tradeForm');
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    const transactionModal = document.getElementById('transactionModal');
    const cancelTransactionBtn = document.getElementById('cancelTransactionBtn');
    const transactionForm = document.getElementById('transactionForm');

    addTradeBtn.addEventListener('click', () => {
        tradeForm.reset();
        document.getElementById('modal-title').textContent = 'Log New Trade';
        tradeModal.classList.remove('hidden');
    });
    cancelBtn.addEventListener('click', () => tradeModal.classList.add('hidden'));

    addTransactionBtn.addEventListener('click', () => transactionModal.classList.remove('hidden'));
    cancelTransactionBtn.addEventListener('click', () => transactionModal.classList.add('hidden'));

    tradeForm.addEventListener('submit', handleFormSubmit);
    transactionForm.addEventListener('submit', handleFormSubmit);

    function handleFormSubmit(e) {
        e.preventDefault();
        const formId = e.target.id;
        let data;

        if (formId === 'tradeForm') {
            const type = document.getElementById('trade_type').value;
            const details = strategyDetails[type];
            const strikeContainer = document.getElementById('strike-price-container');

            data = {
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
                isExpired: document.getElementById('expired_worthless').checked,
                ratio: details.ratio === true,
            };
            data.pnl = calculatePnl(data);
            const tradeId = document.getElementById('trade_id').value;
            if (tradeId) data.id = parseInt(tradeId);
            tradeModal.classList.add('hidden');

        } else if (formId === 'transactionForm') {
            data = {
                transaction_type: document.getElementById('transaction_type').value,
                amount: parseFloat(document.getElementById('transaction_amount').value),
                date: document.getElementById('transaction_date').value,
                notes: document.getElementById('transaction_notes').value,
            };
            transactionModal.classList.add('hidden');
        }

        addOrUpdateTransaction(data);
        saveState();
        e.target.reset();
    }

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
    });
    
    // Trade Filters
    const tradeFilters = document.getElementById('trade-filters');
    tradeFilters.addEventListener('click', (e) => {
        const filterButton = e.target.closest('.filter-btn');
        if (filterButton) {
            // Update button styles
            tradeFilters.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('bg-indigo-600', 'text-white');
                btn.classList.add('bg-gray-700', 'text-gray-300');
            });
            filterButton.classList.add('bg-indigo-600', 'text-white');
            filterButton.classList.remove('bg-gray-700', 'text-gray-300');

            const filter = filterButton.dataset.filter;
            setUiState('tradeTableFilter', filter);
            renderDashboard(); 
        }
    });
}
