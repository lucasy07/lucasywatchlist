import { cn } from "@/lib/utils";
import umiLockup from "@/assets/umi-lockup.png";

interface BrandLockupProps {
  size?: "sm" | "md";
  className?: string;
}

export function BrandLockup({ size = "md", className }: BrandLockupProps) {
  return (
    <img
      src={umiLockup}
      alt=""
      aria-hidden="true"
      className={cn(
        "w-auto object-contain",
        size === "sm" ? "h-7 sm:h-9" : "h-9 sm:h-11",
        className,
      )}
    />
  );
}

export default BrandLockup;
