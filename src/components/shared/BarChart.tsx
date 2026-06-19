"use client";

import { cn } from "@/lib/utils";

interface BarItem {
  label: string;
  value: number;
  color: string;
}

export default function BarChart({ 
  data, 
  height = 200,
  className 
}: { 
  data: BarItem[]; 
  height?: number;
  className?: string;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((item, i) => {
          const pct = (item.value / maxValue) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-xs font-bold tabular-nums">{item.value}</span>
              <div
                className="w-full rounded-t-md transition-all duration-700 hover:opacity-80"
                style={{
                  height: `${pct}%`,
                  background: item.color,
                  minHeight: item.value > 0 ? '4px' : '0px',
                }}
              />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
