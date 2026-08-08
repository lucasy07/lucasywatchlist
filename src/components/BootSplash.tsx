import { useEffect, useRef, useState } from "react";

type BootSplashProps = {
  progress: number;
  label: string;
};

const STARS = [
  { left: "8%", top: "12%", delay: "0s" },
  { left: "17%", top: "26%", delay: "1.2s" },
  { left: "29%", top: "8%", delay: "2.4s" },
  { left: "38%", top: "20%", delay: "0.6s" },
  { left: "52%", top: "10%", delay: "3.1s" },
  { left: "61%", top: "24%", delay: "1.8s" },
  { left: "73%", top: "6%", delay: "2.7s" },
  { left: "88%", top: "18%", delay: "0.9s" },
  { left: "94%", top: "30%", delay: "3.6s" },
];

const WAVE_1 = "M0 15 q15 -6 30 0" + " t30 0".repeat(43);
const WAVE_2 = "M0 20 q20 -7 40 0" + " t40 0".repeat(33);

function CardDebris({ big = false }: { big?: boolean }) {
  return (
    <div
      style={{
        width: big ? "66px" : "54px",
        borderRadius: "5px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        paddingBottom: "6px",
      }}
    >
      <div
        style={{
          height: big ? "68px" : "56px",
          background: "var(--card-elevated)",
          borderRadius: "4px 4px 0 0",
        }}
      />
      <div
        style={{
          height: "4px",
          borderRadius: "2px",
          background: "var(--card-elevated)",
          margin: "6px 6px 0",
        }}
      />
      <div
        style={{
          height: "4px",
          borderRadius: "2px",
          background: "var(--card-elevated)",
          margin: "6px 6px 0",
          width: "56%",
        }}
      />
    </div>
  );
}

