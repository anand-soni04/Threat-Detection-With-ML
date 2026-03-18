"use client";

import { useEffect, useState } from "react";
import { dashboardApi, DashboardStats } from "@/lib/api";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  AlertTriangle,
  Shield,
  Activity,
  Server,
} from "lucide-react";

import ThreatChart from "@/components/dashboard/ThreatChart";
import AlertsTimeline from "@/components/dashboard/AlertsTimeline";
import ThreatMap from "@/components/dashboard/ThreatMap";
import RecentAlerts from "@/components/dashboard/RecentAlerts";

export default function Home() {

  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await dashboardApi.getStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      }
    };

    loadStats();

    const interval = setInterval(loadStats, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Security Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time threat monitoring and analysis
            </p>
          </div>

          <Badge variant="outline" className="text-primary border-primary">
            <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
            Live Monitoring
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <Card className="bg-card border-border">
            <CardContent className="p-6 flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Threats
                </p>
                <p className="text-3xl font-bold">
                  {stats?.total_threats ?? "-"}
                </p>
              </div>
              <Shield className="w-6 h-6 text-destructive" />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Active Alerts
                </p>
                <p className="text-3xl font-bold">
                  {stats?.active_alerts ?? "-"}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Events Processed
                </p>
                <p className="text-3xl font-bold">
                  {stats?.events_processed ?? "-"}
                </p>
              </div>
              <Activity className="w-6 h-6 text-primary" />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Endpoints
                </p>
                <p className="text-3xl font-bold">
                  {stats?.monitored_endpoints ?? "-"}
                </p>
              </div>
              <Server className="w-6 h-6 text-green-500" />
            </CardContent>
          </Card>

        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Threat Detection Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ThreatChart />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Alert Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertsTimeline />
            </CardContent>
          </Card>

        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader>
              <CardTitle>Threat Origin Map</CardTitle>
            </CardHeader>
            <CardContent>
              <ThreatMap />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentAlerts />
            </CardContent>
          </Card>

        </div>

      </div>
    </DashboardLayout>
  );
}
