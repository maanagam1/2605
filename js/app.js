/* =========================================================
   2605 — App
   UI wiring: navigation, dashboard rendering, entry form,
   record list, wallets, settings, theme, exports.
   ========================================================= */

(() => {
  let state = {
    view: 'dashboard',
    dashRange: 'monthly',
    recordRange: 'monthly',
    refDate: new Date(),
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------------- Toast ----------------
  let toastTimer;
  function toast(msg){
    const el = $('[data-role="toast"]');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------------- Theme ----------------
  function applyTheme(){
    const s = Store.getSettings();
    let mode = s.theme;
    if(mode === 'auto'){
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', mode);
    $$('.seg-control button', document).forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

  // ---------------- Incognito ----------------
  function applyIncognito(){
    const s = Store.getSettings();
    $$('.money').forEach(el => el.classList.toggle('blurred', s.incognito));
    $('.eye-open').style.display = s.incognito ? 'none' : '';
    $('.eye-closed').style.display = s.incognito ? '' : 'none';
  }

  // ---------------- Navigation ----------------
  function goToView(name){
    state.view = name;
    $$('.view').forEach(v => v.classList.remove('active'));
    $('#view-' + name).classList.add('active');
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    if(name === 'dashboard') renderDashboard();
    if(name === 'record') renderRecord();
    if(name === 'entry') prepEntryForm();
    if(name === 'settings') renderSettings();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $$('.nav-btn').forEach(btn => btn.addEventListener('click', () => goToView(btn.dataset.view)));

  // ---------------- Dashboard ----------------
  function rangeLabel(range, ref = new Date()){
    const map = {
      daily: ref.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
      weekly: 'This Week',
      monthly: ref.toLocaleDateString('en-IN', { month:'long', year:'numeric' }),
      yearly: ref.getFullYear().toString(),
    };
    return map[range] || '';
  }

  function renderDashboard(){
    const s = Store.getSettings();
    const all = Store.getEntries();
    const filtered = filterEntriesByRange(all, state.dashRange, state.refDate);

    const totals = filtered.reduce((acc, e) => {
      const t = Store.entryTotals(e);
      acc.earning += t.earning; acc.expense += t.expense; acc.net += t.net;
      return acc;
    }, { earning: 0, expense: 0, net: 0 });

    $('[data-role="stat-earning"]').textContent = formatMoney(totals.earning, s.incognito);
    $('[data-role="stat-expense"]').textContent = formatMoney(totals.expense, s.incognito);
    $('[data-role="stat-profit"]').textContent = formatMoney(totals.net, s.incognito);

    $('[data-role="donut-month"]').textContent = rangeLabel(state.dashRange, state.refDate);
    const donutRes = ChartsMod.buildDonut(filtered);
    $('[data-role="donut-total"]').textContent = formatMoney(donutRes ? donutRes.total : 0, s.incognito);

    ChartsMod.buildBar(filtered, state.dashRange);

    renderWallets();
    applyIncognito();
  }

  $$('[data-role="timeframe-filters"] .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-role="timeframe-filters"] .pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.dashRange = btn.dataset.range;
      renderDashboard();
    });
  });

  $('[data-role="donut-wrap"]')?.addEventListener('click', (e) => {
    const center = $('[data-role="donut-center"]');
    center.classList.toggle('expanded');
    center.style.transform = center.classList.contains('expanded') ? 'scale(1.08)' : '';
  });

  // ---------------- Wallets ----------------
  function syncNetWallet(){
    const all = Store.getEntries();
    const totalNet = all.reduce((sum, e) => sum + Store.entryTotals(e).net, 0);
    const wallets = Store.getWallets();
    const netWallet = wallets.find(w => w.id === 'w_net');
    if(netWallet){
      netWallet.balance = totalNet;
      Store.saveWallets(wallets);
    }
  }

  const BANK_STYLES = {
    'HDFC Bank': 'linear-gradient(135deg,#16233d,#3a5a8f)',
    'ICICI Credit Card': 'linear-gradient(135deg,#b5651d,#7a3e0e)',
    'Cash': 'linear-gradient(135deg,#2c5638,#4a8a5e)',
    '2605 Net Profit': 'linear-gradient(135deg,#3a2517,#8f6f2e)',
  };
  function walletBg(name){
    return BANK_STYLES[name] || 'linear-gradient(135deg,#223a63,#16233d)';
  }

  function renderWallets(){
    syncNetWallet();
    const s = Store.getSettings();
    const wallets = Store.getWallets();
    const el = $('[data-role="wallet-carousel"]');
    el.innerHTML = wallets.map(w => `
      <div class="wallet-card" style="background:${walletBg(w.bank)}" data-id="${w.id}">
        ${!w.locked ? `<button class="wc-del" data-role="wallet-del" data-id="${w.id}">✕</button>` : ''}
        <div class="wc-top">
          <span class="wc-bank">${w.bank}</span>
          <span class="wc-chip"></span>
        </div>
        <div class="wc-num">•••• •••• •••• ${String(w.id).slice(-4).toUpperCase()}</div>
        <div class="wc-bottom">
          <span class="wc-label">Balance</span>
          <span class="wc-balance money">${formatMoney(w.balance, s.incognito)}</span>
        </div>
      </div>
    `).join('');
    applyIncognito();
  }

  $('[data-role="add-wallet"]')?.addEventListener('click', () => {
    const bank = prompt('Wallet / Bank ka naam (e.g. HDFC Bank, Cash, ICICI Credit Card):');
    if(!bank) return;
    const startBalance = Number(prompt('Starting balance (₹):', '0')) || 0;
    Store.addWallet({ bank, type: 'manual', balance: startBalance, locked: false });
    renderWallets();
    toast('Wallet add ho gaya');
  });

  document.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-role="wallet-del"]');
    if(delBtn){
      if(confirm('Ye wallet delete karein?')){
        Store.deleteWallet(delBtn.dataset.id);
        renderWallets();
      }
    }
  });

  // ---------------- Entry form ----------------
  function prepEntryForm(editEntry){
    const form = $('#entryForm');
    const s = Store.getSettings();
    form.reset();
    $('[name="editId"]').value = '';
    $('[name="date"]').value = new Date().toISOString().slice(0,10);
    $('#emiToggle').checked = s.defaultEmiOn;
    $('#emiAmount').value = s.defaultEmiAmount;
    $('[data-role="entry-submit"]').textContent = 'Entry Save Karo';

    if(editEntry){
      $('[name="editId"]').value = editEntry.id;
      $('[name="date"]').value = editEntry.date;
      $('[name="earning"]').value = editEntry.earning;
      $('[name="cng"]').value = editEntry.cng;
      $('#emiToggle').checked = !!editEntry.emiOn;
      $('#emiAmount').value = editEntry.emi;
      $('[name="other"]').value = editEntry.other;
      $('[name="note"]').value = editEntry.note || '';
      $('[data-role="entry-submit"]').textContent = 'Entry Update Karo';
    }
    updateEntryPreview();
  }

  function updateEntryPreview(){
    const form = $('#entryForm');
    const fd = new FormData(form);
    const t = Store.entryTotals({
      earning: fd.get('earning'), cng: fd.get('cng'),
      emi: $('#emiAmount').value, emiOn: $('#emiToggle').checked, other: fd.get('other'),
    });
    const preview = $('[data-role="entry-preview-value"]');
    preview.textContent = formatMoney(t.net);
    preview.style.color = t.net >= 0 ? 'var(--profit)' : 'var(--expense)';
  }

  $('#entryForm')?.addEventListener('input', updateEntryPreview);
  $('#emiToggle')?.addEventListener('change', () => {
    $('#emiAmount').disabled = !$('#emiToggle').checked;
    updateEntryPreview();
  });

  $('#entryForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const editId = fd.get('editId');
    const entry = {
      id: editId || undefined,
      date: fd.get('date'),
      earning: Number(fd.get('earning')) || 0,
      cng: Number(fd.get('cng')) || 0,
      emi: Number($('#emiAmount').value) || 0,
      emiOn: $('#emiToggle').checked,
      other: Number(fd.get('other')) || 0,
      note: fd.get('note') || '',
    };
    if(!entry.date){ toast('Date daaliye'); return; }
    Store.addEntry(entry);
    toast(editId ? 'Entry update ho gayi' : 'Entry save ho gayi');
    prepEntryForm();
    goToView('record');
  });

  // ---------------- Record ----------------
  function renderRecord(){
    const s = Store.getSettings();
    const all = Store.getEntries();
    const filtered = filterEntriesByRange(all, state.recordRange, state.refDate);

    const totals = filtered.reduce((acc, e) => {
      const t = Store.entryTotals(e);
      acc.earning += t.earning; acc.expense += t.expense; acc.net += t.net;
      return acc;
    }, { earning: 0, expense: 0, net: 0 });

    $('[data-role="record-earning"]').textContent = formatMoney(totals.earning, s.incognito);
    $('[data-role="record-expense"]').textContent = formatMoney(totals.expense, s.incognito);
    $('[data-role="record-net"]').textContent = formatMoney(totals.net, s.incognito);

    const listEl = $('[data-role="record-list"]');
    const emptyEl = $('[data-role="record-empty"]');
    if(!filtered.length){
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
    } else {
      emptyEl.style.display = 'none';
      listEl.innerHTML = filtered.map(e => {
        const t = Store.entryTotals(e);
        const dateStr = new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
        return `
        <div class="record-row" data-id="${e.id}">
          <div class="rr-left">
            <span class="rr-date">${dateStr}</span>
            <span class="rr-breakdown">Earning ${formatMoney(t.earning, s.incognito)} · CNG ${formatMoney(t.cng, s.incognito)} · EMI ${formatMoney(t.emi, s.incognito)} · Other ${formatMoney(t.other, s.incognito)}</span>
            ${e.note ? `<span class="rr-note">${e.note}</span>` : ''}
          </div>
          <div class="rr-right">
            <span class="rr-net money ${t.net >= 0 ? 'pos':'neg'}">${formatMoney(t.net, s.incognito)}</span>
            <div class="rr-actions">
              <button class="icon-sm" data-role="edit-entry" data-id="${e.id}" title="Edit">
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </button>
              <button class="icon-sm" data-role="del-entry" data-id="${e.id}" title="Delete">
                <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 14H7L6 7zm3-4h6l1 2H8l1-2z"/></svg>
              </button>
            </div>
          </div>
        </div>`;
      }).join('');
    }
    applyIncognito();
  }

  $$('[data-role="record-filters"] .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-role="record-filters"] .pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.recordRange = btn.dataset.range;
      renderRecord();
    });
  });

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-role="edit-entry"]');
    const delBtn = e.target.closest('[data-role="del-entry"]');
    if(editBtn){
      const entry = Store.getEntry(editBtn.dataset.id);
      goToView('entry');
      prepEntryForm(entry);
    }
    if(delBtn){
      if(confirm('Ye entry delete karein?')){
        Store.deleteEntry(delBtn.dataset.id);
        renderRecord();
        toast('Entry delete ho gayi');
      }
    }
  });

  // ---------------- WhatsApp share ----------------
  $('[data-role="btn-whatsapp"]')?.addEventListener('click', () => {
    const all = Store.getEntries();
    const filtered = filterEntriesByRange(all, state.recordRange, state.refDate);
    if(!filtered.length){ toast('Is period me koi entry nahi'); return; }
    const totals = filtered.reduce((acc, e) => {
      const t = Store.entryTotals(e);
      acc.earning += t.earning; acc.expense += t.expense; acc.net += t.net;
      return acc;
    }, { earning: 0, expense: 0, net: 0 });
    let msg = `*2605 — Cab Hisaab (${rangeLabel(state.recordRange, state.refDate)})*\n\n`;
    filtered.slice(0,15).forEach(e => {
      const t = Store.entryTotals(e);
      msg += `${e.date}: Earning ₹${Math.round(t.earning)}, Expense ₹${Math.round(t.expense)}, Net ₹${Math.round(t.net)}\n`;
    });
    msg += `\n*Total Earning:* ₹${Math.round(totals.earning)}\n*Total Expense:* ₹${Math.round(totals.expense)}\n*Net Profit:* ₹${Math.round(totals.net)}`;
    const url = 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  });

  // ---------------- PDF export ----------------
  function exportPdf(range, ref){
    const all = Store.getEntries();
    const filtered = filterEntriesByRange(all, range, ref);
    if(!filtered.length){ toast('Is period me koi entry nahi'); return; }
    const settings = Store.getSettings();
    const doc = PdfMod.generate({ entries: filtered, settings, rangeLabel: rangeLabel(range, ref) });
    doc.save(`2605-statement-${range}-${(ref||new Date()).toISOString().slice(0,10)}.pdf`);
    toast('PDF ban gayi');
  }
  $('[data-role="btn-pdf"]')?.addEventListener('click', () => exportPdf(state.recordRange, state.refDate));
  $('[data-role="export-pdf-settings"]')?.addEventListener('click', () => exportPdf('yearly', state.refDate));

  // ---------------- CSV / Excel export ----------------
  function entriesToRows(entries){
    return entries.map(e => {
      const t = Store.entryTotals(e);
      return {
        Date: e.date, Earning: t.earning, CNG: t.cng, EMI: t.emi, Other: t.other,
        Expense: t.expense, Net: t.net, Note: e.note || '',
      };
    });
  }

  $('[data-role="export-csv"]')?.addEventListener('click', () => {
    const rows = entriesToRows(Store.getEntries());
    if(!rows.length){ toast('Koi entry nahi hai'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => r[h]).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, '2605-data.csv');
    toast('CSV export ho gaya');
  });

  $('[data-role="export-xlsx"]')?.addEventListener('click', () => {
    const rows = entriesToRows(Store.getEntries());
    if(!rows.length){ toast('Koi entry nahi hai'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '2605');
    XLSX.writeFile(wb, '2605-data.xlsx');
    toast('Excel export ho gaya');
  });

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------------- Backup / Restore ----------------
  function doBackup(){
    const data = Store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `2605-backup-${new Date().toISOString().slice(0,10)}.json`);
    toast('Backup ban gaya');
  }
  $('[data-role="btn-backup"]')?.addEventListener('click', doBackup);
  $('[data-role="settings-backup"]')?.addEventListener('click', doBackup);

  function handleRestoreFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        Store.importAll(data);
        toast('Restore ho gaya');
        renderDashboard(); renderRecord(); renderSettings();
      }catch(err){
        toast('Backup file sahi nahi hai');
      }
    };
    reader.readAsText(file);
  }
  $('#restoreFile')?.addEventListener('change', (e) => e.target.files[0] && handleRestoreFile(e.target.files[0]));
  $('#restoreFile2')?.addEventListener('change', (e) => e.target.files[0] && handleRestoreFile(e.target.files[0]));

  // ---------------- Settings view ----------------
  function renderSettings(){
    const s = Store.getSettings();
    $('#profileName').value = s.name;
    $('#profileEmail').value = s.email;
    $('#defaultEmiAmount').value = s.defaultEmiAmount;
    $('#defaultEmiToggle').checked = s.defaultEmiOn;
    $$('.seg-control button').forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));
  }

  $('#profileName')?.addEventListener('change', (e) => Store.saveSettings({ name: e.target.value }));
  $('#profileEmail')?.addEventListener('change', (e) => Store.saveSettings({ email: e.target.value }));
  $('#defaultEmiAmount')?.addEventListener('change', (e) => Store.saveSettings({ defaultEmiAmount: Number(e.target.value) || 0 }));
  $('#defaultEmiToggle')?.addEventListener('change', (e) => Store.saveSettings({ defaultEmiOn: e.target.checked }));

  $$('[data-role="theme-seg"] button').forEach(btn => {
    btn.addEventListener('click', () => {
      Store.saveSettings({ theme: btn.dataset.theme });
      applyTheme();
    });
  });

  $('[data-role="clear-data"]')?.addEventListener('click', () => {
    if(confirm('Pakka sab data mitana hai? Ye wapas nahi hoga.')){
      Store.resetAll();
      toast('Sab data reset ho gaya');
      goToView('dashboard');
    }
  });

  // ---------------- Incognito toggle ----------------
  $('#incognitoBtn')?.addEventListener('click', () => {
    const s = Store.getSettings();
    Store.saveSettings({ incognito: !s.incognito });
    applyIncognito();
  });

  // ---------------- Install (PWA) ----------------
  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const panel = $('#installPanel');
    if(panel) panel.style.display = 'block';
  });
  $('[data-role="install-btn"]')?.addEventListener('click', async () => {
    if(!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if(outcome === 'accepted') toast('App install ho rahi hai');
    deferredInstallPrompt = null;
    $('#installPanel').style.display = 'none';
  });
  window.addEventListener('appinstalled', () => {
    toast('2605 install ho gayi!');
    const panel = $('#installPanel');
    if(panel) panel.style.display = 'none';
  });

  // ---------------- Init ----------------
  function init(){
    applyTheme();
    goToView('dashboard');
    applyIncognito();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
