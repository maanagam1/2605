# 2605 — Cab Hisaab Kitaab 🚕

A personal earnings & expense tracker for cab drivers running their own car on **Ola, Uber, and Rapido**. Pure HTML/CSS/JavaScript — no build step, no backend, no sign-up. Your data stays on your own device (browser `localStorage`).

## Features

- **Dashboard** — Total Earning, Total Expense, Net Profit "gauges", a monthly bar report, and an interactive donut chart (tap the center to expand) showing this period's spending split between CNG, EMI, and Other.
- **Entry** — log Date, Total Earning, CNG Expense, Daily EMI (auto-fills ₹801, with an on/off switch per entry) and Other Expense, plus an optional note.
- **Record** — daily-wise summary with Daily / Weekly / Monthly / Yearly pill filters. Edit or delete any entry, share a period's summary straight to **WhatsApp**, or generate a premium, bank-statement-styled **PDF** with a repeated "2605" watermark. Includes **Backup** (JSON) and **Restore**.
- **Wallet carousel** — horizontally scrollable bank-style cards. A locked "2605 Net Profit" card auto-tracks your running net profit; add your own (HDFC Bank, Cash, ICICI Credit Card, etc.).
- **Settings** — profile (name, email, premium badge), an Export Hub (CSV / Excel / PDF), default EMI settings, and a theme switch (Auto / Light / Dark — Auto follows your system setting).
- **Incognito mode** — tap the eye icon to blur every amount on screen when you're in public.
- **Skeuomorphic UI** — a stitched-leather, brass-bezel dashboard look inspired by a real taxi meter, with glass gauge faces and embossed cards.

## Getting started

It's a static site with a built-in **PWA (installable app)** setup — no app store needed.

### Option A — host it once, install on your phone (recommended)

1. Push this repo to GitHub.
2. Go to **Settings → Pages**, set source to the `main` branch / root folder, save.
3. Your app goes live at `https://<username>.github.io/<repo-name>/`.
4. Open that link on your phone:
   - **Android (Chrome):** open Settings → **Install app** (the app itself shows an "📲 Install 2605" button too), or tap the browser's ⋮ menu → *Add to Home screen / Install app*.
   - **iPhone (Safari):** tap the Share icon → **Add to Home Screen**.
5. It now opens full-screen from your home screen icon, just like a normal app, and works offline after the first load.

> A PWA needs to be served over `https://` (or `localhost`) for install/offline features to work — a plain double-clicked `index.html` file will still run fine, just without "Add to Home Screen".

### Option B — just run it locally

1. Download/clone this repo.
2. Open `index.html` in any modern browser (Chrome/Edge/Safari, desktop or mobile).
3. Start adding entries from the **Entry** tab.

## Tech

- Vanilla HTML/CSS/JS (no framework, no bundler)
- [Chart.js](https://www.chartjs.org/) for the donut & bar charts
- [jsPDF](https://github.com/parallax/jsPDF) for the watermarked PDF statements
- [SheetJS (xlsx)](https://sheetjs.com/) for Excel export
- All loaded from CDN — an internet connection is needed the first time these load (browsers cache them after).

## Data & privacy

Everything is stored locally in your browser's `localStorage` — nothing is sent to any server. Use **Settings → Backup** regularly (or the Backup button in Record) to save a `.json` copy of your data somewhere safe, and **Restore** to bring it back on a new device or browser.

## Folder structure

```
2605-app/
├── index.html
├── manifest.json          # PWA install config
├── service-worker.js      # offline app-shell caching
├── css/
│   └── style.css
├── js/
│   ├── store.js           # localStorage data layer
│   ├── charts.js          # Chart.js donut + bar setup
│   ├── pdf.js              # jsPDF watermarked statement generator
│   └── app.js              # UI wiring + install prompt
├── assets/icons/           # app icons (72px–512px + maskable)
└── README.md
```

---

Made for the road. 🚖 *2605*
