# Dukaan AI — Smart Retail Intelligence System

Ek Pakistani retail dukaan ke liye AI-powered dashboard system.

---

## 🚀 Kaise Chalayein

### Option 1 — VS Code Live Server (Recommended)
1. VS Code mein folder open karein
2. "Live Server" extension install karein
3. `index.html` pe right-click → "Open with Live Server"

### Option 2 — Python Server
```bash
python -m http.server 8080
# Browser mein: http://localhost:8080
```

### Option 3 — Seedha Browser mein
```
index.html ko double-click karein
```

---

## 📁 Project Structure

```
dukaan-ai/
├── index.html                    ← Main entry point
└── src/
    ├── app.js                    ← App initialize karta hai
    ├── data/
    │   └── inventory.js          ← Products + localStorage save/load
    ├── styles/
    │   ├── main.css              ← Layout, responsive breakpoints
    │   └── components.css        ← UI components (glassmorphism)
    ├── utils/
    │   ├── helpers.js            ← Utility functions
    │   ├── router.js             ← Panel navigation
    │   └── charts.js             ← Chart.js config
    └── components/
        ├── header.js             ← Top navbar + hamburger
        ├── sidebar.js            ← Left nav + mobile support
        ├── dashboard.js          ← Dynamic metrics & alerts
        ├── inventory.js          ← Stock table
        ├── forecast.js           ← Sales Forecast
        ├── loss.js               ← Loss Detector
        ├── ai-chat.js            ← AI Assistant (Claude API)
        └── upload.js             ← 📁 NEW: CSV file upload
```

---

## 📱 Features

| Tab | Kya karta hai |
|-----|--------------|
| Dashboard | Dynamic metrics, auto-generated alerts, sales chart |
| Inventory | Stock levels, dynamic bars, days remaining |
| Sales Forecast | Auto-fills from product, 7-day prediction |
| Loss Detector | Margin analysis, profit/loss per product |
| AI Assistant | Claude AI chat (XSS-safe) |
| **Upload Data** | **Apni CSV file upload karein!** |

---

## 📁 CSV File Upload (New!)

"Upload Data" tab mein jaayein aur apni inventory CSV file upload karein:

1. **File drag-drop karein** ya click karein choose karne ke liye
2. **Columns map karein** — auto-detect bhi karta hai
3. **Preview dekho** — 5 rows preview
4. **Apply karein** — poora app aapke data pe kaam karega
5. Data **localStorage mein save** hota hai — page refresh pe bhi rehta hai

### CSV Format:
```
Product Name,Category,Stock,Reorder Level,Avg Daily Sales,Selling Price,Cost Price
Basmati Rice 5kg,Grocery,18,30,6,650,520
Cooking Oil 1L,Grocery,95,20,12,480,370
```

**Categories:** Grocery | Beverage | Cosmetic | Detergent

> Sample CSV download karne ke liye "Upload Data" tab mein "⬇ Sample CSV Download" button dabayein.

---

## 📱 Responsive Design

App ab har screen pe sahi kaam karta hai:

| Screen | Behavior |
|--------|----------|
| Desktop (>1024px) | Full sidebar + all columns |
| Tablet (768–1024px) | 2-column grids |
| Mobile (<768px) | Hamburger menu, slide-in sidebar |
| Small Mobile (<480px) | Single column, compact layout |

---

## 🤖 AI Assistant Setup (Claude API)

`src/components/ai-chat.js` mein API key paste karein:

```js
var CLAUDE_API_KEY = 'sk-ant-...';  // <-- yahan paste karo
```

> ⚠️ **Security:** API key sirf local/dev use ke liye. Production mein backend proxy use karein.

API key: `https://console.anthropic.com`

---

## 🎨 Colors Customize Karna

`src/styles/main.css` mein `:root` section:

```css
:root {
  --green: #1DB584;   /* Primary accent */
  --bg:    #0A0E14;   /* Main background */
  --text:  #CDD9E5;   /* Primary text */
}
```

---

Made with ❤️ for Pakistani retail businesses
