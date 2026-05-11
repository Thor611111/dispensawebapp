import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

function stepFor(unit?: string | null) {
  const u = (unit ?? "").toLowerCase();
  if (u === "g" || u === "ml") return 50;
  if (u === "kg" || u === "l") return 0.1;
  return 1;
}

function fmt(n: number) {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}

export function QuantityStepper({
  value,
  unit,
  onChange,
  disabled,
}: {
  value: number;
  unit?: string | null;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(fmt(value));
  useEffect(() => { setLocal(fmt(value)); }, [value]);
  const step = stepFor(unit);

  const commit = (n: number) => {
    const v = Math.max(0, Math.round(n * 100) / 100);
    onChange(v);
  };

  return (
    <div className="inline-flex items-center gap-1">
      <Button type="button" size="icon" variant="outline" className="h-7 w-7 shrink-0" disabled={disabled} onClick={() => commit(value - step)}>
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        inputMode="decimal"
        value={local}
        disabled={disabled}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { const n = Number(local); commit(Number.isFinite(n) ? n : value); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="h-7 w-14 px-1 text-center text-xs"
      />
      <span className="text-xs text-muted-foreground">{unit ?? ""}</span>
      <Button type="button" size="icon" variant="outline" className="h-7 w-7 shrink-0" disabled={disabled} onClick={() => commit(value + step)}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}