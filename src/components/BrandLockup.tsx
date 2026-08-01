import umiMark from "@/assets/umi-mark.png";
import { cn } from "@/lib/utils";

type BrandLockupProps = {
  size?: "sm" | "md";
  className?: string;
};

export function BrandLockup({ size = "md", className }: BrandLockupProps) {
  const isSm = size === "sm";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src={umiMark}
        alt=""
        aria-hidden="true"
        className={cn(
          "shrink-0 object-contain",
          isSm ? "h-9 w-9 sm:h-10 sm:w-10" : "h-10 w-10 sm:h-12 sm:w-12",
        )}
      />
      <span className="flex flex-col items-end leading-none">
        <span className="inline-flex items-center gap-1">
          <span
            className={cn(
              "font-display font-extrabold tracking-tight text-foreground",
              isSm ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
            )}
          >
            Umi
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "inline-block shrink-0 rounded-full bg-primary",
              isSm ? "h-1 w-1" : "h-1.5 w-1.5",
            )}
          />
        </span>
        <span
          className={cn(
            "font-display font-medium tracking-wide text-muted-foreground",
            isSm ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-xs",
          )}
        >
          Watchlist
        </span>
      </span>
    </span>
  );
}

export default BrandLockup;
