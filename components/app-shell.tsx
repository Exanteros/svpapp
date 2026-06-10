"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LockKeyhole, Menu, Trophy, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
      <header className="pwa-header sticky top-0 z-40 border-b border-[#d9dec8] bg-[#fbfbf8]/92 backdrop-blur supports-[backdrop-filter]:bg-[#fbfbf8]/82">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3 rounded-md py-1.5 pr-2 transition-colors hover:text-[#4f5d2f]"
            onClick={() => setIsOpen(false)}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d9dec8] bg-white shadow-sm transition-colors group-hover:border-[#c2cba8]">
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

          <nav className="hidden items-center gap-1 rounded-md border border-[#d9dec8] bg-white/75 p-1 shadow-sm md:flex">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#f6f7f1] hover:text-[#4f5d2f]",
                  isActive(item.href) && "bg-[#5e6d35] text-white shadow-sm hover:bg-[#4f5d2f] hover:text-white"
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
                "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#f6f7f1] hover:text-[#4f5d2f]",
                isActive("/admin/login") && "bg-[#5e6d35] text-white shadow-sm hover:bg-[#4f5d2f] hover:text-white"
              )}
            >
              <LockKeyhole className="size-4" />
            </Link>
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="border border-[#d9dec8] bg-white/75 text-[#4f5d2f] shadow-sm hover:bg-[#f6f7f1] md:hidden"
            aria-label="Navigation öffnen"
            onClick={() => setIsOpen((value) => !value)}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>

        {isOpen && (
          <div className="border-t border-[#d9dec8] bg-[#fbfbf8] shadow-sm md:hidden">
            <nav className="mx-auto grid max-w-6xl gap-2 px-4 py-3">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-[#d9dec8] hover:bg-white hover:text-[#4f5d2f]",
                    isActive(item.href) && "border-[#d9dec8] bg-white text-[#4f5d2f] shadow-sm"
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
                  "flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-[#d9dec8] hover:bg-white hover:text-[#4f5d2f]",
                  isActive("/admin/login") && "border-[#d9dec8] bg-white text-[#4f5d2f] shadow-sm"
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
          <p>© 2025 SV Puschendorf Rasenturnier</p>
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
