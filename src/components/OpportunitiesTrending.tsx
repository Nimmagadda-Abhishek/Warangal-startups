import { Link } from "react-router-dom";
import { EmptyDataCard } from "./EmptyDataCard";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}
const fmt = (d: Date, withYear = true) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });

/* ------------------------------------------------------------------ */
/*  Opportunities                                                      */
/* ------------------------------------------------------------------ */

function OpportunityRow({ o, index }: { o: any; index: number }) {
  const to = `/requirements/${encodeURIComponent(o.slug || o.id)}`;
  const kindRaw: string = o.type || o.opportunity_type || o.category?.name || (typeof o.category === "string" ? o.category : "");
  const kind = kindRaw ? kindRaw.charAt(0).toUpperCase() + kindRaw.slice(1) : "";
  const org = o.company || o.organization || o.business?.name || o.owner?.full_name || "";
  const place = o.is_remote ? "Remote" : o.city || o.location || "";
  const deadline = parseDate(o.deadline ?? o.closes_at ?? o.expires_at);
  const posted = parseDate(o.created_at ?? o.published_at);
  const description = o.description || o.summary;

  return (
    <Reveal delay={index * 80} as="article" className="card min-w-0 p-4">
      {kind && <span className="inline-block rounded bg-navy-50 px-2 py-1 text-[12px] font-semibold leading-none text-navy-700">{kind}</span>}
      <h3 className={`${kind ? "mt-2.5" : ""} text-[16px] font-semibold leading-snug text-navy-900`}>
        <Link to={to} className={`rounded-sm hover:underline hover:decoration-gold-500 hover:underline-offset-4 ${focusRing}`}>
          {o.title || o.name}
        </Link>
      </h3>
      {(org || place) && <p className="mt-1 text-[13px] font-medium text-slate-700">{[org, place].filter(Boolean).join(", ")}</p>}
      {description && <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-600">{description}</p>}
      {(deadline || posted) && (
        <p className="mt-2.5 text-[13px] text-slate-600">{deadline ? `Closes ${fmt(deadline)}` : `Posted ${fmt(posted as Date)}`}</p>
      )}
    </Reveal>
  );
}

export function Opportunities({ items }: { items?: any[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* Hide posts whose deadline has passed */
  const open = (items || [])
    .filter((o) => o && (o.title || o.name))
    .filter((o) => {
      const d = parseDate(o.deadline ?? o.closes_at ?? o.expires_at);
      return !d || d >= today;
    })
    .slice(0, 4);

  return (
    <div>
      <SectionHeader title="Business Opportunities" to="/requirements" />
      {open.length === 0 ? (
        <EmptyDataCard
          title="Welcome — no opportunities yet"
          text="Real funding, jobs, partnerships and collaboration posts will appear here."
          action="Post opportunity"
          to="/dashboard?tab=post"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {open.map((o, i) => (
            <OpportunityRow key={o.slug || o.id || i} o={o} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trending businesses                                                */
/* ------------------------------------------------------------------ */

export function TrendingBusinesses({ items = [] }: { items?: any[] }) {
  return (
    <div>
      <SectionHeader title="Trending Businesses" />
      {items.length === 0 ? (
        <EmptyDataCard
          title="Welcome — no trending businesses"
          text="Published businesses will appear here as they join WS Hub."
          action="Explore businesses"
          to="/businesses"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.slice(0, 4).map((business, i) => {
            const rating = Number(business.avg_rating || 0);
            const reviews = Number(business.review_count || 0);
            const category = business.category?.name || business.category || "Business";
            const line = [category, business.city].filter(Boolean).join(", ");
            const image = business.logo_url || business.cover_url;
            return (
              <Reveal key={business.id || business.slug || i} delay={i * 80}>
                <Link
                  to={`/businesses/${business.slug}`}
                  className={`card flex items-center gap-4 p-3.5 transition-colors hover:border-navy-300 motion-reduce:transition-none ${focusRing}`}
                >
                  {image ? (
                    <img src={image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-navy-50 font-serif text-[20px] text-navy-800"
                    >
                      {String(business.name || "B").trim().slice(0, 2).toUpperCase()}
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-navy-900">{business.name}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-slate-600">{line}</span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block text-[15px] font-semibold text-navy-900 tabular-nums">
                      {rating > 0 ? rating.toFixed(1) : "New"}
                    </span>
                    <span className="block text-[13px] text-slate-600">
                      {reviews} {reviews === 1 ? "review" : "reviews"}
                    </span>
                    <span className="sr-only">{rating > 0 ? `Rated ${rating.toFixed(1)} out of 5` : "No rating yet"}</span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}