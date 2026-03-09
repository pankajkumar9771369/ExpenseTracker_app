import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    // ── Theme Management ──
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const logout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/dashboard" className="navbar-brand">
                    <div className="brand-icon">💸</div>
                    ExpenseTracker
                </Link>
                <div className="navbar-links">
                    <button className="nav-link" onClick={toggleTheme} title="Toggle Theme" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 8px' }}>
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
                    <Link to="/add-expense" className={isActive('/add-expense')}>Add Expense</Link>
                    <Link to="/ds-chat" className={isActive('/ds-chat')}>AI Chat</Link>
                    <button className="nav-logout" onClick={logout}>Logout</button>
                </div>
            </div>
        </nav>
    );
}
