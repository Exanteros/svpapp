// Vereinfachte Chart-Komponente ohne problematische TypeScript-Typen

import React from 'react';

export interface ChartConfig {
  [key: string]: {
    label: string;
    color?: string;
  };
}

export interface ChartContainerProps {
  children: React.ReactNode;
  config: ChartConfig;
  className?: string;
}

export function ChartContainer({ children, className }: ChartContainerProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function ChartTooltipContent() {
  return null;
}

export function ChartTooltip({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
