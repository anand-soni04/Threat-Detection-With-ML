"use client";

import { useEffect } from "react";
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
import { cn } from "@/lib/utils";
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

const filteredAlerts = alerts.filter((alert) => {
  const matchesSearch =
    alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.source.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesSeverity =
    severityFilter === "all" || alert.severity === severityFilter;

  const matchesStatus =
    statusFilter === "all" || alert.status === statusFilter;

  return matchesSearch && matchesSeverity && matchesStatus;
});


  useEffect(() => {
  const loadAlerts = async () => {
    try {
      const data = await alertsApi.getAll();

      const sorted = data.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      );

      setAlerts(sorted);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    }
  };

  loadAlerts();

  const interval = setInterval(loadAlerts, 5000);

  return () => clearInterval(interval);
}, []);



  const updateAlertStatus = async (id: string, status: Alert["status"]) => {
  try {
    await alertsApi.updateStatus(id, status);

    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  } catch (error) {
    console.error("Failed to update alert:", error);
  }
};


  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

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
                    placeholder="Search alerts..."
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
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mb-3 opacity-20" />
                <p>No alerts match your filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">ID</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Severity</TableHead>
                    <TableHead className="text-muted-foreground">Source</TableHead>
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
                            <span className="text-foreground">{alert.type}</span>
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
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {alert.source}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {alert.target}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-foreground">
                          {alert.message}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {alert.timestamp}
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
                                <AlertTriangle className="w-4 h-4 mr-2" />
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
                  <p className="text-foreground font-medium">{selectedAlert.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Severity</p>
                  <Badge className={cn("capitalize", severityColors[selectedAlert.severity as keyof typeof severityColors])}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Source</p>
                  <p className="text-foreground font-mono">{selectedAlert.source}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Target</p>
                  <p className="text-foreground font-mono">{selectedAlert.target}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Timestamp</p>
                  <p className="text-foreground">{selectedAlert.timestamp}</p>
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
