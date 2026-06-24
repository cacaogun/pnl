import * as XLSX from "xlsx"
import { MONTH_LABELS } from "./pnl"

export function exportExcel(project, result) {
  const wb = XLSX.utils.book_new()
  const a = project.assumptions
  const hc = project.headcount
  const ts = project.techstack

  // Sheet 1: Assumptions
  const assumData = [
    ["ASSUMPTIONS & INPUT PARAMETERS"],
    [],
    ["A. PRICING"],
    ["Basic (VND/user/mo)", a.priceBasic], ["Pro", a.pricePro], ["Enterprise", a.priceEnterprise],
    ["Annual Discount (%)", a.annualDiscount / 100], ["Setup Blended (₫/KH mới)", a.setupBlended],
    [],
    ["B. CUSTOMERS"],
    ["Starting Customers", a.startingCustomers], ["Growth/mo (%)", a.monthlyGrowthRate / 100],
    ["Churn/mo (%)", a.monthlyChurnRate / 100], ["% Monthly plan", a.pctMonthly / 100],
    ["% Enterprise tier", a.pctEnterprise / 100], ["% Pro tier", a.pctPro / 100],
    ["Avg users/KH", a.avgUsersPerCustomer],
    [],
    ["C. COGS"],
    ["Hosting base (₫/mo)", a.hostingBase], ["Hosting/KH", a.hostingPerCustomer],
    ["Support/KH/mo", a.supportPerCustomer], ["Payment gateway (%)", a.paymentGatewayPct / 100],
    [],
    ["D. OPEX"],
    ["Sales commission (% New MRR)", a.salesCommissionPct / 100],
    ["Marketing budget/mo", a.marketingBudget], ["G&A/mo", a.gaRent], ["Depreciation/mo", a.depreciation],
    [],
    ["E. TAX"], ["CIT (%)", a.citRate / 100], ["VAT (%)", a.vatRate / 100],
    [],
    ["F. HEADCOUNT"],
    ["Role", "Dept", "Type", "Count", "Salary/Head (₫/mo)", "Annual Raise %"],
    ...hc.map(h => [h.role, h.dept, h.type, h.count, h.salaryPerHead, h.annualRaisePct / 100]),
    [],
    ["G. TECH STACK COSTS"],
    ["Tool", "Category", "Billing", "Monthly Cost", "Per Customer Cost", "Free Quota", "Note"],
    ...ts.map(t => [t.name, t.category, t.billingType, t.monthlyCost, t.perCustomerCost, t.freeQuota, t.note]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(assumData), "Assumptions")

  // Sheet 2: Monthly P&L
  const m = result.months
  const sum = (k) => m.reduce((s, r) => s + r[k], 0)

  const monthlyData = [
    ["SAAS P&L – MONTHLY VIEW (VND)"],
    ["LINE ITEM", ...MONTH_LABELS, "FY Total"],
    ["CUSTOMER METRICS"],
    ["Starting Customers", ...m.map(r => r.startCust), ""],
    ["+ New Customers", ...m.map(r => r.newCust), sum("newCust")],
    ["− Churned", ...m.map(r => r.churned), sum("churned")],
    ["Ending Customers", ...m.map(r => r.endCust), m[11].endCust],
    [],
    ["REVENUE"],
    ["MRR", ...m.map(r => r.mrr), sum("mrr")],
    ["ARR (monthly recog.)", ...m.map(r => r.arr), sum("arr")],
    ["Setup Fees", ...m.map(r => r.setupFees), sum("setupFees")],
    ["TOTAL REVENUE", ...m.map(r => r.totalRevenue), sum("totalRevenue")],
    [],
    ["COGS"],
    ["Cloud / Hosting", ...m.map(r => r.hosting), sum("hosting")],
    ["Tech Stack", ...m.map(r => r.techCost), sum("techCost")],
    ["Customer Support", ...m.map(r => r.support), sum("support")],
    ["Payment Gateway", ...m.map(r => r.payment), sum("payment")],
    ["TOTAL COGS", ...m.map(r => r.totalCogs), sum("totalCogs")],
    ["GROSS PROFIT", ...m.map(r => r.grossProfit), sum("grossProfit")],
    ["Gross Margin %", ...m.map(r => r.grossMargin), sum("grossProfit") / sum("totalRevenue")],
    [],
    ["OPEX"],
    ["Total Headcount Cost", ...m.map(r => r.totalHcCost), sum("totalHcCost")],
    ["Sales Commission", ...m.map(r => r.commissionNew), sum("commissionNew")],
    ["Marketing", ...m.map(() => a.marketingBudget), a.marketingBudget * 12],
    ["G&A", ...m.map(() => a.gaRent), a.gaRent * 12],
    ["Depreciation", ...m.map(() => a.depreciation), a.depreciation * 12],
    ["TOTAL OPEX", ...m.map(r => r.totalOpex), sum("totalOpex")],
    [],
    ["PROFITABILITY"],
    ["EBITDA", ...m.map(r => r.ebitda), sum("ebitda")],
    ["EBITDA Margin %", ...m.map(r => r.ebitdaMargin), sum("ebitda") / sum("totalRevenue")],
    ["Income Tax", ...m.map(r => r.tax), sum("tax")],
    ["NET PROFIT", ...m.map(r => r.netProfit), sum("netProfit")],
    ["Net Margin %", ...m.map(r => r.netMargin), sum("netProfit") / sum("totalRevenue")],
    [],
    ["SAAS KPIS"],
    ["MRR", ...m.map(r => r.mrr + r.arr), ""],
    ["ARPU (monthly)", ...m.map(r => r.arpu), ""],
    ["LTV", ...m.map(r => r.ltv), ""],
    ["CAC", ...m.map(r => r.cac), ""],
    ["LTV:CAC", ...m.map(r => r.ltvCac), ""],
    ["Revenue per Head", ...m.map(r => r.revenuePerHead), ""],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthlyData), "Monthly P&L")

  // Sheet 3: Annual Summary
  const ann = result.annual
  const annData = [
    ["SAAS ANNUAL SUMMARY (VND)"],
    ["LINE ITEM", "FY Amount", "% of Revenue", "Benchmark"],
    ["TOTAL REVENUE", ann.revenue, 1, ""],
    ["TOTAL COGS", ann.cogs, ann.cogs / ann.revenue, "20-40% typical"],
    ["GROSS PROFIT", ann.grossProfit, ann.grossMargin, "60-80% SaaS"],
    ["TOTAL OPEX", ann.opex, ann.opex / ann.revenue, ""],
    ["EBITDA", ann.ebitda, ann.ebitdaMargin, ">15% mature SaaS"],
    ["Income Tax", ann.tax, ann.tax / ann.revenue, "CIT 20%"],
    ["NET PROFIT", ann.netProfit, ann.netMargin, ""],
    [],
    ["KEY METRICS"],
    ["ARR Run-Rate", ann.arrRunRate, "", ">$100k ARR = PMF"],
    ["Ending Customers", ann.endingCustomers, "", ""],
    ["Total Headcount", ann.totalHeadcount, "", ""],
    ["Annual Churn", ann.annualChurn / 100, "", "<10% healthy B2B"],
    ["Gross Margin", ann.grossMargin, "", ">70% SaaS"],
    ["EBITDA Margin", ann.ebitdaMargin, "", "15-30% mature"],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(annData), "Annual Summary")

  XLSX.writeFile(wb, `PnL_${project.name.replace(/\s+/g, "_")}.xlsx`)
}
