"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { detectionApi, API_BASE_URL } from "@/lib/api";
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Brain, Activity, Target, Zap, CheckCircle,
  AlertTriangle, Upload, Play, ShieldAlert, ShieldCheck,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  last_trained: string | null;
  status: string;
  model_name: string;
}

interface DetectionResult {
  id: number;
  input: string;
  prediction: string;
  confidence: number;
  timestamp: string | null;
  features: Record<string, string | number>;
}

interface ThreatDistItem {
  name: string;
  value: number;
  color: string;
}

interface UploadResult {
  prediction: string;
  confidence: number;
  threat_rate: number;
  attack_ratio: number;
  file: string;
  total_rows: number;
  malicious_rows: number;
  normal_rows: number;
  log_id: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const COLORS = ["#f85149", "#d29922", "#388bfd", "#a371f7", "#3fb950"];

const TOOLTIP_STYLE = {
  backgroundColor: "#161b22",
  border: "1px solid #30363d",
  borderRadius: "8px",
  color: "#e6edf3",
};

const predictionColors: Record<string, string> = {
  Malicious:        "bg-destructive text-destructive-foreground",
  Suspicious:       "bg-[#d29922] text-[#0d1117]",
  Phishing:         "bg-[#d29922] text-[#0d1117]",
  "SQL Injection":  "bg-[#d29922] text-[#0d1117]",
  "Botnet C2":      "bg-[#a371f7] text-white",
  Intrusion:        "bg-[#f85149] text-white",
  Normal:           "bg-[#3fb950] text-[#0d1117]",
  Anomaly:          "bg-accent text-accent-foreground",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function DetectionPage() {
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [threatDistribution, setThreatDistribution] = useState<ThreatDistItem[]>([]);
  const [modelPerformance, setModelPerformance] = useState<{ metric: string; value: number; fullMark: number }[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Fetch page data ────────────────────────────────────────────────────

  const fetchPageData = async (latestUpload?: UploadResult) => {
    try {
      const [metricsRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/detect/metrics`),
        fetch(`${API_BASE_URL}/api/detect`),
      ]);

      const metrics: ModelMetrics = await metricsRes.json();
      const results: DetectionResult[] = await resultsRes.json();

      setModelMetrics(metrics);
      setDetectionResults(results);

      // update radar chart from real model metrics
      setModelPerformance([
        { metric: "Accuracy",  value: metrics.accuracy,  fullMark: 100 },
        { metric: "Precision", value: metrics.precision, fullMark: 100 },
        { metric: "Recall",    value: metrics.recall,    fullMark: 100 },
        { metric: "F1 Score",  value: metrics.f1_score,  fullMark: 100 },
      ]);

      // update pie chart
      if (latestUpload) {
        // use attack_ratio from latest upload — real % of malicious rows
        // use min 0.5 so even tiny attack ratios show as a visible slice
        const attackPct = parseFloat(latestUpload.attack_ratio.toFixed(2));
        const normalPct = parseFloat((100 - attackPct).toFixed(2));
        const maliciousColor =
          latestUpload.prediction === "Suspicious" ? "#d29922" : "#f85149";

        setThreatDistribution([
          {
            name: `Malicious`,
            value: attackPct < 0.5 ? 0.5 : attackPct,
            color: maliciousColor,
          },
          {
            name: `Normal`,
            value: normalPct,
            color: "#3fb950",
          },
        ]);
      } else {
        // initial state before any file is analysed — always show 100% Normal
        setThreatDistribution([
          {
            name: "Normal",
            value: 100,
            color: "#3fb950",
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to load detection page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────

  const runDetection = async () => {
    setIsRunning(true);
    setUploadResult(null);
    try {
      if (uploadedFile) {
        const res = await detectionApi.uploadFile(uploadedFile) as UploadResult;
        setUploadResult(res);
        // pass upload result so pie chart uses attack_ratio from this file
        await fetchPageData(res);
      } else {
        await detectionApi.runDetection({
          packet_size: 1500,
          frequency: 80,
          cpu_usage: 0.9,
        });
        await fetchPageData();
      }
    } catch (e) {
      console.error("Detection error:", e);
    } finally {
      setIsRunning(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
      "application/octet-stream": [".csv"],
    },
    maxFiles: 1,
  });

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Page Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ML Threat Detection</h1>
            <p className="text-muted-foreground">
              Machine learning powered threat analysis and classification
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Compact dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "flex items-center gap-2 h-9 px-3 rounded-md border cursor-pointer transition-colors text-sm",
                isDragActive
                  ? "border-primary bg-primary/10"
                  : uploadedFile
                  ? "border-[#3fb950] bg-[#3fb950]/10"
                  : "border-border hover:border-primary/50 hover:bg-secondary"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium max-w-[160px] truncate">
                {isDragActive ? "Drop CSV here" : uploadedFile ? uploadedFile.name : "Upload CSV"}
              </span>
            </div>

            {/* Run button */}
            <Button
              size="sm"
              className="bg-primary text-primary-foreground"
              onClick={runDetection}
              disabled={isRunning}
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? "Analysing..." : uploadedFile ? "Analyse File" : "Run Sample Detection"}
            </Button>
          </div>
        </div>

        {/* File Analysis Result — only shown after CSV upload */}
        {uploadResult && (
          <Card className={cn(
            "border-2",
            uploadResult.prediction === "Malicious"
              ? "border-destructive bg-destructive/5"
              : uploadResult.prediction === "Suspicious"
              ? "border-[#d29922] bg-[#d29922]/5"
              : "border-[#3fb950] bg-[#3fb950]/5"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                {uploadResult.prediction === "Malicious"
                  ? <ShieldAlert className="w-5 h-5 text-destructive" />
                  : uploadResult.prediction === "Suspicious"
                  ? <ShieldAlert className="w-5 h-5 text-[#d29922]" />
                  : <ShieldCheck className="w-5 h-5 text-[#3fb950]" />}
                File Analysis Result
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Verdict</p>
                <Badge className={predictionColors[uploadResult.prediction] ?? "bg-secondary"}>
                  {uploadResult.prediction}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">File</p>
                <p className="text-sm font-medium text-foreground truncate">{uploadResult.file}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Rows</p>
                <p className="text-lg font-bold text-foreground">{uploadResult.total_rows.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Malicious Rows</p>
                <p className="text-lg font-bold text-[#f85149]">{uploadResult.malicious_rows.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Normal Rows</p>
                <p className="text-lg font-bold text-[#3fb950]">{uploadResult.normal_rows.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Threat Rate</p>
                <p className={cn(
                  "text-lg font-bold",
                  uploadResult.threat_rate > 50
                    ? "text-[#f85149]"
                    : uploadResult.threat_rate > 20
                    ? "text-[#d29922]"
                    : "text-[#3fb950]"
                )}>
                  {uploadResult.threat_rate}%
                </p>
                <Progress value={uploadResult.threat_rate} className="h-1 mt-1" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Model Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Model Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={
                      modelMetrics?.status === "active"
                        ? "bg-[#3fb950] text-[#0d1117]"
                        : "bg-secondary"
                    }>
                      <span className="w-2 h-2 bg-[#0d1117]/30 rounded-full mr-1 animate-pulse" />
                      {modelMetrics?.status ?? "Loading..."}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {modelMetrics?.model_name ?? "—"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary text-primary">
                  <Brain className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {modelMetrics?.accuracy ?? 0}%
                  </p>
                  <Progress value={modelMetrics?.accuracy ?? 0} className="mt-2 h-1.5" />
                </div>
                <div className="p-3 rounded-lg bg-secondary text-primary">
                  <Target className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">F1 Score</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {modelMetrics?.f1_score ?? 0}%
                  </p>
                  <Progress value={modelMetrics?.f1_score ?? 0} className="mt-2 h-1.5" />
                </div>
                <div className="p-3 rounded-lg bg-secondary text-[#d29922]">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">
                {uploadResult
                  ? `Threat Distribution — ${uploadResult.file}`
                  : "Threat Classification Distribution"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center">
                <ResponsiveContainer width="50%" height={300}>
                  <PieChart>
                    <Pie
                      data={threatDistribution}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={2} dataKey="value"
                    >
                      {threatDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {threatDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-foreground">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Model Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={modelPerformance}>
                    <PolarGrid stroke="#30363d" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: "#8b949e", fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: "#8b949e", fontSize: 10 }}
                    />
                    <Radar
                      name="Performance"
                      dataKey="value"
                      stroke="#65d9a5"
                      fill="#65d9a5"
                      fillOpacity={0.3}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detection Results Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Detection Results
              {loading && (
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  Loading...
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="results" className="space-y-4">
              <TabsList className="bg-secondary">
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="features">Feature Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="results">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Input</TableHead>
                      <TableHead className="text-muted-foreground">Prediction</TableHead>
                      <TableHead className="text-muted-foreground">Confidence</TableHead>
                      <TableHead className="text-muted-foreground">Timestamp</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detectionResults.map((r) => (
                      <TableRow key={r.id} className="border-border hover:bg-secondary/50">
                        <TableCell className="font-medium text-foreground">
                          {r.input}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(predictionColors[r.prediction] ?? "bg-secondary")}>
                            {r.prediction}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={r.confidence} className="w-20 h-2" />
                            <span className="text-sm text-muted-foreground">
                              {r.confidence.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {r.timestamp ? new Date(r.timestamp).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>
                          {r.prediction === "Normal" ? (
                            <CheckCircle className="w-5 h-5 text-[#3fb950]" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-[#d29922]" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="features">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {detectionResults.map((r) => (
                    <Card key={r.id} className="bg-secondary/30 border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={cn("text-xs", predictionColors[r.prediction] ?? "bg-secondary")}>
                            {r.prediction}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {r.confidence.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-sm text-foreground mb-2">{r.input}</p>
                        <div className="space-y-1">
                          {Object.entries(r.features).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="text-foreground font-mono">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}