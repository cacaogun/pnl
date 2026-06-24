// ─── DEFAULTS ──────────────────────────────────────────────────────────────
export const DEFAULT_HEADCOUNT = [
  { id: "hc1", role: "Backend Engineer", dept: "R&D", type: "fulltime", count: 1, salaryPerHead: 20000000, annualRaisePct: 10 },
  { id: "hc2", role: "Frontend Engineer", dept: "R&D", type: "fulltime", count: 1, salaryPerHead: 18000000, annualRaisePct: 10 },
  { id: "hc3", role: "Sales / BD", dept: "S&M", type: "fulltime", count: 1, salaryPerHead: 15000000, annualRaisePct: 8 },
  { id: "hc4", role: "Customer Success", dept: "G&A", type: "fulltime", count: 1, salaryPerHead: 12000000, annualRaisePct: 8 },
]

export const DEFAULT_TECHSTACK = [
  { id: "ts1", name: "Supabase", category: "Database/Backend", billingType: "flat", monthlyCost: 500000, perCustomerCost: 0, freeQuota: 2, note: "Pro plan" },
  { id: "ts2", name: "Vercel", category: "Hosting/Deploy", billingType: "flat", monthlyCost: 500000, perCustomerCost: 0, freeQuota: 0, note: "Pro plan" },
  { id: "ts3", name: "GitHub", category: "DevOps", billingType: "flat", monthlyCost: 200000, perCustomerCost: 0, freeQuota: 0, note: "Team plan" },
  { id: "ts4", name: "Alibaba Cloud CDN", category: "Infrastructure", billingType: "per_customer", monthlyCost: 0, perCustomerCost: 50000, freeQuota: 0, note: "Per active customer" },
  { id: "ts5", name: "Sentry", category: "DevOps", billingType: "flat", monthlyCost: 300000, perCustomerCost: 0, freeQuota: 0, note: "Team plan" },
  { id: "ts6", name: "SendGrid", category: "Communication", billingType: "per_customer", monthlyCost: 100000, perCustomerCost: 20000, freeQuota: 0, note: "Base + per KH" },
]

export const DEFAULT_ASSUMPTIONS = {
  priceBasic: 1500000,
  pricePro: 3500000,
  priceEnterprise: 8000000,
  annualDiscount: 15,
  setupBlended: 7000000,
  startingCustomers: 10,
  monthlyGrowthRate: 10,
  monthlyChurnRate: 3,
  pctMonthly: 55,
  pctEnterprise: 20,
  pctPro: 35,
  avgUsersPerCustomer: 5,
  hostingBase: 8000000,
  hostingPerCustomer: 150000,
  supportPerCustomer: 100000,
  paymentGatewayPct: 1.5,
  salesCommissionPct: 8,
  marketingBudget: 5000000,
  gaRent: 10000000,
  depreciation: 2000000,
  citRate: 20,
  vatRate: 10,
}

export const MONTH_LABELS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"]
export const DEPT_COLORS = { "R&D": "#6366f1", "S&M": "#ec4899", "G&A": "#f59e0b" }
export const TS_CATEGORIES = ["Database/Backend","Hosting/Deploy","Infrastructure","DevOps","Communication","Other"]
export const STORAGE_KEY = "pnl_projects_v2"

// ─── CALCULATION ENGINE ────────────────────────────────────────────────────
export function calcTechStackMonthly(techstack, customerCount) {
  return techstack.reduce((sum, t) => {
    const flat = t.billingType === "flat" ? t.monthlyCost : 0
    const variable = t.billingType === "per_customer"
      ? t.monthlyCost + (Math.max(0, customerCount - t.freeQuota) * t.perCustomerCost)
      : 0
    return sum + flat + variable
  }, 0)
}

export function calcHeadcountMonthly(headcount) {
  return headcount.reduce((sum, h) => sum + h.count * h.salaryPerHead, 0)
}

export function calcHeadcountByDept(headcount) {
  const depts = { "R&D": 0, "S&M": 0, "G&A": 0 }
  headcount.forEach(h => { depts[h.dept] = (depts[h.dept] || 0) + h.count * h.salaryPerHead })
  return depts
}

