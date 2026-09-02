import { useState } from "react";
import { Tv } from "lucide-react";
import { type Season } from "@/lib/anime-storage";

export type SeasonThumbProps = {
  season: Season;
  className?: string;
  alt?: string;
};

export function SeasonThumb({ season, className = "", alt = "" }: SeasonThumbProps) {
  const [error, setError] = useState(false);
  const showImage = season.imageUrl && !error;

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-secondary ${className}`}
      aria-hidden={alt === ""}
    >
      {showImage ? (
        <img
          src={season.imageUrl!}
          alt={alt}
          loading="lazy"
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Tv className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
