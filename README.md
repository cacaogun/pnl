# PnL Manager – SaaS Edition

Personal P&L calculator cho SaaS products. Stack: Next.js 14 + Recharts + SheetJS.

## Deploy lên Vercel (3 bước)

1. Push folder này lên GitHub repo mới
2. Vào vercel.com → New Project → Import repo đó
3. Click Deploy — xong, không cần config gì thêm

## Chạy local

```bash
npm install
npm run dev
# mở http://localhost:3000
```

## Cấu trúc

```
app/
  layout.js       # Root layout
  page.js         # Entry point
components/
  PnLApp.jsx      # Main app (sidebar, tabs, all UI)
  Charts.jsx      # Recharts dashboard (client-only)
lib/
  pnl.js          # Calculation engine + defaults + styles
  export.js       # Excel export (SheetJS)
```

## Features

- Dashboard: KPI cards + Revenue/Cost charts
- Assumptions: Pricing, Customer mix, COGS, OPEX, Tax
- Headcount: Per-role, per-dept breakdown với annual raise
- Tech Stack: Flat vs per-customer billing, free quota
- Monthly P&L: 12-month table + FY total
- So sánh: Side-by-side nhiều dự án
- Export Excel: 3 sheets (Assumptions / Monthly P&L / Annual Summary)
- Lưu localStorage: persist qua session
