  "http://localhost:5001";

  export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  export interface Alert {
    id: string;
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    source: string;
    target: string;
    message: string;
    timestamp: string;
    status: "open" | "investigating" | "resolved";
  }

  export interface Log {
    id: number;
    timestamp: string;
    level: "ERROR" | "WARN" | "INFO" | "DEBUG";
    source: string;
    service: string;
    message: string;
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
  };

  // Logs API
  export const logsApi = {
    getAll: (params?: { level?: string; source?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.level) searchParams.set("level", params.level);
      if (params?.source) searchParams.set("source", params.source);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      const queryString = searchParams.toString();
      return fetchWithErrorHandling<Log[]>(
        `/api/logs${queryString ? `?${queryString}` : ""}`
      );
    },
    search: (query: string) =>
      fetchWithErrorHandling<Log[]>(`/api/logs/search?q=${encodeURIComponent(query)}`),
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

