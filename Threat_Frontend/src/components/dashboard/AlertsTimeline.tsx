"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { day: "Mon", critical: 12, high: 24, medium: 45, low: 32 },
  { day: "Tue", critical: 8, high: 18, medium: 38, low: 28 },
  { day: "Wed", critical: 15, high: 32, medium: 52, low: 41 },
  { day: "Thu", critical: 6, high: 21, medium: 41, low: 35 },
  { day: "Fri", critical: 18, high: 28, medium: 48, low: 38 },
  { day: "Sat", critical: 4, high: 12, medium: 25, low: 18 },
  { day: "Sun", critical: 3, high: 9, medium: 18, low: 15 },
];

export default function AlertsTimeline() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            dataKey="day"
            stroke="#8b949e"
            tick={{ fill: "#8b949e", fontSize: 12 }}
          />
          <YAxis stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "8px",
              color: "#e6edf3",
            }}
          />
          <Legend
            wrapperStyle={{ color: "#8b949e" }}
            formatter={(value) => (
              <span style={{ color: "#8b949e" }}>{value}</span>
            )}
          />
          <Bar dataKey="critical" fill="#f85149" radius={[2, 2, 0, 0]} name="Critical" />
          <Bar dataKey="high" fill="#d29922" radius={[2, 2, 0, 0]} name="High" />
          <Bar dataKey="medium" fill="#388bfd" radius={[2, 2, 0, 0]} name="Medium" />
          <Bar dataKey="low" fill="#3fb950" radius={[2, 2, 0, 0]} name="Low" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
