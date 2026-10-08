"use client";

import React, { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { logsApi, Log, TimeRange } from "@/lib/api";
import { cn, formatTimestamp, timeAgo } from "@/lib/utils";
import { parseSearchTerms } from "@/lib/search";
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
  AlertTriangle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

type SavedSearch = { id: number; name: string; query: string };
type RecentSearch = { query: string; at: number };
type SearchResult = Log;

// These match what this app actually logs (ML predictions, log levels and
// services), so every saved search can return real results.
const defaultSavedSearches: SavedSearch[] = [
  { id: 1, name: "Malicious Detections", query: "prediction:malicious" },
  { id: 2, name: "Error-level Events", query: "level:ERROR" },
  { id: 3, name: "Suspicious (Warnings)", query: "level:WARN" },
  { id: 4, name: "CSV Upload Analyses", query: "service:ml-model-upload" },
];

const RECENT_KEY = "threat-search:recent";
const SAVED_KEY = "threat-search:saved";
const MAX_RECENT = 6;

const levelColors: Record<string, string> = {
  ERROR: "bg-destructive text-destructive-foreground",
  WARN: "bg-[#d29922] text-[#0d1117]",
  INFO: "bg-accent text-accent-foreground",
  DEBUG: "bg-muted text-muted-foreground",
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode, quota) - searches just won't persist */
  }
}

