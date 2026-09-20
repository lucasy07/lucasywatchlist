export type FoundSeason = {
  parentId: string;
  parentName: string;
  malId: number;
  title: string;
  malScore: number | null;
  imageUrl: string | null;
  type: string | null;
  year: number | null;
  episodes: number | null;
  durationMin: number | null;
};

export type UpdatedSeason = {
  parentId: string;
  parentName: string;
  title: string;
  malId: number;
  oldScore: number | null;
  newScore: number | null;
  filledFields: string[];
};
