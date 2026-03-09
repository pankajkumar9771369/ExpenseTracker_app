import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SYMBOLS = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };

function fmt(e) {
    const sym = SYMBOLS[e.currency] || '';
    return `${sym}${parseFloat(e.amount || 0).toFixed(2)} ${e.currency || ''}`;
}

function fmtDate(ts) {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return ts; }
}

// ── CSV Export ────────────────────────────────────────────────
export function exportCSV(expenses) {
    const header = ['Date', 'Merchant', 'Amount', 'Currency'];
    const rows = expenses.map(e => [
        fmtDate(e.createdAt || e.created_at),
        e.merchant || 'Unknown',
        parseFloat(e.amount || 0).toFixed(2),
        e.currency || '',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── PDF Export ────────────────────────────────────────────────
export function exportPDF(expenses) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // ── Header gradient strip ──
    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, pageW, 52, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ExpenseTracker — Expense Report', 40, 34);

    // ── Sub-header ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 230);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}   ·   ${expenses.length} transactions`, 40, 48);

    // ── Totals summary ──
    const totals = expenses.reduce((acc, e) => {
        acc[e.currency || 'USD'] = (acc[e.currency || 'USD'] || 0) + parseFloat(e.amount || 0);
        return acc;
    }, {});
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 40, 78);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let yy = 94;
    Object.entries(totals).forEach(([cur, amt]) => {
        doc.text(`Total spent (${cur}): ${(SYMBOLS[cur] || '')}${amt.toFixed(2)}`, 40, yy);
        yy += 14;
    });

    // ── Table ──
    autoTable(doc, {
        startY: yy + 10,
        head: [['Date', 'Merchant', 'Amount', 'Currency']],
        body: expenses.map(e => [
            fmtDate(e.createdAt || e.created_at),
            e.merchant || 'Unknown',
            `${SYMBOLS[e.currency] || ''}${parseFloat(e.amount || 0).toFixed(2)}`,
            e.currency || '—',
        ]),
        headStyles: {
            fillColor: [108, 99, 255],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10,
        },
        alternateRowStyles: { fillColor: [245, 244, 255] },
        styles: { fontSize: 9, cellPadding: 6 },
        columnStyles: { 2: { halign: 'right' } },
    });

    doc.save(`expenses_${new Date().toISOString().slice(0, 10)}.pdf`);
}
