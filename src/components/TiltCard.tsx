import { useRef, useState, type CSSProperties, type ReactNode } from "react";

type TiltCardProps = {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  max?: number;
};

export function TiltCard({ className, style, children, max = 9 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [tx, setTx] = useState({ rx: 0, ry: 0, px: 50, py: 50 });

  const canTilt = () => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return false;
    return true;
  };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canTilt()) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTx({
      rx: -ny * 2 * max,
      ry: nx * 2 * max,
      px: (nx + 0.5) * 100,
      py: (ny + 0.5) * 100,
    });
    if (!hovering) setHovering(true);
  };

  const onLeave = () => {
    setHovering(false);
    setTx({ rx: 0, ry: 0, px: 50, py: 50 });
  };

  const transform = hovering
    ? `perspective(800px) rotateX(${tx.rx}deg) rotateY(${tx.ry}deg) translateZ(6px) scale(1.01)`
    : "perspective(800px) rotateX(0deg) rotateY(0deg)";

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{
        ...style,
        transform,
        transformStyle: "preserve-3d",
        transition: hovering ? "transform 60ms linear" : "transform 180ms ease-out",
        willChange: hovering ? "transform" : undefined,
      }}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200"
        style={{
          opacity: hovering ? 1 : 0,
          background: `radial-gradient(circle at ${tx.px}% ${tx.py}%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 55%)`,
        }}
      />
    </div>
  );
}
