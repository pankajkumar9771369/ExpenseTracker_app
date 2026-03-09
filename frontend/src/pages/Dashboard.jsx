import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ExpenseCharts from '../components/ExpenseCharts';
import BudgetModal, { useBudgetAlert } from '../components/BudgetModal';
import { exportCSV, exportPDF } from '../utils/exportUtils';
import { expenseApi } from '../api/api';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };

function getMerchantIcon(merchant = '') {
    const m = merchant.toLowerCase();
    if (m.includes('starbucks') || m.includes('coffee') || m.includes('cafe')) return '☕';
    if (m.includes('amazon') || m.includes('flipkart')) return '📦';
    if (m.includes('uber') || m.includes('ola') || m.includes('lyft')) return '🚗';
    if (m.includes('swiggy') || m.includes('zomato') || m.includes('food')) return '🍔';
    if (m.includes('netflix') || m.includes('spotify') || m.includes('prime')) return '🎬';
    if (m.includes('flight') || m.includes('airline') || m.includes('air')) return '✈️';
    return '🛍️';
}

function formatDate(ts) {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return ts; }
}

function groupByMonth(expenses) {
    const map = {};
    expenses.forEach((e) => {
        const d = new Date(e.createdAt || e.created_at || Date.now());
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        const cur = e.currency || 'USD';
        if (!map[label]) map[label] = { label, totals: {}, count: 0 };
        map[label].totals[cur] = (map[label].totals[cur] || 0) + parseFloat(e.amount || 0);
        map[label].count++;
    });
    return Object.values(map).sort((a, b) => {
        const parse = (l) => new Date('1 ' + l);
        return parse(b.label) - parse(a.label);
    });
}

const TABS = [
    { id: 'all', label: '🧾 All' },
    { id: 'monthly', label: '📅 Monthly' },
    { id: 'charts', label: '📊 Charts' },
];

