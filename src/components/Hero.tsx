import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/* Same hand-drawn glyph language as the Navbar: one stroke weight, round joins. */
function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <circle cx="8.6" cy="8.6" r="5.4" />
      <path d="m12.7 12.7 4.1 4.1" />
    </svg>
  );
}
function ChevronGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <path d="m5.5 7.8 4.5 4.4 4.5-4.4" />
    </svg>
  );
}

/* What the search box can look inside */
const scopes: { label: string; to: string }[] = [
  { label: "Businesses", to: "/businesses" },
  { label: "Startups", to: "/startups" },
  { label: "Founders", to: "/founders" },
  { label: "Investors", to: "/investors" },
];

/* Direct routes into the directory */
const browse: { label: string; to: string }[] = [
  { label: "Businesses", to: "/businesses" },
  { label: "Startups", to: "/startups" },
  { label: "Founders", to: "/founders" },
  { label: "Investors", to: "/investors" },
  { label: "Jobs", to: "/jobs" },
  { label: "Events", to: "/events" },
  { label: "Requirements", to: "/requirements" },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900";

export function Hero() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState(scopes[0].to);

  return (
    <section className="relative overflow-hidden bg-navy-900 text-white" aria-labelledby="hero-title">
      {/* Photograph, held to the right and faded into the navy */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-y-0 right-0 w-full md:w-[62%]">
          <img src="/images/hero.jpg" alt="" className="h-full w-full object-cover object-center" fetchPriority="high" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/25 md:via-navy-900/90 md:via-40%" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-navy-900/30" />
      </div>

      <div className="relative mx-auto flex max-w-[1280px] flex-col px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:min-h-[600px] lg:justify-center lg:px-8 lg:pb-28 lg:pt-24">
        <div className="max-w-[660px]">
          <h1
            id="hero-title"
            className="hero-in font-serif text-[40px] font-medium leading-[1.08] tracking-[-0.015em] text-white sm:text-[52px] lg:text-[60px]"
            style={{ animationDelay: "0ms" }}
          >
            Find the businesses, startups and founders building Warangal.
          </h1>

          <p
            className="hero-in mt-5 max-w-[540px] text-[16px] leading-[1.65] text-white/85 sm:text-[17px]"
            style={{ animationDelay: "120ms" }}
          >
            WS Hub is Warangal’s directory of local businesses, startups, founders and investors, with jobs, events and
            requirements listed alongside.
          </p>

          <div className="hero-in" style={{ animationDelay: "240ms" }}>
            {/* Search */}
            <form
              role="search"
              className="mt-8 flex flex-col overflow-hidden rounded-lg bg-white shadow-[0_18px_44px_-18px_rgba(0,0,0,0.65)] focus-within:ring-2 focus-within:ring-gold-400 sm:flex-row sm:items-stretch"
              onSubmit={(e) => {
                e.preventDefault();
                const term = q.trim();
                navigate(term ? `${scope}?q=${encodeURIComponent(term)}` : scope);
              }}
            >
              <div className="relative border-b border-slate-200 sm:w-[158px] sm:shrink-0 sm:border-b-0 sm:border-r">
                <label htmlFor="hero-scope" className="sr-only">
                  Search in
                </label>
                <select
                  id="hero-scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="h-12 w-full cursor-pointer appearance-none bg-transparent pl-4 pr-9 text-[14px] font-semibold text-navy-900 focus:outline-none"
                >
                  {scopes.map((s) => (
                    <option key={s.to} value={s.to}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronGlyph className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>

              <div className="flex min-w-0 flex-1 items-center">
                <SearchGlyph className="ml-4 h-[18px] w-[18px] shrink-0 text-slate-500" />
                <label htmlFor="hero-search" className="sr-only">
                  Search term
                </label>
                <input
                  id="hero-search"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name, product, service or skill"
                  autoComplete="off"
                  className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[14px] text-ink placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="h-12 shrink-0 bg-gold-500 px-8 text-[14px] font-semibold text-navy-900 transition-colors hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-900 motion-reduce:transition-none"
              >
                Search
              </button>
            </form>

            {/* Browse */}
            <nav aria-label="Browse the directory" className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13.5px]">
              <span className="text-white/60">Browse</span>
              {browse.map((b) => (
                <Link
                  key={b.to}
                  to={b.to}
                  className={`inline-flex min-h-[36px] items-center rounded-sm text-white/90 underline decoration-white/25 underline-offset-[6px] transition-colors hover:text-white hover:decoration-gold-400 motion-reduce:transition-none ${focusRing}`}
                >
                  {b.label}
                </Link>
              ))}
            </nav>

            <p className="mt-4 text-[13.5px] text-white/70">
              Run a business in Warangal?{" "}
              <Link
                to="/businesses/manage"
                className={`rounded-sm font-semibold text-gold-400 underline underline-offset-4 hover:text-gold-300 ${focusRing}`}
              >
                Add it to the directory
              </Link>
            </p>
          </div>
        </div>

        {/* Caption set against the photograph */}
        <figure
          className="hero-in absolute bottom-10 right-8 hidden max-w-[270px] border-l-2 border-gold-500 pl-4 lg:block xl:right-10"
          style={{ animationDelay: "420ms" }}
        >
          <blockquote className="font-serif text-[22px] italic leading-snug text-white">
            Local ideas, global opportunities.
          </blockquote>
          <figcaption className="mt-2 text-[13px] text-white/70">Warangal rises together.</figcaption>
        </figure>
      </div>
    </section>
  );
}