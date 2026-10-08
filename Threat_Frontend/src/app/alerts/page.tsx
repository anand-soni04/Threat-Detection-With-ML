"use client";

import { useCallback, useEffect } from "react";
import { alertsApi, Alert } from "@/lib/api";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, formatTimestamp, prettyLabel } from "@/lib/utils";
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Bug,
  Mail,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";


const severityColors = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-[#d29922] text-[#0d1117]",
  medium: "bg-accent text-accent-foreground",
  low: "bg-[#3fb950] text-[#0d1117]",
};

const statusColors = {
  open: "border-destructive text-destructive",
  investigating: "border-[#d29922] text-[#d29922]",
  resolved: "border-[#3fb950] text-[#3fb950]",
  dismissed: "border-muted-foreground text-muted-foreground",
};

const typeIcons = {
  Malware: Bug,
  Intrusion: Shield,
  Phishing: Mail,
  Anomaly: AlertTriangle,
  Network: AlertTriangle,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Every word must appear somewhere in the alert, in any of these fields.
  const matchesSearch = (alert: Alert, query: string) => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return true;
    const haystack = [
      alert.id,
      alert.type,
      prettyLabel(alert.type),
      alert.severity,
      alert.status,
      alert.source,
      alert.target,
      alert.detected_by ?? "",
      alert.message,
      alert.log_id != null ? `log ${alert.log_id}` : "",
      formatTimestamp(alert.timestamp),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity =
      severityFilter === "all" || alert.severity === severityFilter;

    // Dismissed alerts are hidden from "All" and only shown when asked for.
    const matchesStatus =
      statusFilter === "all"
        ? alert.status !== "dismissed"
        : alert.status === statusFilter;

    return matchesSearch(alert, searchQuery) && matchesSeverity && matchesStatus;
  });

  const loadAlerts = useCallback(async () => {
    try {
      const data = await alertsApi.getAll();
      const sorted = [...data].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setAlerts(sorted);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      setError("Could not load alerts from the server. Retrying automatically...");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 5000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const updateAlertStatus = async (id: string, status: Alert["status"]) => {
    const previous = alerts;
    // Optimistic update, rolled back if the server rejects it.
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setSelectedAlert((cur) => (cur && cur.id === id ? { ...cur, status } : cur));
    try {
      await alertsApi.updateStatus(id, status);
    } catch (err) {
      console.error("Failed to update alert:", err);
      setAlerts(previous);
      setError("Could not update the alert. Please try again.");
    }
  };

  // Saved on the server (status "dismissed") so it stays dismissed after the
  // next refresh instead of reappearing.
  const dismissAlert = (id: string) => updateAlertStatus(id, "dismissed");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Security Alerts
            </h1>
            <p className="text-muted-foreground">
              Monitor and manage security incidents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-destructive text-destructive">
              {alerts.filter((a) => a.status === "open").length} Open
            </Badge>
            <Badge variant="outline" className="border-[#d29922] text-[#d29922]">
              {alerts.filter((a) => a.status === "investigating").length} Investigating
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search alerts by ID, type, source, target, message, status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-input border-border"
                  />
                </div>
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px] bg-input border-border">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-input border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              Alerts ({filteredAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="flex items-center gap-2 mb-4 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mb-3 opacity-20" />
                <p>
                  {isLoading
                    ? "Loading alerts..."
                    : alerts.length === 0
                    ? "No alerts yet"
                    : "No alerts match your filters"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">ID</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Severity</TableHead>
                    <TableHead className="text-muted-foreground" title="Where the anomaly came from">Source</TableHead>
                    <TableHead className="text-muted-foreground">Target</TableHead>
                    <TableHead className="text-muted-foreground">Message</TableHead>
                    <TableHead className="text-muted-foreground">Time</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => {
                    const TypeIcon =
                      typeIcons[alert.type as keyof typeof typeIcons] ||
                      AlertTriangle;
                    return (
                      <TableRow
                        key={alert.id}
                        className="border-border hover:bg-secondary/50 cursor-pointer"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <TableCell className="font-mono text-sm text-foreground">
                          {alert.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{prettyLabel(alert.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "capitalize",
                              severityColors[
                                alert.severity as keyof typeof severityColors
                              ]
                            )}
                          >
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="font-mono text-sm text-muted-foreground whitespace-normal break-all max-w-[190px]"
                          title={alert.source}
                        >
                          {alert.source}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {alert.target}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-foreground" title={alert.message}>
                          {alert.message}
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground text-sm whitespace-normal min-w-[110px] max-w-[130px]"
                          title={alert.timestamp}
                        >
                          {formatTimestamp(alert.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              statusColors[
                                alert.status as keyof typeof statusColors
                              ]
                            )}
                          >
                            {alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedAlert(alert)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateAlertStatus(alert.id, "investigating")}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Investigating
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => updateAlertStatus(alert.id, "resolved")}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Resolved
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => updateAlertStatus(alert.id, "open")}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reopen
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => dismissAlert(alert.id)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Dismiss
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              Alert Details — {selectedAlert?.id}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Full information about this security alert
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Type</p>
                  <p className="text-foreground font-medium">{prettyLabel(selectedAlert.type)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Severity</p>
                  <Badge className={cn("capitalize", severityColors[selectedAlert.severity as keyof typeof severityColors])}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Source (origin)</p>
                  <p className="text-foreground font-mono break-all">{selectedAlert.source}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Target</p>
                  <p className="text-foreground font-mono">{selectedAlert.target}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Detected by</p>
                  <p className="text-foreground font-mono">{selectedAlert.detected_by ?? "ml-detector"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Timestamp</p>
                  <p className="text-foreground">{formatTimestamp(selectedAlert.timestamp)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className={cn("capitalize", statusColors[selectedAlert.status as keyof typeof statusColors])}>
                    {selectedAlert.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-sm">Message</p>
                <p className="text-foreground text-sm bg-secondary/50 p-3 rounded-lg font-mono">
                  {selectedAlert.message}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    updateAlertStatus(selectedAlert.id, "resolved");
                    setSelectedAlert(null);
                  }}
                  disabled={selectedAlert.status === "resolved"}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Resolved
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    dismissAlert(selectedAlert.id);
                    setSelectedAlert(null);
                  }}
                  disabled={selectedAlert.status === "dismissed"}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
