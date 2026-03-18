"use client";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  Server,
} from "lucide-react";
import { useState } from "react";

import { logsApi, Log } from "@/lib/api";
import { useEffect } from "react";

const levelColors = {
  ERROR: "bg-destructive text-destructive-foreground",
  WARN: "bg-[#d29922] text-[#0d1117]",
  INFO: "bg-accent text-accent-foreground",
  DEBUG: "bg-muted text-muted-foreground",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [expandedLogs, setExpandedLogs] = useState<number[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleExpand = (id: number) => {
    setExpandedLogs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.service.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === "all" || log.level === levelFilter;
    const matchesSource = sourceFilter === "all" || log.source === sourceFilter;
    return matchesSearch && matchesLevel && matchesSource;
  });

  const sources = Array.from(new Set(logs.map((log) => log.source)));

useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const data = await logsApi.getAll();
      setLogs(data);
    } catch (error) {
      console.error(error);
    }
  }, 5000);

  return () => clearInterval(interval);
}, []);


  const handleRefresh = async () => {
  setIsRefreshing(true);

  try {
    const data = await logsApi.getAll({
      level: levelFilter !== "all" ? levelFilter : undefined,
      source: sourceFilter !== "all" ? sourceFilter : undefined,
    });

    setLogs(data);
  } catch (error) {
    console.error("Failed to refresh logs:", error);
  }

  setIsRefreshing(false);
};


  const handleExport = () => {
    const lines = filteredLogs.map(
      (l) => `[${l.timestamp}] [${l.level}] [${l.source}/${l.service}] ${l.message}`
    );
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "security-logs.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Logs</h1>
            <p className="text-muted-foreground">
              Search and analyze security event logs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs by message, source, or service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-input border-border font-mono"
                  />
                </div>
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[130px] bg-input border-border">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="WARN">Warning</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="DEBUG">Debug</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[160px] bg-input border-border">
                  <Server className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center justify-between">
              <span>Log Events ({filteredLogs.length})</span>
              <Badge variant="outline" className="text-primary border-primary">
                <Clock className="w-3 h-3 mr-1" />
                Real-time
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="hover:bg-secondary/30 transition-colors"
                  >
                    <div
                      className="flex items-start gap-3 p-4 cursor-pointer"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <button className="mt-1">
                        {expandedLogs.includes(log.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.timestamp}
                          </span>
                          <Badge
                            className={cn(
                              "text-xs",
                              levelColors[log.level]
                            )}
                          >
                            {log.level}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs border-border text-muted-foreground"
                          >
                            {log.source}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs border-border text-muted-foreground"
                          >
                            {log.service}
                          </Badge>
                        </div>
                        <p className="font-mono text-sm text-foreground">
                          {log.message}
                        </p>
                      </div>
                    </div>
                    {expandedLogs.includes(log.id) && (
                      <div className="px-11 pb-4">
                        <div className="bg-secondary/50 rounded-lg p-4 font-mono text-sm">
                          <pre className="text-muted-foreground whitespace-pre-wrap">
                            {JSON.stringify(log.details ?? {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
