  export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://threat-backend-0wk6.onrender.com";

  export interface Alert {
    id: string;
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    /** Where the anomaly came from (IP, host, "upload:<file>", ...). */
    source: string;
    target: string;
    /** Component that raised the alert (e.g. "ml-detector"). */
    detected_by?: string;
    message: string;
    timestamp: string;
    status: "open" | "investigating" | "resolved" | "dismissed";
    log_id?: number | null;
  }

  export interface Log {
    id: number;
    timestamp: string;
    level: "ERROR" | "WARN" | "INFO" | "DEBUG";
    source: string;
    service: string;
    message: string;
    prediction?: string | null;
    details: Record<string, unknown>;
  }

  export interface DetectionResult {
    id: number;
    input: string;
    prediction: string;
    confidence: number;
    timestamp: string;
    features: Record<string, unknown>;
  }

  export interface ModelMetrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    last_trained: string;
    status: string;
    model_name: string;
  }

  export interface DashboardStats {
    total_threats: number;
    active_alerts: number;
    events_processed: number;
    monitored_endpoints: number;
  }

  async function fetchWithErrorHandling<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const isFormData = options?.body instanceof FormData;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: isFormData
        ? options?.headers  // let browser set Content-Type with boundary
        : {
            "Content-Type": "application/json",
            ...options?.headers,
          },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

  // Alerts API
  export const alertsApi = {
    getAll: () => fetchWithErrorHandling<Alert[]>("/api/alerts"),
    getById: (id: string) => fetchWithErrorHandling<Alert>(`/api/alerts/${id}`),
    updateStatus: (id: string, status: Alert["status"]) =>
      fetchWithErrorHandling<Alert>(`/api/alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) =>
      fetchWithErrorHandling<{ message: string }>(`/api/alerts/${id}`, {
        method: "DELETE",
      }),
  };

  // Logs API
  export type TimeRange = "15m" | "1h" | "24h" | "7d" | "30d" | "all";

  export const logsApi = {
    /** List logs. `q` accepts the same syntax as search (e.g. "level:ERROR malicious"). */
    getAll: (params?: {
      q?: string;
      level?: string;
      source?: string;
      range?: TimeRange;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.q?.trim()) searchParams.set("q", params.q.trim());
      if (params?.level) searchParams.set("level", params.level);
      if (params?.source) searchParams.set("source", params.source);
      if (params?.range && params.range !== "all") searchParams.set("range", params.range);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      const queryString = searchParams.toString();
      return fetchWithErrorHandling<Log[]>(
        `/api/logs${queryString ? `?${queryString}` : ""}`
      );
    },
    search: (query: string, range: TimeRange = "all", limit = 500) => {
      const p = new URLSearchParams({ q: query, limit: String(limit) });
      if (range !== "all") p.set("range", range);
      return fetchWithErrorHandling<Log[]>(`/api/logs/search?${p.toString()}`);
    },
    /** Number of logs matching a query (used for saved-search hit counts). */
    count: async (query: string, range: TimeRange = "all") => {
      const p = new URLSearchParams({ q: query, count: "1" });
      if (range !== "all") p.set("range", range);
      const res = await fetchWithErrorHandling<{ count: number }>(
        `/api/logs/search?${p.toString()}`
      );
      return res.count;
    },
  };

  // Detection API
  export const detectionApi = {
    getResults: () => fetchWithErrorHandling<DetectionResult[]>("/api/detect"),
    runDetection: (data: unknown) =>
      fetchWithErrorHandling<DetectionResult>("/api/detect", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    uploadFile: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE_URL}/api/detect/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        console.error("Upload error detail:", err); // 👈 shows exact Flask error
        throw new Error(`Upload failed: ${response.status} - ${err.error}`);
      }
      return response.json();
    },
    getModelMetrics: () =>
      fetchWithErrorHandling<ModelMetrics>("/api/detect/metrics"),
  };

  // Dashboard API
  export const dashboardApi = {
    getStats: () => fetchWithErrorHandling<DashboardStats>("/api/dashboard/stats"),
    getThreatTrend: () =>
      fetchWithErrorHandling<{ time: string; malware: number; intrusion: number; phishing: number }[]>(
        "/api/dashboard/threat-trend"
      ),
  };

  // Preprocessing API (for data upload)
  export const preprocessApi = {
    uploadFile: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`${API_BASE_URL}/api/preprocess/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      return response.json();
    },
    preprocess: (fileId: string) =>
      fetchWithErrorHandling<{ status: string; features: string[] }>(
        `/api/preprocess/${fileId}`,
        { method: "POST" }
      ),
  };

