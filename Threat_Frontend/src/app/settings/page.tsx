"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Bell,
  Shield,
  Key,
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";

type SavedTab = "general" | "notifications" | "security" | "api" | null;

// ── localStorage helpers ───────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SettingsPage() {

  // ── General ──────────────────────────────────────────────────────────────
  const [dashboardName, setDashboardName] = useState(() => load("settings.dashboardName", "DefendX Security Monitor"));
  const [organization, setOrganization]   = useState(() => load("settings.organization", "Security Team"));
  const [autoRefresh, setAutoRefresh]     = useState(() => load("settings.autoRefresh", true));
  const [darkMode, setDarkMode]           = useState(() => load("settings.darkMode", true));
  const [timezone, setTimezone]           = useState(() => load("settings.timezone", "utc"));

  // ── Notifications ─────────────────────────────────────────────────────────
  const [criticalAlerts, setCriticalAlerts] = useState(() => load("settings.criticalAlerts", true));
  const [highAlerts, setHighAlerts]         = useState(() => load("settings.highAlerts", true));
  const [dailySummary, setDailySummary]     = useState(() => load("settings.dailySummary", true));
  const [weeklyReport, setWeeklyReport]     = useState(() => load("settings.weeklyReport", false));
  const [alertEmail, setAlertEmail]         = useState(() => load("settings.alertEmail", "admin@company.com"));

  // ── Security ──────────────────────────────────────────────────────────────
  const [twoFactor, setTwoFactor]         = useState(() => load("settings.twoFactor", true));
  const [sessionTimeout, setSessionTimeout] = useState(() => load("settings.sessionTimeout", "30"));
  const [ipWhitelist, setIpWhitelist]     = useState(() => load("settings.ipWhitelist", false));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]     = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw]         = useState(false);

  // ── API ───────────────────────────────────────────────────────────────────
  const [apiUrl, setApiUrl]           = useState(() => load("settings.apiUrl", "http://localhost:5001"));
  const [apiKey, setApiKey]           = useState(() => load("settings.apiKey", "sk-xxxxxxxxxxxxxxxxxx"));
  const [showApiKey, setShowApiKey]   = useState(false);
  const [apiLogging, setApiLogging]   = useState(() => load("settings.apiLogging", true));
  const [rateLimiting, setRateLimiting] = useState(() => load("settings.rateLimiting", true));

  const [savedTab, setSavedTab] = useState<SavedTab>(null);

  // ── Save handlers ─────────────────────────────────────────────────────────

  const handleSave = (tab: SavedTab) => {
    if (tab === "general") {
      save("settings.dashboardName", dashboardName);
      save("settings.organization", organization);
      save("settings.autoRefresh", autoRefresh);
      save("settings.darkMode", darkMode);
      save("settings.timezone", timezone);
    } else if (tab === "notifications") {
      save("settings.criticalAlerts", criticalAlerts);
      save("settings.highAlerts", highAlerts);
      save("settings.dailySummary", dailySummary);
      save("settings.weeklyReport", weeklyReport);
      save("settings.alertEmail", alertEmail);
    } else if (tab === "security") {
      save("settings.twoFactor", twoFactor);
      save("settings.sessionTimeout", sessionTimeout);
      save("settings.ipWhitelist", ipWhitelist);
      // password change would need a real backend — clear fields after save
      setCurrentPassword("");
      setNewPassword("");
    } else if (tab === "api") {
      save("settings.apiUrl", apiUrl);
      save("settings.apiKey", apiKey);
      save("settings.apiLogging", apiLogging);
      save("settings.rateLimiting", rateLimiting);
    }

    setSavedTab(tab);
    setTimeout(() => setSavedTab(null), 2500);
  };

  const regenerateApiKey = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const key = "sk-" + Array.from({ length: 20 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    setApiKey(key);
  };

  const SaveButton = ({ tab }: { tab: SavedTab }) => (
    <Button
      className="bg-primary text-primary-foreground"
      onClick={() => handleSave(tab)}
    >
      {savedTab === tab ? (
        <>
          <CheckCircle className="w-4 h-4 mr-2" />
          Saved!
        </>
      ) : (
        <>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </>
      )}
    </Button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your security dashboard preferences
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <User className="w-5 h-5" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-foreground">Dashboard Name</Label>
                    <Input
                      value={dashboardName}
                      onChange={(e) => setDashboardName(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Organization</Label>
                    <Input
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Auto-refresh Dashboard</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically refresh data every 30 seconds
                      </p>
                    </div>
                    <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Use dark theme for the dashboard
                      </p>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Time Zone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="w-[300px] bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">Eastern Time (EST)</SelectItem>
                        <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                        <SelectItem value="ist">India Standard Time (IST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <SaveButton tab="general" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Critical Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for critical security events
                      </p>
                    </div>
                    <Switch checked={criticalAlerts} onCheckedChange={setCriticalAlerts} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">High Priority Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for high priority events
                      </p>
                    </div>
                    <Switch checked={highAlerts} onCheckedChange={setHighAlerts} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Daily Summary</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive a daily summary of security events
                      </p>
                    </div>
                    <Switch checked={dailySummary} onCheckedChange={setDailySummary} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Weekly Report</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive a weekly security report
                      </p>
                    </div>
                    <Switch checked={weeklyReport} onCheckedChange={setWeeklyReport} />
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-2">
                  <Label className="text-foreground">Email for Alerts</Label>
                  <Input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    className="bg-input border-border max-w-md"
                  />
                </div>

                <div className="flex justify-end">
                  <SaveButton tab="notifications" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Session Timeout</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically log out after inactivity
                      </p>
                    </div>
                    <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                      <SelectTrigger className="w-[180px] bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">IP Whitelist</Label>
                      <p className="text-sm text-muted-foreground">
                        Only allow access from specific IP addresses
                      </p>
                    </div>
                    <Switch checked={ipWhitelist} onCheckedChange={setIpWhitelist} />
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-2">
                  <Label className="text-foreground">Change Password</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                    <div className="relative">
                      <Input
                        type={showCurrentPw ? "text" : "password"}
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-input border-border pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowCurrentPw((p) => !p)}
                      >
                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showNewPw ? "text" : "password"}
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-input border-border pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowNewPw((p) => !p)}
                      >
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <SaveButton tab="security" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Settings */}
          <TabsContent value="api">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-foreground">Backend API URL</Label>
                  <Input
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="bg-input border-border max-w-xl font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    The URL of your Flask backend API
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">API Key</Label>
                  <div className="flex gap-2 max-w-xl">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-input border-border font-mono pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowApiKey((p) => !p)}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button variant="outline" onClick={regenerateApiKey}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Enable API Logging</Label>
                      <p className="text-sm text-muted-foreground">
                        Log all API requests for debugging
                      </p>
                    </div>
                    <Switch checked={apiLogging} onCheckedChange={setApiLogging} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-foreground">Rate Limiting</Label>
                      <p className="text-sm text-muted-foreground">
                        Limit API requests to prevent abuse
                      </p>
                    </div>
                    <Switch checked={rateLimiting} onCheckedChange={setRateLimiting} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <SaveButton tab="api" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}