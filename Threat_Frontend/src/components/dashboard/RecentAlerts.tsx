"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const alerts = [
  {
    id: 1,
    type: "Malware",
    severity: "critical",
    message: "Trojan detected on endpoint-042",
    time: "2 min ago",
  },
  {
    id: 2,
    type: "Intrusion",
    severity: "high",
    message: "Brute force attack detected",
    time: "15 min ago",
  },
  {
    id: 3,
    type: "Phishing",
    severity: "medium",
    message: "Suspicious email blocked",
    time: "32 min ago",
  },
  {
    id: 4,
    type: "Anomaly",
    severity: "low",
    message: "Unusual traffic pattern",
    time: "1 hr ago",
  },
  {
    id: 5,
    type: "Malware",
    severity: "high",
    message: "Ransomware signature detected",
    time: "2 hr ago",
  },
];

const severityColors = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-[#d29922] text-[#0d1117]",
  medium: "bg-accent text-accent-foreground",
  low: "bg-[#3fb950] text-[#0d1117]",
};

export default function RecentAlerts() {
  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full mt-2 flex-shrink-0",
              alert.severity === "critical" && "bg-destructive",
              alert.severity === "high" && "bg-[#d29922]",
              alert.severity === "medium" && "bg-accent",
              alert.severity === "low" && "bg-[#3fb950]"
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground text-sm">
                {alert.type}
              </span>
              <Badge
                className={cn(
                  "text-xs px-1.5 py-0",
                  severityColors[alert.severity as keyof typeof severityColors]
                )}
              >
                {alert.severity}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {alert.message}
            </p>
            <span className="text-xs text-muted-foreground">{alert.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
