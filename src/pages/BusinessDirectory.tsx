import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Handshake,
  LayoutGrid,
  List,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { filterListingCategories, industries, locations, popularSearches, type BusinessRecord } from "../businesses";
import { BusinessCard } from "../components/BusinessCard";
import { Reveal } from "../components/Reveal";
import { cn } from "../utils/cn";
import { businessApi, homeApi } from "../api";
import { BusinessCardShimmer } from "../components/ui/Shimmer";

/* ───────────────────────── Constants & tokens ───────────────────────── */

const PAGE_SIZE = 6;
const types = ["Startup", "SME", "Large Enterprise"] as const;
const years = ["Any Year", "2020 & later", "2010 – 2019", "2000 – 2009", "Before 2000"];
const memberships = ["Any", "Free", "Premium", "Enterprise"];
const sorts: { value: string; label: string }[] = [
  { value: "recent", label: "Recently Added" },
  { value: "viewed", label: "Most Viewed" },
  { value: "rated", label: "Highest Rated" },
  { value: "verified", label: "Recently Verified" },
  { value: "alpha", label: "Alphabetical" },
];

const allTags: string[] = [];

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const FOCUS_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900";
const EASE = "transition-all duration-200 ease-out motion-reduce:transition-none";
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────────────────────── Filtering logic (unchanged) ───────────────────────── */

interface Filters {
  q: string;
  category: string;
  industry: string;
  location: string;
  type: string[];
  verified: boolean;
  rating: number;
  year: string;
  ps: string;
  membership: string;
}

function matchYear(y: number, f: string) {
  switch (f) {
    case "2020 & later":
      return y >= 2020;
    case "2010 – 2019":
      return y >= 2010 && y <= 2019;
    case "2000 – 2009":
      return y >= 2000 && y <= 2009;
    case "Before 2000":
      return y < 2000;
    default:
      return true;
  }
}

