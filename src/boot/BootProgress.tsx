import { createContext, useContext } from "react";

export type BootProgressValue = {
  step: number;
  /** Only ever advances forward. */
  setStep: (n: number) => void;
};

const BootProgressContext = createContext<BootProgressValue>({
  step: 3,
  setStep: () => {},
});

export const BootProgressProvider = BootProgressContext.Provider;

export function useBootProgress() {
  return useContext(BootProgressContext);
}
