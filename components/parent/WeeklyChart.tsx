"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  data: Array<{ day: string; accuracy: number; count: number }>;
}

export function WeeklyChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        No practice yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" fontSize={12} />
        <YAxis domain={[0, 100]} fontSize={12} />
        <Tooltip
          formatter={(v: number) => `${v}%`}
          labelFormatter={(l) => `Day ${l}`}
        />
        <Bar dataKey="accuracy" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