function applyFilters(list: BusinessRecord[], f: Filters) {
  const q = f.q.trim().toLowerCase();
  return list.filter((b) => {
    if (q) {
      const hay = [b.name, b.category, b.industry, b.description, b.location, ...b.tags, ...b.products.map((p) => p.name), ...b.services.map((s) => s.name)]
        .join(" ")
        .toLowerCase();
      const words = q.split(/\s+/);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (f.category && b.category !== f.category) return false;
    if (f.industry && b.industry !== f.industry) return false;
    if (f.location && b.location !== f.location) return false;
    if (f.type.length && !f.type.includes(b.businessType)) return false;
    if (f.verified && !b.verified) return false;
    if (f.rating && b.rating < f.rating) return false;
    if (!matchYear(b.established, f.year)) return false;
    if (f.ps && !b.tags.includes(f.ps)) return false;
    if (f.membership && f.membership !== "Any" && b.membership !== f.membership) return false;
    return true;
  });
}

function sortList(list: BusinessRecord[], sort: string) {
  const c = [...list];
  switch (sort) {
    case "viewed":
      return c.sort((a, b) => b.views - a.views);
    case "rated":
      return c.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    case "verified":
      return c.sort((a, b) => (b.verifiedAt || "").localeCompare(a.verifiedAt || ""));
    case "alpha":
      return c.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return c.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }
}

/* ───────────────────────── Filter panel ───────────────────────── */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-line py-4">
      <legend className="float-left mb-3 w-full text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

const checkRow =
  "-mx-1 flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md px-2 text-[14px] text-slate-700 hover:bg-navy-50";

function FilterPanel({
  f,
  set,
  clear,
  activeCount,
  categories,
}: {
  f: Filters;
  set: (patch: Partial<Filters>) => void;
  clear: () => void;
  activeCount: number;
  categories: { id: string; name: string; slug: string }[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-navy-900">
          Refine
          {activeCount > 0 && (
            <span className="rounded-full bg-navy-900 px-2 py-0.5 text-[12px] font-semibold leading-none text-white" aria-label={`${activeCount} active filters`}>
              {activeCount}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={clear}
          disabled={activeCount === 0}
          className={cn("inline-flex items-center gap-1 rounded px-1 py-1 text-[13px] font-medium text-navy-700 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-40", FOCUS)}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
        </button>
      </div>

      <Field label="Category">
        <select className="select w-full text-[14px]" value={f.category} onChange={(e) => set({ category: e.target.value })} aria-label="Category">
          <option value="">All Categories</option>
          {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
        </select>
      </Field>

      <Field label="Industry">
        <select className="select w-full text-[14px]" value={f.industry} onChange={(e) => set({ industry: e.target.value })} aria-label="Industry">
          <option value="">All Industries</option>
          {industries.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>

      <Field label="Location">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <select className="select w-full pl-9 text-[14px]" value={f.location} onChange={(e) => set({ location: e.target.value })} aria-label="Location">
            <option value="">All Locations</option>
            {locations.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </Field>

      <Field label="Business Type">
        <div className="space-y-0.5">
          {types.map((t) => (
            <label key={t} className={checkRow}>
              <input
                type="checkbox"
                className="checkbox"
                checked={f.type.includes(t)}
                onChange={(e) => set({ type: e.target.checked ? [...f.type, t] : f.type.filter((x) => x !== t) })}
              />
              {t}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Verification">
        <label className={checkRow}>
          <input type="checkbox" className="checkbox" checked={f.verified} onChange={(e) => set({ verified: e.target.checked })} />
          Verified only
        </label>
      </Field>

      <Field label="Rating">
        <div className="space-y-1">
          {[4, 3, 0].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => set({ rating: r })}
              aria-pressed={f.rating === r}
              className={cn(
                "flex min-h-[40px] w-full items-center gap-2.5 rounded-md px-2 text-left text-[14px]",
                EASE,
                FOCUS,
                f.rating === r ? "bg-navy-50 font-semibold text-navy-900 ring-1 ring-navy-100" : "text-slate-700 hover:bg-slate-50",
              )}
            >
              <span className="flex gap-0.5" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("h-3.5 w-3.5", i < (r || 5) ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
              {r ? `${r}+ & above` : "Any rating"}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Year Established">
        <select className="select w-full text-[14px]" value={f.year} onChange={(e) => set({ year: e.target.value })} aria-label="Year established">
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
      </Field>

      {allTags.length > 0 && (
        <Field label="Products / Services">
          <select className="select w-full text-[14px]" value={f.ps} onChange={(e) => set({ ps: e.target.value })} aria-label="Products or services">
            <option value="">Select</option>
            {allTags.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      )}

      <Field label="Membership">
        <select className="select w-full text-[14px]" value={f.membership} onChange={(e) => set({ membership: e.target.value })} aria-label="Membership">
          {memberships.map((m) => <option key={m}>{m}</option>)}
        </select>
      </Field>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function BusinessDirectory() {
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const [apiTotal, setApiTotal] = useState<number | null>(null);
  const [apiBusinesses, setApiBusinesses] = useState<BusinessRecord[] | null>(null);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string; slug: string }[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    homeApi.categories().then((items: any[]) => {
      if (active) setCategoryOptions(filterListingCategories(Array.isArray(items) ? items : []));
    }).catch(() => { if (active) setCategoryOptions([]); });
    return () => { active = false; };
  }, []);

  const f: Filters = {
    q: params.get("q") || "",
    category: params.get("category") || "",
    industry: params.get("industry") || "",
    location: params.get("location") || "",
    type: params.get("type")?.split(",").filter(Boolean) || [],
    verified: params.get("verified") === "1",
    rating: Number(params.get("rating") || 0),
    year: params.get("year") || "Any Year",
    ps: params.get("ps") || "",
    membership: params.get("membership") || "Any",
  };
  const sort = params.get("sort") || "recent";
  const view = (params.get("view") as "grid" | "list") || "grid";
  const page = Math.max(1, Number(params.get("page") || 1));
  const [query, setQuery] = useState(f.q);
  useEffect(() => setQuery(f.q), [f.q]);

  const update = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (resetPage) next.delete("page");
    setParams(next, { replace: false });
  };

  const set = (patch: Partial<Filters>) =>
    update({
      ...(patch.q !== undefined && { q: patch.q }),
      ...(patch.category !== undefined && { category: patch.category }),
      ...(patch.industry !== undefined && { industry: patch.industry }),
      ...(patch.location !== undefined && { location: patch.location }),
      ...(patch.type !== undefined && { type: patch.type.join(",") }),
      ...(patch.verified !== undefined && { verified: patch.verified ? "1" : "" }),
      ...(patch.rating !== undefined && { rating: patch.rating ? String(patch.rating) : "" }),
      ...(patch.year !== undefined && { year: patch.year === "Any Year" ? "" : patch.year }),
      ...(patch.ps !== undefined && { ps: patch.ps }),
      ...(patch.membership !== undefined && { membership: patch.membership === "Any" ? "" : patch.membership }),
    });

  const clear = () => {
    const next = new URLSearchParams();
    if (sort !== "recent") next.set("sort", sort);
    if (view !== "grid") next.set("view", view);
    setParams(next);
  };

  const activeCount =
    (f.q ? 1 : 0) + (f.category ? 1 : 0) + (f.industry ? 1 : 0) + (f.location ? 1 : 0) + f.type.length + (f.verified ? 1 : 0) + (f.rating ? 1 : 0) + (f.year !== "Any Year" ? 1 : 0) + (f.ps ? 1 : 0) + (f.membership !== "Any" ? 1 : 0);

  const results = useMemo(() => apiBusinesses ? sortList(applyFilters(apiBusinesses, f), sort) : [], [params, apiBusinesses]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    set({ q: query });
  };

  useEffect(() => {
    document.title = "Explore Businesses — WS Hub";
  }, []);

  useEffect(() => {
    let active = true;
    setBusinessesLoading(true);
    setApiBusinesses(null);
    businessApi.list({
      listingType: "business",
      q: f.q || undefined,
      category: f.category || undefined,
      city: f.location || undefined,
      minRating: f.rating || undefined,
      sort: sort === "recent" ? "newest" : sort === "viewed" ? "popular" : sort === "rated" ? "rating" : sort === "alpha" ? "name" : "newest",
      page,
      limit: PAGE_SIZE,
    }).then((result: any) => {
      const payload = Array.isArray(result) ? result : result?.data;
      const meta = Array.isArray(result) ? null : result?.meta;
      const records: BusinessRecord[] = (payload ?? []).filter((b: any) => String(b.listing_type ?? b.listingType ?? "").toLowerCase() === "business").map((b: any) => ({
        slug: b.slug,
        name: b.name,
        category: b.category?.name || "Business",
        industry: b.category?.slug || "General",
        location: b.city || b.location || "Warangal",
        area: b.address || b.city || "",
        tagline: b.description || "Published on WS Hub",
        description: b.description || "",
        mission: "",
        vision: "",
        founder: b.owner?.full_name || "",
        founderId: b.owner?.id || "",
        employees: b.employee_count == null ? "Not listed" : String(b.employee_count),
        established: Number(b.established_year || 0),
        hours: "",
        businessType: b.listing_type === "startup" ? "Startup" : "SME",
        membership: "Free",
        verified: Boolean(b.is_verified),
        rating: Number(b.avg_rating ?? b.rating ?? 0),
        reviews: Number(b.review_count ?? b.reviews ?? 0),
        views: Number(b.view_count ?? b.views ?? 0),
        addedAt: b.created_at || "",
        verifiedAt: "",
        tags: Array.isArray(b.tags) ? b.tags : [],
        products: Array.isArray(b.products) ? b.products : [],
        services: [],
        gallery: Array.isArray(b.gallery) ? b.gallery : [],
        achievements: [],
        reviewList: [],
        contact: {
          phone: b.phone || "",
          whatsapp: b.phone || "",
          email: b.email || "",
          website: b.website || "",
          address: b.address || b.city || "",
          maps: b.map_url || "",
          instagram: b.social_links?.instagram,
          linkedin: b.social_links?.linkedin,
        },
        cover: b.cover_url || "/images/hero.jpg",
        logo: { initials: b.name?.slice(0, 2).toUpperCase() || "WS", bg: "#0f2a4a", fg: "#ffffff" },
      }));
      if (active) { setApiBusinesses(records); setApiTotal(meta?.total ?? records.length); }
    }).catch(() => {
      if (active) { setApiBusinesses([]); setApiTotal(0); }
    }).finally(() => { if (active) setBusinessesLoading(false); });
    return () => { active = false; };
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drawer: lock scroll, move focus in, close on Escape, restore focus.
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

  // "/" focuses search.
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

  const goPage = (p: number) => {
    update({ page: p > 1 ? String(p) : undefined }, false);
    window.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
  };
  const closeDrawer = () => {
    setDrawer(false);
    drawerTriggerRef.current?.focus();
  };

  const shownTotal = apiTotal ?? results.length;

  const chips: { id: string; label: string; onRemove: () => void }[] = [];
  if (f.q) chips.push({ id: "q", label: `“${f.q}”`, onRemove: () => { setQuery(""); set({ q: "" }); } });
  if (f.category) chips.push({ id: "category", label: categoryOptions.find((c) => c.slug === f.category)?.name ?? f.category, onRemove: () => set({ category: "" }) });
  if (f.industry) chips.push({ id: "industry", label: f.industry, onRemove: () => set({ industry: "" }) });
  if (f.location) chips.push({ id: "location", label: f.location, onRemove: () => set({ location: "" }) });
  f.type.forEach((t) => chips.push({ id: `type:${t}`, label: t, onRemove: () => set({ type: f.type.filter((x) => x !== t) }) }));
  if (f.verified) chips.push({ id: "verified", label: "Verified", onRemove: () => set({ verified: false }) });
  if (f.rating > 0) chips.push({ id: "rating", label: `${f.rating}+ stars`, onRemove: () => set({ rating: 0 }) });
  if (f.year !== "Any Year") chips.push({ id: "year", label: f.year, onRemove: () => set({ year: "Any Year" }) });
  if (f.ps) chips.push({ id: "ps", label: f.ps, onRemove: () => set({ ps: "" }) });
  if (f.membership !== "Any") chips.push({ id: "membership", label: f.membership, onRemove: () => set({ membership: "Any" }) });

  return (
    <div className="page-in pb-20 lg:pb-0">
      {/* ═════════ Hero ═════════ */}
      <section className="relative overflow-hidden border-b-2 border-gold-500 bg-navy-900 text-white">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-y-0 right-0 hidden w-[52%] md:block">
            <img src="/images/hero.jpg" alt="" className="h-full w-full object-cover object-[center_40%] opacity-80" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900 to-navy-900/40 md:via-[50%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-transparent" />
        </div>
        <div className="relative mx-auto max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-white/75">
            <Link to="/" className={cn("rounded hover:text-white", FOCUS_DARK)}>Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/50" aria-hidden="true" />
            <span aria-current="page" className="font-medium text-white">Businesses</span>
          </nav>

          <div className="mt-7 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h1 className="text-[34px] font-bold leading-[1.08] tracking-tight sm:text-[46px]">
                Explore <span className="text-gold-500">Businesses</span>
              </h1>
              <p className="mt-3 max-w-[580px] text-[16px] leading-relaxed text-white/85">
                Discover verified businesses across Warangal. Connect, collaborate and grow together.
              </p>
              {!businessesLoading && (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-[13px] text-white/90 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
                  <span className="font-semibold text-white">{shownTotal.toLocaleString("en-IN")}</span> businesses listed
                </p>
              )}
            </div>
            <figure className="hidden max-w-[300px] border-l-2 border-gold-500 pl-4 lg:block">
              <blockquote className="text-[16px] font-medium italic leading-snug text-white/95">“Local Businesses. Stronger Warangal.”</blockquote>
            </figure>
          </div>

          <form
            role="search"
            onSubmit={submit}
            className="mt-8 flex max-w-[820px] overflow-hidden rounded-xl bg-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.65)] ring-1 ring-white/10 transition-shadow duration-200 focus-within:ring-2 focus-within:ring-gold-400"
          >
            <label htmlFor="dir-search" className="sr-only">Search businesses</label>
            <span className="flex items-center pl-5 pr-3 text-navy-700" aria-hidden="true"><Search className="h-5 w-5" strokeWidth={2.2} /></span>
            <input
              ref={searchRef}
              id="dir-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, category, products or services…"
              autoComplete="off"
              enterKeyHint="search"
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-slate-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => { setQuery(""); set({ q: "" }); searchRef.current?.focus(); }}
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

      {/* ═════════ Popular searches ═════════ */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3.5 sm:px-6 lg:px-8">
          <button
            ref={drawerTriggerRef}
            type="button"
            onClick={() => setDrawer(true)}
            aria-haspopup="dialog"
            className={cn("inline-flex min-h-[40px] items-center gap-2 rounded-full bg-navy-900 px-4 text-[13px] font-semibold text-white hover:bg-navy-800 lg:hidden", EASE, FOCUS)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters{activeCount > 0 && ` (${activeCount})`}
          </button>
          <span className="mr-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Popular</span>
          {popularSearches.map((p) => (
            <ChipBtn key={p} active={f.q === p} onClick={() => { setQuery(p); set({ q: f.q === p ? "" : p }); }}>
              {p}
            </ChipBtn>
          ))}
        </div>
      </div>

      {/* Category chips (mobile / tablet) */}
      {categoryOptions.length > 0 && (
        <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 lg:hidden">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 hide-scrollbar" role="group" aria-label="Categories">
            <ChipBtn active={!f.category} onClick={() => set({ category: "" })}>All</ChipBtn>
            {categoryOptions.map((category) => (
              <ChipBtn key={category.id} active={f.category === category.slug} onClick={() => set({ category: category.slug })}>
                {category.name}
              </ChipBtn>
            ))}
          </div>
        </div>
      )}

      {/* ═════════ Main ═════════ */}
      <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="grid gap-8 lg:grid-cols-[264px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-[76px] max-h-[calc(100vh-92px)] overflow-y-auto rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] hide-scrollbar">
              <FilterPanel f={f} set={set} clear={clear} activeCount={activeCount} categories={categoryOptions} />
            </div>
          </aside>

          <section aria-label="Results" aria-busy={businessesLoading}>
            <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[22px] font-bold tracking-tight text-navy-900" aria-live="polite">
                  {businessesLoading ? (
                    <span className="inline-block h-7 w-40 animate-pulse rounded bg-slate-200 align-middle motion-reduce:animate-none" />
                  ) : (
                    <>
                      {shownTotal.toLocaleString("en-IN")} <span className="font-medium text-slate-600">{shownTotal === 1 ? "Business" : "Businesses"}</span>
                    </>
                  )}
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-600">
                  {f.q ? <>Results for “{f.q}”</> : <>Showing results in {f.location || "Warangal"}</>}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="sort" className="hidden text-[13px] font-medium text-slate-600 sm:block">Sort by</label>
                  <select id="sort" className="select h-10 w-auto min-w-[168px] text-[13px]" value={sort} onChange={(e) => update({ sort: e.target.value === "recent" ? undefined : e.target.value })}>
                    {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="hidden items-center overflow-hidden rounded-lg border border-slate-300 bg-white sm:inline-flex" role="group" aria-label="Layout">
                  <ViewBtn active={view === "grid"} onClick={() => update({ view: undefined }, false)} label="Grid view"><LayoutGrid className="h-4 w-4" /></ViewBtn>
                  <ViewBtn active={view === "list"} onClick={() => update({ view: "list" }, false)} label="List view"><List className="h-4 w-4" /></ViewBtn>
                </div>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
                {chips.map((c) => <Chip key={c.id} label={c.label} onRemove={c.onRemove} />)}
                <button type="button" onClick={clear} className={cn("rounded px-1.5 py-1 text-[13px] font-semibold text-navy-700 hover:text-navy-900 hover:underline", FOCUS)}>
                  Clear all
                </button>
              </div>
            )}

            {businessesLoading ? (
              <div className="mt-6"><BusinessCardShimmer count={6} /></div>
            ) : pageItems.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 border-t-2 border-t-gold-500 bg-white px-6 py-14 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-700" aria-hidden="true"><Search className="h-6 w-6" /></span>
                <h3 className="mt-4 text-[18px] font-bold tracking-tight text-navy-900">
                  {activeCount > 0 ? "No businesses match your criteria" : "No businesses listed yet"}
                </h3>
                <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-slate-600">
                  {activeCount > 0
                    ? "Try removing a filter, checking your spelling, or searching a broader term."
                    : "Published businesses will appear here. Add the first business to get started."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {activeCount > 0 && (
                    <button type="button" onClick={clear} className={cn("btn-navy min-h-[44px] px-6 text-[13px]", FOCUS)}>Clear all filters</button>
                  )}
                  <Link
                    to="/dashboard"
                    className={cn(
                      "inline-flex min-h-[44px] items-center rounded-md px-6 text-[13px] font-semibold",
                      EASE,
                      FOCUS,
                      activeCount > 0 ? "border border-slate-300 text-navy-800 hover:bg-navy-50" : "btn-navy",
                    )}
                  >
                    Add a business
                  </Link>
                </div>
              </div>
            ) : (
              <div key={`${view}-${safePage}-${params.toString()}`} className={cn("mt-6 grid gap-5", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                {pageItems.map((b, i) => (
                  <Reveal key={b.slug} delay={i * 40}>
                    <BusinessCard b={b} view={view} />
                  </Reveal>
                ))}
              </div>
            )}

            {!businessesLoading && results.length > 0 && (
              <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
                <p className="text-[13px] text-slate-600">
                  Showing <span className="font-semibold text-navy-900">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, results.length)}</span> of{" "}
                  <span className="font-semibold text-navy-900">{results.length.toLocaleString("en-IN")}</span> businesses
                </p>
                {totalPages > 1 && (
                  <nav aria-label="Pagination" className="flex items-center gap-1.5">
                    <PageBtn disabled={safePage === 1} onClick={() => goPage(safePage - 1)} aria-label="Previous page"><ArrowLeft className="h-4 w-4" /></PageBtn>
                    {pageList(safePage, totalPages).map((n, i) =>
                      n === "…" ? (
                        <span key={`gap-${i}`} className="px-1 text-slate-500" aria-hidden="true">…</span>
                      ) : (
                        <PageBtn key={n} active={safePage === n} onClick={() => goPage(n)} aria-label={`Page ${n}`} aria-current={safePage === n ? "page" : undefined}>{n}</PageBtn>
                      ),
                    )}
                    <PageBtn disabled={safePage === totalPages} onClick={() => goPage(safePage + 1)} aria-label="Next page"><ArrowRight className="h-4 w-4" /></PageBtn>
                  </nav>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ═════════ Owner CTA ═════════ */}
        <Reveal className="my-12 flex flex-col gap-5 rounded-xl border border-line border-l-4 border-l-gold-500 bg-white p-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500" aria-hidden="true"><Handshake className="h-7 w-7" strokeWidth={1.6} /></span>
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-navy-900">Are you a business owner?</h3>
              <p className="mt-0.5 max-w-xl text-[14px] leading-relaxed text-slate-600">List your business on WS Hub and get discovered by customers, partners and investors.</p>
            </div>
          </div>
          <Link
            to="/signup"
            className={cn("inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-lg bg-navy-900 px-6 text-[14px] font-semibold text-white hover:bg-navy-800 hover:shadow-[0_12px_24px_-12px_rgba(10,25,60,0.8)]", EASE, FOCUS)}
          >
            Register Your Business <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>

      {/* ═════════ Mobile filter drawer ═════════ */}
      <div className={cn("fixed inset-0 z-[60] lg:hidden", drawer ? "visible" : "invisible transition-[visibility] delay-300")} aria-hidden={!drawer}>
        <div className={cn("absolute inset-0 bg-navy-950/60 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none", drawer ? "opacity-100" : "opacity-0")} onClick={closeDrawer} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={cn(
            "absolute inset-y-0 left-0 flex w-[88%] max-w-[360px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            drawer ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-line bg-navy-900 px-5 py-4 text-white">
            <span className="text-[16px] font-semibold tracking-tight">Refine results</span>
            <button ref={drawerCloseRef} type="button" aria-label="Close filters" onClick={closeDrawer} className={cn("flex h-10 w-10 items-center justify-center rounded-md text-white/90 hover:bg-white/10", FOCUS_DARK)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5"><FilterPanel f={f} set={set} clear={clear} activeCount={activeCount} categories={categoryOptions} /></div>
          <div className="border-t border-line bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={closeDrawer} className={cn("min-h-[48px] w-full rounded-lg bg-gold-500 text-[15px] font-semibold text-navy-900 hover:bg-gold-400", EASE, FOCUS)}>
              Show {shownTotal.toLocaleString("en-IN")} {shownTotal === 1 ? "business" : "businesses"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[40px] shrink-0 items-center rounded-full border px-4 text-[13px] font-medium",
        EASE,
        FOCUS,
        active ? "border-navy-900 bg-navy-900 text-white shadow-sm" : "border-slate-300 bg-white text-slate-700 hover:border-navy-700 hover:bg-navy-50 hover:text-navy-900",
      )}
    >
      {children}
    </button>
  );
}

function ViewBtn({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: ReactNode }) {
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

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-navy-100 bg-navy-50 py-1 pl-3 pr-1 text-[13px] font-medium text-navy-800">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className={cn("flex h-6 w-6 items-center justify-center rounded-full hover:bg-navy-100", FOCUS)}>
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
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
        active ? "border-navy-900 bg-navy-900 text-white" : "border-slate-300 bg-white text-navy-800 hover:border-navy-700 hover:bg-navy-50",
        className,
      )}
      {...rest}
    />
  );
}

/** 1 … 4 5 6 … 20 — keeps pagination compact. */
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