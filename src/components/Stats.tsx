import { useEffect, useRef, useState } from "react";
import { BarChart3, Building2, CalendarCheck, ClipboardCheck, Rocket, User, Users, type LucideIcon } from "lucide-react";
import { Reveal } from "./Reveal";

/* Live figures from the API. Every field is optional; anything missing
   falls back to the placeholder figures below. */
export type ApiStats = {
  businesses?: number;
  startups?: number;
  founders?: number;
  investors?: number;
  users?: number;
  jobs?: number;
  events?: number;
};

type Stat = { key: keyof ApiStats; label: string; fallback: number; icon: LucideIcon };

const stats: Stat[] = [
  { key: "businesses", label: "Businesses", fallback: 1250, icon: Building2 },
  { key: "startups", label: "Startups", fallback: 430, icon: Rocket },
  { key: "founders", label: "Founders", fallback: 700, icon: User },
  { key: "investors", label: "Investors", fallback: 95, icon: BarChart3 },
  { key: "users", label: "Members", fallback: 3200, icon: Users },
  { key: "jobs", label: "Jobs", fallback: 250, icon: ClipboardCheck },
  { key: "events", label: "Events", fallback: 65, icon: CalendarCheck },
];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
        <span aria-hidden="true">{n.toLocaleString("en-IN")}{suffix}</span>
        <span className="sr-only">{target.toLocaleString("en-IN")}{suffix}</span>
      </p>
      <p className="mt-2 text-[13px] font-medium text-slate-600">{label}</p>
    </li>
  );
}

function MobileStatItem({ stat, target, suffix, start }: { stat: Stat; target: number; suffix: string; start: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target]);
  const Icon = stat.icon;
  return (
    <li className="flex items-center gap-3 px-2 py-2 lg:px-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gold-500">
        <Icon className="h-7 w-7" strokeWidth={1.6} />
      </span>
      <div className="leading-tight">
        <p className="text-[15px] font-bold text-navy-800 tabular-nums">
          <span aria-hidden="true">{value.toLocaleString("en-IN")}{suffix}</span>
          <span className="sr-only">{target.toLocaleString("en-IN")}{suffix}</span>
        </p>
        <p className="text-[11px] text-slate-500">{stat.label}</p>
      </div>
    </li>
  );
}

export function Stats({ apiStats }: { apiStats?: ApiStats }) {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setStart(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setStart(true);
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const items = stats.map((stat) => {
    const live = apiStats?.[stat.key];
    const isLive = typeof live === "number";
    return { stat, label: stat.label, target: isLive ? live : stat.fallback, suffix: isLive ? "" : "+" };
  });
  const odd = items.length % 2 === 1;

  return (
    <section className="hidden mt-3 lg:mt-4 lg:block" aria-label="Ecosystem statistics">
      <div ref={ref} className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <Reveal delay={100} className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_10px_30px_-18px_rgba(10,28,63,0.3)]">
          <ul className="grid grid-cols-2 gap-x-2 px-3 py-2 sm:grid-cols-4 lg:hidden">
            {stats.map((stat) => <MobileStatItem key={stat.label} stat={stat} target={stat.fallback} suffix="+" start={start} />)}
          </ul>
          <ul className="hidden grid-cols-7 gap-px bg-line lg:grid">
            {items.map(({ label, target, suffix }, i) => (
              <StatItem key={label} label={label} target={target} suffix={suffix} start={start} span={odd && i === items.length - 1} />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
