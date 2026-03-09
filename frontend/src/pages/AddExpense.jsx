import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { expenseApi } from '../api/api';

const CURRENCIES = ['USD', 'EUR', 'INR', 'GBP', 'AUD', 'CAD', 'JPY'];

export default function AddExpense() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ amount: '', merchant: '', currency: 'USD' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setLoading(true);
        try {
            await expenseApi.post('/expense/v1/addExpense', {
                amount: parseFloat(form.amount),
                merchant: form.merchant,
                currency: form.currency,
            });
            setSuccess('Expense added successfully! Redirecting…');
            setTimeout(() => navigate('/dashboard'), 1200);
        } catch (err) {
            if (err?.response?.status === 401) { localStorage.clear(); navigate('/login'); return; }
            setError('Failed to add expense. Please check your inputs and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="main-content">
                <div className="form-page">
                    <div className="form-card">
                        <h2>💳 Add Expense</h2>
                        <p>Log a new expense to your account</p>

                        {error && <div className="alert alert-error">⚠️ {error}</div>}
                        {success && <div className="alert alert-success">✅ {success}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Merchant / Description</label>
                                <input
                                    id="expense-merchant"
                                    type="text"
                                    name="merchant"
                                    value={form.merchant}
                                    onChange={onChange}
                                    placeholder="e.g. Starbucks, Amazon, Netflix"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Amount</label>
                                    <input
                                        id="expense-amount"
                                        type="number"
                                        name="amount"
                                        value={form.amount}
                                        onChange={onChange}
                                        placeholder="0.00"
                                        min="0.01"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Currency</label>
                                    <select id="expense-currency" name="currency" value={form.currency} onChange={onChange}>
                                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    id="expense-cancel"
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => navigate('/dashboard')}
                                >
                                    Cancel
                                </button>
                                <button id="expense-submit" type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? <span className="spinner" /> : '💾 Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
