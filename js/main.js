// main.js: The main entry point for the application.

import { initializeFirebase, saveState } from './firebase.js';
import { 
    setInitialDayjs,
    setUiState, 
    addOrUpdateTransaction,
    deleteTransaction,
    getActiveTransactions,
    getAppData
} from './state.js';
import { cacheElements, renderDashboard } from './ui.js';
import { calculatePnl } from './calculations.js';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    setInitialDayjs();
    setupEventListeners();
    initializeFirebase();
});


// --- EVENT LISTENERS ---
function setupEventListeners() {
    const addTradeBtn = document.getElementById('addTradeBtn');
    const tradeModal = document.getElementById('tradeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const tradeForm = document.getElementById('tradeForm');
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    const transactionModal = document.getElementById('transactionModal');
    const cancelTransactionBtn = document.getElementById('cancelTransactionBtn');
    const transactionForm = document.getElementById('transactionForm');
    const accountSwitcher = document.getElementById('account-switcher');
    
    // Modals
    addTradeBtn.addEventListener('click', () => tradeModal.classList.remove('hidden'));
    cancelBtn.addEventListener('click', () => tradeModal.classList.add('hidden'));
    addTransactionBtn.addEventListener('click', () => transactionModal.classList.remove('hidden'));
    cancelTransactionBtn.addEventListener('click', () => transactionModal.classList.add('hidden'));
    
    // Forms
    tradeForm.addEventListener('submit', handleTradeFormSubmit);
    transactionForm.addEventListener('submit', handleTransactionFormSubmit);

    // Account Switcher
    accountSwitcher.addEventListener('click', e => {
        const btn = e.target.closest('.account-switch-btn');
        if (btn) {
            getAppData().activeAccountId = btn.dataset.id;
            saveState(); // Firebase listener will trigger re-render
        }
    });
    
    // Activity Log
    const tradesBody = document.getElementById('recent-trades-body');
    tradesBody.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const itemId = parseInt(deleteButton.dataset.id);
            if (confirm('Are you sure you want to delete this item?')) {
                deleteTransaction(itemId, getActiveTransactions());
                saveState();
            }
        }
    });

    // Filters
    const tradeFilters = document.getElementById('trade-filters');
    tradeFilters.addEventListener('click', (e) => {
        const filterButton = e.target.closest('.filter-btn');
        if (filterButton) {
            setUiState('tradeTableFilter', filterButton.dataset.filter);
            renderDashboard(); // Update UI instantly for filters
        }
    });
}

function handleTradeFormSubmit(e) {
    e.preventDefault();
    const allTransactions = getActiveTransactions();
    const tradeId = document.getElementById('trade_id').value;
    const type = document.getElementById('trade_type').value;

    const tradeData = {
        transaction_type: 'trade',
        ticker: document.getElementById('underlying_ticker').value.toUpperCase(),
        type: type,
        open: document.getElementById('open_date').value,
        close: document.getElementById('close_date').value,
        expiration: document.getElementById('expiration_date').value,
        strikes: Array.from(document.getElementById('strike-price-container').querySelectorAll('input')).map(input => parseFloat(input.value)),
        quantity: parseInt(document.getElementById('quantity').value),
        entry_price: parseFloat(document.getElementById('entry_price').value),
        exit_price: parseFloat(document.getElementById('exit_price').value),
        max_risk: parseFloat(document.getElementById('max_risk').value) || 0,
        // ... and all other form fields
    };

    tradeData.pnl = calculatePnl(tradeData);
    if (tradeId) tradeData.id = parseInt(tradeId);

    addOrUpdateTransaction(tradeData, allTransactions);
    saveState();
    
    document.getElementById('tradeModal').classList.add('hidden');
    e.target.reset();
}

function handleTransactionFormSubmit(e) {
    e.preventDefault();
    const allTransactions = getActiveTransactions();
    const data = {
        transaction_type: document.getElementById('transaction_type').value,
        amount: parseFloat(document.getElementById('transaction_amount').value),
        date: document.getElementById('transaction_date').value,
        notes: document.getElementById('transaction_notes').value,
    };

    addOrUpdateTransaction(data, allTransactions);
    saveState();

    document.getElementById('transactionModal').classList.add('hidden');
    e.target.reset();
}
