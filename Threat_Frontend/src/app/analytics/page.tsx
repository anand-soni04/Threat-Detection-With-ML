"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useState } from "react";



const threatTrend = [
  { date: "Jan 8", threats: 145, blocked: 142 },
  { date: "Jan 9", threats: 189, blocked: 185 },
  { date: "Jan 10", threats: 234, blocked: 228 },
  { date: "Jan 11", threats: 178, blocked: 175 },
  { date: "Jan 12", threats: 267, blocked: 261 },
  { date: "Jan 13", threats: 312, blocked: 305 },
  { date: "Jan 14", threats: 289, blocked: 284 },
  { date: "Jan 15", threats: 256, blocked: 251 },
];

const attackVectors = [
  { name: "Network", value: 35 },
  { name: "Email", value: 28 },
  { name: "Web", value: 22 },
  { name: "Endpoint", value: 15 },
];

const sourceCountries = [
  { country: "Russia", attacks: 1234, color: "#f85149" },
  { country: "China", attacks: 987, color: "#d29922" },
  { country: "USA", attacks: 654, color: "#388bfd" },
  { country: "Brazil", attacks: 432, color: "#a371f7" },
  { country: "India", attacks: 321, color: "#3fb950" },
];

const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, "0")}:00`,
  events: Math.floor(Math.random() * 500) + 100,
  alerts: Math.floor(Math.random() * 50) + 10,
}));

const COLORS = ["#f85149", "#d29922", "#388bfd", "#a371f7", "#3fb950"];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Security Analytics
            </h1>
            <p className="text-muted-foreground">
              Comprehensive security metrics and trends
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px] bg-input border-border">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Events</p>
              <p className="text-3xl font-bold text-foreground mt-1">1.87M</p>
              <div className="flex items-center gap-1 mt-2 text-primary">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+12.4% vs last period</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Threats Blocked</p>
              <p className="text-3xl font-bold text-foreground mt-1">1,831</p>
              <div className="flex items-center gap-1 mt-2 text-[#3fb950]">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">98.2% block rate</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <p className="text-3xl font-bold text-foreground mt-1">2.3s</p>
              <div className="flex items-center gap-1 mt-2 text-primary">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">-15% improvement</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">False Positives</p>
              <p className="text-3xl font-bold text-foreground mt-1">1.8%</p>
              <div className="flex items-center gap-1 mt-2 text-[#3fb950]">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">Below 2% target</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">
                Threat Detection Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={threatTrend}>
                    <defs>
                      <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f85149" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f85149" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="date" stroke="#8b949e" tick={{ fill: "#8b949e" }} />
                    <YAxis stroke="#8b949e" tick={{ fill: "#8b949e" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161b22",
                        border: "1px solid #30363d",
                        borderRadius: "8px",
                        color: "#e6edf3",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="threats"
                      stroke="#f85149"
                      fillOpacity={1}
                      fill="url(#colorThreats)"
                      name="Detected"
                    />
                    <Area
                      type="monotone"
                      dataKey="blocked"
                      stroke="#3fb950"
                      fillOpacity={1}
                      fill="url(#colorBlocked)"
                      name="Blocked"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Attack Vectors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={attackVectors}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {attackVectors.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161b22",
                        border: "1px solid #30363d",
                        borderRadius: "8px",
                        color: "#e6edf3",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-4">
                  {attackVectors.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <span className="text-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium text-foreground">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Hourly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis
                      dataKey="hour"
                      stroke="#8b949e"
                      tick={{ fill: "#8b949e", fontSize: 10 }}
                      interval={3}
                    />
                    <YAxis stroke="#8b949e" tick={{ fill: "#8b949e" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161b22",
                        border: "1px solid #30363d",
                        borderRadius: "8px",
                        color: "#e6edf3",
                      }}
                    />
                    <Bar dataKey="events" fill="#388bfd" radius={[2, 2, 0, 0]} name="Events" />
                    <Bar dataKey="alerts" fill="#f85149" radius={[2, 2, 0, 0]} name="Alerts" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Top Source Countries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sourceCountries.map((item, index) => (
                <div key={item.country} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">#{index + 1}</span>
                      <span className="text-foreground">{item.country}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {item.attacks.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(item.attacks / sourceCountries[0].attacks) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
