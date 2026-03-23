"use client";

import { useMemo } from "react";
import { format, parseISO, differenceInMinutes, addDays } from "date-fns";
import { Clock, Users, Calendar, TrendingUp, AlertTriangle, Coffee } from "lucide-react";
import type { CalendarEvent, SummaryData } from "@/app/app/page";

interface WeeklyAnalyticsProps {
  events: CalendarEvent[];
  summaries: SummaryData[];
  weekStart: Date;
}

export function WeeklyAnalytics({ events, summaries, weekStart }: WeeklyAnalyticsProps) {
  const analytics = useMemo(() => {
    // Total meeting hours
    let totalMinutes = 0;
    const dailyMinutes: Record<string, number> = {};
    const attendeeCount: Record<string, { count: number; name: string; minutes: number }> = {};
    let longestMeeting = { title: "", minutes: 0 };
    let overlappingCount = 0;

    for (let i = 0; i < 7; i++) {
      const dayKey = format(addDays(weekStart, i), "EEE");
      dailyMinutes[dayKey] = 0;
    }

    for (const event of events) {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      const mins = differenceInMinutes(end, start);
      totalMinutes += mins;

      const dayKey = format(start, "EEE");
      dailyMinutes[dayKey] = (dailyMinutes[dayKey] || 0) + mins;

      if (mins > longestMeeting.minutes) {
        longestMeeting = { title: event.summary, minutes: mins };
      }

      for (const att of event.attendees || []) {
        const key = att.email;
        if (!attendeeCount[key]) {
          attendeeCount[key] = { count: 0, name: att.displayName || att.email, minutes: 0 };
        }
        attendeeCount[key].count++;
        attendeeCount[key].minutes += mins;
      }
    }

    // Count overlapping meetings
    const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].start < sorted[i].end) {
          overlappingCount++;
        }
      }
    }

    // Top collaborators (excluding self — top 5)
    const topCollaborators = Object.values(attendeeCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Busiest day
    const busiestDay = Object.entries(dailyMinutes)
      .sort((a, b) => b[1] - a[1])[0];

    // Free time estimate (assuming 8h workday, 5 weekdays)
    const workMinutes = 5 * 8 * 60; // 2400 minutes
    const freeMinutes = Math.max(0, workMinutes - totalMinutes);

    // Summary coverage
    const summarizedCount = events.filter(e => 
      summaries.some(s => s.calendarEventId === e.id)
    ).length;

    return {
      totalMeetings: events.length,
      totalHours: (totalMinutes / 60).toFixed(1),
      totalMinutes,
      dailyMinutes,
      topCollaborators,
      longestMeeting,
      overlappingCount,
      busiestDay,
      freeMinutes,
      freeHours: (freeMinutes / 60).toFixed(1),
      summarizedCount,
      avgMeetingMins: events.length > 0 ? Math.round(totalMinutes / events.length) : 0,
    };
  }, [events, summaries, weekStart]);

  const maxDailyMinutes = Math.max(...Object.values(analytics.dailyMinutes), 1);

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-6 text-lg font-semibold">
        Weekly Analytics · {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
      </h2>

      {/* Top stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Calendar className="h-4 w-4 text-indigo-500" />}
          label="Meetings"
          value={String(analytics.totalMeetings)}
          sub={`${analytics.summarizedCount} summarized`}
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-violet-500" />}
          label="In meetings"
          value={`${analytics.totalHours}h`}
          sub={`avg ${analytics.avgMeetingMins} min`}
        />
        <StatCard
          icon={<Coffee className="h-4 w-4 text-emerald-500" />}
          label="Free time"
          value={`${analytics.freeHours}h`}
          sub="of 40h work week"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          label="Conflicts"
          value={String(analytics.overlappingCount)}
          sub="overlapping slots"
        />
      </div>

      {/* Daily breakdown bar chart */}
      <div className="mb-6 rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Daily Load</h3>
        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {Object.entries(analytics.dailyMinutes).map(([day, mins]) => (
            <div key={day} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {mins > 0 ? `${(mins / 60).toFixed(1)}h` : "—"}
              </span>
              <div
                className="w-full rounded-t bg-indigo-400 transition-all"
                style={{
                  height: `${Math.max(4, (mins / maxDailyMinutes) * 100)}px`,
                  opacity: mins > 0 ? 1 : 0.2,
                }}
              />
              <span className="text-xs font-medium">{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top collaborators */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Top Collaborators
          </h3>
          {analytics.topCollaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendees data</p>
          ) : (
            <div className="space-y-2">
              {analytics.topCollaborators.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {c.count} meetings · {Math.round(c.minutes / 60)}h
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            Insights
          </h3>
          <div className="space-y-2 text-sm">
            {analytics.busiestDay && analytics.busiestDay[1] > 0 && (
              <p>
                <span className="font-medium">Busiest day:</span>{" "}
                {analytics.busiestDay[0]} ({(analytics.busiestDay[1] / 60).toFixed(1)}h)
              </p>
            )}
            {analytics.longestMeeting.minutes > 0 && (
              <p>
                <span className="font-medium">Longest meeting:</span>{" "}
                {analytics.longestMeeting.title} ({analytics.longestMeeting.minutes} min)
              </p>
            )}
            {analytics.totalMeetings > 0 && (
              <p>
                <span className="font-medium">Meeting load:</span>{" "}
                {Math.round((analytics.totalMinutes / (5 * 8 * 60)) * 100)}% of work week
              </p>
            )}
            {analytics.overlappingCount > 0 && (
              <p className="text-amber-600">
                ⚠ {analytics.overlappingCount} time conflict{analytics.overlappingCount > 1 ? "s" : ""} this week
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
