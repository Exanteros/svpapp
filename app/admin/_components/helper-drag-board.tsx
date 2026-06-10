"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Clock, GripVertical, Move, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { formatDate, isActive } from "./format";
import type { HelferAnmeldung, HelferBedarf } from "./types";

type HelperCategory = HelferBedarf["kategorie"];

interface HelperDragBoardProps {
  bedarf: HelferBedarf[];
  anmeldungen: HelferAnmeldung[];
  defaultDate: string;
  saving?: boolean;
  onMoveBedarf: (bedarf: HelferBedarf, patch: Partial<Pick<HelferBedarf, "datum" | "startzeit" | "endzeit" | "kategorie">>) => Promise<unknown> | unknown;
  onOpenBedarf: (bedarf: HelferBedarf) => void;
}

interface HelperTargetCell {
  datum: string;
  startzeit: string;
  kategorie: HelperCategory;
}

const helperCategories: Array<{ value: HelperCategory; label: string }> = [
  { value: "getraenke", label: "Getränke" },
  { value: "kaffee_kuchen", label: "Kaffee/Kuchen" },
  { value: "grill", label: "Grill" },
  { value: "waffeln_suess", label: "Waffeln/Süß" },
  { value: "aufbau", label: "Aufbau" },
  { value: "sonstiges", label: "Sonstiges" },
];

