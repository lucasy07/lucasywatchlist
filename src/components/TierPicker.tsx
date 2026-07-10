import type { Tier } from "@/lib/anime-storage";

const TIER_ORDER: readonly Tier[] = ["S", "A", "B", "C", "D", "E"];

export function tierColor(t: Tier | null): string {
  if (t === "S") return "text-tier-s";
  if (t === "A") return "text-tier-a";
  if (t === "B") return "text-tier-b";
  if (t === "C") return "text-tier-c";
  if (t === "D") return "text-tier-d";
  if (t === "E") return "text-tier-e";
  return "text-muted-foreground";
}

export function tierBg(t: Tier | null): string {
  if (t === "S") return "bg-tier-s";
  if (t === "A") return "bg-tier-a";
  if (t === "B") return "bg-tier-b";
  if (t === "C") return "bg-tier-c";
  if (t === "D") return "bg-tier-d";
  if (t === "E") return "bg-tier-e";
  return "bg-secondary";
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
                : `bg-secondary ${tierColor(t)} hover:bg-secondary/70`
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
