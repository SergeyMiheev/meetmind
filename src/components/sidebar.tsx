"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import type { SummaryData } from "@/app/app/page";

interface SidebarProps {
  summaries: SummaryData[];
  onSummaryClick: (summary: SummaryData) => void;
}

export function Sidebar({ summaries, onSummaryClick }: SidebarProps) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return summaries;
    const q = filter.toLowerCase();
    return summaries.filter(
      (s) =>
        s.eventTitle.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [summaries, filter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.eventStart.localeCompare(a.eventStart)),
    [filtered]
  );

  return (
    <aside className="w-80 border-l bg-background">
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by title or tag..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-112px)]">
        <div className="p-2">
          {sorted.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {summaries.length === 0
                ? "No summaries yet. Click a meeting to add one."
                : "No matches found."}
            </p>
          ) : (
            sorted.map((summary) => (
              <button
                key={summary.id}
                className="w-full rounded-lg p-3 text-left transition-colors hover:bg-muted"
                onClick={() => onSummaryClick(summary)}
              >
                <div className="mb-1 font-medium text-sm truncate">
                  {summary.eventTitle}
                </div>
                <div className="mb-2 text-xs text-muted-foreground">
                  {format(parseISO(summary.eventStart), "MMM d, h:mm a")}
                </div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {summary.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-1.5 py-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                {summary.summaryContext && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {summary.summaryContext}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
