// ui.js: This file handles all DOM manipulation and rendering.

import { getActiveTransactions, getActiveAccount, getUiState, getSettings, getAppData } from './state.js';
import { formatCurrency, calculateRawPnl, getTradeCommissions } from './calculations.js';
import { createOrUpdateChart, destroyAllCharts } from './charts.js';

// This is a dictionary to hold all our DOM elements so we don't have to keep looking them up.
const elements = {};

// This function finds all the elements we need and stores them in the `elements` object.
export function cacheElements() {
    const ids = [
        'kpi-total-pnl', 'kpi-win-rate', 'kpi-avg-roc', 'kpi-total-trades',
        'total-account-value', 'total-deposits', 'total-withdrawals',
        'recent-trades-body', 'pagination-controls', 'activity-log-footer',
        'account-switcher', 'performance-stats-title', 'stats-avg-win', 'stats-avg-loss',
        'stats-largest-win', 'stats-largest-loss', 'stats-profit-factor', 'stats-expectancy',
        'stats-max-drawdown', 'stats-avg-hold', 'stats-win-streak', 'stats-loss-streak',
        'stats-total-comm', 'main-view-title', 'calendar-controls-wrapper',
        'calendar-view', 'strategy-view', 'analytics-view', 'calendar-grid',
        'calendar-period-label', 'calendar-summary', 'chart-filter-display',
        'equity-curve-filter-select'
    ];
    ids.forEach(id => elements[id] = document.getElementById(id));
}

// The main function that updates the entire dashboard.
export function renderDashboard() {
    const allTransactions = getActiveTransactions();
    const trades = allTransactions.filter(t => t.transaction_type === 'trade');
    
    // Filter trades based on the selected date range for charts and stats
    const { filteredTrades, dateRangeText } = filterTradesByDate(trades);

    renderAccountSwitcher();
    renderAccountValue(allTransactions, trades);
    renderKpis(filteredTrades);
    renderPerformanceStats(filteredTrades, dateRangeText);
    destroyAllCharts();
    renderPnlCurve(allTransactions, trades); // PnL curve always uses all trades for context
    renderAnalyticsCharts(filteredTrades, dateRangeText);
    renderMainView(filteredTrades, dateRangeText);
    renderActivityLog(allTransactions);
}

function filterTradesByDate(trades) {
    const { equityTimeFilter, dateMode } = getUiState();
    const now = dateMode === 'live' ? window.dayjs() : (trades.length > 0 ? window.dayjs(Math.max(...trades.map(t => window.dayjs(t.close)))) : window.dayjs());
    let startDate, endDate;
    let dateRangeText = "All Time";

    switch (equityTimeFilter) {
        case 'ytd':
            startDate = now.startOf('year');
            endDate = now.endOf('day');
            dateRangeText = "Year to Date";
            break;
        // Add other cases: 'qtd', 'mtd', 'this-week', 'today', 'custom'
        // ...
        default:
            return { filteredTrades: trades, dateRangeText };
    }

    const filteredTrades = trades.filter(t => {
        const closeDate = window.dayjs(t.close);
        return !closeDate.isBefore(startDate, 'day') && !closeDate.isAfter(endDate, 'day');
    });

    return { filteredTrades, dateRangeText };
}

function calculateKpis(tradeList) {
    const hasTrades = tradeList.length > 0;
    const totalPnl = hasTrades ? tradeList.reduce((acc, trade) => acc + trade.pnl, 0) : 0;
    const winningTrades = hasTrades ? tradeList.filter(trade => trade.pnl > 0) : [];
    const winRate = hasTrades ? (winningTrades.length / tradeList.length) * 100 : 0;
    const rocTrades = tradeList.filter(t => t.max_risk > 0);
    const avgRoc = rocTrades.length > 0 ? (rocTrades.reduce((acc, t) => acc + (calculateRawPnl(t) / t.max_risk), 0) / rocTrades.length) * 100 : 0;
    return { totalPnl, winRate, avgRoc, tradeCount: tradeList.length };
};

function renderKpis(trades) {
    const { totalPnl, winRate, avgRoc, tradeCount } = calculateKpis(trades);
    if (!elements.kpi_total_pnl) return;
    elements.kpi_total_pnl.textContent = formatCurrency(totalPnl);
    elements.kpi_total_pnl.className = `text-3xl font-bold mt-1 ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`;
    elements.kpi_win_rate.textContent = `${winRate.toFixed(1)}%`;
    elements.kpi_avg_roc.textContent = `${avgRoc.toFixed(1)}%`;
    elements.kpi_total_trades.textContent = tradeCount;
}

function renderAccountValue(allTransactions, trades) {
    if (!elements.total_account_value) return;
    const totalDeposits = allTransactions.filter(t => t.transaction_type === 'deposit').reduce((acc, t) => acc + t.amount, 0);
    const totalWithdrawals = allTransactions.filter(t => t.transaction_type === 'withdrawal').reduce((acc, t) => acc + t.amount, 0);
    const totalPnl = trades.reduce((acc, t) => acc + t.pnl, 0);
    elements.total_account_value.textContent = formatCurrency(totalDeposits - totalWithdrawals + totalPnl);
    elements.total_deposits.textContent = formatCurrency(totalDeposits);
    elements.total_withdrawals.textContent = formatCurrency(totalWithdrawals);
}