export function HelperDragBoard({
  bedarf,
  anmeldungen,
  defaultDate,
  saving = false,
  onMoveBedarf,
  onOpenBedarf,
}: HelperDragBoardProps) {
  const [activeDate, setActiveDate] = useState(defaultDate);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  const days = useMemo(() => getHelperDays(bedarf, defaultDate), [bedarf, defaultDate]);
  const bedarfForDay = useMemo(
    () => bedarf.filter((item) => item.datum === activeDate).sort(compareBedarf),
    [activeDate, bedarf]
  );
  const timeSlots = useMemo(() => buildHelperTimeSlots(bedarfForDay), [bedarfForDay]);
  const coverageByBedarf = useMemo(() => {
    const result = new Map<string, number>();

    for (const anmeldung of anmeldungen) {
      if (anmeldung.status === "abgesagt") continue;
      result.set(anmeldung.helferBedarfId, (result.get(anmeldung.helferBedarfId) || 0) + 1);
    }

    return result;
  }, [anmeldungen]);
  const bedarfByCell = useMemo(() => {
    const result = new Map<string, HelferBedarf[]>();

    for (const item of bedarfForDay) {
      const key = getHelperCellKey(item.datum, item.startzeit, item.kategorie);
      result.set(key, [...(result.get(key) || []), item]);
    }

    return result;
  }, [bedarfForDay]);

  useEffect(() => {
    if (days.some((day) => day.date === activeDate)) return;
    setActiveDate(days[0]?.date || defaultDate);
  }, [activeDate, days, defaultDate]);

  async function handleDragEnd(event: DragEndEvent) {
    const bedarfId = getBedarfId(String(event.active.id));
    const target = event.over ? parseHelperCellId(String(event.over.id)) : null;

    if (!bedarfId || !target) {
      return;
    }

    const item = bedarf.find((candidate) => candidate.id === bedarfId);

    if (!item) {
      return;
    }

    const duration = Math.max(30, timeToMinutes(item.endzeit) - timeToMinutes(item.startzeit));
    const nextEnd = minutesToTime(timeToMinutes(target.startzeit) + duration);

    if (
      item.datum === target.datum &&
      item.startzeit === target.startzeit &&
      item.endzeit === nextEnd &&
      item.kategorie === target.kategorie
    ) {
      return;
    }

    try {
      setPendingId(bedarfId);
      await onMoveBedarf(item, {
        datum: target.datum,
        startzeit: target.startzeit,
        endzeit: nextEnd,
        kategorie: target.kategorie,
      });
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
            Helfer-Zeitplan
          </CardTitle>
          <p className="!mt-1 text-sm text-muted-foreground">
            Aufgaben visuell nach Zeitfenster und Bereich planen. Die Deckung bleibt direkt sichtbar.
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
        {bedarf.length === 0 ? (
          <div className="rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
            Noch kein Helfer-Bedarf angelegt.
          </div>
        ) : bedarfForDay.length === 0 ? (
          <div className="rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">
            Für {formatDate(activeDate)} ist noch kein Helfer-Bedarf geplant.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="border-[#d9dec8] text-[#4f5d2f]">
                {bedarfForDay.length} Aufgaben
              </Badge>
              <span className="inline-flex items-center gap-1">
                <GripVertical className="size-3.5" />
                Aufgabe ziehen, neues Zeitfenster oder Bereich wählen.
              </span>
            </div>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="overflow-x-auto pb-2">
                <div
                  className="grid min-w-[900px] gap-2"
                  style={{
                    gridTemplateColumns: `136px repeat(${timeSlots.length}, minmax(142px, 1fr))`,
                  }}
                >
                  <div className="sticky left-0 z-10 rounded-[8px] border bg-[#f6f7f1] p-3 text-xs font-medium text-[#4f5d2f]">
                    Bereich
                  </div>
                  {timeSlots.map((time) => (
                    <div key={time} className="rounded-[8px] border bg-[#f6f7f1] p-3">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <Clock className="size-4 text-[#5e6d35]" />
                        {time}
                      </div>
                      <p className="!mt-1 text-xs text-muted-foreground">Startzeit</p>
                    </div>
                  ))}

                  {helperCategories.map((category) => (
                    <HelperCategoryRow
                      key={category.value}
                      category={category}
                      activeDate={activeDate}
                      timeSlots={timeSlots}
                      bedarfByCell={bedarfByCell}
                      coverageByBedarf={coverageByBedarf}
                      disabled={saving}
                      pendingId={pendingId}
                      onOpenBedarf={onOpenBedarf}
                    />
                  ))}
                </div>
              </div>
            </DndContext>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HelperCategoryRow({
  category,
  activeDate,
  timeSlots,
  bedarfByCell,
  coverageByBedarf,
  disabled,
  pendingId,
  onOpenBedarf,
}: {
  category: { value: HelperCategory; label: string };
  activeDate: string;
  timeSlots: string[];
  bedarfByCell: Map<string, HelferBedarf[]>;
  coverageByBedarf: Map<string, number>;
  disabled: boolean;
  pendingId: string | null;
  onOpenBedarf: (bedarf: HelferBedarf) => void;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex min-h-[112px] items-start rounded-[8px] border bg-white p-3 text-sm font-medium">
        {category.label}
      </div>
      {timeSlots.map((time) => {
        const id = createHelperCellId(activeDate, time, category.value);
        const items = bedarfByCell.get(getHelperCellKey(activeDate, time, category.value)) || [];

        return (
          <HelperDropCell key={id} id={id}>
            {items.length === 0 ? (
              <span className="text-xs text-muted-foreground">frei</span>
            ) : (
              items.map((item) => (
                <HelperBedarfCard
                  key={item.id}
                  item={item}
                  signed={coverageByBedarf.get(item.id) || 0}
                  disabled={disabled}
                  pending={pendingId === item.id}
                  onOpen={() => onOpenBedarf(item)}
                />
              ))
            )}
          </HelperDropCell>
        );
      })}
    </>
  );
}

function HelperDropCell({ id, children }: { id: string; children: ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid min-h-[112px] content-start gap-2 rounded-[8px] border border-dashed bg-[#fbfbf8] p-2 transition-colors",
        isOver && "border-[#5e6d35] bg-[#eef1e5]"
      )}
    >
      {children}
    </div>
  );
}

function HelperBedarfCard({
  item,
  signed,
  disabled,
  pending,
  onOpen,
}: {
  item: HelferBedarf;
  signed: number;
  disabled: boolean;
  pending: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: createBedarfId(item.id),
    disabled,
  });
  const needed = Number(item.anzahlBenötigt || 0);
  const undercovered = signed < needed;
  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none rounded-[8px] border bg-white p-3 shadow-xs transition-shadow",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-60 shadow-md",
        pending && "opacity-60"
      )}
    >
      <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 break-words text-left text-sm font-semibold leading-5 hover:underline">
          {item.titel}
        </button>
        <GripVertical className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={undercovered ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#d9dec8] text-[#4f5d2f]"}>
          <Users className="mr-1 size-3" />
          {signed}/{needed}
        </Badge>
        <Badge variant="outline" className={isActive(item.aktiv) ? "border-[#d9dec8] text-[#4f5d2f]" : ""}>
          {isActive(item.aktiv) ? "Aktiv" : "Inaktiv"}
        </Badge>
      </div>
      <p className="!mt-2 text-xs text-muted-foreground">
        {item.startzeit} - {item.endzeit}
      </p>
    </div>
  );
}

function getHelperDays(bedarf: HelferBedarf[], defaultDate: string) {
  const dates = new Set([defaultDate, ...bedarf.map((item) => item.datum)]);

  return Array.from(dates)
    .filter(Boolean)
    .sort()
    .map((date, index) => ({
      date,
      label: date === defaultDate ? "Tag 1" : `Tag ${index + 1}`,
    }));
}

function buildHelperTimeSlots(items: HelferBedarf[]) {
  if (items.length === 0) {
    return createSlots(8 * 60, 18 * 60, 60);
  }

  const starts = items.map((item) => timeToMinutes(item.startzeit));
  const ends = items.map((item) => timeToMinutes(item.endzeit));
  const first = Math.max(0, Math.floor((Math.min(...starts) - 60) / 30) * 30);
  const last = Math.min(23 * 60 + 30, Math.ceil((Math.max(...ends) + 30) / 30) * 30);

  return createSlots(first, last, 30);
}

function createSlots(start: number, end: number, step: number) {
  const result: string[] = [];

  for (let minutes = start; minutes <= end; minutes += step) {
    result.push(minutesToTime(minutes));
  }

  return result;
}

function createHelperCellId(datum: string, startzeit: string, kategorie: HelperCategory) {
  return `helper-cell|${datum}|${startzeit}|${kategorie}`;
}

function parseHelperCellId(id: string): HelperTargetCell | null {
  const [type, datum, startzeit, kategorie] = id.split("|");

  if (type !== "helper-cell" || !datum || !startzeit || !isHelperCategory(kategorie)) {
    return null;
  }

  return { datum, startzeit, kategorie };
}

function createBedarfId(id: string) {
  return `bedarf|${id}`;
}

function getBedarfId(id: string) {
  return id.startsWith("bedarf|") ? id.slice(7) : "";
}

function getHelperCellKey(datum: string, startzeit: string, kategorie: HelperCategory) {
  return `${datum}|${startzeit}|${kategorie}`;
}

function isHelperCategory(value: string): value is HelperCategory {
  return helperCategories.some((category) => category.value === value);
}

function compareBedarf(first: HelferBedarf, second: HelferBedarf) {
  return `${first.startzeit}-${first.kategorie}-${first.titel}`.localeCompare(
    `${second.startzeit}-${second.kategorie}-${second.titel}`,
    "de"
  );
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
