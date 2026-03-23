"use client";

import { signOut, useSession } from "next-auth/react";
import { Sparkles, LogOut, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  activeView: "calendar" | "analytics" | "people";
  onToggleSamePeople: () => void;
  onToggleAnalytics: () => void;
}

export function AppHeader({
  activeView,
  onToggleSamePeople,
  onToggleAnalytics,
}: AppHeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <span className="font-semibold">MeetMind</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant={activeView === "people" ? "default" : "outline"}
          size="sm"
          onClick={onToggleSamePeople}
          className={cn(
            "gap-1.5",
            activeView === "people" && "bg-indigo-500 hover:bg-indigo-600"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Commitments
        </Button>
        <Button
          variant={activeView === "analytics" ? "default" : "outline"}
          size="sm"
          onClick={onToggleAnalytics}
          className={cn(
            "gap-1.5",
            activeView === "analytics" && "bg-indigo-500 hover:bg-indigo-600"
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Analytics
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {session?.user && (
          <>
            <Avatar className="h-7 w-7">
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback>
                {session.user.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {session.user.name}
            </span>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
