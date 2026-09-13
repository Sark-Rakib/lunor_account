"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#84cc16"];

const axisProps = {
  tick: { fontSize: 11, fill: "#71717a" },
  axisLine: { stroke: "#e4e4e7" },
  tickLine: false,
};

export function AreaChartCard({ title, data, dataKey, color = "#6366f1", height = 280, loading, subtitle }) {
  if (loading) return <ChartSkeleton />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <span className="text-xs text-zinc-400">{subtitle}</span>}
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} width={44} />
            <Tooltip
              formatter={(v) => [`৳${Number(v).toLocaleString("en-IN")}`, ""]}
              contentStyle={{ borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 12 }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill="url(#gradRevenue)" strokeWidth={2} strokeKey="revenue" />
            {data[0]?.expenses !== undefined && (
              <Area type="monotone" dataKey="expenses" stroke="#f59e0b" fill="url(#gradExpense)" strokeWidth={2} name="Expenses" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function BarChartCard({ title, data, dataKey, xKey = "name", height = 280, loading }) {
  if (loading) return <ChartSkeleton />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey={xKey} {...axisProps} interval={0} />
            <YAxis {...axisProps} width={44} />
            <Tooltip formatter={(v) => [`৳${Number(v).toLocaleString("en-IN")}`, ""]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
            <Bar dataKey={dataKey} fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DonutChartCard({ title, data, height = 260, loading, valueFormatter }) {
  if (loading) return <ChartSkeleton />;
  const fmt = valueFormatter || ((v) => `৳${Number(v).toLocaleString("en-IN")}`);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v, n) => [fmt(v), n]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </CardHeader>
      <CardContent className="flex h-[260px] items-center justify-center">
        <div className="h-40 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/60" />
      </CardContent>
    </Card>
  );
}