export function calcPnL(a, headcount, techstack) {
  const months = []
  let startCust = a.startingCustomers

  for (let m = 0; m < 12; m++) {
    const newCust = Math.round(startCust * (a.monthlyGrowthRate / 100))
    const churned = Math.round(startCust * (a.monthlyChurnRate / 100))
    const endCust = startCust + newCust - churned
    const avgCust = (startCust + endCust) / 2

    const pctBasic = (100 - a.pctEnterprise - a.pctPro) / 100
    const blendedMonthly =
      pctBasic * a.priceBasic * a.avgUsersPerCustomer +
      (a.pctPro / 100) * a.pricePro * a.avgUsersPerCustomer +
      (a.pctEnterprise / 100) * a.priceEnterprise * a.avgUsersPerCustomer

    const mrrMonthly = avgCust * (a.pctMonthly / 100) * blendedMonthly
    const arrMonthly = avgCust * (1 - a.pctMonthly / 100) * blendedMonthly * (1 - a.annualDiscount / 100)
    const setupFees = newCust * a.setupBlended
    const totalRevenue = mrrMonthly + arrMonthly + setupFees

    const hosting = a.hostingBase + avgCust * a.hostingPerCustomer
    const techCost = calcTechStackMonthly(techstack, avgCust)
    const support = avgCust * a.supportPerCustomer
    const payment = totalRevenue * (a.paymentGatewayPct / 100)
    const totalCogs = hosting + techCost + support + payment
    const grossProfit = totalRevenue - totalCogs
    const grossMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0

    const hcByDept = calcHeadcountByDept(headcount)
    const totalHcCost = calcHeadcountMonthly(headcount)
    const commissionNew = newCust > 0 ? mrrMonthly * (newCust / Math.max(avgCust, 1)) * (a.salesCommissionPct / 100) : 0
    const totalOpex = totalHcCost + commissionNew + a.marketingBudget + a.gaRent + a.depreciation

    const ebitda = grossProfit - totalOpex
    const ebitdaMargin = totalRevenue > 0 ? ebitda / totalRevenue : 0
    const tax = ebitda > 0 ? ebitda * (a.citRate / 100) : 0
    const netProfit = ebitda - tax
    const netMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0

    const arpu = avgCust > 0 ? (mrrMonthly + arrMonthly) / avgCust : 0
    const ltv = a.monthlyChurnRate > 0 ? arpu / (a.monthlyChurnRate / 100) : 0
    const cac = newCust > 0 ? ((hcByDept["S&M"] || 0) + a.marketingBudget) / newCust : 0
    const ltvCac = cac > 0 ? ltv / cac : 0
    const totalHeadcount = headcount.reduce((s, h) => s + h.count, 0)
    const revenuePerHead = totalHeadcount > 0 ? totalRevenue / totalHeadcount : 0

    months.push({
      month: MONTH_LABELS[m],
      startCust, newCust, churned, endCust,
      mrr: mrrMonthly, arr: arrMonthly, setupFees, totalRevenue,
      hosting, techCost, support, payment, totalCogs,
      grossProfit, grossMargin,
      totalHcCost, hcByDept: { ...hcByDept }, commissionNew,
      totalOpex, ebitda, ebitdaMargin, tax, netProfit, netMargin,
      arpu, ltv, cac, ltvCac, totalHeadcount, revenuePerHead,
    })

    startCust = endCust
  }

  const sum = (k) => months.reduce((s, m) => s + m[k], 0)
  const last = months[11]
  const annualRevenue = sum("totalRevenue")
  const annualGP = annualRevenue - sum("totalCogs")
  const annualEbitda = sum("ebitda")
  const annualNet = sum("netProfit")

  return {
    months,
    annual: {
      revenue: annualRevenue,
      cogs: sum("totalCogs"),
      grossProfit: annualGP,
      grossMargin: annualRevenue > 0 ? annualGP / annualRevenue : 0,
      opex: sum("totalOpex"),
      ebitda: annualEbitda,
      ebitdaMargin: annualRevenue > 0 ? annualEbitda / annualRevenue : 0,
      tax: sum("tax"),
      netProfit: annualNet,
      netMargin: annualRevenue > 0 ? annualNet / annualRevenue : 0,
      endingCustomers: last.endCust,
      arrRunRate: (last.mrr + last.arr) * 12,
      avgArpu: last.arpu,
      annualChurn: a.monthlyChurnRate * 12,
      totalHeadcount: last.totalHeadcount,
    }
  }
}

