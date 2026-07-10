import type { Tier } from "@/lib/anime-storage";

const TIER_ORDER: readonly Tier[] = ["S", "A", "B", "C", "D", "E"];

export function tierColor(t: Tier | null): string {
  if (t === "S") return "text-primary";
  if (t === "A") return "text-foreground";
  if (t === "B") return "text-foreground/80";
  if (t === "C") return "text-muted-foreground";
  if (t === "D") return "text-muted-foreground/60";
  if (t === "E") return "text-muted-foreground/40";
  return "text-muted-foreground";
}

export function TierPicker({
  value,
  onChange,
}: {
  value: Tier | null;
  onChange: (t: Tier | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TIER_ORDER.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(active ? null : t)}
            aria-pressed={active}
            aria-label={`Tier ${t}`}
            className={`font-display h-9 w-9 rounded-md text-sm font-bold transition-colors ${
              active
                ? "bg-primary text-primary-foreground ring-1 ring-primary/60"
                : "bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
          >
            {t}
          </button>
        );
      })}
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
        >
          limpar
        </button>
      )}
    </div>
  );
}
