import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/api';

export default function Signup() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        username: '', password: '', first_name: '', last_name: '',
        email: '', phone_number: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setLoading(true);
        try {
            const payload = {
                username: form.username,
                password: form.password,
                firstName: form.first_name,
                lastName: form.last_name,
                email: form.email,
                phoneNumber: form.phone_number ? Number(form.phone_number) : undefined,
            };
            const { data } = await authApi.post('/auth/v1/signup', payload);
            localStorage.setItem('accessToken', data.accessToken || data.access_token || '');
            localStorage.setItem('refreshToken', data.token || '');
            localStorage.setItem('userId', data.userId || data.user_id || '');
            setSuccess('Account created! Redirecting…');
            setTimeout(() => navigate('/dashboard'), 1200);
        } catch (err) {
            const msg = err?.response?.data;
            setError(typeof msg === 'string' ? msg : 'Signup failed. Username may already exist.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: 500 }}>
                <div className="auth-logo">
                    <div className="logo-icon">✨</div>
                    <h1>Create Account</h1>
                    <p>Join ExpenseTracker today</p>
                </div>

                {error && <div className="alert alert-error">⚠️ {error}</div>}
                {success && <div className="alert alert-success">✅ {success}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>First Name</label>
                            <input id="signup-firstname" type="text" name="first_name" value={form.first_name} onChange={onChange} placeholder="John" required />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input id="signup-lastname" type="text" name="last_name" value={form.last_name} onChange={onChange} placeholder="Doe" required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Username</label>
                        <input id="signup-username" type="text" name="username" value={form.username} onChange={onChange} placeholder="johndoe" required autoFocus />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input id="signup-password" type="password" name="password" value={form.password} onChange={onChange} placeholder="Min. 8 characters" required />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input id="signup-email" type="email" name="email" value={form.email} onChange={onChange} placeholder="john@example.com" required />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input id="signup-phone" type="tel" name="phone_number" value={form.phone_number} onChange={onChange} placeholder="9876543210" />
                    </div>
                    <button id="signup-submit" className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? <span className="spinner" /> : '🚀 Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