function TierDebris({ tiers }: { tiers: string[] }) {
  return (
    <div
      style={{
        padding: "5px",
        borderRadius: "5px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: "3px",
      }}
    >
      {tiers.map((t, i) => (
        <div key={t} style={{ display: "flex", gap: "3px" }}>
          <div
            style={{ width: "11px", height: "13px", borderRadius: "2px", background: `var(${t})` }}
          />
          {Array.from({ length: i === 0 ? 3 : 2 }).map((_, j) => (
            <div
              key={j}
              style={{
                width: "10px",
                height: "13px",
                borderRadius: "2px",
                background: "var(--card-elevated)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ButtonDebris() {
  return (
    <div
      style={{
        height: "15px",
        width: "48px",
        borderRadius: "999px",
        background: "var(--gradient-primary)",
      }}
    />
  );
}

const DEBRIS = [
  { left: "6%", top: "60%", layer: "near", node: <CardDebris big />, delay: "-1s", drift: "a" },
  {
    left: "31%",
    top: "88%",
    layer: "far",
    node: <TierDebris tiers={["--tier-s", "--tier-b"]} />,
    delay: "-3s",
    drift: "b",
  },
  { left: "49%", top: "67%", layer: "mid", node: <ButtonDebris />, delay: "-6s", drift: "a" },
  { left: "69%", top: "56%", layer: "far", node: <CardDebris />, delay: "-8s", drift: "b" },
  {
    left: "83%",
    top: "85%",
    layer: "near",
    node: <TierDebris tiers={["--tier-a", "--tier-c"]} />,
    delay: "-11s",
    drift: "a",
  },
];

export function BootSplash({ progress, label }: BootSplashProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const [diving, setDiving] = useState(false);
  const [ripple, setRipple] = useState(0);
  const prev = useRef(clamped);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (prev.current === clamped) return;
    prev.current = clamped;
    setDiving(true);
    const t = setTimeout(() => {
      setDiving(false);
      setRipple((r) => r + 1);
    }, 450);
    return () => clearTimeout(t);
  }, [clamped]);

  return (
    <div role="status" aria-busy="true" className="boot-splash fixed inset-0 overflow-hidden">
      <span className="sr-only">Carregando</span>

      <style>{`
        .boot-splash {
          --wl: 46%;
          --fin-w: 42px;
          --fin-h: 31px;
          --moon: 64px;
        }
        @media (max-width: 640px) {
          .boot-splash { --wl: 42%; --fin-w: 32px; --fin-h: 24px; --moon: 46px; }
        }
        @media (max-aspect-ratio: 3/5) {
          .boot-splash { --wl: 40%; }
        }
        @keyframes bs-twinkle {
          0%, 100% { opacity: .18; }
          50% { opacity: .6; }
        }
        @keyframes bs-shimmer {
          0%, 100% { transform: translateX(50%) scaleX(1); opacity: .75; }
          50% { transform: translateX(50%) scaleX(1.3); opacity: 1; }
        }
        @keyframes bs-drift-a {
          0%, 100% { transform: translateY(0) rotate(-7deg); }
          50% { transform: translateY(-14px) rotate(-3deg); }
        }
        @keyframes bs-drift-b {
          0%, 100% { transform: translateY(0) rotate(6deg); }
          50% { transform: translateY(-18px) rotate(2deg); }
        }
        @keyframes bs-drift { to { transform: translateX(-50%); } }
        @keyframes bs-finbob {
          0%, 100% { transform: translateY(2px) rotate(-3deg); }
          50% { transform: translateY(-2px) rotate(0deg); }
        }
        @keyframes bs-ripple {
          from { transform: scale(.5); opacity: .8; }
          to { transform: scale(1.6); opacity: 0; }
        }
        @keyframes bs-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .boot-splash *,
          .boot-splash *::before,
          .boot-splash *::after { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* 1. Fundo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, color-mix(in oklab, var(--background) 88%, black) 0%, var(--background) 38%, color-mix(in oklab, var(--background) 70%, black) 100%)",
        }}
      />

      {/* 2. Céu */}
      {STARS.map((s) => (
        <div
          key={s.left + s.top}
          className="absolute rounded-full"
          style={{
            left: s.left,
            top: s.top,
            width: "2px",
            height: "2px",
            background: "color-mix(in srgb, var(--foreground) 70%, transparent)",
            animation: "bs-twinkle 4s ease-in-out infinite",
            animationDelay: s.delay,
          }}
        />
      ))}
      <div
        className="absolute rounded-full"
        style={{
          right: "14%",
          top: "9%",
          width: "var(--moon)",
          height: "var(--moon)",
          background: "color-mix(in srgb, var(--foreground) 92%, transparent)",
          boxShadow:
            "0 0 60px 18px color-mix(in srgb, var(--accent) 26%, transparent), 0 0 140px 40px color-mix(in srgb, var(--accent) 12%, transparent)",
        }}
      />

      {/* 3. Reflexo da lua */}
      <div
        className="absolute"
        style={{
          right: "14%",
          top: "var(--wl)",
          width: "calc(var(--moon) * .8)",
          height: "34%",
          transform: "translateX(50%)",
          filter: "blur(5px)",
          background:
            "linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 26%, transparent), transparent)",
          animation: "bs-shimmer 6s ease-in-out infinite",
        }}
      />

      {/* 4. Profundidade */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "var(--wl)",
          bottom: 0,
          background:
            "linear-gradient(to bottom, color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%)",
        }}
      />
      {/* sedimento */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "74%",
          bottom: 0,
          background:
            "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--background) 8%, black) 100%)",
          opacity: 0.92,
        }}
      />

      {/* 5. Destroços */}
      {DEBRIS.map((d) => {
        const cfg =
          d.layer === "far"
            ? { opacity: 0.2, blur: "blur(2.4px)", dur: "17s" }
            : d.layer === "mid"
              ? { opacity: 0.34, blur: "blur(1.1px)", dur: "13s" }
              : { opacity: 0.5, blur: "none", dur: "10s" };
        return (
          <div
            key={d.left + d.top}
            className="absolute"
            style={{
              left: d.left,
              top: d.top,
              opacity: cfg.opacity,
              filter: cfg.blur,
              animation: `bs-drift-${d.drift} ${cfg.dur} ease-in-out infinite`,
              animationDelay: d.delay,
            }}
          >
            {d.node}
          </div>
        );
      })}

      {/* 6. Rastro + nadadeira */}
      <div
        className="absolute left-0 top-0 h-full"
        style={{
          width: `${clamped * 100}%`,
          transition: "width 700ms cubic-bezier(.22,.8,.28,1)",
        }}
      >
        {/* linha */}
        <div
          className="absolute"
          style={{
            left: 0,
            right: 0,
            top: "var(--wl)",
            height: "2px",
            background:
              "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary-glow) 85%, transparent))",
          }}
        />
        {/* esteira em V */}
        <div
          className="absolute"
          style={{
            right: "2px",
            top: "calc(var(--wl) - 22px)",
            width: "180px",
            height: "46px",
            clipPath: "polygon(100% 50%, 0 0, 0 6%, 94% 50%, 0 94%, 0 100%)",
            background:
              "linear-gradient(to left, color-mix(in srgb, var(--primary-glow) 26%, transparent), transparent)",
          }}
        />

        {/* nadadeira */}
        <div
          className="absolute"
          style={{
            right: "-8px",
            top: "calc(var(--wl) - var(--fin-h))",
            width: "var(--fin-w)",
            height: "var(--fin-h)",
            transform: diving ? "translateY(22px)" : "translateY(0)",
            opacity: diving ? 0 : 1,
            transition: "opacity 380ms ease, transform 380ms ease",
          }}
        >
          <div style={{ animation: "bs-finbob 1.6s ease-in-out infinite" }}>
            <svg
              viewBox="0 0 26 19"
              width="100%"
              height="100%"
              fill="currentColor"
              aria-hidden="true"
              className="text-primary"
              style={{
                display: "block",
                filter: "drop-shadow(0 2px 8px color-mix(in srgb, var(--primary) 55%, transparent))",
              }}
            >
              <path d="M25 19C21 11 15 4 1 0c4 6 8 12 8 19z" />
            </svg>
          </div>
        </div>

        {/* onda circular */}
        {ripple > 0 && !diving && (
          <div
            key={ripple}
            className="motion-reduce:hidden absolute"
            style={{
              right: "-30px",
              top: "calc(var(--wl) - 9px)",
              width: "86px",
              height: "22px",
              borderRadius: "50%",
              border: "1px solid color-mix(in srgb, var(--primary-glow) 70%, transparent)",
              animation: "bs-ripple 700ms ease-out forwards",
            }}
          />
        )}
      </div>

      {/* 7. Linha d'água — duas linhas finas */}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: "100%",
          height: "30px",
          overflow: "hidden",
          top: "calc(var(--wl) - 14px)",
        }}
      >
        <svg
          style={{
            width: "200%",
            height: "30px",
            color: "var(--border)",
            opacity: 0.9,
            animation: "bs-drift 9s linear infinite",
            position: "absolute",
            left: 0,
            top: 0,
          }}
          viewBox="0 0 1200 30"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={WAVE_1} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <svg
          style={{
            width: "200%",
            height: "30px",
            color: "var(--accent)",
            opacity: 0.22,
            animation: "bs-drift 15s linear infinite",
            position: "absolute",
            left: 0,
            top: 0,
          }}
          viewBox="0 0 1200 30"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={WAVE_2} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      {/* 8. Vinheta */}
      <div
        className="absolute inset-0"
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% var(--wl), transparent 40%, color-mix(in oklab, var(--background) 0%, black) 100%)",
          opacity: 0.5,
        }}
      />

      {/* 9. Texto */}
      <p
        key={label}
        className="absolute inset-x-0 text-center text-sm text-muted-foreground"
        style={{ bottom: "76px", animation: "bs-fadein 300ms ease-out" }}
      >
        {label}
      </p>
    </div>
  );
}

export default BootSplash;
