/* =========================================================
   2605 — PDF Export
   Bank-statement styled summary using jsPDF, with a repeated
   "2605" watermark across the page (8-9 times), premium look.
   ========================================================= */

const PdfMod = (() => {

  function addWatermark(doc, pageW, pageH){
    doc.saveGraphicsState && doc.saveGraphicsState();
    doc.setTextColor(201, 162, 75);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(46);
    if(doc.setGState){
      doc.setGState(new doc.GState({ opacity: 0.08 }));
    }
    const rows = 3, cols = 3;
    for(let r = 0; r < rows; r++){
      for(let c = 0; c < cols; c++){
        const x = (pageW / cols) * c + 10;
        const y = (pageH / rows) * r + 30;
        doc.text('2605', x, y, { angle: 30 });
      }
    }
    if(doc.setGState){
      doc.setGState(new doc.GState({ opacity: 1 }));
    }
    doc.setTextColor(20, 20, 20);
    doc.restoreGraphicsState && doc.restoreGraphicsState();
  }

  function generate({ entries, settings, rangeLabel }){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 40;

    addWatermark(doc, pageW, pageH);

    // ---- Header block ----
    doc.setFillColor(27, 19, 12);
    doc.rect(0, 0, pageW, 70, 'F');
    doc.setTextColor(232, 205, 138);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('2605', marginX, 44);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Cab Earnings & Expense Statement', marginX, 58);

    doc.setTextColor(232, 205, 138);
    doc.setFontSize(9);
    doc.text(rangeLabel || '', pageW - marginX, 44, { align: 'right' });
    doc.text('Generated: ' + new Date().toLocaleString('en-IN'), pageW - marginX, 58, { align: 'right' });

    // ---- Account holder strip ----
    let y = 95;
    doc.setTextColor(60, 45, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Account Holder', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(settings.name || 'Cab Driver', marginX, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.text('Statement Period', pageW - marginX, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(rangeLabel || 'All time', pageW - marginX, y + 14, { align: 'right' });

    y += 32;
    doc.setDrawColor(201, 162, 75);
    doc.setLineWidth(1.2);
    doc.line(marginX, y, pageW - marginX, y);

    // ---- Summary cards ----
    y += 22;
    const totals = entries.reduce((acc, e) => {
      const t = Store.entryTotals(e);
      acc.earning += t.earning; acc.expense += t.expense; acc.net += t.net;
      return acc;
    }, { earning: 0, expense: 0, net: 0 });

    const cardW = (pageW - marginX * 2 - 20) / 3;
    const cards = [
      { label: 'TOTAL EARNING', value: totals.earning, color: [47, 95, 138] },
      { label: 'TOTAL EXPENSE', value: totals.expense, color: [171, 59, 52] },
      { label: 'NET PROFIT', value: totals.net, color: [63, 122, 82] },
    ];
    cards.forEach((c, i) => {
      const x = marginX + i * (cardW + 10);
      doc.setFillColor(...c.color);
      doc.roundedRect(x, y, cardW, 46, 6, 6, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(c.label, x + 10, y + 18);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Rs. ' + Math.round(c.value).toLocaleString('en-IN'), x + 10, y + 36);
    });

    y += 70;

    // ---- Table header ----
    doc.setTextColor(20,20,20);
    const cols = [
      { key: 'date', label: 'Date', w: 65 },
      { key: 'earning', label: 'Earning', w: 65 },
      { key: 'cng', label: 'CNG', w: 55 },
      { key: 'emi', label: 'EMI', w: 55 },
      { key: 'other', label: 'Other', w: 60 },
      { key: 'net', label: 'Net', w: 65 },
      { key: 'note', label: 'Note', w: pageW - marginX*2 - (65+65+55+55+60+65) },
    ];

    function drawTableHeader(yy){
      doc.setFillColor(243, 234, 217);
      doc.rect(marginX, yy, pageW - marginX*2, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = marginX + 6;
      cols.forEach(c => { doc.text(c.label, x, yy + 15); x += c.w; });
      return yy + 22;
    }

    y = drawTableHeader(y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const sorted = [...entries].sort((a,b) => new Date(a.date) - new Date(b.date));
    sorted.forEach((e, idx) => {
      const t = Store.entryTotals(e);
      if(y > pageH - 60){
        doc.addPage();
        addWatermark(doc, pageW, pageH);
        y = 50;
        y = drawTableHeader(y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }
      if(idx % 2 === 0){
        doc.setFillColor(250, 246, 236);
        doc.rect(marginX, y, pageW - marginX*2, 18, 'F');
      }
      let x = marginX + 6;
      const row = {
        date: e.date,
        earning: Math.round(t.earning).toLocaleString('en-IN'),
        cng: Math.round(t.cng).toLocaleString('en-IN'),
        emi: Math.round(t.emi).toLocaleString('en-IN'),
        other: Math.round(t.other).toLocaleString('en-IN'),
        net: Math.round(t.net).toLocaleString('en-IN'),
        note: e.note || '-',
      };
      doc.setTextColor(30,30,30);
      cols.forEach(c => {
        let val = row[c.key];
        if(c.key === 'note' && val.length > 22) val = val.slice(0,20) + '..';
        doc.text(String(val), x, y + 13);
        x += c.w;
      });
      y += 18;
    });

    // ---- Footer ----
    doc.setDrawColor(201,162,75);
    doc.line(marginX, pageH - 34, pageW - marginX, pageH - 34);
    doc.setFontSize(8);
    doc.setTextColor(120,105,80);
    doc.text('This is a system generated statement from the 2605 app.', marginX, pageH - 20);
    doc.text('2605', pageW - marginX, pageH - 20, { align: 'right' });

    return doc;
  }

  return { generate };
})();
