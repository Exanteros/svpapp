"use client";

import { Fragment, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GripVertical, MapPin, Megaphone, Move } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { formatDate } from "./format";
import type { FeldEinstellungen, Spiel, TurnierEinstellungen } from "./types";

interface ScheduleDragBoardProps {
  spiele: Spiel[];
  settings: TurnierEinstellungen;
  feldEinstellungen: FeldEinstellungen[];
  saving: boolean;
  onSpielMove: (spielId: string, patch: Pick<Spiel, "datum" | "zeit" | "feld">) => Promise<unknown> | unknown;
}

interface TargetCell {
  datum: string;
  zeit: string;
  feld: string;
}

const ANNOUNCEMENT_OFFSET_MINUTES = 5;
const twoLineClampStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};

export function ScheduleDragBoard({
  spiele,
  settings,
  feldEinstellungen,
  saving,
  onSpielMove,
}: ScheduleDragBoardProps) {
  const [activeDate, setActiveDate] = useState(settings.turnierStartDatum);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  const days = useMemo(() => getScheduleDays(spiele, settings), [spiele, settings]);
  const gamesForDay = useMemo(
    () => spiele.filter((spiel) => spiel.datum === activeDate).sort(compareGames),
    [activeDate, spiele]
  );
  const fields = useMemo(
    () => getFieldsForDay(gamesForDay, feldEinstellungen, activeDate),
    [activeDate, feldEinstellungen, gamesForDay]
  );
  const timeSlots = useMemo(
    () => getTimeSlotsForDay(gamesForDay, settings, activeDate),
    [activeDate, gamesForDay, settings]
  );
  const gamesByCell = useMemo(() => {
    const result = new Map<string, Spiel[]>();

    for (const spiel of gamesForDay) {
      const key = getCellKey(spiel.datum, spiel.zeit, spiel.feld);
      result.set(key, [...(result.get(key) || []), spiel]);
    }

    return result;
  }, [gamesForDay]);

  useEffect(() => {
    if (days.some((day) => day.date === activeDate)) return;
    setActiveDate(days[0]?.date || settings.turnierStartDatum);
  }, [activeDate, days, settings.turnierStartDatum]);

  async function handleDragEnd(event: DragEndEvent) {
    const spielId = getGameId(String(event.active.id));
    const target = event.over ? parseCellId(String(event.over.id)) : null;

    if (!spielId || !target) {
      return;
    }

    const spiel = spiele.find((candidate) => candidate.id === spielId);

    if (!spiel || (spiel.datum === target.datum && spiel.zeit === target.zeit && spiel.feld === target.feld)) {
      return;
    }

    try {
      setPendingId(spielId);
      await onSpielMove(spielId, target);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden rounded-[8px] border-[#d9dec8] bg-white">
      <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Move className="size-5 text-[#5e6d35]" />
            Spielbaum & Ansagen
          </CardTitle>
          <p className="!mt-1 text-sm text-muted-foreground">
            Spiele visuell nach Uhrzeit und Feld verschieben. Jede Spalte zeigt die Ansagezeit.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {days.map((day) => (
            <Button
              key={day.date}
              type="button"
              variant={activeDate === day.date ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveDate(day.date)}
              className={activeDate === day.date ? "bg-[#5e6d35] text-white hover:bg-[#4f5d2f]" : ""}
            >
              {day.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {spiele.length === 0 ? (
          <div className="rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
            Noch kein Spielplan vorhanden.
          </div>
        ) : gamesForDay.length === 0 ? (
          <div className="rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
            Für {formatDate(activeDate)} sind noch keine Spiele geplant.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="border-[#d9dec8] text-[#4f5d2f]">
                {gamesForDay.length} Spiele
              </Badge>
              <span className="inline-flex items-center gap-1">
                <GripVertical className="size-3.5" />
                Karte ziehen und auf eine andere Feldzeit ablegen.
              </span>
            </div>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <ScheduleTimeGrid
                fields={fields}
                timeSlots={timeSlots}
                activeDate={activeDate}
                gamesByCell={gamesByCell}
                disabled={saving}
                pendingId={pendingId}
              />
            </DndContext>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduleTimeGrid({
  fields,
  timeSlots,
  activeDate,
  gamesByCell,
  disabled,
  pendingId,
}: {
  fields: string[];
  timeSlots: string[];
  activeDate: string;
  gamesByCell: Map<string, Spiel[]>;
  disabled: boolean;
  pendingId: string | null;
}) {
  const columnCount = Math.max(fields.length, 1);
  const gridTemplateColumns = `104px repeat(${columnCount}, minmax(220px, 1fr))`;
  const gridTemplateRows = `44px repeat(${Math.max(timeSlots.length, 1)}, 176px)`;
  const minWidth = 104 + columnCount * 240;

  if (fields.length === 0) {
    return (
      <div className="rounded-[8px] border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
        Keine aktiven Felder für diesen Tag.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[8px] border border-[#d9dec8] bg-[#e1e4d8]">
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns, gridTemplateRows, minWidth }}
      >
        <div className="sticky left-0 z-20 flex h-11 items-center bg-white px-3 text-xs font-semibold uppercase tracking-normal text-[#4f5d2f]">
          Anpfiff
        </div>
        {fields.map((field) => (
          <div key={field} className="flex h-11 items-center bg-white px-3">
            <div className="inline-flex min-w-0 items-center gap-2 text-sm font-medium">
              <MapPin className="size-4 shrink-0 text-[#5e6d35]" />
              <span className="min-w-0 truncate">{field}</span>
            </div>
          </div>
        ))}

        {timeSlots.map((time) => (
          <Fragment key={time}>
            <div className="sticky left-0 z-10 h-44 overflow-hidden bg-[#f6f7f1] p-3">
              <div className="inline-flex items-center gap-1 text-sm font-semibold text-[#4f5d2f]">
                <Clock className="size-3.5" />
                {time}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Megaphone className="size-3.5" />
                {subtractMinutes(time, ANNOUNCEMENT_OFFSET_MINUTES)}
              </div>
            </div>
            {fields.map((field) => {
              const id = createCellId(activeDate, time, field);
              const games = gamesByCell.get(getCellKey(activeDate, time, field)) || [];

              return (
                <ScheduleDropCell key={id} id={id} empty={games.length === 0}>
                  {games.length > 0 ? (
                    games.map((spiel) => (
                      <ScheduleGameCard
                        key={spiel.id}
                        spiel={spiel}
                        disabled={disabled}
                        pending={pendingId === spiel.id}
                      />
                    ))
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-[6px] text-xs text-muted-foreground/70">
                      frei
                    </div>
                  )}
                </ScheduleDropCell>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function ScheduleDropCell({ id, children, empty = false }: { id: string; children: ReactNode; empty?: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid h-44 max-h-44 grid-rows-1 overflow-hidden border border-dashed p-2 transition-colors",
        empty ? "border-[#e6e8de] bg-[#fbfbf8]" : "border-[#d9dec8] bg-white",
        isOver && "border-[#5e6d35] bg-[#eef1e5]"
      )}
    >
      {children}
    </div>
  );
}

function ScheduleGameCard({ spiel, disabled, pending }: { spiel: Spiel; disabled: boolean; pending: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: createGameId(spiel.id),
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    height: 160,
    maxHeight: 160,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex h-40 max-h-40 touch-none flex-col overflow-hidden rounded-[8px] border bg-white p-3 shadow-xs transition-shadow",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-60 shadow-md",
        pending && "opacity-60"
      )}
    >
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="block max-w-[calc(100%-24px)] truncate border-[#d9dec8] text-[#4f5d2f]"
          title={spiel.kategorie}
        >
          <span className="block truncate">{spiel.kategorie}</span>
        </Badge>
        <GripVertical className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <p
        className="!mt-0 h-10 overflow-hidden break-words text-sm font-semibold leading-5"
        style={twoLineClampStyle}
        title={spiel.team1}
      >
        {spiel.team1}
      </p>
      <p className="!my-1 h-4 shrink-0 text-xs text-muted-foreground">gegen</p>
      <p
        className="!mb-0 h-10 overflow-hidden break-words text-sm font-semibold leading-5"
        style={twoLineClampStyle}
        title={spiel.team2}
      >
        {spiel.team2}
      </p>
      {spiel.status !== "geplant" && (
        <Badge variant="secondary" className="mt-auto w-fit">
          {spiel.status}
        </Badge>
      )}
    </div>
  );
}

function getScheduleDays(spiele: Spiel[], settings: TurnierEinstellungen) {
  const dates = new Set([settings.turnierStartDatum, settings.turnierEndDatum, ...spiele.map((spiel) => spiel.datum)]);

  return Array.from(dates)
    .filter(Boolean)
    .sort()
    .map((date, index) => ({
      date,
      label: date === settings.turnierStartDatum ? "Tag 1" : date === settings.turnierEndDatum ? "Tag 2" : `Tag ${index + 1}`,
    }));
}

function getFieldsForDay(spiele: Spiel[], feldEinstellungen: FeldEinstellungen[], date: string) {
  const activeFields = feldEinstellungen
    .filter((field) => field.aktiveTage?.[date] !== false)
    .map((field) => field.name)
    .filter(Boolean);
  const gameFields = spiele.map((spiel) => spiel.feld).filter(Boolean);

  return unique([...activeFields, ...gameFields]).sort(compareFieldNames);
}

function getTimeSlotsForDay(spiele: Spiel[], settings: TurnierEinstellungen, date: string) {
  const times = unique(spiele.map((spiel) => spiel.zeit).filter(Boolean)).sort();

  if (times.length > 0) {
    return times;
  }

  const isStartDate = date === settings.turnierStartDatum;
  return createHourlySlots(
    isStartDate ? settings.samstagStartzeit : settings.sonntagStartzeit,
    isStartDate ? settings.samstagEndzeit : settings.sonntagEndzeit
  );
}

function createCellId(datum: string, zeit: string, feld: string) {
  return `cell|${datum}|${zeit}|${encodeURIComponent(feld)}`;
}

function parseCellId(id: string): TargetCell | null {
  const [type, datum, zeit, encodedField] = id.split("|");

  if (type !== "cell" || !datum || !zeit || !encodedField) {
    return null;
  }

  return {
    datum,
    zeit,
    feld: decodeURIComponent(encodedField),
  };
}

function createGameId(id: string) {
  return `game|${id}`;
}

function getGameId(id: string) {
  return id.startsWith("game|") ? id.slice(5) : "";
}

function getCellKey(datum: string, zeit: string, feld: string) {
  return `${datum}|${zeit}|${feld}`;
}

function compareGames(first: Spiel, second: Spiel) {
  return `${first.zeit}-${first.feld}-${first.kategorie}-${first.team1}`.localeCompare(
    `${second.zeit}-${second.feld}-${second.kategorie}-${second.team1}`,
    "de"
  );
}

function compareFieldNames(first: string, second: string) {
  const firstNumber = Number(first.match(/\d+/)?.[0]);
  const secondNumber = Number(second.match(/\d+/)?.[0]);

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber) && firstNumber !== secondNumber) {
    return firstNumber - secondNumber;
  }

  return first.localeCompare(second, "de");
}

function createHourlySlots(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  const slots: string[] = [];

  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 60) {
    slots.push(minutesToTime(minutes));
  }

  return slots.length > 0 ? slots : ["09:00", "10:00", "11:00"];
}

function subtractMinutes(time: string, minutes: number) {
  return minutesToTime(Math.max(0, timeToMinutes(time) - minutes));
}

function timeToMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}
