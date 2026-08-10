import { useEffect, useRef, useState } from "react";

type BootSplashProps = {
  progress: number;
  label: string;
};

const STARS = [
  { left: "8%", top: "14%", delay: "0s" },
  { left: "17%", top: "28%", delay: "1.2s" },
  { left: "26%", top: "9%", delay: "2.4s" },
  { left: "37%", top: "22%", delay: ".6s" },
  { left: "45%", top: "7%", delay: "3s" },
  { left: "54%", top: "31%", delay: "1.8s" },
  { left: "63%", top: "16%", delay: "2.1s" },
  { left: "78%", top: "33%", delay: ".9s" },
  { left: "91%", top: "20%", delay: "2.7s" },
];

const WAVE_1 = "M0 15 q15 -6 30 0" + " t30 0".repeat(43);
const WAVE_2 = "M0 20 q20 -7 40 0" + " t40 0".repeat(33);

function MiniCard({ big = false }: { big?: boolean }) {
  return (
    <div className="bs-mcard" style={big ? { width: "66px" } : undefined}>
      <div className="bs-cv" style={big ? { height: "68px" } : undefined} />
      <div className="bs-ln" />
      <div className="bs-ln bs-ln-s" />
    </div>
  );
}

function TierList({ rows }: { rows: { tier: string; blanks: number }[] }) {
  return (
    <div className="bs-tl">
      {rows.map((r) => (
        <div className="bs-row" key={r.tier}>
          <i style={{ background: `var(${r.tier})` }} />
          {Array.from({ length: r.blanks }).map((_, j) => (
            <b key={j} />
          ))}
        </div>
      ))}
    </div>
  );
}

