"use client";

import { useMemo } from "react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { Users, Clock, Lightbulb, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CalendarEvent } from "@/app/app/page";

interface SamePeopleViewProps {
  events: CalendarEvent[];
  weekStart: Date;
  filterEmail?: string | null;
  onEventClick: (eventId: string) => void;
}

interface PersonGroup {
  email: string;
  name: string;
  events: CalendarEvent[];
  totalMinutes: number;
}

interface MeetingCluster {
  people: string[];
  peopleEmails: string[];
  events: CalendarEvent[];
  totalMinutes: number;
}

export function SamePeopleView({ events, weekStart, filterEmail, onEventClick }: SamePeopleViewProps) {
  const { personGroups, clusters, recommendations } = useMemo(() => {
    // Group events by attendee
    const byPerson: Record<string, PersonGroup> = {};

    for (const event of events) {
      for (const att of event.attendees || []) {
        if (!byPerson[att.email]) {
          byPerson[att.email] = {
            email: att.email,
            name: att.displayName || att.email,
            events: [],
            totalMinutes: 0,
          };
        }
        const mins = differenceInMinutes(parseISO(event.end), parseISO(event.start));
        byPerson[att.email].events.push(event);
        byPerson[att.email].totalMinutes += mins;
      }
    }

    const personGroups = Object.values(byPerson)
      .filter((p) => p.events.length >= 1)
      .sort((a, b) => b.events.length - a.events.length);

    // Find clusters: groups of meetings with identical attendees
    const clusterMap = new Map<string, MeetingCluster>();
    for (const event of events) {
      const emails = (event.attendees || []).map((a) => a.email).sort();
      if (emails.length === 0) continue;
      const key = emails.join(",");
      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          people: (event.attendees || []).map((a) => a.displayName || a.email),
          peopleEmails: emails,
          events: [],
          totalMinutes: 0,
        });
      }
      const cluster = clusterMap.get(key)!;
      cluster.events.push(event);
      cluster.totalMinutes += differenceInMinutes(parseISO(event.end), parseISO(event.start));
    }

    const clusters = [...clusterMap.values()]
      .filter((c) => c.events.length >= 2)
      .sort((a, b) => b.events.length - a.events.length);

    // Recommendations
    const recommendations: string[] = [];

    // Find clusters that could be merged (same people, multiple short meetings)
    for (const cluster of clusters) {
      if (cluster.events.length >= 3) {
        const avgMins = Math.round(cluster.totalMinutes / cluster.events.length);
        if (avgMins <= 30) {
          recommendations.push(
            `Consider merging ${cluster.events.length} short meetings (avg ${avgMins} min) with ${cluster.people.slice(0, 2).join(", ")}${cluster.people.length > 2 ? ` +${cluster.people.length - 2}` : ""} into fewer, longer sessions.`
          );
        }
      }
    }

    // Find people you spend most time with
    const topPerson = personGroups[0];
    if (topPerson && topPerson.events.length >= 4) {
      recommendations.push(
        `You have ${topPerson.events.length} meetings with ${topPerson.name} this week (${Math.round(topPerson.totalMinutes / 60)}h). Consider a standing agenda doc to reduce sync overhead.`
      );
    }

    // Back-to-back with same people
    const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      const gap = differenceInMinutes(parseISO(next.start), parseISO(curr.end));
      if (gap >= 0 && gap <= 15) {
        const currEmails = new Set((curr.attendees || []).map((a) => a.email));
        const overlap = (next.attendees || []).filter((a) => currEmails.has(a.email));
        if (overlap.length > 0 && overlap.length >= currEmails.size * 0.5) {
          recommendations.push(
            `"${curr.summary}" and "${next.summary}" are back-to-back with overlapping attendees. Could these be one meeting?`
          );
        }
      }
    }

    return { personGroups, clusters, recommendations };
  }, [events]);

  // If filtering by a specific person, show only that person's view
  const filteredGroups = filterEmail
    ? personGroups.filter((p) => p.email === filterEmail)
    : personGroups;

  const filteredClusters = filterEmail
    ? clusters.filter((c) => c.peopleEmails.includes(filterEmail))
    : clusters;

  return (
    <div className="flex h-full flex-col overflow-auto">
      <h2 className="mb-1 text-lg font-semibold">
        {filterEmail
          ? `Meetings with ${filteredGroups[0]?.name || filterEmail}`
          : "Same People · Meeting Groups"}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {filterEmail
          ? "All meetings involving this person"
          : "See who you meet with most and find optimization opportunities"}
      </p>

      {/* Recommendations */}
      {recommendations.length > 0 && !filterEmail && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <Lightbulb className="h-3.5 w-3.5" />
            Optimization Tips
          </h3>
          <ul className="space-y-1.5">
            {recommendations.map((r, i) => (
              <li key={i} className="text-sm text-amber-700">• {r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Meeting Clusters (same attendees) */}
      {filteredClusters.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Recurring Groups ({filteredClusters.length})
          </h3>
          <div className="space-y-3">
            {filteredClusters.map((cluster, ci) => (
              <div key={ci} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap gap-1">
                  {cluster.people.map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
                <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {cluster.events.length} meetings
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round(cluster.totalMinutes / 60)}h total
                  </span>
                </div>
                <div className="space-y-1">
                  {cluster.events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event.id)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted/50"
                    >
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(parseISO(event.start), "EEE h:mm a")}
                      </span>
                      <span className="truncate">{event.summary}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-person breakdown */}
      <div>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {filterEmail ? "Meetings" : `By Person (${filteredGroups.length})`}
        </h3>
        {filteredGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendees data for this week</p>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((person) => (
              <div key={person.email} className="rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-sm">{person.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {person.events.length} meetings · {Math.round(person.totalMinutes / 60)}h
                  </span>
                </div>
                <div className="space-y-1">
                  {person.events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event.id)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted/50"
                    >
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(parseISO(event.start), "EEE h:mm a")}
                      </span>
                      <span className="truncate">{event.summary}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
