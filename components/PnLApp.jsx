'use client'

import { useState, useEffect, useCallback } from "react"
import {
  DEFAULT_HEADCOUNT, DEFAULT_TECHSTACK, DEFAULT_ASSUMPTIONS,
  MONTH_LABELS, DEPT_COLORS, TS_CATEGORIES, STORAGE_KEY,
  calcPnL, calcHeadcountMonthly, calcHeadcountByDept, calcTechStackMonthly,
  fVND, fPct, fNum, uid, S,
} from "../lib/pnl"
import { exportExcel } from "../lib/export"
import dynamic from "next/dynamic"

const Charts = dynamic(() => import("./Charts"), { ssr: false })

export default function PnLApp() {
  const [projects, setProjects] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState("dashboard")
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        setProjects(saved)
        if (saved.length > 0) setActiveId(saved[0].id)
      }
    } catch {}
    setLoading(false)
  }, [])

  const save = useCallback((updated) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
  }, [])

  const activeProject = projects.find(p => p.id === activeId)
  const result = activeProject ? calcPnL(activeProject.assumptions, activeProject.headcount, activeProject.techstack) : null

  const createProject = () => {
    if (!newName.trim()) return
    const p = {
      id: Date.now().toString(),
      name: newName.trim(),
      createdAt: new Date().toLocaleDateString("vi-VN"),
      assumptions: { ...DEFAULT_ASSUMPTIONS },
      headcount: DEFAULT_HEADCOUNT.map(h => ({ ...h, id: uid() })),
      techstack: DEFAULT_TECHSTACK.map(t => ({ ...t, id: uid() })),
    }
    const updated = [...projects, p]
    setProjects(updated); setActiveId(p.id); save(updated)
    setNewName(""); setShowNewModal(false); setTab("dashboard")
  }

  const updateAssumption = (key, val) => {
    const updated = projects.map(p => p.id === activeId ? { ...p, assumptions: { ...p.assumptions, [key]: val } } : p)
    setProjects(updated); save(updated)
  }

  const updateHeadcount = (newHc) => {
    const updated = projects.map(p => p.id === activeId ? { ...p, headcount: newHc } : p)
    setProjects(updated); save(updated)
  }

  const updateTechstack = (newTs) => {
    const updated = projects.map(p => p.id === activeId ? { ...p, techstack: newTs } : p)
    setProjects(updated); save(updated)
  }

  const deleteProject = (id) => {
    const updated = projects.filter(p => p.id !== id)
    setProjects(updated); save(updated)
    if (activeId === id) setActiveId(updated[0]?.id || null)
  }

  const IField = ({ label, k, suffix = "₫" }) => (
    <div style={S.inputRow}>
      <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="number" style={S.numInput} value={activeProject?.assumptions[k] ?? ""}
          onChange={e => updateAssumption(k, parseFloat(e.target.value) || 0)} />
        {suffix && <span style={{ fontSize: 10, color: "#374151", width: 18 }}>{suffix}</span>}
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ color: "#4f46e5" }}>Đang tải...</div>
    </div>
  )

  // ── HEADCOUNT TAB ──────────────────────────────────────────────────────────
  const HeadcountTab = () => {
    const hc = activeProject.headcount
    const totalMonthly = calcHeadcountMonthly(hc)
    const byDept = calcHeadcountByDept(hc)
    const totalPeople = hc.reduce((s, h) => s + h.count, 0)
    const addRow = () => updateHeadcount([...hc, { id: uid(), role: "New Role", dept: "R&D", type: "fulltime", count: 1, salaryPerHead: 15000000, annualRaisePct: 8 }])
    const delRow = (id) => updateHeadcount(hc.filter(h => h.id !== id))
    const editRow = (id, field, val) => updateHeadcount(hc.map(h => h.id === id ? { ...h, [field]: val } : h))

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "Total Headcount", val: totalPeople + " người", c: "#e2e8f0" },
            { label: "Monthly HC Cost", val: fVND(totalMonthly), c: "#a78bfa" },
            { label: "Annual HC Cost", val: fVND(totalMonthly * 12), c: "#f59e0b" },
            { label: "% of Revenue (FY)", val: result ? fPct(totalMonthly * 12 / result.annual.revenue) : "–", c: "#4ade80" },
          ].map((k, i) => (
            <div key={i} style={S.kpi(k.c)}>
              <div style={S.kpiLabel}>{k.label}</div>
              <div style={S.kpiVal(k.c)}>{k.val}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {Object.entries(byDept).map(([dept, cost]) => (
            <div key={dept} style={{ ...S.card(), borderColor: (DEPT_COLORS[dept] || "#6366f1") + "44" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: DEPT_COLORS[dept] || "#6366f1", marginBottom: 6 }}>{dept}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>{fVND(cost)}/tháng</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>
                {hc.filter(h => h.dept === dept).reduce((s, h) => s + h.count, 0)} người · {fVND(cost * 12)}/năm
              </div>
            </div>
          ))}
        </div>
        <div style={S.card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>👥 Headcount Detail</div>
            <button style={S.btn("sm")} onClick={addRow}>+ Thêm role</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={S.tableHeader}>
                  {["Role", "Dept", "Type", "Count", "Lương/người (₫/tháng)", "Raise/năm %", "Total/tháng", ""].map((h, i) => (
                    <th key={i} style={{ ...S.th(), textAlign: i === 0 ? "left" : "right", padding: "8px 10px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hc.map(h => (
                  <tr key={h.id} style={{ borderBottom: "1px solid #0f1428" }}>
                    <td style={{ padding: "6px 10px" }}>
                      <input value={h.role} onChange={e => editRow(h.id, "role", e.target.value)} style={{ ...S.textInput, width: 140 }} />
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <select value={h.dept} onChange={e => editRow(h.id, "dept", e.target.value)} style={{ ...S.textInput, color: DEPT_COLORS[h.dept] || "#e2e8f0" }}>
                        {["R&D", "S&M", "G&A"].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <select value={h.type} onChange={e => editRow(h.id, "type", e.target.value)} style={S.textInput}>
                        <option value="fulltime">Full-time</option>
                        <option value="contractor">Contractor</option>
                        <option value="parttime">Part-time</option>
                      </select>
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <input type="number" value={h.count} onChange={e => editRow(h.id, "count", parseInt(e.target.value) || 1)} style={{ ...S.numInput, width: 50 }} />
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <input type="number" value={h.salaryPerHead} onChange={e => editRow(h.id, "salaryPerHead", parseFloat(e.target.value) || 0)} style={{ ...S.numInput, width: 120 }} />
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <input type="number" value={h.annualRaisePct} onChange={e => editRow(h.id, "annualRaisePct", parseFloat(e.target.value) || 0)} style={{ ...S.numInput, width: 50 }} />
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right", color: "#a78bfa", fontWeight: 700 }}>
                      {fVND(h.count * h.salaryPerHead)}
                    </td>
                    <td style={{ padding: "6px 6px", textAlign: "right" }}>
                      <button style={S.btn("danger")} onClick={() => delRow(h.id)}>×</button>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#0a0d1c", borderTop: "2px solid #1a1f3a" }}>
                  <td colSpan={5} style={{ padding: "8px 10px", color: "#94a3b8", fontWeight: 700, fontSize: 11 }}>TOTAL</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#94a3b8", fontSize: 11 }}>{totalPeople} người</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#a78bfa", fontWeight: 800, fontSize: 13 }}>{fVND(totalMonthly)}/tháng</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "#374151" }}>
            💡 Annual Raise % dùng để project cost cho năm sau — chưa tính trong PnL năm hiện tại.
          </div>
        </div>
      </div>
    )
  }

  // ── TECH STACK TAB ─────────────────────────────────────────────────────────
  const TechStackTab = () => {
    const ts = activeProject.techstack
    const avgCust = result ? result.months.reduce((s, m) => s + m.endCust, 0) / 12 : 10
    const totalMonthly = calcTechStackMonthly(ts, avgCust)
    const addRow = () => updateTechstack([...ts, { id: uid(), name: "New Tool", category: "Other", billingType: "flat", monthlyCost: 0, perCustomerCost: 0, freeQuota: 0, note: "" }])
    const delRow = (id) => updateTechstack(ts.filter(t => t.id !== id))
    const editRow = (id, field, val) => updateTechstack(ts.map(t => t.id === id ? { ...t, [field]: val } : t))

    const byCategory = {}
    ts.forEach(t => {
      const cost = t.billingType === "flat" ? t.monthlyCost : t.monthlyCost + Math.max(0, avgCust - t.freeQuota) * t.perCustomerCost
      byCategory[t.category] = (byCategory[t.category] || 0) + cost
    })

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "Total Tech Cost/tháng", val: fVND(totalMonthly), c: "#38bdf8" },
            { label: "Annual Tech Cost", val: fVND(totalMonthly * 12), c: "#f59e0b" },
            { label: "Tech Cost / KH (avg)", val: fVND(avgCust > 0 ? totalMonthly / avgCust : 0), c: "#e2e8f0" },
            { label: "% of Revenue (FY)", val: result ? fPct((totalMonthly * 12) / result.annual.revenue) : "–", c: "#4ade80" },
          ].map((k, i) => (
            <div key={i} style={S.kpi(k.c)}>
              <div style={S.kpiLabel}>{k.label}</div>
              <div style={S.kpiVal(k.c)}>{k.val}</div>
            </div>
          ))}
        </div>
        <div style={S.card()}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>
            Cost breakdown by category (avg @ {Math.round(avgCust)} KH)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, cost]) => (
              <div key={cat} style={{ background: "#090c1a", border: "1px solid #1a1f3a", borderRadius: 8, padding: "8px 12px", minWidth: 140 }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 3 }}>{cat}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>{fVND(cost)}</div>
                <div style={{ fontSize: 10, color: "#374151" }}>{totalMonthly > 0 ? fPct(cost / totalMonthly) : "–"}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={S.card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>🛠 Tech Stack Cost Detail</div>
            <button style={S.btn("sm")} onClick={addRow}>+ Thêm tool</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={S.tableHeader}>
                  {["Tool", "Category", "Billing", "Monthly Cost (₫)", "Per Customer (₫)", "Free Quota", "Note", "Est. Monthly", ""].map((h, i) => (
                    <th key={i} style={{ ...S.th(), textAlign: i === 0 ? "left" : "right", padding: "8px 8px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ts.map(t => {
                  const estCost = t.billingType === "flat" ? t.monthlyCost : t.monthlyCost + Math.max(0, avgCust - t.freeQuota) * t.perCustomerCost
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #0f1428" }}>
                      <td style={{ padding: "5px 8px" }}>
                        <input value={t.name} onChange={e => editRow(t.id, "name", e.target.value)} style={{ ...S.textInput, width: 120 }} />
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>
                        <select value={t.category} onChange={e => editRow(t.id, "category", e.target.value)} style={{ ...S.textInput, fontSize: 10 }}>
                          {TS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>
                        <select value={t.billingType} onChange={e => editRow(t.id, "billingType", e.target.value)} style={S.textInput}>
                          <option value="flat">Flat</option>
                          <option value="per_customer">Per KH</option>
                        </select>
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>
                        <input type="number" value={t.monthlyCost} onChange={e => editRow(t.id, "monthlyCost", parseFloat(e.target.value) || 0)} style={{ ...S.numInput, width: 100 }} />
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>
                        <input type="number" value={t.perCustomerCost} onChange={e => editRow(t.id, "perCustomerCost", parseFloat(e.target.value) || 0)}
                          style={{ ...S.numInput, width: 90, color: t.billingType === "per_customer" ? "#93c5fd" : "#374151" }}
                          disabled={t.billingType !== "per_customer"} />
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>
                        <input type="number" value={t.freeQuota} onChange={e => editRow(t.id, "freeQuota", parseInt(e.target.value) || 0)}
                          style={{ ...S.numInput, width: 60, color: t.billingType === "per_customer" ? "#93c5fd" : "#374151" }}
                          disabled={t.billingType !== "per_customer"} />
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>
                        <input value={t.note} onChange={e => editRow(t.id, "note", e.target.value)} style={{ ...S.textInput, width: 100, fontSize: 10 }} />
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: "#38bdf8", fontWeight: 700 }}>{fVND(estCost)}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right" }}>
                        <button style={S.btn("danger")} onClick={() => delRow(t.id)}>×</button>
                      </td>
                    </tr>
                  )
                })}
                <tr style={{ background: "#0a0d1c", borderTop: "2px solid #1a1f3a" }}>
                  <td colSpan={6} style={{ padding: "8px 10px", color: "#94a3b8", fontWeight: 700, fontSize: 11 }}>TOTAL (avg @ {Math.round(avgCust)} KH)</td>
                  <td /><td style={{ padding: "8px 8px", textAlign: "right", color: "#38bdf8", fontWeight: 800, fontSize: 13 }}>{fVND(totalMonthly)}/tháng</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "#374151" }}>
            💡 Flat = fixed fee. Per KH = base + (customers − freeQuota) × perCustomerCost.
          </div>
        </div>
      </div>
    )
  }

  // ── MONTHLY P&L TAB ────────────────────────────────────────────────────────
  const MonthlyTab = () => {
    if (!result) return null
    const m = result.months
    const sum = (k) => m.reduce((s, r) => s + r[k], 0)
    const a = activeProject.assumptions
    const Row = ({ label, vals, fmt = fVND, hi, dim, hd }) => (
      <tr style={{ background: hi ? "#131836" : hd ? "#0a0d1c" : "transparent", borderBottom: "1px solid #0f1428" }}>
        <td style={{ padding: "6px 12px", color: hi ? "#e2e8f0" : hd ? "#94a3b8" : dim ? "#374151" : "#64748b", fontWeight: hi || hd ? 700 : 400, position: "sticky", left: 0, background: hi ? "#131836" : hd ? "#0a0d1c" : "#090c1a" }}>{label}</td>
        {vals.map((v, i) => <td key={i} style={S.td({ color: hi ? "#e2e8f0" : dim ? "#374151" : "#64748b", fontWeight: hi ? 700 : 400 })}>{fmt(v)}</td>)}
      </tr>
    )
    const Sep = ({ label }) => (
      <tr><td colSpan={15} style={{ padding: "10px 12px 4px", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#4f46e5" }}>{label}</td></tr>
    )
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={S.tableHeader}>
              <th style={{ ...S.th({ textAlign: "left", minWidth: 200, position: "sticky", left: 0, background: "#0a0d1c" }) }}>Line Item</th>
              {MONTH_LABELS.map(ml => <th key={ml} style={S.th({ minWidth: 85 })}>{ml}</th>)}
              <th style={S.th({ color: "#6366f1", minWidth: 100 })}>FY Total</th>
            </tr>
          </thead>
          <tbody>
            <Sep label="Customer Metrics" />
            <Row label="Starting Customers" vals={m.map(r => r.startCust)} fmt={fNum} />
            <Row label="+ New Customers" vals={m.map(r => r.newCust)} fmt={fNum} />
            <Row label="− Churned" vals={m.map(r => r.churned)} fmt={fNum} dim />
            <Row label="Ending Customers" vals={[...m.map(r => r.endCust), m[11].endCust]} fmt={fNum} hd />
            <Sep label="Revenue" />
            <Row label="MRR (Monthly Plan)" vals={[...m.map(r => r.mrr), sum("mrr")]} />
            <Row label="ARR (Annual – monthly recog.)" vals={[...m.map(r => r.arr), sum("arr")]} />
            <Row label="Setup Fees" vals={[...m.map(r => r.setupFees), sum("setupFees")]} dim />
            <Row label="TOTAL REVENUE" vals={[...m.map(r => r.totalRevenue), sum("totalRevenue")]} hi />
            <Sep label="COGS" />
            <Row label="Cloud / Hosting" vals={[...m.map(r => r.hosting), sum("hosting")]} />
            <Row label="Tech Stack (all tools)" vals={[...m.map(r => r.techCost), sum("techCost")]} />
            <Row label="Customer Support" vals={[...m.map(r => r.support), sum("support")]} />
            <Row label="Payment Gateway" vals={[...m.map(r => r.payment), sum("payment")]} />
            <Row label="TOTAL COGS" vals={[...m.map(r => r.totalCogs), sum("totalCogs")]} hi />
            <Row label="GROSS PROFIT" vals={[...m.map(r => r.grossProfit), sum("grossProfit")]} hi />
            <Row label="Gross Margin %" vals={[...m.map(r => r.grossMargin), sum("grossProfit") / sum("totalRevenue")]} fmt={fPct} />
            <Sep label="OPEX" />
            <Row label="Total Headcount Cost" vals={[...m.map(r => r.totalHcCost), sum("totalHcCost")]} />
            <Row label="Sales Commission" vals={[...m.map(r => r.commissionNew), sum("commissionNew")]} dim />
            <Row label="Marketing" vals={[...m.map(() => a.marketingBudget), a.marketingBudget * 12]} />
            <Row label="G&A" vals={[...m.map(() => a.gaRent), a.gaRent * 12]} />
            <Row label="Depreciation" vals={[...m.map(() => a.depreciation), a.depreciation * 12]} dim />
            <Row label="TOTAL OPEX" vals={[...m.map(r => r.totalOpex), sum("totalOpex")]} hi />
            <Sep label="Profitability" />
            <Row label="EBITDA" vals={[...m.map(r => r.ebitda), sum("ebitda")]} hi />
            <Row label="EBITDA Margin %" vals={[...m.map(r => r.ebitdaMargin), sum("ebitda") / sum("totalRevenue")]} fmt={fPct} />
            <Row label="Income Tax (CIT)" vals={[...m.map(r => r.tax), sum("tax")]} dim />
            <Row label="NET PROFIT / (LOSS)" vals={[...m.map(r => r.netProfit), sum("netProfit")]} hi />
            <Row label="Net Margin %" vals={[...m.map(r => r.netMargin), sum("netProfit") / sum("totalRevenue")]} fmt={fPct} />
            <Sep label="SaaS KPIs" />
            <Row label="MRR" vals={m.map(r => r.mrr + r.arr)} />
            <Row label="ARPU (monthly)" vals={m.map(r => r.arpu)} />
            <Row label="LTV" vals={m.map(r => r.ltv)} />
            <Row label="CAC" vals={m.map(r => r.cac)} />
            <Row label="LTV:CAC" vals={m.map(r => r.ltvCac)} fmt={v => v.toFixed(1) + "x"} />
            <Row label="Revenue per Head" vals={m.map(r => r.revenuePerHead)} />
          </tbody>
        </table>
      </div>
    )
  }

  // ── COMPARE TAB ────────────────────────────────────────────────────────────
  const CompareTab = () => {
    if (projects.length < 2) return (
      <div style={S.emptyState}>
        <div style={{ fontSize: 32 }}>⚖️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>Cần ít nhất 2 dự án để so sánh</div>
        <button style={S.btn("primary")} onClick={() => setShowNewModal(true)}>+ Tạo dự án mới</button>
      </div>
    )
    const results = projects.map(p => ({ p, r: calcPnL(p.assumptions, p.headcount, p.techstack) }))
    const CR = ({ label, fn, fmt = fVND, better = "high" }) => {
      const vals = results.map(({ r }) => fn(r))
      const best = better === "high" ? Math.max(...vals) : Math.min(...vals)
      return (
        <tr style={{ borderBottom: "1px solid #0f1428" }}>
          <td style={{ padding: "8px 14px", color: "#64748b" }}>{label}</td>
          {vals.map((v, i) => (
            <td key={i} style={{ padding: "8px 14px", textAlign: "right", color: v === best ? "#4ade80" : "#94a3b8", fontWeight: v === best ? 700 : 400 }}>{fmt(v)}</td>
          ))}
        </tr>
      )
    }
    return (
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 18 }}>So sánh tất cả dự án</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #1a1f3a" }}>
              <th style={S.th({ textAlign: "left" })}>Chỉ số</th>
              {projects.map(p => <th key={p.id} style={S.th({ color: p.id === activeId ? "#a5b4fc" : "#64748b" })}>{p.name}</th>)}
            </tr>
          </thead>
          <tbody>
            <CR label="Total Revenue (FY)" fn={r => r.annual.revenue} />
            <CR label="Gross Margin" fn={r => r.annual.grossMargin} fmt={fPct} />
            <CR label="EBITDA Margin" fn={r => r.annual.ebitdaMargin} fmt={fPct} />
            <CR label="Net Profit" fn={r => r.annual.netProfit} />
            <CR label="Net Margin" fn={r => r.annual.netMargin} fmt={fPct} />
            <CR label="ARR Run-Rate" fn={r => r.annual.arrRunRate} />
            <CR label="Ending Customers" fn={r => r.annual.endingCustomers} fmt={v => v + " KH"} />
            <CR label="Total Headcount" fn={r => r.annual.totalHeadcount} fmt={v => v + " người"} />
            <CR label="Annual Churn" fn={r => r.annual.annualChurn} fmt={v => v.toFixed(0) + "%"} better="low" />
            <CR label="LTV:CAC (avg)" fn={r => r.months.reduce((s, m) => s + m.ltvCac, 0) / 12} fmt={v => v.toFixed(1) + "x"} />
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: "#374151", marginTop: 8, textAlign: "right" }}>🟢 = giá trị tốt nhất</div>
      </div>
    )
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...S.app, display: "flex", height: "100vh" }}>

      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={S.sideHeader}>
          <div style={{ fontSize: 14, fontWeight: 800, background: "linear-gradient(135deg,#818cf8,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            PnL Manager
          </div>
          <div style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>SaaS Edition</div>
        </div>
        <div style={S.sideLabel}>Dự án</div>
        {projects.map(p => (
          <div key={p.id} style={S.projItem(p.id === activeId)} onClick={() => { setActiveId(p.id); setTab("dashboard") }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>📁 {p.name}</span>
            <button onClick={e => { e.stopPropagation(); deleteProject(p.id) }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#374151", fontSize: 13, padding: "0 0 0 4px" }}>×</button>
          </div>
        ))}
        <div style={{ padding: "10px 16px", marginTop: "auto", borderTop: "1px solid #1a1f3a" }}>
          <button style={{ ...S.btn("secondary"), width: "100%", fontSize: 11 }} onClick={() => setShowNewModal(true)}>
            + Dự án mới
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        {activeProject && (
          <div style={S.topbar}>
            <div style={{ flex: 1, display: "flex" }}>
              {[["dashboard","📊 Dashboard"],["inputs","⚙️ Assumptions"],["headcount","👥 Headcount"],["techstack","🛠 Tech Stack"],["monthly","📅 Monthly P&L"],["compare","⚖️ So sánh"]].map(([id, label]) => (
                <button key={id} style={S.tabBtn(tab === id)} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>
            <button style={S.btn("secondary")} onClick={() => exportExcel(activeProject, result)}>📥 Export Excel</button>
          </div>
        )}

        <div style={S.content}>
          {/* EMPTY STATE */}
          {!activeProject && (
            <div style={S.emptyState}>
              <div style={{ fontSize: 48 }}>📊</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Chưa có dự án nào</div>
              <div style={{ fontSize: 13, color: "#374151" }}>Tạo dự án để bắt đầu tính P&L</div>
              <button style={S.btn("primary")} onClick={() => setShowNewModal(true)}>+ Tạo dự án mới</button>
            </div>
          )}

          {/* DASHBOARD */}
          {activeProject && tab === "dashboard" && result && (
            <Charts result={result} activeProject={activeProject} />
          )}

          {/* INPUTS */}
          {activeProject && tab === "inputs" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div style={S.card()}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>💲 Pricing & Revenue</div>
                <span style={S.secLabel}>Subscription (₫/tháng/user)</span>
                <IField label="Giá Basic" k="priceBasic" /><IField label="Giá Pro" k="pricePro" /><IField label="Giá Enterprise" k="priceEnterprise" />
                <IField label="Annual Discount (%)" k="annualDiscount" suffix="%" />
                <IField label="Setup blended (₫/KH mới)" k="setupBlended" />
                <span style={S.secLabel}>Customer mix</span>
                <IField label="Khách đầu T1" k="startingCustomers" suffix="KH" />
                <IField label="Tăng trưởng KH/tháng (%)" k="monthlyGrowthRate" suffix="%" />
                <IField label="Churn rate/tháng (%)" k="monthlyChurnRate" suffix="%" />
                <IField label="% KH Monthly plan" k="pctMonthly" suffix="%" />
                <IField label="% KH Enterprise tier" k="pctEnterprise" suffix="%" />
                <IField label="% KH Pro tier" k="pctPro" suffix="%" />
                <IField label="Avg seats/KH" k="avgUsersPerCustomer" suffix="seat" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={S.card()}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>🏭 COGS (per-customer)</div>
                  <IField label="Hosting base (₫/tháng)" k="hostingBase" />
                  <IField label="Hosting/KH (₫/tháng)" k="hostingPerCustomer" />
                  <IField label="Support cost/KH (₫/tháng)" k="supportPerCustomer" />
                  <IField label="Payment gateway (% Rev)" k="paymentGatewayPct" suffix="%" />
                  <div style={{ fontSize: 10, color: "#374151", marginTop: 8 }}>💡 Tech stack costs → tab Tech Stack</div>
                </div>
                <div style={S.card()}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>💼 OPEX (non-headcount)</div>
                  <IField label="Sales commission (% New MRR)" k="salesCommissionPct" suffix="%" />
                  <IField label="Marketing budget/tháng" k="marketingBudget" />
                  <IField label="G&A – Rent, Admin, Legal" k="gaRent" />
                  <IField label="Depreciation/Amortization" k="depreciation" />
                  <div style={{ fontSize: 10, color: "#374151", marginTop: 8 }}>💡 Headcount salaries → tab Headcount</div>
                </div>
                <div style={S.card()}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>🧾 Tax</div>
                  <IField label="CIT rate (%)" k="citRate" suffix="%" />
                  <IField label="VAT (%) if applicable" k="vatRate" suffix="%" />
                </div>
              </div>
            </div>
          )}

          {activeProject && tab === "headcount" && <HeadcountTab />}
          {activeProject && tab === "techstack" && <TechStackTab />}
          {activeProject && tab === "monthly" && <MonthlyTab />}
          {tab === "compare" && <CompareTab />}
        </div>
      </div>

      {/* NEW PROJECT MODAL */}
      {showNewModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000b", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#0d1020", border: "1px solid #1a1f3a", borderRadius: 16, padding: 28, width: 360 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>Tạo dự án mới</div>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 18 }}>Default data sẽ load từ template 8onyX</div>
            <input autoFocus placeholder="VD: 8onyX CRM, KOL Manager..."
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createProject()}
              style={{ width: "100%", padding: "10px 14px", background: "#090c1a", border: "1px solid #1a1f3a", borderRadius: 8, color: "#e2e8f0", fontSize: 13, outline: "none", marginBottom: 16, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={S.btn("ghost")} onClick={() => setShowNewModal(false)}>Huỷ</button>
              <button style={S.btn("primary")} onClick={createProject}>Tạo dự án →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
