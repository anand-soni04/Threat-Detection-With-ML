"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "00:00", malware: 12, intrusion: 8, phishing: 5 },
  { time: "04:00", malware: 19, intrusion: 12, phishing: 9 },
  { time: "08:00", malware: 45, intrusion: 28, phishing: 18 },
  { time: "12:00", malware: 67, intrusion: 42, phishing: 31 },
  { time: "16:00", malware: 53, intrusion: 35, phishing: 24 },
  { time: "20:00", malware: 38, intrusion: 22, phishing: 15 },
  { time: "23:59", malware: 25, intrusion: 18, phishing: 11 },
];

export default function ThreatChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorMalware" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f85149" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f85149" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorIntrusion" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d29922" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#d29922" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPhishing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#388bfd" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#388bfd" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            dataKey="time"
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
          <Area
            type="monotone"
            dataKey="malware"
            stroke="#f85149"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorMalware)"
            name="Malware"
          />
          <Area
            type="monotone"
            dataKey="intrusion"
            stroke="#d29922"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorIntrusion)"
            name="Intrusion"
          />
          <Area
            type="monotone"
            dataKey="phishing"
            stroke="#388bfd"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPhishing)"
            name="Phishing"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
