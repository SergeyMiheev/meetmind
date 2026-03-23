"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarGrid } from "@/components/calendar-grid";
import { Sidebar } from "@/components/sidebar";
import { MeetingDetail } from "@/components/meeting-detail";
import { AppHeader } from "@/components/app-header";
import { WeeklyAnalytics } from "@/components/weekly-analytics";
import { SamePeopleView } from "@/components/same-people-view";
import { useSearchParams, useRouter } from "next/navigation";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  parseISO,
} from "date-fns";

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  attendees: { email: string; displayName?: string }[];
  description?: string;
}

export interface SummaryData {
  id: string;
  calendarEventId: string;
  eventTitle: string;
  eventStart: string;
  eventEnd: string;
  rawInput: string;
  summaryContext: string | null;
  summaryMainIdeas: string[];
  summaryActions: string[];
  tags: string[];
  modelUsed: string | null;
  createdAt: string;
}

export default function AppPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateParam = searchParams.get("date");

  const [currentDate, setCurrentDate] = useState(() =>
    dateParam ? parseISO(dateParam) : new Date()
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [summaries, setSummaries] = useState<SummaryData[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSamePeople, setShowSamePeople] = useState(false);
  const [samePeopleEmail, setSamePeopleEmail] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, summariesRes] = await Promise.all([
        fetch(
          `/api/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
        ),
        fetch(`/api/summaries`),
      ]);
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (summariesRes.ok) setSummaries(await summariesRes.json());
    } finally {
      setLoading(false);
    }
  }, [weekStart.toISOString(), weekEnd.toISOString()]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateWeek = (direction: "prev" | "next" | "today") => {
    const newDate =
      direction === "today"
        ? new Date()
        : direction === "next"
          ? addWeeks(currentDate, 1)
          : subWeeks(currentDate, 1);
    setCurrentDate(newDate);
    router.replace(`/app?date=${format(newDate, "yyyy-MM-dd")}`, {
      scroll: false,
    });
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const selectedSummary = summaries.find(
    (s) => s.calendarEventId === selectedEventId
  );

  const summaryEventIds = new Set(summaries.map((s) => s.calendarEventId));

  const handleToggleSamePeople = () => {
    setShowSamePeople((v) => !v);
    setSamePeopleEmail(null);
    if (!showSamePeople) setShowAnalytics(false);
  };

  const handleToggleAnalytics = () => {
    setShowAnalytics((v) => !v);
    if (!showAnalytics) {
      setShowSamePeople(false);
      setSamePeopleEmail(null);
    }
  };

  const handleAttendeeClick = (email: string) => {
    setShowSamePeople(true);
    setSamePeopleEmail(email);
    setShowAnalytics(false);
  };

  const activeView = showAnalytics ? "analytics" : showSamePeople ? "people" : "calendar";

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        activeView={activeView}
        onToggleSamePeople={handleToggleSamePeople}
        onToggleAnalytics={handleToggleAnalytics}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          {showAnalytics ? (
            <WeeklyAnalytics
              events={events}
              summaries={summaries}
              weekStart={weekStart}
            />
          ) : showSamePeople ? (
            <SamePeopleView
              events={events}
              weekStart={weekStart}
              filterEmail={samePeopleEmail}
              onEventClick={(id) => {
                setSelectedEventId(id);
              }}
            />
          ) : (
            <CalendarGrid
              events={events}
              summaryEventIds={summaryEventIds}
              weekStart={weekStart}
              currentDate={currentDate}
              loading={loading}
              onEventClick={setSelectedEventId}
              onNavigate={navigateWeek}
              selectedEventId={selectedEventId}
            />
          )}
        </main>
        <Sidebar
          summaries={summaries}
          onSummaryClick={(summary) => {
            setSelectedEventId(summary.calendarEventId);
            const eventDate = parseISO(summary.eventStart);
            if (eventDate < weekStart || eventDate > weekEnd) {
              setCurrentDate(eventDate);
              router.replace(
                `/app?date=${format(eventDate, "yyyy-MM-dd")}`,
                { scroll: false }
              );
            }
          }}
        />
      </div>

      {selectedEventId && (
        <MeetingDetail
          event={selectedEvent ?? null}
          summary={selectedSummary ?? null}
          onClose={() => setSelectedEventId(null)}
          onSummaryCreated={(newSummary) => {
            setSummaries((prev) => {
              const idx = prev.findIndex(
                (s) => s.calendarEventId === newSummary.calendarEventId
              );
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = newSummary;
                return updated;
              }
              return [...prev, newSummary];
            });
          }}
          onAttendeeClick={handleAttendeeClick}
        />
      )}
    </div>
  );
}
