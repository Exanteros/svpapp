"use client";

import { useState } from "react";
import { Activity, Trophy } from "lucide-react";

import ErgebnisseManager from "@/components/ErgebnisseManager";
import LiveGamesDashboard from "@/components/LiveGamesDashboard";
import RefereeCardScanner from "@/components/RefereeCardScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ToolView = "live" | "results";

export function DayToolsPanel() {
  const [view, setView] = useState<ToolView>("live");

  const views = [
    { id: "live" as const, label: "Live Games", icon: Activity },
    { id: "results" as const, label: "Ergebnisse", icon: Trophy },
  ];

  return (
    <div className="grid min-w-0 max-w-full gap-5 overflow-hidden">
      <Card className="min-w-0 overflow-hidden rounded-[8px] border-[#d9dec8] bg-white">
        <CardHeader className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-lg">Turniertag-Werkzeuge</CardTitle>
            <p className="!mt-1 text-sm text-muted-foreground">
              Laufende Spiele und Ergebnispflege sind bewusst von Planung und Verwaltung getrennt.
            </p>
          </div>
          <div className="grid w-full min-w-0 grid-cols-2 rounded-md border bg-[#f6f7f1] p-1 sm:w-auto sm:flex">
            {views.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => setView(item.id)}
                className={cn(
                  "h-8 min-w-0 w-full sm:w-auto",
                  view === item.id && "bg-white text-[#4f5d2f] shadow-xs hover:bg-white"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      <Card className="min-w-0 overflow-hidden rounded-[8px]">
        <CardContent className="min-w-0 max-w-full overflow-hidden p-3 sm:p-6">
          {view === "live" ? (
            <LiveGamesDashboard onOpenResults={() => setView("results")} />
          ) : (
            <div className="grid min-w-0 max-w-full gap-5 overflow-hidden">
              <ErgebnisseManager />
              <RefereeCardScanner />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
