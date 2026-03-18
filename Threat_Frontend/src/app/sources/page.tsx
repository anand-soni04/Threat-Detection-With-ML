"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Server,
  Database,
  Network,
  Shield,
  Mail,
  Globe,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";

type DataSource = {
  id: number;
  name: string;
  type: string;
  icon: React.ElementType;
  status: string;
  eventsPerSec: number;
  lastSync: string;
  enabled: boolean;
};

const initialSources: DataSource[] = [
  {
    id: 1,
    name: "Firewall Logs",
    type: "Network",
    icon: Shield,
    status: "connected",
    eventsPerSec: 1247,
    lastSync: "2 sec ago",
    enabled: true,
  },
  {
    id: 2,
    name: "IDS/IPS Sensors",
    type: "Security",
    icon: Network,
    status: "connected",
    eventsPerSec: 892,
    lastSync: "5 sec ago",
    enabled: true,
  },
  {
    id: 3,
    name: "Email Gateway",
    type: "Email",
    icon: Mail,
    status: "connected",
    eventsPerSec: 234,
    lastSync: "12 sec ago",
    enabled: true,
  },
  {
    id: 4,
    name: "Web Application Firewall",
    type: "Web",
    icon: Globe,
    status: "warning",
    eventsPerSec: 156,
    lastSync: "45 sec ago",
    enabled: true,
  },
  {
    id: 5,
    name: "Endpoint Protection",
    type: "Endpoint",
    icon: Server,
    status: "connected",
    eventsPerSec: 567,
    lastSync: "8 sec ago",
    enabled: true,
  },
  {
    id: 6,
    name: "Database Audit",
    type: "Database",
    icon: Database,
    status: "disconnected",
    eventsPerSec: 0,
    lastSync: "2 hours ago",
    enabled: false,
  },
];

const statusColors = {
  connected: "bg-[#3fb950]",
  warning: "bg-[#d29922]",
  disconnected: "bg-destructive",
};

const statusText = {
  connected: "Connected",
  warning: "Degraded",
  disconnected: "Disconnected",
};

const typeIconMap: Record<string, React.ElementType> = {
  Network: Shield,
  Security: Network,
  Email: Mail,
  Web: Globe,
  Endpoint: Server,
  Database: Database,
};

export default function SourcesPage() {
  const [sources, setSources] = useState<DataSource[]>(initialSources);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshedIds, setRefreshedIds] = useState<number[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", type: "Network" });
  const [nameError, setNameError] = useState("");

  const toggleSource = (id: number) => {
    setSources((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled, status: !s.enabled ? "connected" : "disconnected" } : s
      )
    );
  };

  const refreshAll = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSources((prev) =>
        prev.map((s) =>
          s.enabled
            ? { ...s, lastSync: "just now", status: "connected" }
            : s
        )
      );
      setIsRefreshing(false);
      setRefreshedIds(sources.map((s) => s.id));
      setTimeout(() => setRefreshedIds([]), 2000);
    }, 1200);
  };

  const addSource = () => {
    const trimmed = newSource.name.trim();
    if (!trimmed) {
      setNameError("Source name is required.");
      return;
    }
    const duplicate = sources.some(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setNameError("A source with this name already exists. Please choose a different name.");
      return;
    }
    setNameError("");
    const IconComponent = typeIconMap[newSource.type] || Server;
    setSources((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        name: trimmed,
        type: newSource.type,
        icon: IconComponent,
        status: "connected",
        eventsPerSec: 0,
        lastSync: "just now",
        enabled: true,
      },
    ]);
    setNewSource({ name: "", type: "Network" });
    setNameError("");
    setShowAddDialog(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Sources</h1>
            <p className="text-muted-foreground">
              Manage and monitor security data integrations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh All"}
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Source
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Sources</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {sources.length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-3xl font-bold text-[#3fb950] mt-1">
                {sources.filter((s) => s.status === "connected").length}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Events/sec</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {sources.reduce((acc, s) => acc + s.eventsPerSec, 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Issues</p>
              <p className="text-3xl font-bold text-destructive mt-1">
                {sources.filter((s) => s.status !== "connected").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Sources List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((source) => (
            <Card key={source.id} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-secondary">
                      <source.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {source.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {source.type}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {refreshedIds.includes(source.id) ? (
                          <CheckCircle className="w-3 h-3 text-[#3fb950]" />
                        ) : (
                          <div
                            className={`w-2 h-2 rounded-full ${
                              statusColors[source.status as keyof typeof statusColors]
                            }`}
                          />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {refreshedIds.includes(source.id)
                            ? "Just synced"
                            : statusText[source.status as keyof typeof statusText]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={source.enabled}
                    onCheckedChange={() => toggleSource(source.id)}
                  />
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Events/sec
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {source.eventsPerSec.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Last Sync
                      </p>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {source.lastSync}
                        </span>
                      </div>
                    </div>
                  </div>

                  {source.status === "connected" && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Health</span>
                        <span className="text-[#3fb950]">100%</span>
                      </div>
                      <Progress value={100} className="h-1.5" />
                    </div>
                  )}

                  {source.status === "warning" && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Health</span>
                        <span className="text-[#d29922]">65%</span>
                      </div>
                      <Progress value={65} className="h-1.5" />
                    </div>
                  )}

                  {source.status === "disconnected" && (
                    <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                      <p className="text-sm text-destructive">
                        Connection lost. Toggle on to reconnect.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Source Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Data Source</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure a new security data source integration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-foreground">Source Name</Label>
              <Input
                placeholder="e.g. SIEM Platform"
                value={newSource.name}
                onChange={(e) => {
                  setNewSource((p) => ({ ...p, name: e.target.value }));
                  setNameError("");
                }}
                className={`bg-input border-border ${nameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Source Type</Label>
              <Select
                value={newSource.type}
                onValueChange={(v) => setNewSource((p) => ({ ...p, type: v }))}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Network">Network</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Web">Web</SelectItem>
                  <SelectItem value="Endpoint">Endpoint</SelectItem>
                  <SelectItem value="Database">Database</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={addSource}
                disabled={!newSource.name.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Source
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
