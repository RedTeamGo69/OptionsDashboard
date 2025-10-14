// ui.js: Handles all DOM manipulation and component rendering.
import { getActiveTransactions, getActiveAccount, getUiState, getSettings } from './state.js';
import { formatCurrency, getTradeCommissions, calculateRawPnl } from './calculations.js';
import { createOrUpdateChart, destroyAllCharts } from './charts.js';

// Store DOM element references so we don't have to query them repeatedly
const elements = {};

function cacheElements() {
    const ids = [
        'kpi-total-pnl', 'kpi-win-rate', 'kpi-total-trades', 'total-account-value',
        'total-deposits', 'total-withdrawals', 'recent-trades-body', 'pagination-controls',
        'activity-log-footer'
    ];
    ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });
}

// --- MAIN RENDER FUNCTION ---
export function renderDashboard() {
    // Cache elements on first render
    if (!elements.kpi_total_pnl) {
        cacheElements();
    }

    const allTransactions = getActiveTransactions();
    const trades = allTransactions.filter(t => t.transaction_type === 'trade');
    
    renderKpis(trades);
    renderAccountValue(allTransactions, trades);
    destroyAllCharts(); // Clear old charts before rendering new ones
    renderPnlCurve(trades);
    renderAnalyticsCharts(trades);
    renderActivityLog(allTransactions);
}

function renderKpis(trades) {
    const totalPnl = trades.reduce((acc, trade) => acc + trade.pnl, 0);
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    
    elements.kpi_total_pnl.textContent = formatCurrency(totalPnl);
    elements.kpi_total_pnl.className = `text-3xl font-bold mt-1 ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`;
    elements.kpi_win_rate.textContent = `${winRate.toFixed(1)}%`;
    elements.kpi_total_trades.textContent = trades.length;
}

function renderAccountValue(allTransactions, trades) {
    const totalDeposits = allTransactions.filter(t => t.transaction_type === 'deposit').reduce((acc, t) => acc + t.amount, 0);
    const totalWithdrawals = allTransactions.filter(t => t.transaction_type === 'withdrawal').reduce((acc, t) => acc + t.amount, 0);
    const totalPnl = trades.reduce((acc, trade) => acc + trade.pnl, 0);
    const totalAccountValue = totalDeposits - totalWithdrawals + totalPnl;
    
    elements.total_account_value.textContent = formatCurrency(totalAccountValue);
    elements.total_deposits.textContent = formatCurrency(totalDeposits);
    elements.total_withdrawals.textContent = formatCurrency(totalWithdrawals);
}

function renderPnlCurve(trades) {
    const sortedTrades = [...trades].sort((a, b) => new Date(a.close) - new Date(b.close));
    let runningPnl = 0;
    const pnlData = sortedTrades.map(trade => {
        runningPnl += trade.pnl;
        return runningPnl;
    });
    const pnlLabels = sortedTrades.map(t => dayjs(t.close).format('MM/DD/YY'));

    createOrUpdateChart('pnlCurve', 'pnlCurveChart', {
        type: 'line',
        data: {
            labels: ['Start', ...pnlLabels],
            datasets: [{
                label: 'Cumulative P&L',
                data: [0, ...pnlData],
                fill: {
                    target: 'origin',
                    above: 'rgba(74, 222, 128, 0.2)',
                    below: 'rgba(248, 113, 113, 0.2)'
                },
                borderColor: '#a78bfa',
                tension: 0.3,
                pointBackgroundColor: '#a78bfa',
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(75, 85, 99, 0.5)' } },
                x: { ticks: { color: '#9ca3af' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderAnalyticsCharts(trades) {
    // P&L by Ticker
    const pnlByTicker = trades.reduce((acc, trade) => {
        if (!acc[trade.ticker]) acc[trade.ticker] = 0;
        acc[trade.ticker] += trade.pnl;
        return acc;
    }, {});

    createOrUpdateChart('pnlByTicker', 'pnlByTickerChart', {
        type: 'bar',
        data: {
            labels: Object.keys(pnlByTicker),
            datasets: [{
                label: 'Total P&L',
                data: Object.values(pnlByTicker),
                backgroundColor: Object.values(pnlByTicker).map(pnl => pnl >= 0 ? 'rgba(74, 222, 128, 0.7)' : 'rgba(248, 113, 113, 0.7)')
            }]
        },
        options: {
            indexAxis: 'y',
            maintainAspectRatio: false,
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });

    // Add other analytics charts here in the same way...
}

function renderActivityLog(allTransactions) {
    const { currentPage, itemsPerPage, tradeTableFilter, logSearchFilter } = getUiState();
    
    // NOTE: A more complete version would also apply search and sort filters here
    let filteredActivity = allTransactions;
    switch(tradeTableFilter) {
        case 'trades': filteredActivity = allTransactions.filter(t => t.transaction_type === 'trade'); break;
        case 'winners': filteredActivity = allTransactions.filter(t => t.transaction_type === 'trade' && t.pnl > 0); break;
        case 'losers': filteredActivity = allTransactions.filter(t => t.transaction_type === 'trade' && t.pnl <= 0); break;
        // ... add other filters
    }

    const totalPages = Math.ceil(filteredActivity.length / itemsPerPage);
    const paginatedActivity = filteredActivity.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    elements.recent_trades_body.innerHTML = '';
    paginatedActivity.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700 hover:bg-gray-700/50 text-sm';
        row.dataset.id = item.id;

        let date, type, description, amount, amountColor, duration = 'N/A', roc = 'N/A';
        
        if (item.transaction_type === 'trade') {
            date = dayjs(item.close).format('YYYY-MM-DD');
            type = 'Trade';
            description = `${item.ticker} ${item.type}`;
            amount = item.pnl;
            amountColor = item.pnl >= 0 ? 'text-green-400' : 'text-red-400';
            duration = dayjs(item.close).diff(dayjs(item.open), 'day') + 'd';
            if (item.max_risk > 0) {
                roc = `${((calculateRawPnl(item) / item.max_risk) * 100).toFixed(1)}%`;
            }
        } else {
            date = dayjs(item.date).format('YYYY-MM-DD');
            type = item.transaction_type.charAt(0).toUpperCase() + item.transaction_type.slice(1);
            description = item.notes || type;
            amount = item.transaction_type === 'deposit' ? item.amount : -item.amount;
            amountColor = item.transaction_type === 'deposit' ? 'text-blue-400' : 'text-orange-400';
        }

        row.innerHTML = `
            <td class="p-3 text-gray-400">${date}</td>
            <td class="p-3 font-semibold">${type}</td>
            <td class="p-3 text-gray-400">${description}</td>
            <td class="p-3 text-gray-400 text-right">${duration}</td>
            <td class="p-3 text-right font-mono ${amountColor}">${formatCurrency(amount)}</td>
            <td class="p-3 text-right font-mono ${amountColor}">${roc}</td>
            <td class="p-3 text-right">
                <button class="edit-btn p-1 text-gray-400 hover:text-white" data-id="${item.id}">✏️</button>
                <button class="delete-btn p-1 text-gray-400 hover:text-red-500" data-id="${item.id}">🗑️</button>
            </td>
        `;
        elements.recent_trades_body.appendChild(row);
    });
}