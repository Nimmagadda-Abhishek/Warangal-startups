import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronRight, LayoutGrid, List, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { addRecentSearch } from "../store";
import { Reveal } from "./Reveal";
import { cn } from "../utils/cn";

/* ───────────────────────── Public API (unchanged) ───────────────────────── */

export type FilterValues = Record<string, string | string[] | boolean>;
export interface FilterDef {
  key: string;
  label: string;
  type: "select" | "checks" | "toggle";
  options?: string[];
  placeholder?: string;
}
export interface QuickFilter {
  label: string;
  params: Record<string, string>;
}
export interface DirectoryProps<T> {
  entity: string;
  singular: string;
  breadcrumb: string;
  title: [string, string];
  subtitle: string;
  quote: [string, string];
  heroImage: string;
  searchPlaceholder: string;
  quickFilters: QuickFilter[];
  filters: FilterDef[];
  sorts: { value: string; label: string }[];
  items: T[];
  match: (item: T, q: string, f: FilterValues) => boolean;
  sort: (a: T, b: T, sort: string) => number;
  keyOf: (item: T) => string;
  renderCard: (item: T, view: "grid" | "list") => ReactNode;
  cta: { title: string; text: string; button: string; to: string; icon: ReactNode };
  banner: { title: string; highlight: string; text: string; image: string };
  pageSize?: number;
  emptyHint?: string;
  listOnly?: boolean;
  beforeResults?: ReactNode;
  afterResults?: ReactNode;
  heroAside?: ReactNode;
  resultsToolbar?: ReactNode;
}

export function readFilters(params: URLSearchParams, defs: FilterDef[]): FilterValues {
  const f: FilterValues = {};
  defs.forEach((d) => {
    const raw = params.get(d.key);
    if (d.type === "checks") f[d.key] = raw ? raw.split(",").filter(Boolean) : [];
    else if (d.type === "toggle") f[d.key] = raw === "1";
    else f[d.key] = raw || "";
  });
  return f;
}

/* ───────────────────────── Shared style tokens ───────────────────────── */

// Visible keyboard focus on every interactive element (WCAG 2.4.7).
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const FOCUS_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900";
const EASE = "transition-all duration-200 ease-out motion-reduce:transition-none";

/* ───────────────────────── Page ───────────────────────── */

