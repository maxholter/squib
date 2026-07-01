"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";

// A stable palette for the category slices.
export const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#ef4444",
  "#10b981",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#84cc16",
  "#06b6d4",
  "#eab308",
];

export function ExpensesDonut({
  data,
}: {
  data: { category: string; total: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No expenses to chart.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          stroke="hsl(var(--card))"
        >
          {data.map((entry, i) => (
            <Cell key={entry.category} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [formatCurrency(value), name]}
          contentStyle={{
            borderRadius: "0.5rem",
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            fontSize: "0.8125rem",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
