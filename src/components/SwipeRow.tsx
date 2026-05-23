import { useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "destructive" | "default";
};

/**
 * Mobile-first swipe-to-reveal row. Drag left to expose actions;
 * tap an action to fire it. Falls back to a normal row on desktop.
 */
export function SwipeRow({
  children,
  actions,
  className,
}: {
  children: ReactNode;
  actions: Action[];
  className?: string;
}) {
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const max = Math.min(96 * actions.length, 220);

  const onStart = (x: number) => {
    startX.current = x - (open ? -max : 0);
  };
  const onMove = (x: number) => {
    if (startX.current == null) return;
    const dx = x - startX.current;
    const next = Math.max(-max, Math.min(0, dx));
    setOffset(next);
  };
  const onEnd = () => {
    if (startX.current == null) return;
    startX.current = null;
    if (offset < -max / 2) { setOffset(-max); setOpen(true); }
    else { setOffset(0); setOpen(false); }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <div className="absolute inset-y-0 right-0 flex">
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { a.onClick(); setOffset(0); setOpen(false); }}
            className={cn(
              "flex h-full w-24 flex-col items-center justify-center gap-1 text-xs font-medium",
              a.variant === "destructive" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            {a.icon ?? <Trash2 className="h-4 w-4" />}
            <span>{a.label}</span>
          </button>
        ))}
      </div>
      <div
        className="relative touch-pan-y transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
      >
        {children}
      </div>
    </div>
  );
}