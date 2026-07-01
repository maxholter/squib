"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";

export function DashboardChart({
  data,
}: {
  data: { month: string; income: number; expenses: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          className="text-xs"
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          tickFormatter={(v) => formatCurrencyShort(v as number)}
          tickLine={false}
          axisLine={false}
          width={72}
          className="text-xs"
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === "income" ? "Income" : "Expenses",
          ]}
          contentStyle={{
            borderRadius: "0.5rem",
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            fontSize: "0.8125rem",
          }}
        />
        <Legend
          formatter={(value) => (value === "income" ? "Income" : "Expenses")}
          wrapperStyle={{ fontSize: "0.8125rem" }}
        />
        <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
