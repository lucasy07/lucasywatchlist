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

function AnimeCardDebris({ scale = 1 }: { scale?: number }) {
  return (
    <div
      className="rounded-md border p-1"
      style={{
        width: `${64 * scale}px`,
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="rounded-sm"
        style={{ height: `${44 * scale}px`, background: "var(--card-elevated)" }}
      />
      <div
        className="mt-1 rounded-full"
        style={{ height: "3px", width: "80%", background: "var(--border)" }}
      />
      <div
        className="mt-1 rounded-full"
        style={{ height: "3px", width: "55%", background: "var(--border)" }}
      />
    </div>
  );
}

function TierDebris({ tiers }: { tiers: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      {tiers.map((t, i) => (
        <div key={t} className="flex items-center gap-1">
          <div
            className="rounded-sm"
            style={{ width: "10px", height: "10px", background: `var(${t})` }}
          />
          {Array.from({ length: i === 0 ? 3 : 2 }).map((_, j) => (
            <div
              key={j}
              className="rounded-sm border"
              style={{
                width: "10px",
                height: "10px",
                background: "var(--card-elevated)",
                borderColor: "var(--border)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function BootSplash({ progress, label }: BootSplashProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const [diving, setDiving] = useState(false);
  const [ripple, setRipple] = useState(0);
  const prev = useRef(clamped);

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
    <div
      role="status"
      aria-busy="true"
      className="boot-splash fixed inset-0 overflow-hidden"
      style={{ ["--wl" as string]: "46%" }}
    >
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
          50% { opacity: .55; }
        }
        @keyframes bs-shimmer {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.3); }
        }
        @keyframes bs-drift {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes bs-waveslide {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes bs-finbob {
          0%, 100% { transform: translateY(2px) rotate(-3deg); }
          50% { transform: translateY(-2px) rotate(0deg); }
        }
        @keyframes bs-ripple {
          from { transform: translate(-50%, -50%) scale(.5); opacity: .8; }
          to { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
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
            animation: "bs-twinkle 4.5s ease-in-out infinite",
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
          width: "var(--moon)",
          height: "38%",
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
      <div
        className="absolute inset-x-0"
        style={{
          top: "74%",
          bottom: 0,
          background:
            "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--background) 40%, black))",
        }}
      />

      {/* 5. Destroços */}
      {[
        {
          left: "6%",
          top: "60%",
          layer: "near",
          node: <AnimeCardDebris scale={1} />,
          delay: "-2s",
        },
        {
          left: "31%",
          top: "88%",
          layer: "far",
          node: <TierDebris tiers={["--tier-s", "--tier-b"]} />,
          delay: "-7s",
        },
        {
          left: "49%",
          top: "67%",
          layer: "mid",
          node: (
            <div
              className="rounded-full"
              style={{ width: "58px", height: "18px", background: "var(--gradient-primary)" }}
            />
          ),
          delay: "-4s",
        },
        {
          left: "69%",
          top: "56%",
          layer: "far",
          node: <AnimeCardDebris scale={0.68} />,
          delay: "-11s",
        },
        {
          left: "83%",
          top: "85%",
          layer: "near",
          node: <TierDebris tiers={["--tier-a", "--tier-c"]} />,
          delay: "-6s",
        },
      ].map((d) => {
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
              animation: `bs-drift ${cfg.dur} ease-in-out infinite`,
              animationDelay: d.delay,
            }}
          >
            {d.node}
          </div>
        );
      })}

      {/* 6. Rastro + 8. Nadadeira */}
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
            right: 0,
            top: "var(--wl)",
            width: "180px",
            height: "46px",
            clipPath: "polygon(100% 0, 100% 100%, 0 50%)",
            background:
              "linear-gradient(to left, color-mix(in srgb, var(--primary-glow) 32%, transparent), transparent)",
          }}
        />

        {/* nadadeira */}
        <div
          className="absolute"
          style={{
            right: 0,
            top: "var(--wl)",
            transform: diving ? "translate(50%, calc(-100% + 22px))" : "translate(50%, -100%)",
            opacity: diving ? 0 : 1,
            transition: "opacity 380ms ease, transform 380ms ease",
          }}
        >
          <div style={{ animation: "bs-finbob 1.6s ease-in-out infinite" }}>
            <svg
              viewBox="0 0 26 19"
              width="var(--fin-w)"
              height="var(--fin-h)"
              fill="currentColor"
              aria-hidden="true"
              className="text-primary"
              style={{
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
            className="motion-reduce:hidden absolute rounded-[50%] border"
            style={{
              right: 0,
              top: "var(--wl)",
              width: "84px",
              height: "26px",
              transform: "translate(50%, -50%)",
              borderColor: "color-mix(in srgb, var(--primary-glow) 70%, transparent)",
              animation: "bs-ripple 700ms ease-out forwards",
            }}
          />
        )}
      </div>

      {/* 7. Linha d'água */}
      <div
        className="absolute inset-x-0 overflow-hidden"
        style={{ top: "var(--wl)", height: "60px", transform: "translateY(-50%)" }}
      >
        <svg
          className="absolute left-0 top-0 h-full"
          style={{ width: "200%", animation: "bs-waveslide 9s linear infinite" }}
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 30 Q75 12 150 30 T300 30 T450 30 T600 30 T750 30 T900 30 T1050 30 T1200 30 V60 H0 Z"
            fill="var(--border)"
          />
        </svg>
        <svg
          className="absolute left-0 top-0 h-full"
          style={{ width: "200%", animation: "bs-waveslide 15s linear infinite" }}
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 34 Q100 20 200 34 T400 34 T600 34 T800 34 T1000 34 T1200 34 V60 H0 Z"
            fill="var(--accent)"
            opacity="0.18"
          />
        </svg>
      </div>

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
