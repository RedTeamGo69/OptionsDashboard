// calculations.js: Contains pure data processing functions.
import { getSettings } from './state.js';

export function formatCurrency(value) {
    const currency = getSettings().currency || '$';
    if (typeof value !== 'number' || isNaN(value)) return `${currency}0.00`;
    if (Math.abs(value) < 0.001) value = 0;
    if (Object.is(value, -0)) value = 0;
    
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'narrowSymbol'
    }).replace('$', currency);
}

export function getTradeCommissions(trade) {
    const { commissions, opening_commission, closing_commission, quantity, quantity_2, isExpired, ratio } = trade;
    
    if (opening_commission != null && closing_commission != null) {
        const totalQuantity = ratio ? quantity + quantity_2 : quantity;
        return (opening_commission + closing_commission) * totalQuantity;
    } else {
        if(isExpired) {
            return ratio ? (commissions * quantity) + (commissions * quantity_2) : (commissions * quantity);
        } else {
             return ratio ? (commissions * quantity * 2) + (commissions * quantity_2 * 2) : (commissions * quantity * 2);
        }
    }
}

export function calculateRawPnl(trade) {
    const multiplier = 100;
    if (trade.ratio) {
        let pnl1 = (trade.type === 'Long Ratio Spread' ? (trade.exit_price - trade.entry_price) : (trade.entry_price - trade.exit_price)) * trade.quantity * multiplier;
        let pnl2 = (trade.type === 'Long Ratio Spread' ? (trade.entry_price_2 - trade.exit_price_2) : (trade.exit_price_2 - trade.entry_price_2)) * trade.quantity_2 * multiplier;
        return pnl1 + pnl2;
    }
    const debitStrategies = ['Long Call', 'Long Put', 'Long Call Spread', 'Long Put Spread', 'Long Straddle', 'Long Strangle', 'Long Butterfly', 'Calendar Spread'];
    return debitStrategies.includes(trade.type) 
        ? (trade.exit_price - trade.entry_price) * trade.quantity * multiplier
        : (trade.entry_price - trade.exit_price) * trade.quantity * multiplier;
}

export function calculatePnl(trade) {
    return calculateRawPnl(trade) - getTradeCommissions(trade);
}