// ─── FORMATTERS ────────────────────────────────────────────────────────────
export const fVND = (v) => {
  if (!isFinite(v)) return "–"
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + " tỷ"
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(0) + " tr"
  return Math.round(v).toLocaleString("vi-VN")
}
export const fPct = (v) => isFinite(v) ? (v * 100).toFixed(1) + "%" : "–"
export const fNum = (v) => Math.round(v).toLocaleString("vi-VN")
export const uid = () => Math.random().toString(36).slice(2, 8)

// ─── STYLES ────────────────────────────────────────────────────────────────
export const S = {
  app: { fontFamily: "'Inter', -apple-system, sans-serif", background: "#090c1a", minHeight: "100vh", color: "#e2e8f0" },
  sidebar: { width: 200, background: "#0d1020", borderRight: "1px solid #1a1f3a", display: "flex", flexDirection: "column" },
  sideHeader: { padding: "16px", borderBottom: "1px solid #1a1f3a" },
  sideLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#374151", padding: "10px 16px 6px" },
  projItem: (active) => ({
    padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500,
    color: active ? "#a5b4fc" : "#64748b", background: active ? "#13183a" : "transparent",
    borderLeft: active ? "2px solid #6366f1" : "2px solid transparent",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  }),
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar: { background: "#0d1020", borderBottom: "1px solid #1a1f3a", padding: "0 20px", display: "flex", alignItems: "center" },
  tabBtn: (active) => ({
    padding: "13px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
    background: "transparent", color: active ? "#a5b4fc" : "#475569",
    borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
  }),
  content: { flex: 1, overflow: "auto", padding: 20 },
  card: (extra = {}) => ({ background: "#0d1020", border: "1px solid #1a1f3a", borderRadius: 10, padding: 16, ...extra }),
  secLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#4f46e5", margin: "12px 0 6px", display: "block" },
  inputRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #0f1428" },
  numInput: { background: "#090c1a", border: "1px solid #1a1f3a", borderRadius: 6, color: "#93c5fd", fontSize: 11, fontWeight: 600, padding: "3px 8px", width: 110, textAlign: "right", outline: "none" },
  textInput: { background: "#090c1a", border: "1px solid #1a1f3a", borderRadius: 6, color: "#e2e8f0", fontSize: 11, padding: "3px 8px", outline: "none" },
  btn: (v = "primary") => ({
    padding: v === "sm" ? "4px 10px" : "8px 16px", borderRadius: 7, border: "none", cursor: "pointer",
    fontSize: v === "sm" ? 11 : 12, fontWeight: 700,
    background: v === "primary" ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : v === "danger" ? "#1f0a0a" : v === "ghost" ? "transparent" : "#13183a",
    color: v === "primary" ? "#fff" : v === "danger" ? "#ef4444" : "#a5b4fc",
    border: v === "danger" ? "1px solid #ef444433" : "none",
  }),
  kpi: (c = "#6366f1") => ({ background: "#0d1020", border: `1px solid ${c}22`, borderRadius: 10, padding: "12px 14px" }),
  kpiVal: (c) => ({ fontSize: 20, fontWeight: 800, color: c, lineHeight: 1.1, marginTop: 2 }),
  kpiLabel: { fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 },
  tableHeader: { background: "#0a0d1c", borderBottom: "2px solid #1a1f3a" },
  th: (extra = {}) => ({ padding: "8px 10px", textAlign: "right", color: "#475569", fontWeight: 700, fontSize: 11, ...extra }),
  td: (extra = {}) => ({ padding: "6px 10px", textAlign: "right", fontSize: 11, color: "#64748b", ...extra }),
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 14 },
}
