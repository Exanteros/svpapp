"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LockKeyhole, Menu, Trophy, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getTournamentYear, TOURNAMENT_DEFAULTS } from "@/lib/tournament";
import { cn } from "@/lib/utils";

const shellRoutes = new Set([
  "/",
  "/anmeldung",
  "/spielplan",
  "/ergebnisse",
  "/admin/login",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/widerrufsrecht",
  "/cookie-richtlinie",
]);

const navItems = [
  { href: "/spielplan", label: "Spielplan", icon: CalendarDays },
  { href: "/ergebnisse", label: "Ergebnisse", icon: Trophy },
  { href: "/anmeldung", label: "Anmeldung", icon: UserPlus, requiresRegistration: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [tournamentYear, setTournamentYear] = useState(getTournamentYear(TOURNAMENT_DEFAULTS.startDate));
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !item.requiresRegistration || registrationOpen),
    [registrationOpen]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRegistrationState() {
      try {
        const response = await fetch("/api/public/turnier-einstellungen", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));

        if (!cancelled && response.ok) {
          setRegistrationOpen(data.anmeldungAktiv === true);
          setTournamentYear(Number(data.tournamentYear) || getTournamentYear(data.turnierStartDatum));
        }
      } catch (error) {
        console.error("Fehler beim Laden des Anmeldestatus:", error);
      }
    }

    loadRegistrationState();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!shellRoutes.has(pathname)) {
    return <>{children}</>;
  }

  const isActive = (href: string) => pathname === href;

  return (
    <div className="pwa-shell min-h-screen bg-background text-foreground">
      <header className="pwa-header sticky top-0 z-40 border-b border-border/70 bg-background/82 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3 rounded-lg py-1.5 pr-2 transition-colors duration-200 hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card shadow-sm transition-colors duration-200 group-hover:border-border">
              <Image
                src="/logo.png"
                alt="SV Puschendorf"
                width={36}
                height={36}
                className="size-8 object-contain"
                priority
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-5 text-foreground">SV Puschendorf</span>
              <span className="block truncate text-xs leading-4 text-muted-foreground">Handball-Turnier</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-xl border border-border/70 bg-card/80 p-1 shadow-sm backdrop-blur md:flex">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-[0.985]",
                  isActive(item.href) && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
            <Link
              href="/admin/login"
              aria-label="Admin"
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-[0.985]",
                isActive("/admin/login") && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
              )}
            >
              <LockKeyhole className="size-4" />
            </Link>
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="border border-border/70 bg-card/80 text-foreground shadow-sm hover:bg-accent md:hidden"
            aria-label="Navigation öffnen"
            onClick={() => setIsOpen((value) => !value)}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>

        {isOpen && (
          <div className="border-t border-border/70 bg-background/95 shadow-sm backdrop-blur-xl md:hidden">
            <nav className="mx-auto grid max-w-6xl gap-2 px-4 py-3">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:bg-card hover:text-foreground",
                    isActive(item.href) && "border-border bg-card text-foreground shadow-sm"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
              <Link
                href="/admin/login"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:bg-card hover:text-foreground",
                  isActive("/admin/login") && "border-border bg-card text-foreground shadow-sm"
                )}
              >
                <LockKeyhole className="size-4" />
                Admin
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="pwa-footer border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {tournamentYear} SV Puschendorf Rasenturnier</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="hover:text-foreground" href="/impressum">Impressum</Link>
            <Separator orientation="vertical" className="h-4" />
            <Link className="hover:text-foreground" href="/datenschutz">Datenschutz</Link>
            <Separator orientation="vertical" className="h-4" />
            <Link className="hover:text-foreground" href="/agb">AGB</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
