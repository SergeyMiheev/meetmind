"use client";

import { useState } from "react";
import { X, Mic, Square, Copy, RefreshCw, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import type { CalendarEvent, SummaryData } from "@/app/app/page";

interface MeetingDetailProps {
  event: CalendarEvent | null;
  summary: SummaryData | null;
  onClose: () => void;
  onSummaryCreated: (summary: SummaryData) => void;
}

export function MeetingDetail({
  event,
  summary,
  onClose,
  onSummaryCreated,
}: MeetingDetailProps) {
  const [rawInput, setRawInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [appendMode, setAppendMode] = useState(false);
  const [regenerateMode, setRegenerateMode] = useState(false);

  const { isRecording, seconds, startRecording, stopRecording } =
    useVoiceRecorder({
      onRecordingComplete: async (blob) => {
        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob);
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const { text } = await res.json();
            setRawInput((prev) => (prev ? prev + "\n\n" + text : text));
          }
        } finally {
          setTranscribing(false);
        }
      },
    });

  const handleGenerate = async () => {
    if (!event || !rawInput.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          eventTitle: event.summary,
          eventStart: event.start,
          eventEnd: event.end,
          eventAttendees: event.attendees,
          eventDescription: event.description,
          rawInput: appendMode && summary
            ? summary.rawInput + "\n\n" + rawInput
            : rawInput,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSummaryCreated(data);
        setRawInput("");
        setAppendMode(false);
        setRegenerateMode(false);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    const text = [
      `# ${summary.eventTitle}`,
      `Tags: ${summary.tags.join(", ")}`,
      "",
      "## Context",
      summary.summaryContext,
      "",
      "## Main Ideas",
      ...summary.summaryMainIdeas.map((i) => `- ${i}`),
      "",
      "## Action Items",
      ...summary.summaryActions.map((a) => `- ${a}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    if (!summary) return;
    setRawInput(summary.rawInput);
    setAppendMode(false);
    setRegenerateMode(true);
  };

  if (!event) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-background p-8">
          <p className="text-muted-foreground">Event not found</p>
          <Button variant="ghost" onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-[480px] overflow-auto bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b p-6">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-semibold">{event.summary}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(parseISO(event.start), "EEEE, MMM d · h:mm a")} —{" "}
              {format(parseISO(event.end), "h:mm a")}
            </p>
            {event.attendees?.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {event.attendees.map((a) => a.displayName || a.email).join(", ")}
              </p>
            )}
            {event.description && (
              <div className="mt-3 rounded-md bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm whitespace-pre-wrap break-words">{event.description}</p>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {summary && !appendMode && !regenerateMode ? (
            /* State B — Has Summary */
            <div>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {summary.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              {summary.summaryContext && (
                <>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    Context
                  </h3>
                  <p className="mb-4 text-sm">{summary.summaryContext}</p>
                </>
              )}

              {summary.summaryMainIdeas.length > 0 && (
                <>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    Main Ideas
                  </h3>
                  <ul className="mb-4 space-y-1">
                    {summary.summaryMainIdeas.map((idea, i) => (
                      <li key={i} className="text-sm">
                        • {idea}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {summary.summaryActions.length > 0 && (
                <>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    Action Items
                  </h3>
                  <ul className="mb-4 space-y-1">
                    {summary.summaryActions.map((action, i) => (
                      <li key={i} className="text-sm">
                        ☐ {action}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <Separator className="my-4" />

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="mr-1 h-3.5 w-3.5" />
                  ) : (
                    <Copy className="mr-1 h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAppendMode(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add notes
                </Button>
              </div>
            </div>
          ) : (
            /* State A — No Summary (or append mode) */
            <div>
              {appendMode && (
                <p className="mb-3 text-sm text-muted-foreground">
                  Adding more notes to existing summary...
                </p>
              )}
              <Textarea
                placeholder="What happened? Just dump your thoughts..."
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                rows={8}
                className="mb-3 resize-none"
              />

              <div className="mb-4 flex items-center gap-3">
                {isRecording ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopRecording}
                  >
                    <Square className="mr-1 h-3.5 w-3.5" />
                    Stop ({seconds}s)
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startRecording}
                    disabled={transcribing}
                  >
                    <Mic className="mr-1 h-3.5 w-3.5" />
                    {transcribing ? "Transcribing..." : "Record voice"}
                  </Button>
                )}
              </div>

              <Button
                className="w-full bg-indigo-500 text-white hover:bg-indigo-600"
                onClick={handleGenerate}
                disabled={!rawInput.trim() || generating}
              >
                {generating ? "Generating..." : "Generate Summary"}
              </Button>

              {appendMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    setAppendMode(false);
                    setRawInput("");
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