export default function Dashboard() {
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState('all');
    const [showBudget, setShowBudget] = useState(false);

    const fetchExpenses = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const { data } = await expenseApi.get('/expense/v1/getExpense');
            setExpenses(Array.isArray(data) ? data : []);
        } catch (err) {
            if (err?.response?.status === 401) { localStorage.clear(); navigate('/login'); return; }
            setError('Could not fetch expenses. Make sure the Expense Service is running.');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    // establishing Server-Sent Events (SSE) connection for Real-Time Live Budget Alerts via Kafka
    useEffect(() => {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const eventSource = new EventSource(`/expense/v1/stream?userId=${userId}`);

        eventSource.addEventListener('new_expense', (event) => {
            try {
                const newExp = JSON.parse(event.data);
                setExpenses(prev => {
                    // prevent duplicate adding if same ID
                    if (prev.some(e => e.externalId === newExp.externalId || e.external_id === newExp.external_id)) return prev;
                    return [newExp, ...prev];
                });
            } catch (err) {
                console.error("Error parsing live expense event:", err);
            }
        });

        eventSource.addEventListener('init', () => console.log('SSE Connected to DS-Service / Expense-Service'));

        eventSource.onerror = (err) => {
            console.error('SSE Error:', err);
            eventSource.close(); // let it be handled manually if needed or let browser retry based on implementation
        };

        return () => eventSource.close();
    }, []);

    // ── MULTI-CURRENCY CONVERSION ─────────────────────────────────
    const [baseCurrency, setBaseCurrency] = useState('ORIGINAL');
    const [rates, setRates] = useState(null);

    useEffect(() => {
        fetch('https://api.frankfurter.app/latest?from=USD')
            .then(res => res.json())
            .then(data => {
                setRates({ ...data.rates, USD: 1 });
            })
            .catch(err => console.error("FX Rates Error", err));
    }, []);

    const convertedExpenses = useMemo(() => {
        if (baseCurrency === 'ORIGINAL' || !rates) return expenses;
        return expenses.map(e => {
            const sourceCur = e.currency || 'USD';
            if (sourceCur === baseCurrency) return e;

            const sourceRate = rates[sourceCur];
            const targetRate = rates[baseCurrency];

            if (!sourceRate || !targetRate) return e;

            const inUsd = (parseFloat(e.amount) || 0) / sourceRate;
            const convertedAmt = inUsd * targetRate;

            return {
                ...e,
                amount: convertedAmt,
                currency: baseCurrency,
                original_amount: e.amount,
                original_currency: e.currency
            };
        });
    }, [expenses, baseCurrency, rates]);

    // Compute stats from converted expenses
    const totals = convertedExpenses.reduce((acc, e) => {
        const cur = e.currency || 'USD';
        acc[cur] = (acc[cur] || 0) + parseFloat(e.amount || 0);
        return acc;
    }, {});

    const monthlyGroups = groupByMonth(convertedExpenses);

    // Calculate current month's totals to trigger budget alerts
    const currentMonthLabel = new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const currentMonthGroup = monthlyGroups.find(g => g.label === currentMonthLabel);
    const currentMonthTotals = currentMonthGroup ? currentMonthGroup.totals : {};

    // Get active budget alerts
    const alerts = useBudgetAlert(currentMonthTotals);

    // Auto-detect recurring subscriptions (de-duplicated by merchant)
    const recurringExpenses = convertedExpenses.filter(e => e.is_recurring || e.isRecurring);
    const uniqueSubs = {};
    recurringExpenses.forEach(e => {
        const m = e.merchant?.toLowerCase() || 'unknown';
        if (!uniqueSubs[m] || new Date(e.createdAt) > new Date(uniqueSubs[m].createdAt)) {
            uniqueSubs[m] = e;
        }
    });
    const subscriptions = Object.values(uniqueSubs);
    const subTotal = subscriptions.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const shareReport = async () => {
        try {
            const { data: uuid } = await expenseApi.post(`/expense/v1/share?monthYear=All`);
            const url = `${window.location.origin}/shared/${uuid}`;
            await navigator.clipboard.writeText(url);
            alert(`✅ Shareable link copied to clipboard!\n\n${url}\n\n(This link expires in 7 days)`);
        } catch (err) {
            alert('Failed to generate share link.');
        }
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="main-content">

                {/* ── Stats Bar ── */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon">🧾</div>
                        <div className="stat-label">Total Expenses</div>
                        <div className="stat-value">{convertedExpenses.length}</div>
                    </div>
                    {Object.entries(totals).map(([cur, total]) => (
                        <div className="stat-card" key={cur}>
                            <div className="stat-icon">{CURRENCY_SYMBOLS[cur] || cur}</div>
                            <div className="stat-label">All-Time ({cur})</div>
                            <div className="stat-value">{(CURRENCY_SYMBOLS[cur] || '') + total.toFixed(2)}</div>
                        </div>
                    ))}
                </div>

                {/* ── Budget Alerts Banner ── */}
                {alerts.map((a, i) => (
                    <div key={i} className={`alert alert-${a.level} ${a.level === 'danger' ? 'pulse' : ''}`}>
                        <strong>{a.level === 'danger' ? 'Budget Exceeded' : 'Budget Warning'} ({a.cur}):</strong> You have spent {Number(a.pct.toFixed(1))}% of your {a.limit.toLocaleString('en-IN')} {a.cur} limit this month.
                    </div>
                ))}

                {/* ── Recurring Subscriptions Forecast ── */}
                {subscriptions.length > 0 && (
                    <div className="subscriptions-panel" style={{ background: 'var(--surface)', padding: '16px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 24 }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: 'var(--text)' }}>🔄 Upcoming Subscriptions</h3>
                        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                            {subscriptions.map((sub, i) => (
                                <div key={i} style={{ minWidth: 120, background: 'var(--surface-2)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                                    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{getMerchantIcon(sub.merchant)}</div>
                                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.merchant}</div>
                                    <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{(CURRENCY_SYMBOLS[sub.currency] || '') + parseFloat(sub.amount || 0).toFixed(2)} / mo</div>
                                </div>
                            ))}
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 140, padding: '0 16px', borderLeft: '2px dashed var(--border)' }}>
                                <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Fixed Monthly Cost</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent)' }}>{(CURRENCY_SYMBOLS[baseCurrency === 'ORIGINAL' ? 'USD' : baseCurrency] || '') + subTotal.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tab Bar + Actions ── */}
                <div className="section-header">
                    <div className="view-tabs">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                id={`tab-${t.id}`}
                                className={`tab-btn ${view === t.id ? 'active' : ''}`}
                                onClick={() => setView(t.id)}
                            >{t.label}</button>
                        ))}
                    </div>
                    <div className="action-buttons">
                        <select
                            className="btn btn-secondary"
                            style={{ backgroundColor: 'var(--surface)', padding: '6px 14px' }}
                            value={baseCurrency}
                            onChange={(e) => setBaseCurrency(e.target.value)}
                            title="Convert all expenses to a specific currency"
                        >
                            <option value="ORIGINAL">🌎 Original Currencies</option>
                            <option value="USD">🇺🇸 USD</option>
                            <option value="EUR">🇪🇺 EUR</option>
                            <option value="INR">🇮🇳 INR</option>
                            <option value="GBP">🇬🇧 GBP</option>
                        </select>
                        <button className="btn btn-secondary" onClick={() => exportCSV(convertedExpenses)}>↓ CSV</button>
                        <button className="btn btn-secondary" onClick={() => exportPDF(convertedExpenses)}>↓ PDF</button>
                        <button className="btn btn-secondary" onClick={() => setShowBudget(true)}>⚙️ Budget</button>
                        <button className="btn btn-secondary" onClick={shareReport}>🔗 Share</button>
                        <button id="btn-ai-chat" className="btn btn-secondary" onClick={() => navigate('/ds-chat')}>🤖 Ask AI</button>
                        <button id="btn-add-expense" className="btn btn-primary" onClick={() => navigate('/add-expense')}>+ Add</button>
                    </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {loading ? (
                    <div className="loading-page">
                        <div className="spinner" />
                        <p>Loading expenses…</p>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">💸</div>
                        <h3>No expenses yet!</h3>
                        <p>Add your first expense or chat with AI to log one naturally.</p>
                    </div>
                ) : view === 'charts' ? (
                    /* ── Charts View ── */
                    <ExpenseCharts expenses={convertedExpenses} />

                ) : view === 'all' ? (
                    /* ── All Expenses Grid ── */
                    <div className="expense-grid">
                        {convertedExpenses.map((exp, i) => (
                            <div className="expense-card" key={exp.externalId || exp.external_id || i}>
                                <div className="expense-icon">{getMerchantIcon(exp.merchant)}</div>
                                <div className="expense-details">
                                    <div className="expense-merchant">{exp.merchant || 'Unknown Merchant'}</div>
                                    <div className="expense-date">{formatDate(exp.createdAt || exp.created_at)}</div>
                                </div>
                                <div className="expense-amount">
                                    <div className="amount">
                                        {(CURRENCY_SYMBOLS[exp.currency] || '') + parseFloat(exp.amount || 0).toFixed(2)}
                                    </div>
                                    <div className="currency">{exp.currency || '—'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ── Monthly Breakdown ── */
                    <div className="monthly-list">
                        {monthlyGroups.map((group) => (
                            <div className="month-group" key={group.label}>
                                <div className="month-header">
                                    <span className="month-label">📅 {group.label}</span>
                                    <span className="month-count">{group.count} expense{group.count !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="month-totals">
                                    {Object.entries(group.totals).map(([cur, amt]) => (
                                        <div className="month-total-pill" key={cur}>
                                            <span className="month-cur">{cur}</span>
                                            <span className="month-amt">{(CURRENCY_SYMBOLS[cur] || '') + amt.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="month-bar-track">
                                    {(() => {
                                        const maxAmt = Math.max(...monthlyGroups.map(g => Object.values(g.totals).reduce((a, b) => a + b, 0)));
                                        const totalAmt = Object.values(group.totals).reduce((a, b) => a + b, 0);
                                        const pct = maxAmt > 0 ? (totalAmt / maxAmt) * 100 : 0;
                                        return <div className="month-bar" style={{ width: `${pct}%` }} />;
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {showBudget && <BudgetModal onClose={() => setShowBudget(false)} />}
        </div>
    );
}
