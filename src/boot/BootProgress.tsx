import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const MIN_BOOT_MS = 1800; // tempo mínimo total do splash na tela
const MIN_STEP_MS = 420; // tempo mínimo que cada etapa fica visível

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

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Paces boot steps: steps are queued and applied at most one per MIN_STEP_MS,
 * and the splash may only leave after MIN_BOOT_MS. Progress is monotonic.
 */
export function useBootPacer() {
  const mountedAt = useRef(Date.now());
  const reduced = useRef(prefersReducedMotion());
  const target = useRef(0);
  const [step, setStepState] = useState(0);
  const [canExit, setCanExit] = useState(reduced.current);
  const [, force] = useState(0);

  const setStep = useCallback((n: number) => {
    if (n > target.current) {
      target.current = n;
      force((x) => x + 1);
    }
  }, []);

  // Apply queued steps one at a time.
  useEffect(() => {
    if (step >= target.current) return;
    if (reduced.current) {
      setStepState(target.current);
      return;
    }
    const t = setTimeout(() => setStepState((s) => Math.min(target.current, s + 1)), MIN_STEP_MS);
    return () => clearTimeout(t);
  }, [step, target.current]);

  // Minimum total time on screen.
  useEffect(() => {
    if (canExit) return;
    const remaining = MIN_BOOT_MS - (Date.now() - mountedAt.current);
    if (remaining <= 0) {
      setCanExit(true);
      return;
    }
    const t = setTimeout(() => setCanExit(true), remaining);
    return () => clearTimeout(t);
  }, [canExit]);

  return { step, setStep, done: step >= 3 && canExit };
}
