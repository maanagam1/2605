/* =========================================================
   2605 — Charts
   Wraps Chart.js for the donut (category breakdown) and
   bar (monthly report) visuals on the dashboard.
   ========================================================= */

const ChartsMod = (() => {
  let donutChart = null;
  let barChart = null;

  const CATEGORY_COLORS = {
    'CNG': '#2f5f8a',
    'EMI': '#ab3b34',
    'Other': '#c9a24b',
  };

  function buildDonut(entries){
    const ctx = document.getElementById('donutChart');
    if(!ctx) return;

    const totals = { CNG: 0, EMI: 0, Other: 0 };
    entries.forEach(e => {
      const t = Store.entryTotals(e);
      totals.CNG += t.cng;
      totals.EMI += t.emi;
      totals.Other += t.other;
    });

    const labels = Object.keys(totals).filter(k => totals[k] > 0);
    const data = labels.map(k => totals[k]);
    const colors = labels.map(k => CATEGORY_COLORS[k]);
    const grandTotal = data.reduce((a,b) => a+b, 0);

    if(donutChart) donutChart.destroy();

    if(grandTotal === 0){
      ctx.getContext('2d').clearRect(0,0,ctx.width,ctx.height);
      renderLegend([], {});
      return { total: 0, breakdown: totals };
    }

    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: 'transparent',
          borderWidth: 3,
          hoverOffset: 10,
        }],
      },
      options: {
        cutout: '72%',
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.label}: ${formatMoney(ctx.raw)}` }
        } },
        animation: { animateRotate: true, duration: 700 },
      },
    });

    renderLegend(labels, totals);
    return { total: grandTotal, breakdown: totals };
  }

  function renderLegend(labels, totals){
    const el = document.querySelector('[data-role="donut-legend"]');
    if(!el) return;
    if(!labels.length){
      el.innerHTML = '<span class="legend-chip">Koi kharcha nahi</span>';
      return;
    }
    el.innerHTML = labels.map(l => `
      <span class="legend-chip">
        <span class="legend-dot" style="background:${CATEGORY_COLORS[l]}"></span>
        ${l} · ${formatMoney(totals[l])}
      </span>
    `).join('');
  }

  function buildBar(entries, range){
    const ctx = document.getElementById('barChart');
    if(!ctx) return;

    // group by day (for daily/weekly) or by month (for yearly), else last 7 buckets
    let buckets = {};
    let labelFmt;
    if(range === 'yearly'){
      labelFmt = (d) => d.toLocaleString('en-IN', { month: 'short' });
    } else {
      labelFmt = (d) => d.getDate() + '/' + (d.getMonth()+1);
    }

    entries.forEach(e => {
      const d = new Date(e.date + 'T00:00:00');
      const key = range === 'yearly' ? d.getMonth() : e.date;
      const label = labelFmt(d);
      if(!buckets[key]) buckets[key] = { label, earning: 0, expense: 0 };
      const t = Store.entryTotals(e);
      buckets[key].earning += t.earning;
      buckets[key].expense += t.expense;
    });

    const keys = Object.keys(buckets).sort();
    const labels = keys.map(k => buckets[k].label);
    const earnings = keys.map(k => buckets[k].earning);
    const expenses = keys.map(k => buckets[k].expense);

    if(barChart) barChart.destroy();
    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Earning', data: earnings, backgroundColor: '#2f5f8a', borderRadius: 5, maxBarThickness: 22 },
          { label: 'Expense', data: expenses, backgroundColor: '#ab3b34', borderRadius: 5, maxBarThickness: 22 },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
          y: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { size: 9 } } },
        },
      },
    });
  }

  return { buildDonut, buildBar };
})();
