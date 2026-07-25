/* =========================================================
   2605 — Store
   Simple localStorage-backed data layer. No backend needed;
   everything lives on the driver's own device.
   ========================================================= */

const STORAGE_KEYS = {
  entries: '2605_entries',
  wallets: '2605_wallets',
  settings: '2605_settings',
};

const DEFAULT_SETTINGS = {
  name: 'Cab Driver',
  email: '',
  premium: true,
  defaultEmiAmount: 801,
  defaultEmiOn: true,
  theme: 'auto', // auto | light | dark
  incognito: false,
};

const DEFAULT_WALLETS = [
  { id: 'w_net', bank: '2605 Net Profit', type: 'auto', balance: 0, locked: true },
];

function uid(prefix = 'e'){
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const Store = {
  // ---- entries ----
  getEntries(){
    try{
      const raw = localStorage.getItem(STORAGE_KEYS.entries);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  },
  saveEntries(list){
    localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(list));
  },
  addEntry(entry){
    const list = Store.getEntries();
    if(entry.id){
      const idx = list.findIndex(e => e.id === entry.id);
      if(idx > -1){ list[idx] = entry; Store.saveEntries(list); return entry; }
    }
    entry.id = uid();
    entry.createdAt = Date.now();
    list.push(entry);
    Store.saveEntries(list);
    return entry;
  },
  deleteEntry(id){
    const list = Store.getEntries().filter(e => e.id !== id);
    Store.saveEntries(list);
  },
  getEntry(id){
    return Store.getEntries().find(e => e.id === id);
  },

  // ---- wallets ----
  getWallets(){
    try{
      const raw = localStorage.getItem(STORAGE_KEYS.wallets);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_WALLETS));
    }catch(e){ return JSON.parse(JSON.stringify(DEFAULT_WALLETS)); }
  },
  saveWallets(list){
    localStorage.setItem(STORAGE_KEYS.wallets, JSON.stringify(list));
  },
  addWallet(wallet){
    const list = Store.getWallets();
    wallet.id = uid('w');
    list.push(wallet);
    Store.saveWallets(list);
    return wallet;
  },
  deleteWallet(id){
    const list = Store.getWallets().filter(w => w.id !== id && !w.locked);
    Store.saveWallets(list);
  },
  updateWalletBalance(id, delta){
    const list = Store.getWallets();
    const w = list.find(x => x.id === id);
    if(w){ w.balance = (w.balance || 0) + delta; Store.saveWallets(list); }
  },

  // ---- settings ----
  getSettings(){
    try{
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    }catch(e){ return { ...DEFAULT_SETTINGS }; }
  },
  saveSettings(patch){
    const current = Store.getSettings();
    const next = { ...current, ...patch };
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(next));
    return next;
  },

  // ---- derived numbers ----
  entryTotals(entry){
    const earning = Number(entry.earning) || 0;
    const cng = Number(entry.cng) || 0;
    const emi = entry.emiOn ? (Number(entry.emi) || 0) : 0;
    const other = Number(entry.other) || 0;
    const expense = cng + emi + other;
    const net = earning - expense;
    return { earning, cng, emi, other, expense, net };
  },

  // ---- backup / restore ----
  exportAll(){
    return {
      app: '2605',
      exportedAt: new Date().toISOString(),
      entries: Store.getEntries(),
      wallets: Store.getWallets(),
      settings: Store.getSettings(),
    };
  },
  importAll(data){
    if(!data || !Array.isArray(data.entries)) throw new Error('Invalid backup file');
    Store.saveEntries(data.entries);
    if(Array.isArray(data.wallets)) Store.saveWallets(data.wallets);
    if(data.settings) Store.saveSettings(data.settings);
  },
  resetAll(){
    localStorage.removeItem(STORAGE_KEYS.entries);
    localStorage.removeItem(STORAGE_KEYS.wallets);
    localStorage.removeItem(STORAGE_KEYS.settings);
  },
};

// ---- date range helpers ----
function isSameDay(d1, d2){
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}
function startOfWeek(d){
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0,0,0,0);
  return x;
}
function filterEntriesByRange(entries, range, refDate = new Date()){
  const ref = new Date(refDate);
  return entries.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    if(range === 'daily') return isSameDay(d, ref);
    if(range === 'weekly'){
      const start = startOfWeek(ref);
      const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
      return d >= start && d <= end;
    }
    if(range === 'monthly') return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
    if(range === 'yearly') return d.getFullYear() === ref.getFullYear();
    return true;
  }).sort((a,b) => new Date(b.date) - new Date(a.date));
}

function formatMoney(n, hide = false){
  if(hide) return '••••';
  const val = Math.round(Number(n) || 0);
  return '₹' + val.toLocaleString('en-IN');
}