const FLOATERS = [
  {
    left: "6%",
    top: "60%",
    layer: "bs-near",
    delay: "-1s",
    node: <MiniCard big />,
  },
  {
    left: "31%",
    top: "88%",
    layer: "bs-far",
    delay: "-11s",
    node: (
      <TierList
        rows={[
          { tier: "--tier-s", blanks: 2 },
          { tier: "--tier-a", blanks: 3 },
        ]}
      />
    ),
  },
  {
    left: "49%",
    top: "67%",
    layer: "bs-mid",
    delay: "-6s",
    node: <div className="bs-btn bs-btn-pri" style={{ width: "48px" }} />,
  },
  {
    left: "69%",
    top: "56%",
    layer: "bs-far",
    delay: "-3s",
    node: <MiniCard />,
  },
  {
    left: "83%",
    top: "85%",
    layer: "bs-near",
    delay: "-8s",
    node: (
      <TierList
        rows={[
          { tier: "--tier-b", blanks: 3 },
          { tier: "--tier-c", blanks: 2 },
        ]}
      />
    ),
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

  const width = `${clamped * 100}%`;

  return (
    <div className="bs-stage" role="status" aria-busy="true">
      <span className="sr-only">Carregando</span>

      <style>{`
        .bs-stage {
          position: fixed; inset: 0; overflow: hidden;
          --wl: 46%; --moon: 64px; --fin-w: 42px; --fin-h: 31px; --dz: 1;
          background: linear-gradient(to bottom,
            color-mix(in oklab, var(--background) 78%, black) 0%,
            var(--background) 40%,
            color-mix(in oklab, var(--background) 92%, black) 56%,
            color-mix(in oklab, var(--background) 56%, black) 100%);
        }
        @media (max-width: 640px) {
          .bs-stage { --wl: 42%; --moon: 44px; --fin-w: 32px; --fin-h: 24px; --dz: .72; }
        }
        @media (max-aspect-ratio: 3/5) { .bs-stage { --wl: 40%; } }

        .bs-star { position: absolute; width: 2px; height: 2px; border-radius: 50%;
          background: var(--foreground); opacity: .35; animation: bs-tw 4s ease-in-out infinite; }
        .bs-moon { position: absolute; right: 14%; top: 12%; width: var(--moon); height: var(--moon);
          border-radius: 50%; background: color-mix(in oklab, var(--foreground) 90%, transparent);
          box-shadow: 0 0 40px color-mix(in oklab, var(--foreground) 20%, transparent),
                      0 0 120px color-mix(in oklab, var(--accent) 16%, transparent); }
        .bs-moonRef { position: absolute; right: 14%; top: var(--wl); width: calc(var(--moon) * .8);
          height: 34%; transform: translateX(6px); filter: blur(5px);
          background: linear-gradient(to bottom,
            color-mix(in oklab, var(--foreground) 22%, transparent),
            color-mix(in oklab, var(--foreground) 0%, transparent));
          animation: bs-shimmer 6s ease-in-out infinite; }

        .bs-depth { position: absolute; left: 0; right: 0; top: var(--wl); bottom: 0;
          background: linear-gradient(to bottom,
            color-mix(in oklab, var(--accent) 10%, transparent),
            color-mix(in oklab, var(--accent) 0%, transparent) 55%); }
        .bs-silt { position: absolute; left: 0; right: 0; top: 74%; bottom: 0;
          background: linear-gradient(to bottom,
            transparent,
            color-mix(in oklab, color-mix(in oklab, var(--background) 56%, black) 92%, transparent)); }
        .bs-vignette { position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 50% var(--wl), transparent 40%,
            color-mix(in oklab, black 50%, transparent) 100%); }

        .bs-floaters { position: absolute; inset: 0; transform: scale(var(--dz)); transform-origin: 50% var(--wl); }
        .bs-f { position: absolute; }
        .bs-far { opacity: .20; filter: blur(2.4px); animation: bs-bobA 17s ease-in-out infinite; }
        .bs-mid { opacity: .34; filter: blur(1.1px); animation: bs-bobB 13s ease-in-out infinite; }
        .bs-near { opacity: .50; animation: bs-bobA 10s ease-in-out infinite; }

        .bs-mcard { width: 54px; border-radius: 5px; background: var(--card);
          border: 1px solid var(--border); overflow: hidden; padding-bottom: 6px; }
        .bs-cv { height: 56px; background: var(--card-elevated); }
        .bs-ln { height: 4px; margin: 6px 6px 0; border-radius: 2px; background: var(--card-elevated); }
        .bs-ln-s { width: 56%; }

        .bs-tl { display: flex; flex-direction: column; gap: 3px; padding: 5px; border-radius: 5px;
          background: var(--card); border: 1px solid var(--border); }
        .bs-row { display: flex; gap: 3px; align-items: center; }
        .bs-row i { width: 11px; height: 13px; border-radius: 2px; display: block; }
        .bs-row b { width: 10px; height: 13px; border-radius: 2px; background: var(--card-elevated); display: block; }

        .bs-btn { height: 15px; border-radius: 999px; background: var(--card); border: 1px solid var(--border); }
        .bs-btn-pri { border: 0; background: linear-gradient(135deg, var(--primary), var(--primary-glow)); }

        .bs-wakeWrap, .bs-finWrap { position: absolute; left: 0; top: 0; height: 100%;
          transition: width 400ms cubic-bezier(.22,.8,.28,1); }
        .bs-wake { position: absolute; left: 0; right: 0; top: var(--wl); height: 2px; border-radius: 999px;
          background: linear-gradient(to right,
            color-mix(in oklab, var(--primary) 0%, transparent),
            color-mix(in oklab, var(--primary) 32%, transparent) 40%,
            var(--primary-glow)); }
        .bs-vee { position: absolute; right: 2px; top: calc(var(--wl) - 22px); width: 180px; height: 46px;
          background: linear-gradient(to left,
            color-mix(in oklab, var(--primary-glow) 26%, transparent),
            color-mix(in oklab, var(--primary-glow) 0%, transparent));
          clip-path: polygon(100% 50%, 0 0, 0 6%, 94% 50%, 0 94%, 0 100%); }
        .bs-waves { position: absolute; left: 0; top: calc(var(--wl) - 14px); width: 100%; height: 30px; overflow: hidden; }
        .bs-waves svg { position: absolute; top: 0; left: 0; width: 200%; height: 30px; }
        .bs-w1 { animation: bs-drift 9s linear infinite; color: var(--border); opacity: .9; }
        .bs-w2 { animation: bs-drift 15s linear infinite; color: var(--accent); opacity: .22; }

        .bs-fin { position: absolute; right: -8px; top: calc(var(--wl) - var(--fin-h));
          width: var(--fin-w); height: var(--fin-h); color: var(--primary);
          transition: opacity 300ms ease-out, transform 420ms cubic-bezier(.16,.9,.3,1); }
        .bs-fin[data-diving="true"] {
          transition: opacity 260ms ease-in, transform 450ms cubic-bezier(.55,0,.85,.35); }
        .bs-fin svg { display: block; width: 100%; height: 100%;
          filter: drop-shadow(0 0 10px color-mix(in oklab, var(--primary) 35%, transparent)); }
        .bs-bob { animation: bs-bob 1.6s ease-in-out infinite; transform-origin: 50% 100%; }
        .bs-ripple { position: absolute; right: -30px; top: calc(var(--wl) - 9px); width: 86px; height: 22px;
          border-radius: 50%; border: 1px solid color-mix(in oklab, var(--primary-glow) 50%, transparent);
          animation: bs-rippleout 700ms ease-out forwards; }

        .bs-steps { position: absolute; left: 0; right: 0; bottom: 76px; height: 20px; text-align: center; }
        .bs-steps span { position: absolute; left: 0; right: 0; font-size: 13px; letter-spacing: .04em;
          color: var(--muted-foreground); animation: bs-fadein 300ms ease-out; }

        @keyframes bs-bob { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-2px) rotate(-3deg); } }
        @keyframes bs-bobA { 0%,100% { transform: translateY(0) rotate(-7deg); } 50% { transform: translateY(-14px) rotate(-3deg); } }
        @keyframes bs-bobB { 0%,100% { transform: translateY(0) rotate(6deg); } 50% { transform: translateY(-18px) rotate(2deg); } }
        @keyframes bs-drift { to { transform: translateX(-50%); } }
        @keyframes bs-tw { 0%,100% { opacity: .18; } 50% { opacity: .6; } }
        @keyframes bs-shimmer {
          0%,100% { opacity: .75; transform: translateX(6px) scaleX(1); }
          50% { opacity: 1; transform: translateX(6px) scaleX(1.3); }
        }
        @keyframes bs-rippleout { from { transform: scale(.5); opacity: .8; } to { transform: scale(1.6); opacity: 0; } }
        @keyframes bs-fadein { from { opacity: 0; } to { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .bs-wakeWrap, .bs-finWrap, .bs-fin { transition: none !important; }
          .bs-fin { opacity: 1 !important; transform: none !important; }
          .bs-bob, .bs-ripple, .bs-w1, .bs-w2, .bs-star, .bs-moonRef,
          .bs-far, .bs-mid, .bs-near, .bs-steps span { animation: none; }
          .bs-ripple { opacity: 0; }
        }
      `}</style>

      {STARS.map((s) => (
        <span
          key={s.left + s.top}
          className="bs-star"
          style={{ left: s.left, top: s.top, animationDelay: s.delay }}
        />
      ))}
      <div className="bs-moon" />
      <div className="bs-moonRef" />

      <div className="bs-depth" />

      <div className="bs-floaters">
        {FLOATERS.map((f) => (
          <div
            key={f.left + f.top}
            className={`bs-f ${f.layer}`}
            style={{ left: f.left, top: f.top, animationDelay: f.delay }}
          >
            {f.node}
          </div>
        ))}
      </div>

      <div className="bs-silt" />

      <div className="bs-wakeWrap" style={{ width }}>
        <div className="bs-wake" />
        <div className="bs-vee" />
      </div>

      <div className="bs-waves">
        <svg viewBox="0 0 1200 30" preserveAspectRatio="none" aria-hidden="true">
          <path className="bs-w1" d={WAVE_1} fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path className="bs-w2" d={WAVE_2} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="bs-finWrap" style={{ width }}>
        {ripple > 0 && !diving && <div key={ripple} className="bs-ripple" />}
        <div
          className="bs-fin"
          data-diving={diving}
          style={{
            opacity: diving ? 0 : 1,
            transform: diving ? "translateY(22px)" : "translateY(0)",
          }}
        >
          <div className="bs-bob" key="fin-bob">
            <svg viewBox="0 0 26 19" aria-hidden="true">
              <path fill="currentColor" d="M25 19C21 11 15 4 1 0c4 6 8 12 8 19z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bs-vignette" />

      <div className="bs-steps">
        <span key={label}>{label}</span>
      </div>
    </div>
  );
}

export default BootSplash;
