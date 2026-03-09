import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { dsApi, expenseApi } from '../api/api';
import Tesseract from 'tesseract.js';

function ParsedResult({ data }) {
    if (!data) return null;
    const fields = [
        ['Merchant', data.merchant],
        ['Amount', data.amount],
        ['Currency', data.currency],
    ].filter(([, val]) => val !== undefined && val !== null && val !== '');

    return (
        <div className="parsed-expense">
            {fields.map(([key, val]) => (
                <div className="row" key={key}>
                    <span className="key">{key}</span>
                    <span className="val">{String(val)}</span>
                </div>
            ))}
        </div>
    );
}

export default function DsChat() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('log'); // 'log' | 'ask'

    // Log Mode State
    const [logMsgs, setLogMsgs] = useState([
        { role: 'system', text: '👋 Hi! Describe an expense in plain English to log it instantly via DS Service.' },
    ]);
    const [logInput, setLogInput] = useState('');

    // Ask Mode State
    const [askMsgs, setAskMsgs] = useState([
        { role: 'system', text: '💡 Ask me anything about your expenses! For example: "What did I spend most on last month?"' },
    ]);
    const [askInput, setAskInput] = useState('');

    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);
    const bottomRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logMsgs, askMsgs, tab]);

    // ── OCR ───────────────────────────────────────────────────
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setOcrLoading(true);
        setLogMsgs(prev => [...prev, { role: 'system', text: `📸 Scanning receipt (${file.name}) using local AI OCR...` }]);

        try {
            const result = await Tesseract.recognize(file, 'eng');
            const extractedText = result.data.text.trim();
            if (!extractedText) throw new Error("No text found");

            setLogInput(`I scanned a receipt, here is the raw text, please extract the Merchant, Amount, and Currency:\n\n${extractedText.substring(0, 500)}`);
            setLogMsgs(prev => [...prev, { role: 'system', text: `✅ Receipt scanned! Check the input box and press Send to let the AI log it.` }]);
        } catch (err) {
            setLogMsgs(prev => [...prev, { role: 'error', text: '⚠️ Failed to read text from image. Please try a clearer picture.' }]);
        } finally {
            setOcrLoading(false);
            e.target.value = null; // reset input so same file can be selected again
        }
    };

    // ── LOG EXPENSE MODE ──────────────────────────────────────
    const sendLogMessage = async () => {
        const text = logInput.trim();
        if (!text || loading) return;

        setLogMsgs(prev => [...prev, { role: 'user', text }]);
        setLogInput('');
        setLoading(true);

        try {
            const { data } = await dsApi.post('/v1/ds/message', { message: text });
            setLogMsgs(prev => [
                ...prev,
                { role: 'system', text: '✅ Expense parsed and logged! Here\'s what was recorded:', parsed: data },
            ]);
        } catch (err) {
            if (err?.response?.status === 401) { localStorage.clear(); navigate('/login'); return; }
            setLogMsgs(prev => [...prev, { role: 'error', text: '⚠️ Could not parse expense message.' }]);
        } finally {
            setLoading(false);
        }
    };

    // ── ASK AI MODE ───────────────────────────────────────────
    const sendAskMessage = async () => {
        const text = askInput.trim();
        if (!text || loading) return;

        setAskMsgs(prev => [...prev, { role: 'user', text }]);
        setAskInput('');
        setLoading(true);

        try {
            // Fetch all expenses as context
            const res = await expenseApi.get('/expense/v1/getExpense');
            const history = Array.isArray(res.data) ? res.data : [];

            // Format for LLM
            const contextStr = history.map(e =>
                `[${new Date(e.createdAt || e.created_at || Date.now()).toISOString().slice(0, 10)}] ${e.merchant}: ${e.amount} ${e.currency}`
            ).join('\n');

            const { data } = await dsApi.post('/v1/ds/ask', {
                question: text,
                context: contextStr || 'No expenses logged yet.'
            });

            setAskMsgs(prev => [...prev, { role: 'system', text: data.answer }]);
        } catch (err) {
            if (err?.response?.status === 401) { localStorage.clear(); navigate('/login'); return; }
            setAskMsgs(prev => [...prev, { role: 'error', text: '⚠️ Could not answer. Is dsService running?' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e, mode) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            mode === 'log' ? sendLogMessage() : sendAskMessage();
        }
    };

    const currentMsgs = tab === 'log' ? logMsgs : askMsgs;
    const currentInput = tab === 'log' ? logInput : askInput;
    const setInput = tab === 'log' ? setLogInput : setAskInput;
    const sendAction = tab === 'log' ? sendLogMessage : sendAskMessage;

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="main-content">
                <div className="chat-page">
                    <div className="chat-card">

                        <div className="chat-header">
                            <h2>🤖 AI Assistant</h2>
                            <div className="view-tabs" style={{ marginTop: '12px' }}>
                                <button
                                    className={`tab-btn ${tab === 'log' ? 'active' : ''}`}
                                    onClick={() => setTab('log')}
                                >Log Expense</button>
                                <button
                                    className={`tab-btn ${tab === 'ask' ? 'active' : ''}`}
                                    onClick={() => setTab('ask')}
                                >Ask AI</button>
                            </div>
                        </div>

                        <div className="chat-messages">
                            {currentMsgs.map((msg, i) => (
                                <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'user' : msg.role === 'error' ? 'error' : 'system'}`}>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                    {msg.parsed && <ParsedResult data={msg.parsed} />}
                                </div>
                            ))}
                            {loading && (
                                <div className="chat-bubble system">
                                    <span className="spinner" style={{ borderTopColor: 'var(--accent)', borderColor: 'rgba(108,99,255,0.3)' }} />
                                    &nbsp; {tab === 'log' ? 'Analysing your message…' : 'Thinking…'}
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        <div className="chat-input-row">
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                            {tab === 'log' && (
                                <button
                                    className="chat-attach-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={loading || ocrLoading}
                                    title="Upload Receipt Image"
                                >
                                    📎
                                </button>
                            )}
                            <input
                                type="text"
                                value={currentInput}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, tab)}
                                placeholder={tab === 'log' ? "e.g. I spent ₹200 at Swiggy" : "e.g. How much did I spend on Food this month?"}
                                disabled={loading || ocrLoading}
                            />
                            <button className="chat-send-btn" onClick={sendAction} disabled={loading || ocrLoading || !currentInput.trim()}>
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
