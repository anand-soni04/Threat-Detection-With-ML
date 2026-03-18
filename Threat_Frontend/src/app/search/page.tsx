"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { logsApi, Log } from "@/lib/api";
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
import {
  Search as SearchIcon,
  Clock,
  Star,
  Trash2,
  Play,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

type SavedSearch = { id: number; name: string; query: string; hits: number };
type RecentSearch = { query: string; time: string };
type SearchResult = Log;

const initialSavedSearches: SavedSearch[] = [
  { id: 1, name: "Failed SSH Logins", query: "ssh", hits: 0 },
  { id: 2, name: "Malware Detections", query: "malicious", hits: 0 },
  { id: 3, name: "SQL Injection Attempts", query: "sql", hits: 0 },
  { id: 4, name: "Phishing Emails", query: "phishing", hits: 0 },
];

const initialRecentSearches: RecentSearch[] = [
  { query: "source:firewall-01 AND action:DROP", time: "5 min ago" },
  { query: "level:ERROR", time: "15 min ago" },
  { query: "service:nginx AND status:500", time: "1 hour ago" },
  { query: "user:admin AND action:login", time: "2 hours ago" },
];

function highlightText(message: string, term: string) {
  if (!term) return <span>{message}</span>;

  const parts = message.split(
    new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  );

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark
            key={i}
            className="bg-[#d29922]/30 text-[#d29922] px-1 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [timeRange, setTimeRange] = useState("24h");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [savedSearches, setSavedSearches] =
    useState<SavedSearch[]>(initialSavedSearches);
  const [recentSearches, setRecentSearches] =
    useState<RecentSearch[]>(initialRecentSearches);

  /* -------- Calculate saved search hits dynamically -------- */

  useEffect(() => {
    const loadHits = async () => {
      try {
        const logs = await logsApi.getAll();

        setSavedSearches((prev) =>
          prev.map((search) => ({
            ...search,
            hits: logs.filter((l) =>
              l.message?.toLowerCase().includes(search.query.toLowerCase())
            ).length,
          }))
        );
      } catch (err) {
        console.error("Failed to compute saved search hits:", err);
      }
    };

    loadHits();
  }, []);

  /* -------- Run search -------- */

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;

    try {
      const data = await logsApi.search(q);

      setResults(data);
      setHasSearched(true);

      setRecentSearches((prev) => {
        const without = prev.filter((s) => s.query !== q);
        return [{ query: q, time: "just now" }, ...without].slice(0, 6);
      });
    } catch (error) {
      console.error("Search failed:", error);
    }
  }, []);

  /* -------- Auto run search from URL -------- */

  useEffect(() => {
    const q = searchParams.get("q");

    if (q) {
      setSearchQuery(q);
      runSearch(q);
    }
  }, [searchParams, runSearch]);

  const handleSearch = () => runSearch(searchQuery);

  const loadQuery = (q: string) => {
    setSearchQuery(q);
    runSearch(q);
  };

  const deleteSaved = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  };

  const deleteRecent = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => prev.filter((s) => s.query !== query));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}

        <div>
          <h1 className="text-2xl font-bold text-foreground">Search</h1>
          <p className="text-muted-foreground">
            Search across all security events and logs
          </p>
        </div>

        {/* Search Bar */}

        <Card className="bg-card border-border">
          <CardContent className="p-4">

            <div className="flex gap-4">

              <div className="flex-1 relative">

                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

                <Input
                  placeholder="Enter search query"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-12 h-12 text-lg bg-input border-border font-mono"
                />

                {searchQuery && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearchQuery("");
                      setHasSearched(false);
                      setResults([]);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

              </div>

              <Select value={timeRange} onValueChange={setTimeRange}>

                <SelectTrigger className="w-[140px] h-12 bg-input border-border">
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="15m">Last 15 min</SelectItem>
                  <SelectItem value="1h">Last 1 hour</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>

              </Select>

              <Button
                onClick={handleSearch}
                className="h-12 px-6 bg-primary text-primary-foreground"
              >
                <Play className="w-4 h-4 mr-2" />
                Search
              </Button>

            </div>

          </CardContent>
        </Card>

        {/* Layout */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sidebar */}

          <div className="space-y-6">

            {/* Saved Searches */}

            <Card className="bg-card border-border">

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#d29922]" />
                  Saved Searches
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">

                {savedSearches.map((search) => (

                  <div
                    key={search.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer group"
                    onClick={() => loadQuery(search.query)}
                  >

                    <div className="flex-1">

                      <p className="text-sm font-medium">{search.name}</p>

                      <p className="text-xs text-muted-foreground font-mono">
                        {search.query}
                      </p>

                    </div>

                    <div className="flex items-center gap-1">

                      <Badge variant="outline">{search.hits}</Badge>

                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => deleteSaved(search.id, e)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                    </div>

                  </div>

                ))}

              </CardContent>

            </Card>

            {/* Recent Searches */}

            <Card className="bg-card border-border">

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Searches
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">

                {recentSearches.map((search, idx) => (

                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 cursor-pointer group"
                    onClick={() => loadQuery(search.query)}
                  >

                    <p className="text-sm font-mono truncate">
                      {search.query}
                    </p>

                    <div className="flex items-center gap-1">

                      <span className="text-xs text-muted-foreground">
                        {search.time}
                      </span>

                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => deleteRecent(search.query, e)}
                      >
                        <X className="w-3 h-3" />
                      </button>

                    </div>

                  </div>

                ))}

              </CardContent>

            </Card>

          </div>

          {/* Results */}

          <Card className="lg:col-span-2 bg-card border-border">

            <CardHeader>
              <CardTitle>
                {hasSearched
                  ? `Search Results (${results.length})`
                  : "Enter a query to search"}
              </CardTitle>
            </CardHeader>

            <CardContent>

              {hasSearched ? (

                <ScrollArea className="h-[500px]">

                  <div className="space-y-3">

                    {results.length === 0 ? (

                      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">

                        <SearchIcon className="w-12 h-12 mb-3 opacity-20" />

                        <p>No results found for "{searchQuery}"</p>

                      </div>

                    ) : (

                      results.map((result) => (

                        <div
                          key={result.id}
                          className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50"
                        >

                          <div className="flex items-center gap-3 mb-2">

                            <span className="text-xs text-muted-foreground font-mono">
                              {result.timestamp}
                            </span>

                            <Badge variant="outline">
                              {result.source}
                            </Badge>

                          </div>

                          <p className="text-sm font-mono">

                            {highlightText(result.message ?? "", searchQuery)}

                          </p>

                        </div>

                      ))

                    )}

                  </div>

                </ScrollArea>

              ) : (

                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">

                  <SearchIcon className="w-16 h-16 mb-4 opacity-20" />

                  <p className="text-lg">Start searching your security data</p>

                  <p className="text-sm mt-2">
                    Use query syntax like: level:ERROR AND source:firewall-01
                  </p>

                </div>

              )}

            </CardContent>

          </Card>

        </div>

      </div>
    </DashboardLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
