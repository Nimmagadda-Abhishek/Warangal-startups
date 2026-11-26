import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

/* Live figures from the API. Every field is optional; anything missing
   falls back to the placeholder in `stats` below. */
export type ApiStats = {
  businesses?: number;
  startups?: number;
  founders?: number;
  investors?: number;
  users?: number; // shown as "Members"
  jobs?: number;
  events?: number;
};

type Stat = { key: keyof ApiStats; label: string; fallback: number };

/* FALLBACK FIGURES ARE PLACEHOLDERS. Replace them with real numbers, or feed
   every field through `apiStats`, before launch. A "+" is shown only on these. */
const stats: Stat[] = [
  { key: "businesses", label: "Businesses", fallback: 1250 },
  { key: "startups", label: "Startups", fallback: 430 },
  { key: "founders", label: "Founders", fallback: 700 },
  { key: "investors", label: "Investors", fallback: 95 },
  { key: "users", label: "Members", fallback: 3200 },
  { key: "jobs", label: "Jobs", fallback: 250 },
  { key: "events", label: "Events", fallback: 65 },
];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* Counts from wherever it currently is, so a late API response
   doesn't snap back to zero. Skips the animation for reduced motion. */
function useCountUp(target: number, start: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (!start) return;
    if (prefersReducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (target - from) * eased);
      current.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);

  return value;
}

function StatItem({ label, target, suffix, start, span }: { label: string; target: number; suffix: string; start: boolean; span: boolean }) {
  const n = useCountUp(target, start);
  return (
    <li className={`bg-white px-5 py-5 lg:px-6 lg:py-6 ${span ? "col-span-2 lg:col-span-1" : ""}`}>
      <p className="font-serif text-[30px] leading-none tracking-tight text-navy-900 tabular-nums lg:text-[32px]">
        {/* Animated number is hidden from screen readers; they get the final value. */}
        <span aria-hidden="true">
          {n.toLocaleString("en-IN")}
          {suffix}
        </span>
        <span className="sr-only">
          {target.toLocaleString("en-IN")}
          {suffix}
        </span>
      </p>
      <p className="mt-2 text-[13px] font-medium text-slate-600">{label}</p>
    </li>
  );
}

export function Stats({ apiStats }: { apiStats?: ApiStats }) {
  const ref = useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setStart(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStart(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const items = stats.map((s) => {
    const live = apiStats?.[s.key];
    const isLive = typeof live === "number";
    return { label: s.label, target: isLive ? live : s.fallback, suffix: isLive ? "" : "+" };
  });
  const odd = items.length % 2 === 1;

  return (
    <section className="mt-3 lg:mt-4" aria-label="Ecosystem statistics">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <Reveal delay={100} className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_10px_30px_-18px_rgba(10,28,63,0.3)]">
          {/* gap-px over a line-coloured background draws the hairline dividers at every breakpoint */}
          <ul ref={ref} className="grid grid-cols-2 gap-px bg-line lg:grid-cols-7">
            {items.map((it, i) => (
              <StatItem key={it.label} {...it} start={start} span={odd && i === items.length - 1} />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}