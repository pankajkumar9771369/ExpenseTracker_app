import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };

function formatDate(ts) {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return ts; }
}

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

export default function PublicReport() {
    const { reportId } = useParams();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchReport = async () => {
            try {
                // Fetch directly to bypass auth interceptors
                const res = await fetch(`/public-api/${reportId}`);
                if (!res.ok) throw new Error('Report not found or link expired.');
                const data = await res.json();
                setExpenses(Array.isArray(data) ? data : []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [reportId]);

    const totals = expenses.reduce((acc, e) => {
        const cur = e.currency || 'USD';
        acc[cur] = (acc[cur] || 0) + parseFloat(e.amount || 0);
        return acc;
    }, {});

    if (loading) return (
        <div className="page-wrapper" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <h2 style={{ marginTop: 20 }}>Loading public report...</h2>
        </div>
    );

    if (error) return (
        <div className="page-wrapper" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-state">
                <div className="empty-icon">⚠️</div>
                <h2>Link Invalid or Expired</h2>
                <p>This shared report link is no longer valid.</p>
                <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Go to Homepage</Link>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="auth-nav" style={{ justifyContent: 'center', padding: '24px 0' }}>
                <div className="logo-section">
                    <div className="logo-icon">✨</div>
                    <div className="logo-text">ExpenseTracker <span>Shared Report</span></div>
                </div>
            </div>

            <div className="main-content" style={{ maxWidth: 800, margin: '0 auto' }}>
                <div className="section-header" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
                    <h1>Monthly Expense Summary</h1>
                    <p style={{ color: 'var(--muted)', marginTop: 8 }}>This is a read-only view of shared expenses.</p>
                </div>

                <div className="stats-row" style={{ justifyContent: 'center' }}>
                    <div className="stat-card" style={{ flex: '0 1 200px' }}>
                        <div className="stat-icon">🧾</div>
                        <div className="stat-label">Total Transactions</div>
                        <div className="stat-value">{expenses.length}</div>
                    </div>
                    {Object.entries(totals).map(([cur, total]) => (
                        <div className="stat-card" style={{ flex: '0 1 200px' }} key={cur}>
                            <div className="stat-icon">{CURRENCY_SYMBOLS[cur] || cur}</div>
                            <div className="stat-label">Total Spent ({cur})</div>
                            <div className="stat-value">{(CURRENCY_SYMBOLS[cur] || '') + total.toFixed(2)}</div>
                        </div>
                    ))}
                </div>

                <div className="expense-grid" style={{ marginTop: 40 }}>
                    {expenses.map((exp, i) => (
                        <div className="expense-card" key={i}>
                            <div className="expense-icon">{getMerchantIcon(exp.merchant)}</div>
                            <div className="expense-details">
                                <div className="expense-merchant">{exp.merchant || 'Unknown'}</div>
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

                {expenses.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">💸</div>
                        <h3>No expenses to show here!</h3>
                    </div>
                )}
            </div>
        </div>
    );
}