function renderPerformanceStats(trades, dateRangeText) {
    if (!elements.performance_stats_title) return;
    elements.performance_stats_title.textContent = `Performance Stats (${dateRangeText})`;
    // ... rest of the performance stats calculation and rendering logic from your original file
}

function renderPnlCurve(allTransactions, trades) {
    const sortedTrades = [...trades].sort((a,b) => new Date(a.close) - new Date(b.close));
    let runningPnl = 0;
    const pnlData = sortedTrades.map(trade => {
        runningPnl += trade.pnl;
        return runningPnl;
    });
    const pnlLabels = sortedTrades.map(t => window.dayjs(t.close).format('MM/DD/YY'));

    createOrUpdateChart('pnlCurveChart', 'pnlCurveChart', {
        type: 'line',
        data: {
            labels: ['Start', ...pnlLabels],
            datasets: [{
                label: 'Cumulative P&L',
                data: [0, ...pnlData],
                // ... all the styling from your original file
            }]
        },
        options: { /* ... options from original file ... */ }
    });
}

function renderAnalyticsCharts(trades, dateRangeText) {
    // P&L by Ticker
    const pnlByTicker = trades.reduce((acc, trade) => {
        if (!acc[trade.ticker]) acc[trade.ticker] = 0;
        acc[trade.ticker] += trade.pnl;
        return acc;
    }, {});
    
    createOrUpdateChart('pnlByTickerChart', 'pnlByTickerChart', {
        type: 'bar',
        data: {
            labels: Object.keys(pnlByTicker),
            datasets: [{ label: 'Total P&L', data: Object.values(pnlByTicker), backgroundColor: Object.values(pnlByTicker).map(pnl => pnl >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)') }]
        },
        options: { /* ... options ... */ }
    });
    // ... render other analytics charts
}

function renderMainView(trades, dateRangeText) {
    const { mainView } = getUiState();
    if (!elements.main_view_title) return;

    elements.calendar_view.classList.add('hidden');
    elements.strategy_view.classList.add('hidden');
    elements.analytics_view.classList.add('hidden');
    elements.calendar_controls_wrapper.classList.add('hidden');

    if (mainView === 'calendar') {
        elements.calendar_view.classList.remove('hidden');
        elements.main_view_title.textContent = 'Trading Calendar';
        elements.calendar_controls_wrapper.classList.remove('hidden');
        renderCalendar(trades);
    } else if (mainView === 'strategy') {
        elements.strategy_view.classList.remove('hidden');
        elements.main_view_title.textContent = `P&L by Strategy (${dateRangeText})`;
        renderStrategyChart(trades);
    } else if (mainView === 'analytics') {
        elements.analytics_view.classList.remove('hidden');
        elements.main_view_title.textContent = `Advanced Analytics (${dateRangeText})`;
    }
}

function renderStrategyChart(trades) {
    const strategyPnl = trades.reduce((acc, trade) => {
        if (!acc[trade.type]) acc[trade.type] = 0;
        acc[trade.type] += trade.pnl;
        return acc;
    }, {});
    
    createOrUpdateChart('pnlByStrategyChart', 'pnlByStrategyChart', {
        type: 'bar',
        data: {
            labels: Object.keys(strategyPnl),
            datasets: [{ label: 'Total P&L', data: Object.values(strategyPnl), backgroundColor: Object.values(strategyPnl).map(pnl => pnl >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)') }]
        },
        options: { /* ... options ... */ }
    });
}

function renderCalendar(trades) {
    // ... The full calendar rendering logic from your original file goes here
}

function renderActivityLog(allTransactions) {
    if (!elements.recent_trades_body) return;
    const { currentPage, itemsPerPage, tradeTableFilter, logSearchFilter, sortBy, sortDirection } = getUiState();

    let filteredActivity = allTransactions;
    // ... Apply all filtering and sorting logic from original file here ...

    const paginatedActivity = filteredActivity.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    
    elements.recent_trades_body.innerHTML = '';
    paginatedActivity.forEach(item => {
        const row = document.createElement('tr');
        // ... build the innerHTML for each row ...
        elements.recent_trades_body.appendChild(row);
    });

    // ... render footer and pagination controls ...
}

function renderAccountSwitcher() {
    const appData = getAppData();
    if (!appData.accounts) return;
    elements.account_switcher.innerHTML = '';
    appData.accounts.forEach(account => {
        const isActive = account.id === appData.activeAccountId;
        const button = document.createElement('button');
        button.textContent = account.name;
        button.dataset.id = account.id;
        button.className = `account-switch-btn py-2 px-4 rounded-lg text-sm font-semibold transition ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`;
        elements.account_switcher.appendChild(button);
    });
}
