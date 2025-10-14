// state.js: Manages the application's state.

// The single source of truth for the entire application.
const state = {
    appData: {},
    isAuthReady: false,
    dataUserId: null,
    unsubscribe: null,
    hasInitialized: false,
    
    // UI State
    ui: {
        tradeTableFilter: 'all',
        equityTimeFilter: 'all',
        logSearchFilter: '',
        calendarDate: null, // Will be initialized as a dayjs object
        calendarView: 'month',
        currentPage: 1,
        itemsPerPage: 10,
        mainView: 'calendar',
        dateMode: 'live',
        sortBy: 'date',
        sortDirection: 'desc',
        selectedCalendarDate: null,
        chartFilter: { type: null, value: null, displayValue: null },
    }
};

// --- STATE GETTERS ---
// Functions to safely access parts of the state.

export function getAppData() {
    return state.appData;
}

export function getUiState() {
    return state.ui;
}

export function getAuthState() {
    return {
        isAuthReady: state.isAuthReady,
        dataUserId: state.dataUserId,
        unsubscribe: state.unsubscribe,
        hasInitialized: state.hasInitialized
    };
}

export function getActiveTransactions() {
    const { appData } = state;
    return appData.transactions && appData.activeAccountId ? appData.transactions[appData.activeAccountId] || [] : [];
}

export function getActiveAccount() {
    const { appData } = state;
    return appData.accounts ? appData.accounts.find(acc => acc.id === appData.activeAccountId) : null;
}

export function getSettings() {
    return state.appData.settings || { currency: '$', defaultCommission: 0.65 };
}

// --- STATE MUTATIONS ---
// Functions that are allowed to modify the state.

export function setInitialDayjs() {
    state.ui.calendarDate = window.dayjs();
}

export function setAppData(data) {
    state.appData = { ...state.appData, ...data };
}

export function setAuthState(authUpdates) {
    Object.assign(state, authUpdates);
}

export function initializeAppState() {
    const defaultAccountId = `acc_${Date.now()}`;
    state.appData = {
        accounts: [{ id: defaultAccountId, name: 'Account 1' }],
        activeAccountId: defaultAccountId,
        transactions: { [defaultAccountId]: [] },
        settings: { currency: '$', defaultCommission: 0.65 }
    };
}

export function addOrUpdateTransaction(item) {
    const allTransactions = getActiveTransactions();
    if (item.id !== undefined && item.id !== null) {
        // Update existing
        const index = allTransactions.findIndex(t => t.id == item.id);
        if (index !== -1) {
            allTransactions[index] = { ...allTransactions[index], ...item };
        }
    } else {
        // Add new
        const newId = allTransactions.length > 0 ? Math.max(...allTransactions.map(t => t.id)) + 1 : 0;
        item.id = newId;
        allTransactions.push(item);
    }
    state.appData.transactions[state.appData.activeAccountId] = allTransactions;
}

export function deleteTransaction(itemId) {
    let allTransactions = getActiveTransactions();
    allTransactions = allTransactions.filter(t => t.id !== itemId);
    state.appData.transactions[state.appData.activeAccountId] = allTransactions;
}

export function setTransactionsForActiveAccount(transactions) {
    if (!state.appData.transactions) {
        state.appData.transactions = {};
    }
    state.appData.transactions[state.appData.activeAccountId] = transactions;
}

export function setActiveAccountId(id) {
    state.appData.activeAccountId = id;
}

export function setUiState(key, value) {
    if (state.ui.hasOwnProperty(key)) {
        state.ui[key] = value;
    }
}