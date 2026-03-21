"use client";

import { format, addDays, isToday, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/app/app/page";

interface CalendarGridProps {
  events: CalendarEvent[];
  summaryEventIds: Set<string>;
  weekStart: Date;
  currentDate: Date;
  loading: boolean;
  onEventClick: (eventId: string) => void;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  selectedEventId: string | null;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 — 20:00

export function CalendarGrid({
  events,
  summaryEventIds,
  weekStart,
  loading,
  onEventClick,
  onNavigate,
  selectedEventId,
}: CalendarGridProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (day: Date) =>
    events.filter((e) => {
      const eventDate = parseISO(e.start);
      return isSameDay(eventDate, day);
    });

  const getEventPosition = (event: CalendarEvent) => {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = ((startHour - 7) / 14) * 100;
    const height = ((endHour - startHour) / 14) * 100;
    return {
      top: `${Math.max(0, top)}%`,
      height: `${Math.max(3, Math.min(height, 100 - Math.max(0, top)))}%`,
    };
  };

  return (
    <div className="flex h-full flex-col">
      {/* Navigation */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => onNavigate("today")}>
          Today
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onNavigate("prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onNavigate("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </h2>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto rounded-lg border">
        {/* Day headers */}
        <div className="sticky top-0 z-10 grid grid-cols-[60px_repeat(7,1fr)] border-b bg-background">
          <div className="border-r p-2" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r p-2 text-center text-sm last:border-r-0",
                isToday(day) && "bg-indigo-50"
              )}
            >
              <div className="text-muted-foreground">
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                  isToday(day) && "bg-indigo-500 text-white"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Hour labels */}
          <div className="border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex h-16 items-start justify-end border-b pr-2 pt-0.5 text-xs text-muted-foreground"
              >
                {format(new Date(2000, 0, 1, hour), "h a")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "relative border-r last:border-r-0",
                isToday(day) && "bg-indigo-50/30"
              )}
            >
              {/* Hour lines */}
              {HOURS.map((hour) => (
                <div key={hour} className="h-16 border-b" />
              ))}

              {/* Events */}
              {loading ? (
                <div className="absolute inset-0 space-y-1 p-1">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                getEventsForDay(day).map((event) => {
                  const pos = getEventPosition(event);
                  const hasSummary = summaryEventIds.has(event.id);
                  const isSelected = selectedEventId === event.id;
                  return (
                    <button
                      key={event.id}
                      className={cn(
                        "absolute left-0.5 right-0.5 overflow-hidden rounded px-1.5 py-0.5 text-left text-xs transition-colors",
                        isSelected
                          ? "bg-indigo-500 text-white ring-2 ring-indigo-500 ring-offset-1"
                          : "bg-indigo-100 text-indigo-900 hover:bg-indigo-200"
                      )}
                      style={{ top: pos.top, height: pos.height }}
                      onClick={() => onEventClick(event.id)}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                            hasSummary ? "bg-indigo-500" : "border border-indigo-400"
                          )}
                        />
                        <span className="truncate font-medium">
                          {event.summary}
                        </span>
                      </div>
                      <div className={cn("truncate", isSelected ? "text-indigo-100" : "text-indigo-600")}>
                        {format(parseISO(event.start), "h:mm a")}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