export function DirectoryPage<T>(p: DirectoryProps<T>) {
  const PAGE = p.pageSize ?? 6;
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

  const q = params.get("q") || "";
  const sort = params.get("sort") || p.sorts[0].value;
  const view = p.listOnly ? "list" : ((params.get("view") as "grid" | "list") || "grid");
  const page = Math.max(1, Number(params.get("page") || 1));
  const f = readFilters(params, p.filters);
  const [query, setQuery] = useState(q);
  useEffect(() => setQuery(q), [q]);

  const key = params.toString();
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 240);
    return () => clearTimeout(t);
  }, [key]);

  useEffect(() => {
    document.title = `${p.title.join(" ")} — WS Hub`;
  }, [p.title]);

  // Drawer: lock scroll, move focus in, close on Escape, restore focus on close.
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    if (drawer) drawerCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawer) {
        setDrawer(false);
        drawerTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  // "/" focuses search (common power-user shortcut).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const update = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (resetPage) next.delete("page");
    setParams(next);
  };
  const setFilter = (k: string, v: string | string[] | boolean) =>
    update({ [k]: Array.isArray(v) ? v.join(",") : typeof v === "boolean" ? (v ? "1" : "") : v });
  const clear = () => {
    const next = new URLSearchParams();
    if (params.get("view")) next.set("view", params.get("view")!);
    setParams(next);
  };

  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];
    if (q) chips.push({ id: "q", label: `“${q}”`, onRemove: () => update({ q: "" }) });
    p.filters.forEach((d) => {
      const v = f[d.key];
      if (d.type === "checks")
        (v as string[]).forEach((x) =>
          chips.push({ id: `${d.key}:${x}`, label: x, onRemove: () => setFilter(d.key, (v as string[]).filter((y) => y !== x)) })
        );
      else if (d.type === "toggle" && v) chips.push({ id: d.key, label: d.label, onRemove: () => setFilter(d.key, false) });
      else if (d.type === "select" && v) chips.push({ id: d.key, label: String(v), onRemove: () => setFilter(d.key, "") });
    });
    return chips;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(
    () => [...p.items.filter((i) => p.match(i, q.trim().toLowerCase(), f))].sort((a, b) => p.sort(a, b, sort)),
    [key, p.items] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = results.slice((safePage - 1) * PAGE, safePage * PAGE);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    addRecentSearch(query);
    update({ q: query.trim() });
  };
  const goPage = (n: number) => {
    update({ page: n > 1 ? String(n) : undefined }, false);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const isQuickActive = (qf: QuickFilter) => Object.entries(qf.params).every(([k, v]) => (params.get(k) || "") === v);
  const toggleQuick = (qf: QuickFilter, active: boolean) =>
    update(active ? Object.fromEntries(Object.keys(qf.params).map((k) => [k, undefined])) : qf.params);
  const hasActive = activeChips.length > 0;
  const entityLc = p.entity.toLowerCase();

  /* ── Filter panel (shared by sidebar + drawer) ── */
  const panel = (
    <div>
      <div className="flex items-center justify-between pb-4">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-navy-900">
          Refine
          {hasActive && (
            <span className="rounded-full bg-navy-900 px-2 py-0.5 text-[12px] font-semibold leading-none text-white" aria-label={`${activeChips.length} active filters`}>
              {activeChips.length}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={clear}
          disabled={!hasActive}
          className={cn("inline-flex items-center gap-1 rounded px-1 py-1 text-[13px] font-medium text-navy-700 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-40", FOCUS)}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
        </button>
      </div>

      {p.filters.map((d) => (
        <fieldset key={d.key} className="border-t border-line py-4">
          <legend className="float-left mb-3 w-full text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{d.label}</legend>
          <div className="clear-both">
            {d.type === "select" && (
              <select className="select w-full text-[14px]" aria-label={d.label} value={f[d.key] as string} onChange={(e) => setFilter(d.key, e.target.value)}>
                <option value="">{d.placeholder ?? `All ${d.label}`}</option>
                {d.options?.map((o) => <option key={o}>{o}</option>)}
              </select>
            )}
            {d.type === "checks" && (
              <div className={cn("-mx-1 space-y-0.5", (d.options?.length ?? 0) > 7 && "max-h-60 overflow-y-auto pr-1")}>
                {d.options?.map((o) => {
                  const arr = f[d.key] as string[];
                  return (
                    <label key={o} className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md px-2 text-[14px] text-slate-700 hover:bg-navy-50">
                      <input type="checkbox" className="checkbox" checked={arr.includes(o)} onChange={(e) => setFilter(d.key, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
                      {o}
                    </label>
                  );
                })}
              </div>
            )}
            {d.type === "toggle" && (
              <label className="-mx-1 flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md px-2 text-[14px] text-slate-700 hover:bg-navy-50">
                <input type="checkbox" className="checkbox" checked={f[d.key] as boolean} onChange={(e) => setFilter(d.key, e.target.checked)} />
                {d.placeholder ?? d.label}
              </label>
            )}
          </div>
        </fieldset>
      ))}
    </div>
  );

  return (
    <div className="page-in pb-20 lg:pb-0">
      {/* ═════════ Hero ═════════ */}
      <section className="relative overflow-hidden border-b-2 border-gold-500 bg-navy-900 text-white">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-y-0 right-0 hidden w-[52%] md:block">
            <img src={p.heroImage} alt="" className="h-full w-full object-cover object-center opacity-80" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900 to-navy-900/40 md:via-[50%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-white/75">
            <Link to="/" className={cn("rounded hover:text-white", FOCUS_DARK)}>Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/50" aria-hidden="true" />
            <span aria-current="page" className="font-medium text-white">{p.breadcrumb}</span>
          </nav>

          <div className="mt-7 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h1 className="text-[34px] font-bold leading-[1.08] tracking-tight sm:text-[46px]">
                {p.title[0]} <span className="text-gold-500">{p.title[1]}</span>
              </h1>
              <p className="mt-3 max-w-[580px] text-[16px] leading-relaxed text-white/85">{p.subtitle}</p>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-[13px] text-white/90 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
                <span className="font-semibold text-white">{p.items.length.toLocaleString("en-IN")}</span> {entityLc} listed
              </p>
            </div>
            <div className={cn(p.heroAside ? "flex flex-col gap-4 lg:items-end" : "hidden lg:block")}>
              <figure className="hidden max-w-[300px] border-l-2 border-gold-500 pl-4 lg:block">
                <blockquote className="text-[16px] font-medium italic leading-snug text-white/95">
                  “{p.quote[0]} {p.quote[1]}”
                </blockquote>
              </figure>
              {p.heroAside}
            </div>
          </div>

          <form
            role="search"
            onSubmit={submit}
            className="mt-8 flex max-w-[820px] overflow-hidden rounded-xl bg-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.65)] ring-1 ring-white/10 transition-shadow duration-200 focus-within:ring-2 focus-within:ring-gold-400"
          >
            <label htmlFor="dir-q" className="sr-only">Search {entityLc}</label>
            <span className="flex items-center pl-5 pr-3 text-navy-700" aria-hidden="true"><Search className="h-5 w-5" strokeWidth={2.2} /></span>
            <input
              ref={searchRef}
              id="dir-q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={p.searchPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-slate-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => { setQuery(""); update({ q: "" }); searchRef.current?.focus(); }}
                className={cn("flex w-11 items-center justify-center text-slate-500 hover:text-navy-900", FOCUS)}
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="mr-3 hidden items-center self-center rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-sans text-[12px] font-medium text-slate-500 sm:inline-flex" aria-hidden="true">/</kbd>
            )}
            <button type="submit" className={cn("shrink-0 bg-gold-500 px-6 text-[14px] font-semibold text-navy-900 hover:bg-gold-400 sm:px-9", EASE, FOCUS)}>
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ═════════ Quick filters ═════════ */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3.5 sm:px-6 lg:px-8">
          <button
            ref={drawerTriggerRef}
            type="button"
            onClick={() => setDrawer(true)}
            aria-haspopup="dialog"
            className={cn("inline-flex min-h-[40px] items-center gap-2 rounded-full bg-navy-900 px-4 text-[13px] font-semibold text-white hover:bg-navy-800 lg:hidden", EASE, FOCUS)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters{hasActive && ` (${activeChips.length})`}
          </button>

          <span className="mr-1 hidden text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:inline">Browse</span>
          <QuickChip active={!hasActive} onClick={clear}>All</QuickChip>
          {p.quickFilters.map((qf) => {
            const active = isQuickActive(qf);
            return (
              <QuickChip key={qf.label} active={active} onClick={() => toggleQuick(qf, active)}>
                {qf.label}
              </QuickChip>
            );
          })}
        </div>
      </div>

      {p.beforeResults && !hasActive && <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8">{p.beforeResults}</div>}

      {/* ═════════ Main ═════════ */}
      <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="grid gap-8 lg:grid-cols-[264px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-[76px] max-h-[calc(100vh-92px)] overflow-y-auto rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] hide-scrollbar">
              {panel}
            </div>
          </aside>

          <section aria-label="Results" aria-busy={loading}>
            {/* Header row */}
            <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[22px] font-bold tracking-tight text-navy-900" aria-live="polite">
                  {loading ? (
                    <span className="inline-block h-7 w-40 animate-pulse rounded bg-slate-200 align-middle motion-reduce:animate-none" />
                  ) : (
                    <>
                      {results.length.toLocaleString("en-IN")} <span className="font-medium text-slate-600">{results.length === 1 ? p.singular : p.entity}</span>
                    </>
                  )}
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-600">{q ? `Results for “${q}”` : `Showing all ${entityLc}`}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="dir-sort" className="hidden text-[13px] font-medium text-slate-600 sm:block">Sort by</label>
                  <select
                    id="dir-sort"
                    className="select h-10 w-auto min-w-[168px] text-[13px]"
                    value={sort}
                    onChange={(e) => update({ sort: e.target.value === p.sorts[0].value ? undefined : e.target.value })}
                  >
                    {p.sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                {!p.listOnly && (
                  <div className="hidden items-center overflow-hidden rounded-lg border border-slate-300 bg-white sm:inline-flex" role="group" aria-label="Layout">
                    <ViewBtn active={view === "grid"} label="Grid view" onClick={() => update({ view: undefined }, false)}><LayoutGrid className="h-4 w-4" /></ViewBtn>
                    <ViewBtn active={view === "list"} label="List view" onClick={() => update({ view: "list" }, false)}><List className="h-4 w-4" /></ViewBtn>
                  </div>
                )}
              </div>
            </div>

            {p.resultsToolbar && <div className="mt-4">{p.resultsToolbar}</div>}

            {/* Active filters */}
            {hasActive && (
              <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
                {activeChips.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-navy-100 bg-navy-50 py-1 pl-3 pr-1 text-[13px] font-medium text-navy-800">
                    {c.label}
                    <button
                      type="button"
                      onClick={c.onRemove}
                      aria-label={`Remove filter ${c.label}`}
                      className={cn("flex h-6 w-6 items-center justify-center rounded-full hover:bg-navy-100", FOCUS)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <button type="button" onClick={clear} className={cn("rounded px-1.5 py-1 text-[13px] font-semibold text-navy-700 hover:text-navy-900 hover:underline", FOCUS)}>
                  Clear all
                </button>
              </div>
            )}

            {/* Results */}
            {loading ? (
              <div className={cn("mt-6 grid gap-5", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                {Array.from({ length: PAGE }).map((_, i) => <SkeletonCard key={i} list={view === "list"} />)}
              </div>
            ) : pageItems.length === 0 ? (
              <EmptyState
                filtered={hasActive}
                entityLc={entityLc}
                hint={p.emptyHint}
                quick={p.quickFilters.slice(0, 4)}
                onQuick={(qf) => toggleQuick(qf, false)}
                onClear={clear}
                ctaTo={p.cta.to}
                ctaLabel={p.cta.button}
              />
            ) : (
              <div key={key} className={cn("mt-6 grid gap-5", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                {pageItems.map((it, i) => (
                  <Reveal key={p.keyOf(it)} delay={i * 40}>{p.renderCard(it, view)}</Reveal>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && results.length > 0 && (
              <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
                <p className="text-[13px] text-slate-600">
                  Showing <span className="font-semibold text-navy-900">{(safePage - 1) * PAGE + 1}–{Math.min(safePage * PAGE, results.length)}</span> of{" "}
                  <span className="font-semibold text-navy-900">{results.length.toLocaleString("en-IN")}</span> {entityLc}
                </p>
                {totalPages > 1 && (
                  <nav aria-label="Pagination" className="flex items-center gap-1.5">
                    <PageBtn disabled={safePage === 1} onClick={() => goPage(safePage - 1)} aria-label="Previous page"><ArrowLeft className="h-4 w-4" /></PageBtn>
                    {pageList(safePage, totalPages).map((n, i) =>
                      n === "…" ? (
                        <span key={`gap-${i}`} className="px-1 text-slate-500" aria-hidden="true">…</span>
                      ) : (
                        <PageBtn key={n} active={safePage === n} onClick={() => goPage(n)} aria-label={`Page ${n}`} aria-current={safePage === n ? "page" : undefined}>{n}</PageBtn>
                      )
                    )}
                    <PageBtn disabled={safePage === totalPages} onClick={() => goPage(safePage + 1)} aria-label="Next page"><ArrowRight className="h-4 w-4" /></PageBtn>
                  </nav>
                )}
              </div>
            )}
          </section>
        </div>

        {p.afterResults}

        {/* ═════════ CTA ═════════ */}
        <Reveal className="mt-12 flex flex-col gap-5 rounded-xl border border-line border-l-4 border-l-gold-500 bg-white p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500" aria-hidden="true">{p.cta.icon}</span>
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-navy-900">{p.cta.title}</h3>
              <p className="mt-0.5 max-w-xl text-[14px] leading-relaxed text-slate-600">{p.cta.text}</p>
            </div>
          </div>
          <Link
            to={p.cta.to}
            className={cn("inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-lg bg-navy-900 px-6 text-[14px] font-semibold text-white hover:bg-navy-800 hover:shadow-[0_12px_24px_-12px_rgba(10,25,60,0.8)]", EASE, FOCUS)}
          >
            {p.cta.button} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>

      {/* ═════════ Banner ═════════ */}
      <Reveal className="mx-auto mt-8 max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-xl border-b-2 border-gold-500 bg-navy-950 text-white">
          <img src={p.banner.image} alt="" loading="lazy" width={1280} height={360} className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/20" aria-hidden="true" />
          <div className="relative px-6 py-10 sm:px-12 sm:py-14">
            <span className="mb-4 block h-[3px] w-12 bg-gold-500" aria-hidden="true" />
            <h2 className="max-w-xl text-[26px] font-bold leading-tight tracking-tight sm:text-[34px]">
              {p.banner.title} <span className="text-gold-500">{p.banner.highlight}</span>
            </h2>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/85">{p.banner.text}</p>
          </div>
        </div>
      </Reveal>

      {/* ═════════ Mobile drawer ═════════ */}
      <div
        className={cn("fixed inset-0 z-[60] lg:hidden", drawer ? "visible" : "invisible transition-[visibility] delay-300")}
        aria-hidden={!drawer}
      >
        <div
          className={cn("absolute inset-0 bg-navy-950/60 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none", drawer ? "opacity-100" : "opacity-0")}
          onClick={() => { setDrawer(false); drawerTriggerRef.current?.focus(); }}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={cn(
            "absolute inset-y-0 left-0 flex w-[88%] max-w-[360px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            drawer ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-line bg-navy-900 px-5 py-4 text-white">
            <span className="text-[16px] font-semibold tracking-tight">Refine results</span>
            <button
              ref={drawerCloseRef}
              type="button"
              aria-label="Close filters"
              onClick={() => { setDrawer(false); drawerTriggerRef.current?.focus(); }}
              className={cn("flex h-10 w-10 items-center justify-center rounded-md text-white/90 hover:bg-white/10", FOCUS_DARK)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{panel}</div>
          <div className="border-t border-line bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => { setDrawer(false); drawerTriggerRef.current?.focus(); }} className={cn("min-h-[48px] w-full rounded-lg bg-gold-500 text-[15px] font-semibold text-navy-900 hover:bg-gold-400", EASE, FOCUS)}>
              Show {results.length.toLocaleString("en-IN")} {results.length === 1 ? p.singular.toLowerCase() : entityLc}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function QuickChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[40px] items-center rounded-full border px-4 text-[13px] font-medium",
        EASE,
        FOCUS,
        active
          ? "border-navy-900 bg-navy-900 text-white shadow-sm"
          : "border-slate-300 bg-white text-slate-700 hover:border-navy-700 hover:bg-navy-50 hover:text-navy-900"
      )}
    >
      {children}
    </button>
  );
}

function ViewBtn({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn("flex h-10 w-10 items-center justify-center", EASE, FOCUS, active ? "bg-navy-900 text-white" : "text-navy-800 hover:bg-navy-50")}
    >
      {children}
    </button>
  );
}

function EmptyState({
  filtered,
  entityLc,
  hint,
  quick,
  onQuick,
  onClear,
  ctaTo,
  ctaLabel,
}: {
  filtered: boolean;
  entityLc: string;
  hint?: string;
  quick: QuickFilter[];
  onQuick: (qf: QuickFilter) => void;
  onClear: () => void;
  ctaTo: string;
  ctaLabel: string;
}) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-700" aria-hidden="true">
        <Search className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-[18px] font-bold tracking-tight text-navy-900">
        {filtered ? `No ${entityLc} match your criteria` : `No ${entityLc} available yet`}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-slate-600">
        {filtered
          ? "Try removing a filter, checking your spelling, or searching a broader term."
          : hint ?? "This section is ready. Add the first record and it will appear here."}
      </p>

      {filtered && quick.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Try instead</p>
          <div className="flex flex-wrap justify-center gap-2">
            {quick.map((qf) => (
              <QuickChip key={qf.label} active={false} onClick={() => onQuick(qf)}>{qf.label}</QuickChip>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {filtered && (
          <button type="button" onClick={onClear} className={cn("btn-navy min-h-[44px] px-6 text-[13px]", FOCUS)}>
            Clear all filters
          </button>
        )}
        <Link to={ctaTo} className={cn("inline-flex min-h-[44px] items-center rounded-md border border-slate-300 px-6 text-[13px] font-semibold text-navy-800 hover:bg-navy-50", EASE, FOCUS)}>
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

function SkeletonCard({ list }: { list: boolean }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl border border-line bg-white p-5 motion-reduce:animate-none", list && "flex gap-5")}
      aria-hidden="true"
    >
      <div className={cn("bg-slate-200", list ? "h-24 w-24 shrink-0 rounded-lg" : "mx-auto h-16 w-16 rounded-full")} />
      <div className="mt-4 flex-1 space-y-2.5">
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
        <div className="mt-5 h-10 w-full rounded-md bg-slate-200" />
      </div>
    </div>
  );
}

function PageBtn({ active, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40",
        EASE,
        FOCUS,
        active
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-slate-300 bg-white text-navy-800 hover:border-navy-700 hover:bg-navy-50",
        className
      )}
      {...rest}
    />
  );
}

/** 1 … 4 5 6 … 20 — keeps pagination compact for large result sets. */
function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}