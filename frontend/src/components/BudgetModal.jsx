import { useState, useEffect } from 'react';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const SYMBOLS = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };

function getBudgets() {
    try { return JSON.parse(localStorage.getItem('budgets') || '{}'); } catch { return {}; }
}
function saveBudgets(b) { localStorage.setItem('budgets', JSON.stringify(b)); }

export function useBudgetAlert(totals) {
    const budgets = getBudgets();
    const alerts = [];
    Object.entries(totals).forEach(([cur, spent]) => {
        const limit = parseFloat(budgets[cur] || 0);
        if (!limit) return;
        const pct = (spent / limit) * 100;
        if (pct >= 100) alerts.push({ cur, spent, limit, pct, level: 'danger' });
        else if (pct >= 80) alerts.push({ cur, spent, limit, pct, level: 'warn' });
    });
    return alerts;
}

export default function BudgetModal({ onClose }) {
    const [budgets, setBudgets] = useState(getBudgets());

    function handleChange(cur, val) {
        setBudgets(prev => ({ ...prev, [cur]: val }));
    }

    function handleSave() {
        saveBudgets(budgets);
        onClose();
    }

    function handleRemove(cur) {
        const next = { ...budgets };
        delete next[cur];
        setBudgets(next);
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">💰 Monthly Budget Limits</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <p className="modal-desc">Set spending limits per currency. You'll be alerted at 80% and 100%.</p>

                <div className="budget-rows">
                    {CURRENCIES.map(cur => (
                        <div className="budget-row" key={cur}>
                            <label className="budget-label">
                                <span className="budget-sym">{SYMBOLS[cur]}</span>
                                <span className="budget-cur">{cur}</span>
                            </label>
                            <input
                                id={`budget-${cur}`}
                                type="number"
                                min="0"
                                className="budget-input"
                                placeholder="No limit"
                                value={budgets[cur] || ''}
                                onChange={e => handleChange(cur, e.target.value)}
                            />
                            {budgets[cur] && (
                                <button className="budget-clear" title="Remove limit" onClick={() => handleRemove(cur)}>✕</button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button id="btn-save-budget" className="btn btn-primary" onClick={handleSave}>Save Limits</button>
                </div>
            </div>
        </div>
    );
}
