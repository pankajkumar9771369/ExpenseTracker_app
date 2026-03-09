import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/api';

export default function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await authApi.post('/auth/v1/login', {
                username: form.username,
                password: form.password,
            });
            localStorage.setItem('accessToken', data.accessToken || data.access_token || '');
            localStorage.setItem('refreshToken', data.token || '');
            localStorage.setItem('userId', data.userId || data.user_id || '');
            navigate('/dashboard');
        } catch (err) {
            setError(err?.response?.data?.message || err?.response?.data || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="logo-icon">💸</div>
                    <h1>ExpenseTracker</h1>
                    <p>Sign in to your account</p>
                </div>

                {error && <div className="alert alert-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            id="login-username"
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={onChange}
                            placeholder="Enter your username"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            id="login-password"
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={onChange}
                            placeholder="Enter your password"
                            required
                        />
                    </div>
                    <button id="login-submit" className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? <span className="spinner" /> : '🔐 Sign In'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account?{' '}
                    <Link to="/signup">Create one</Link>
                </div>
            </div>
        </div>
    );
}
