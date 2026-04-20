# GA4 Maccabi – WordPress Plugin

## 🧩 פלאגין WordPress

### התקנה
1. העתק את התיקייה `ga4-maccabi-tracking` לתוך `wp-content/plugins/`
2. הפעל את הפלאגין ממסך "תוספים"
3. דרוש WooCommerce פעיל

### מבנה הפלאגין
```
ga4-maccabi-tracking/
├── ga4-maccabi-tracking.php   # קובץ ראשי
├── assets/
│   └── js/
│       └── ga4-tracking.js    # סקריפט GA4 מלא
└── README.txt
```

---

## 🔒 Server-Injected Purchase (Enterprise)

- בדף תודה (order-received) ה-PHP מייצר `window.ga4PurchaseData` עם נתוני ההזמנה מהשרת
- ה-JS קורא ל-`ga4PurchaseData` ונדחף ל-dataLayer – בלי DOM scraping
- Fallback ל-DOM parse אם אין `ga4PurchaseData`

---

## 📊 Debug Mode

### הפעלה
- **Query param:** `?ga4debug=1` בכל URL
- **localStorage:** `localStorage.setItem('ga4debug', '1')` ואז רענון

### מה רואים
- פאנל קבוע בפינה הימנית התחתונה
- כל `dataLayer.push` בזמן אמת עם סיכום + JSON
- כפתורים: Clear, Close

---

## קבצים ישנים (לפני פלאגין)

| קובץ | הערה |
|------|------|
| `ga4-purchase-inject.php` | מוכל כעת בתוך הפלאגין |
| `ga4-tracking.js` | מוכל ב-`ga4-maccabi-tracking/assets/js/` |
