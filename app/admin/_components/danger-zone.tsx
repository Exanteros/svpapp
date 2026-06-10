"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DangerZoneProps {
  title: string;
  description: string;
  demoLabel?: string;
  flushLabel?: string;
  affectedCount?: number;
  onCreateDemo?: () => void;
  onFlush?: () => void;
}

export function DangerZone({ title, description, demoLabel, flushLabel, affectedCount, onCreateDemo, onFlush }: DangerZoneProps) {
  const [armed, setArmed] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const canFlush = armed && confirmation.trim() === "LEEREN";

  return (
    <Card className="rounded-[8px] border-destructive/20 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="!mt-0 text-sm leading-6 text-muted-foreground">{description}</p>
        {typeof affectedCount === "number" && (
          <p className="!mt-0 text-sm text-muted-foreground">
            Betroffene Einträge: <span className="font-medium text-foreground">{affectedCount}</span>
          </p>
        )}
        <div className="flex items-center gap-2">
          <Checkbox id={`${title}-armed`} checked={armed} onCheckedChange={(value) => setArmed(Boolean(value))} />
          <Label htmlFor={`${title}-armed`} className="text-sm">
            Gefahrbereich entsperren
          </Label>
        </div>
        {onFlush && (
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor={`${title}-confirmation`} className="text-sm">
              Zum Leeren exakt LEEREN eingeben
            </Label>
            <Input
              id={`${title}-confirmation`}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={!armed}
              placeholder="LEEREN"
            />
          </div>
        )}
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          {onCreateDemo && (
            <Button variant="outline" size="sm" disabled={!armed} onClick={onCreateDemo} className="w-full sm:w-auto">
              {demoLabel || "Demo-Daten erstellen"}
            </Button>
          )}
          {onFlush && (
            <Button variant="destructive" size="sm" disabled={!canFlush} onClick={onFlush} className="w-full sm:w-auto">
              {flushLabel || "Daten leeren"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
