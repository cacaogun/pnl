'use client'

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { calcTechStackMonthly, fVND, fPct, fNum, S } from "../lib/pnl"

const customTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#0d1020", border: "1px solid #1a1f3a", borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", marginBottom: 5 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 11, color: p.color || p.fill, marginBottom: 2 }}>
          {p.name}: {fVND(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Charts({ result, activeProject }) {
  const ann = result.annual
  const m = result.months

  const chartData = m.map(mo => ({
    month: mo.month,
    "Doanh thu": Math.round(mo.totalRevenue / 1e6),
    "Gross Profit": Math.round(mo.grossProfit / 1e6),
    "Net Profit": Math.round(mo.netProfit / 1e6),
  }))

  const costData = m.map(mo => ({
    month: mo.month,
    "Headcount": Math.round(mo.totalHcCost / 1e6),
    "Tech Stack": Math.round(mo.techCost / 1e6),
    "Hosting": Math.round(mo.hosting / 1e6),
    "Marketing/G&A": Math.round((mo.totalOpex - mo.totalHcCost) / 1e6),
  }))

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>{activeProject.name}</h2>
        <span style={{ fontSize: 11, color: "#374151" }}>
          SaaS · {activeProject.createdAt} · {ann.totalHeadcount} người · {activeProject.techstack.length} tools
        </span>
      </div>

      {/* KPI Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total Revenue (FY)", val: fVND(ann.revenue), c: "#6366f1", sub: null },
          { label: "Gross Margin", val: fPct(ann.grossMargin), c: "#4ade80", sub: fVND(ann.grossProfit), badge: ann.grossMargin > 0.7 ? "✅ >70%" : "⚠️ <70%" },
          { label: "EBITDA Margin", val: fPct(ann.ebitdaMargin), c: "#a78bfa", sub: fVND(ann.ebitda), badge: ann.ebitdaMargin > 0.15 ? "✅ >15%" : "⚠️ <15%" },
          { label: "Net Profit (after CIT)", val: fVND(ann.netProfit), c: "#60a5fa", sub: "Net: " + fPct(ann.netMargin) },
        ].map((k, i) => (
          <div key={i} style={S.kpi(k.c)}>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={S.kpiVal(k.c)}>{k.val}</div>
            {k.sub && <div style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>{k.sub}</div>}
            {k.badge && <div style={{ fontSize: 10, color: k.c, marginTop: 3, fontWeight: 700 }}>{k.badge}</div>}
          </div>
        ))}
      </div>

      {/* KPI Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "ARR Run-Rate", val: fVND(ann.arrRunRate), c: "#f59e0b" },
          { label: "Ending Customers", val: ann.endingCustomers + " KH", c: "#e2e8f0" },
          { label: "Total Headcount", val: ann.totalHeadcount + " người", c: "#a78bfa" },
          { label: "Tech Stack/mo", val: fVND(calcTechStackMonthly(activeProject.techstack, ann.endingCustomers)), c: "#38bdf8" },
          { label: "Annual Churn", val: ann.annualChurn.toFixed(0) + "%", c: ann.annualChurn < 10 ? "#4ade80" : "#f87171" },
        ].map((k, i) => (
          <div key={i} style={{ ...S.card(), padding: "10px 12px" }}>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: k.c }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div style={S.card()}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>Revenue & Profit (triệu ₫)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                {[["g1","#6366f1"],["g2","#4ade80"],["g3","#60a5fa"]].map(([id, c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.3} /><stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f3a" />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={customTip} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
              <Area type="monotone" dataKey="Doanh thu" stroke="#6366f1" fill="url(#g1)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Gross Profit" stroke="#4ade80" fill="url(#g2)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Net Profit" stroke="#60a5fa" fill="url(#g3)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card()}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>Cost breakdown (triệu ₫)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1f3a" />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={customTip} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
              <Bar dataKey="Headcount" stackId="a" fill="#a78bfa" />
              <Bar dataKey="Tech Stack" stackId="a" fill="#38bdf8" />
              <Bar dataKey="Hosting" stackId="a" fill="#6366f1" />
              <Bar dataKey="Marketing/G&A" stackId="a" fill="#f59e0b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