/** Wrap every occurrence of any search term in <mark>. */
function highlightText(text: string, terms: string[]) {
  const usable = terms.filter(Boolean);
  if (usable.length === 0) return <span>{text}</span>;

  const pattern = usable
    .sort((x, y) => y.length - x.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  // With one capture group, split() puts every match at an odd index.
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-[#d29922]/30 text-[#d29922] px-1 rounded">
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
  // The demo data can be old, so default to everything rather than "24h",
  // which would show no results for logs older than a day.
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTerms, setActiveTerms] = useState<string[]>([]);
  const [lastQuery, setLastQuery] = useState("");
  const [savedSearches, setSavedSearches] =
    useState<SavedSearch[]>(defaultSavedSearches);
  const [hits, setHits] = useState<Record<number, number>>({});
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const requestId = useRef(0);

  /* -------- Restore saved/recent searches (browser only) -------- */

  useEffect(() => {
    setSavedSearches(loadStored(SAVED_KEY, defaultSavedSearches));
    setRecentSearches(loadStored(RECENT_KEY, []));
  }, []);

  /* -------- Hit counts come from the same search the results use -------- */

  const savedKey = savedSearches.map((x) => `${x.id}:${x.query}`).join("|");

  useEffect(() => {
    let cancelled = false;
    const loadHits = async () => {
      const entries = await Promise.all(
        savedSearches.map(async (search) => {
          try {
            return [search.id, await logsApi.count(search.query, timeRange)] as const;
          } catch {
            return [search.id, undefined] as const;
          }
        })
      );
      if (cancelled) return;
      const next: Record<number, number> = {};
      for (const [id, count] of entries) if (count !== undefined) next[id] = count;
      setHits(next);
    };
    loadHits();
    return () => {
      cancelled = true;
    };
    // savedKey changes exactly when the list of queries changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, timeRange]);

  /* -------- Run search -------- */

  const runSearch = useCallback(async (q: string, range: TimeRange) => {
    const query = q.trim();
    if (!query) {
      requestId.current++;
      setResults([]);
      setHasSearched(false);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const id = ++requestId.current;
    setIsSearching(true);
    setSearchError(null);

    try {
      const data = await logsApi.search(query, range);
      if (id !== requestId.current) return; // a newer search superseded this one

      setResults(data);
      setActiveTerms(parseSearchTerms(query));
      setLastQuery(query);
      setHasSearched(true);

      setRecentSearches((prev) => {
        const without = prev.filter((s) => s.query !== query);
        const next = [{ query, at: Date.now() }, ...without].slice(0, MAX_RECENT);
        saveStored(RECENT_KEY, next);
        return next;
      });
    } catch (error) {
      if (id !== requestId.current) return;
      console.error("Search failed:", error);
      setSearchError("Search failed. Check that the backend is reachable and try again.");
      setHasSearched(true);
      setResults([]);
    } finally {
      if (id === requestId.current) setIsSearching(false);
    }
  }, []);

  /* -------- Auto run search from URL (header search box) -------- */

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setSearchQuery(q);
      runSearch(q, "all");
      setTimeRange("all");
    }
  }, [searchParams, runSearch]);

  const handleSearch = () => runSearch(searchQuery, timeRange);

  const handleRangeChange = (value: string) => {
    const range = value as TimeRange;
    setTimeRange(range);
    if (hasSearched && searchQuery.trim()) runSearch(searchQuery, range);
  };

  const loadQuery = (q: string) => {
    setSearchQuery(q);
    runSearch(q, timeRange);
  };

  const deleteSaved = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedSearches((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveStored(SAVED_KEY, next);
      return next;
    });
  };

  const deleteRecent = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s.query !== query);
      saveStored(RECENT_KEY, next);
      return next;
    });
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
                  placeholder="Search logs... e.g. malicious, level:ERROR, service:ml-model-upload"
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
                      runSearch("", timeRange);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

              </div>

              <Select value={timeRange} onValueChange={handleRangeChange}>

                <SelectTrigger className="w-[140px] h-12 bg-input border-border">
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="15m">Last 15 min</SelectItem>
                  <SelectItem value="1h">Last 1 hour</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>

              </Select>

              <Button
                onClick={handleSearch}
                disabled={isSearching}
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

                      <Badge variant="outline">{hits[search.id] ?? "–"}</Badge>

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

                {recentSearches.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Your searches will show up here.
                  </p>
                )}

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
                        {timeAgo(search.at)}
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
                {isSearching && hasSearched && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    updating...
                  </span>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent>

              {hasSearched ? (

                <ScrollArea className="h-[500px]">

                  <div className="space-y-3">

                    {searchError ? (

                      <div className="flex flex-col items-center justify-center h-[300px] text-destructive">

                        <AlertTriangle className="w-12 h-12 mb-3 opacity-40" />

                        <p>{searchError}</p>

                      </div>

                    ) : results.length === 0 ? (

                      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">

                        <SearchIcon className="w-12 h-12 mb-3 opacity-20" />

                        <p>No results found for &quot;{lastQuery}&quot;</p>

                        {timeRange !== "all" && (
                          <p className="text-sm mt-2">
                            Try widening the time range.
                          </p>
                        )}

                      </div>

                    ) : (

                      results.map((result) => (

                        <div
                          key={result.id}
                          className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50"
                        >

                          <div className="flex items-center gap-2 mb-2 flex-wrap">

                            <span
                              className="text-xs text-muted-foreground font-mono"
                              title={result.timestamp}
                            >
                              {formatTimestamp(result.timestamp)}
                            </span>

                            <Badge
                              className={cn(
                                "text-xs",
                                levelColors[result.level] ?? levelColors.INFO
                              )}
                            >
                              {result.level}
                            </Badge>

                            <Badge variant="outline">
                              {highlightText(result.source, activeTerms)}
                            </Badge>

                            <Badge variant="outline">
                              {highlightText(result.service, activeTerms)}
                            </Badge>

                          </div>

                          <p className="text-sm font-mono">

                            {highlightText(result.message ?? "", activeTerms)}

                          </p>

                        </div>

                      ))

                    )}

                  </div>

                </ScrollArea>

              ) : (

                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">

                  <SearchIcon className="w-16 h-16 mb-4 opacity-20" />

                  <p className="text-lg">
                    {isSearching ? "Searching..." : "Start searching your security data"}
                  </p>

                  <p className="text-sm mt-2 text-center max-w-md">
                    Try: malicious · level:ERROR · service:ml-model-upload AND malicious · &quot;rows malicious&quot;
                  </p>

                  <p className="text-xs mt-1">
                    Fields: level, source, service, prediction, message, id
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
