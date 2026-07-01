"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronsLeft, ChevronsRight, LogOut, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { AdminNavItem, AdminSectionId } from "./types";

interface AdminShellProps {
  activeSection: AdminSectionId;
  navItems: AdminNavItem[];
  loading: boolean;
  children: React.ReactNode;
  onSectionChange: (section: AdminSectionId) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export function AdminShell({
  activeSection,
  navItems,
  loading,
  children,
  onSectionChange,
  onRefresh,
  onLogout,
}: AdminShellProps) {
  const activeItem = navItems.find((item) => item.id === activeSection) || navItems[0];
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);

  return (
    <div className="pwa-shell min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="pwa-header sticky top-0 z-40 border-b border-border/70 bg-background/82 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Button asChild variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
              <Link href="/">
                <ArrowLeft className="size-4" />
                Website
              </Link>
            </Button>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
                  <Image
                    src="/logo.png"
                    alt="SV Puschendorf"
                    width={40}
                    height={40}
                    className="size-8 object-contain"
                    priority
                  />
                </span>
                <h1 className="truncate text-base font-semibold tracking-normal sm:text-lg">Turnier-Verwaltung</h1>
              </div>
              <p className="mt-1 hidden text-xs text-muted-foreground sm:block">SV Puschendorf Operations</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Badge variant="outline" className="hidden sm:inline-flex">
              Admin
            </Badge>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="w-full sm:w-auto">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              Aktualisieren
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="w-full text-muted-foreground sm:w-auto">
              <LogOut className="size-4" />
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-6 lg:py-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-6",
          tabletSidebarOpen ? "md:grid-cols-[240px_minmax(0,1fr)]" : "md:grid-cols-[64px_minmax(0,1fr)]"
        )}
      >
        <aside className="hidden md:block xl:hidden">
          <div className="pwa-sticky-panel sticky top-24 rounded-xl border border-border/70 bg-card/90 p-2 shadow-sm backdrop-blur">
            <div className={cn("mb-2 flex items-center", tabletSidebarOpen ? "justify-between gap-2" : "justify-center")}>
              {tabletSidebarOpen && (
                <span className="min-w-0 truncate px-2 text-sm font-medium text-foreground">Admin</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={tabletSidebarOpen ? "Sidebar einklappen" : "Sidebar ausklappen"}
                onClick={() => setTabletSidebarOpen((open) => !open)}
                className="size-9 shrink-0 text-muted-foreground"
              >
                {tabletSidebarOpen ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />}
              </Button>
            </div>

            <TooltipProvider delayDuration={150}>
              <nav className="grid gap-1">
                {navItems.map((item) => {
                  const button = (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSectionChange(item.id)}
                      aria-label={item.label}
                      className={cn(
                        "flex min-w-0 items-center rounded-lg text-sm transition-all duration-200",
                        tabletSidebarOpen ? "gap-3 px-3 py-3 text-left" : "justify-center px-2 py-3",
                        activeSection === item.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {tabletSidebarOpen && (
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{item.label}</span>
                          <span className="mt-0.5 block truncate text-xs opacity-80">{item.description}</span>
                        </span>
                      )}
                    </button>
                  );

                  if (tabletSidebarOpen) {
                    return button;
                  }

                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>
            </TooltipProvider>
          </div>
        </aside>

        <aside className="hidden xl:block">
          <div className="pwa-sticky-panel sticky top-24 rounded-xl border border-border/70 bg-card/90 p-2 shadow-sm backdrop-blur">
            <nav className="grid gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-3 py-3 text-left text-sm transition-all duration-200",
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="block font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-xs opacity-80">{item.description}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-5 md:hidden">
            <Select value={activeSection} onValueChange={(value) => onSectionChange(value as AdminSectionId)}>
                <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {navItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-5 sm:mb-6">
            <p className="text-sm font-medium text-muted-foreground">{activeItem.label}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal sm:text-3xl">{activeItem.description}</h2>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
