import { Check, RotateCcw } from "lucide-react";

export function WatchedIcon({
  watched,
  className = "h-4 w-4",
}: {
  watched: boolean;
  className?: string;
}) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} aria-hidden="true">
      <Check
        className={`watched-icon absolute inset-0 h-full w-full ${watched ? "watched-icon-hidden-check" : "watched-icon-visible"}`}
      />
      <RotateCcw
        className={`watched-icon absolute inset-0 h-full w-full ${watched ? "watched-icon-visible" : "watched-icon-hidden-undo"}`}
      />
    </span>
  );
}