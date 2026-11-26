import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, ChevronRight, Lock } from "lucide-react";
import { Reveal } from "./Reveal";
import { cn } from "../utils/cn";

/* ───────────────────────── Public API (unchanged) ───────────────────────── */

export interface ProfileTab {
  id: string;
  label: string;
  content: ReactNode;
  subtitle?: string;
}
interface Props {
  cover: string;
  crumbs: { label: string; to?: string }[];
  avatar: ReactNode;
  title: string;
  verified?: boolean;
  subtitle?: ReactNode;
  meta: ReactNode;
  badges?: ReactNode;
  actions: ReactNode;
  topRight: ReactNode;
  tabs: ProfileTab[];
  sidebar: ReactNode;
  related?: { title: string; subtitle?: string; to: string; children: ReactNode };
  footer?: ReactNode;
  stickyActions?: ReactNode;
}

/* ───────────────────────── Shared tokens ───────────────────────── */

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const FOCUS_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900";
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────────────────────── Profile shell ───────────────────────── */

export function ProfileShell(p: Props) {
  const [active, setActive] = useState(p.tabs[0]?.id);
  const tabIds = p.tabs.map((t) => t.id).join(",");
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = p.tabs.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-130px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tabIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the active tab visible inside the horizontally scrolling nav on small screens.
  useEffect(() => {
    const nav = navRef.current;
    const btn = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !btn) return;
    nav.scrollTo({ left: btn.offsetLeft - nav.clientWidth / 2 + btn.clientWidth / 2, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [active]);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    setActive(id);
  };

  return (
    <div className={cn("page-in lg:pb-0", p.stickyActions ? "pb-36" : "pb-20")}>
      {/* ═════════ Cover ═════════ */}
      <div className="relative z-0 h-[200px] overflow-hidden border-b-2 border-gold-500 bg-navy-900 sm:h-[250px] lg:h-[290px]">
        <img src={p.cover} alt="" className="ken-burns h-full w-full object-cover motion-reduce:animate-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/25 to-navy-950/55" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0">
          <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-white/85">
              {p.crumbs.map((c, i) => {
                const last = i === p.crumbs.length - 1;
                return (
                  <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/50" aria-hidden="true" />}
                    {c.to ? (
                      <Link to={c.to} className={cn("rounded hover:text-white", FOCUS_DARK)}>{c.label}</Link>
                    ) : (
                      <span aria-current={last ? "page" : undefined} className="max-w-[200px] truncate font-medium text-white">{c.label}</span>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>
        </div>
        <div className="absolute right-4 top-4 flex gap-2 sm:right-6 lg:right-8">{p.topRight}</div>
      </div>

      {/* ═════════ Identity card ═════════ */}
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 -mt-12 rounded-xl border border-line border-t-[3px] border-t-gold-500 bg-white p-5 shadow-[var(--shadow-card)] sm:-mt-14 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {p.avatar}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="text-[26px] font-bold leading-tight tracking-tight text-navy-900 sm:text-[32px]">{p.title}</h1>
                  {p.verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3 py-1 text-[12px] font-semibold text-white">
                      <BadgeCheck className="h-3.5 w-3.5 text-gold-400" strokeWidth={2.4} aria-hidden="true" /> Verified
                    </span>
                  )}
                </div>
                {p.subtitle && <p className="mt-1.5 text-[15px] font-medium text-slate-700">{p.subtitle}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-600">{p.meta}</div>
                {p.badges && <div className="mt-3.5 flex flex-wrap gap-2">{p.badges}</div>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 md:max-w-[400px] md:justify-end">{p.actions}</div>
          </div>
        </div>
      </div>

      {/* ═════════ Section tabs ═════════ */}
      <div className="sticky top-[60px] z-30 mt-6 border-y border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <nav ref={navRef} className="flex gap-1 overflow-x-auto hide-scrollbar" aria-label="Profile sections">
            {p.tabs.map((t) => {
              const on = active === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => jump(t.id)}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "relative min-h-[48px] shrink-0 rounded-md px-4 text-[14px] font-semibold transition-colors duration-200 motion-reduce:transition-none",
                    FOCUS,
                    on ? "text-navy-900" : "text-slate-600 hover:text-navy-900",
                  )}
                >
                  {t.label}
                  <span
                    className={cn("absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-gold-500 transition-transform duration-300 motion-reduce:transition-none", on ? "scale-x-100" : "scale-x-0")}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ═════════ Body ═════════ */}
      <div className="mx-auto max-w-[1280px] px-4 pt-7 sm:px-6 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {p.tabs.map((t) => (
              <Reveal key={t.id} as="section" className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
                <div id={t.id} className="scroll-mt-[128px]" />
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-5 w-1 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                  <div>
                    <h2 className="text-[19px] font-bold tracking-tight text-navy-900">{t.label}</h2>
                    {t.subtitle && <p className="mt-0.5 text-[13px] text-slate-600">{t.subtitle}</p>}
                  </div>
                </div>
                <div className="mt-5">{t.content}</div>
              </Reveal>
            ))}
          </div>
          <aside className="space-y-5 lg:sticky lg:top-[124px] lg:self-start" aria-label="Summary">{p.sidebar}</aside>
        </div>

        {p.related && (
          <section className="mb-10 mt-14" aria-label={p.related.title}>
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-3">
              <div>
                <h2 className="text-[21px] font-bold tracking-tight text-navy-900">{p.related.title}</h2>
                {p.related.subtitle && <p className="mt-0.5 text-[13px] text-slate-600">{p.related.subtitle}</p>}
              </div>
              <Link to={p.related.to} className={cn("view-all shrink-0 rounded", FOCUS)}>
                View All <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            {p.related.children}
          </section>
        )}
      </div>

      {p.footer}

      {p.stickyActions && (
        <div
          className="fixed inset-x-0 bottom-[57px] z-40 border-t border-line bg-white/95 p-3 shadow-[0_-8px_24px_-12px_rgba(10,25,60,0.25)] backdrop-blur lg:hidden"
          role="region"
          aria-label="Primary actions"
        >
          <div className="flex gap-2 [&>*]:min-h-[44px] [&>*]:flex-1 [&>*]:justify-center">{p.stickyActions}</div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Reusable profile pieces ───────────────────────── */

export function SideCard({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]", className)}>
      {title && (
        <h3 className="flex items-center gap-2 border-b border-line pb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
          {title}
        </h3>
      )}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </div>
  );
}

export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="text-[14px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-line py-2.5 first:pt-0 last:border-0 last:pb-0">
          <dt className="text-slate-600">{k}</dt>
          <dd className="text-right font-semibold text-navy-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tag({ children, to }: { children: ReactNode; to?: string }) {
  const cls = cn(
    "inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] font-medium text-slate-700",
    "transition-colors duration-200 motion-reduce:transition-none",
  );
  return to ? (
    <Link to={to} className={cn(cls, "hover:border-navy-900 hover:bg-navy-900 hover:text-white", FOCUS)}>{children}</Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export function Timeline({ items }: { items: { year: string; title: string; type: string; description: string }[] }) {
  return (
    <ol className="relative ml-2 border-l-2 border-navy-100 pl-7">
      {items.map((a, i) => (
        <li key={`${a.year}-${a.title}-${i}`} className="relative pb-7 last:pb-0">
          <span className="absolute -left-[37px] top-1 h-4 w-4 rounded-full bg-gold-500 ring-4 ring-white" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[14px] font-bold text-gold-800">{a.year}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-slate-600">{a.type}</span>
          </div>
          <h3 className="mt-1.5 text-[15px] font-bold text-navy-900">{a.title}</h3>
          <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{a.description}</p>
        </li>
      ))}
    </ol>
  );
}

export function Avatar({ initials, color, size = "xl" }: { initials: string; color: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const dims = { sm: "h-10 w-10 text-xs", md: "h-14 w-14 text-base", lg: "h-[72px] w-[72px] text-xl", xl: "h-24 w-24 text-2xl sm:h-28 sm:w-28 sm:text-3xl" }[size];
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight text-white shadow-md ring-4 ring-white", dims)}
      style={{ background: color }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function LockedNote({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-center text-[14px] text-slate-700 sm:flex-row sm:justify-center sm:gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700" aria-hidden="true">
        <Lock className="h-4 w-4" />
      </span>
      <p>
        {text}{" "}
        <Link to="/login" className={cn("rounded font-semibold text-navy-700 underline-offset-2 hover:underline", FOCUS)}>Sign in</Link>
      </p>
    </div>
  );
}