import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend, Cell,
} from 'recharts';

const ACCENT = '#6c63ff';
const ACCENT_2 = '#a78bfa';
const SURFACE_2 = '#1a2035';
const MUTED = '#8892b0';
const TEXT = '#e8eaf6';
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const CUR_COLORS = { INR: '#a78bfa', USD: '#22c55e', EUR: '#38bdf8', GBP: '#f59e0b' };

// ── helpers ──────────────────────────────────────────────────

function parseAmt(e) { return parseFloat(e.amount || 0); }

function monthKey(ts) {
    const d = new Date(ts || Date.now());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
    const [y, m] = key.split('-');
    return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function yearKey(ts) { return String(new Date(ts || Date.now()).getFullYear()); }

// Build last-N months of data, one bar per currency
function buildMonthly(expenses, months = 12) {
    // Generate last N month keys
    const keys = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        keys.push(monthKey(d));
    }

    // Accumulate
    const map = {};
    keys.forEach(k => { map[k] = { month: monthLabel(k) }; });
    expenses.forEach(e => {
        const k = monthKey(e.createdAt || e.created_at);
        if (map[k]) {
            const cur = e.currency || 'USD';
            map[k][cur] = (map[k][cur] || 0) + parseAmt(e);
        }
    });
    return keys.map(k => map[k]);
}

// Build yearly data
function buildYearly(expenses) {
    const map = {};
    expenses.forEach(e => {
        const k = yearKey(e.createdAt || e.created_at);
        const cur = e.currency || 'USD';
        if (!map[k]) map[k] = { year: k };
        map[k][cur] = (map[k][cur] || 0) + parseAmt(e);
    });
    return Object.values(map).sort((a, b) => a.year.localeCompare(b.year));
}

// Detect which currencies are actually used
function usedCurrencies(expenses) {
    const s = new Set(expenses.map(e => e.currency || 'USD').filter(Boolean));
    return CURRENCIES.filter(c => s.has(c));
}

// ── Custom Tooltip ────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#131828', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '10px 16px', fontSize: 13,
        }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: TEXT }}>{label}</div>
            {payload.map(p => (
                <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
                    {p.dataKey}: <strong>{p.value?.toFixed(2)}</strong>
                </div>
            ))}
        </div>
    );
}

// ── Main export ───────────────────────────────────────────────

export default function ExpenseCharts({ expenses }) {
    if (!expenses.length) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No data to chart yet</h3>
                <p>Add expenses via the form or AI Chat to see your spending trends.</p>
            </div>
        );
    }

    const currencies = usedCurrencies(expenses);
    const monthlyData = buildMonthly(expenses, 12);
    const yearlyData = buildYearly(expenses);

    const axisProps = {
        tick: { fill: MUTED, fontSize: 12 },
        axisLine: { stroke: 'rgba(255,255,255,0.07)' },
        tickLine: false,
    };

    return (
        <div className="charts-wrapper">

            {/* ── Monthly Bar Chart ── */}
            <div className="chart-card">
                <div className="chart-title">
                    <span>📅 Monthly Spending — Last 12 Months</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData} barGap={3} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="month" {...axisProps} />
                        <YAxis {...axisProps} width={55} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,99,255,0.08)' }} />
                        <Legend
                            wrapperStyle={{ fontSize: 13, paddingTop: 12, color: MUTED }}
                            iconType="circle" iconSize={8}
                        />
                        {currencies.map((cur, i) => (
                            <Bar
                                key={cur} dataKey={cur}
                                fill={CUR_COLORS[cur] || ACCENT}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={36}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* ── Yearly Line Chart ── */}
            <div className="chart-card">
                <div className="chart-title">
                    <span>📆 Yearly Spending Trend</span>
                </div>
                {yearlyData.length < 2 ? (
                    <div className="chart-note">
                        Spend across multiple years to see a trend line.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={yearlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="year" {...axisProps} />
                            <YAxis {...axisProps} width={55} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12, color: MUTED }} iconType="circle" iconSize={8} />
                            {currencies.map((cur, i) => (
                                <Line
                                    key={cur} type="monotone" dataKey={cur}
                                    stroke={CUR_COLORS[cur] || ACCENT}
                                    strokeWidth={2.5} dot={{ r: 5, fill: CUR_COLORS[cur] || ACCENT }}
                                    activeDot={{ r: 7 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Yearly Totals Pills ── */}
            <div className="chart-card chart-card--sm">
                <div className="chart-title"><span>🏆 All-Time Totals by Year</span></div>
                <div className="year-pills-grid">
                    {yearlyData.map(row => (
                        <div className="year-pill" key={row.year}>
                            <div className="year-pill-year">{row.year}</div>
                            {currencies.map(cur => row[cur] ? (
                                <div className="year-pill-amount" key={cur} style={{ color: CUR_COLORS[cur] }}>
                                    {cur} <strong>{row[cur].toFixed(2)}</strong>
                                </div>
                            ) : null)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
