import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, MapPin, Rocket, Share2, UserRound } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Stars } from "./Stars";
import { Reveal } from "./Reveal";
import { BusinessMark } from "./BrandMarks";
import { EmptyDataCard } from "./EmptyDataCard";

/* Hand-drawn glyphs, same language as the rest of the site */
function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <path d="m4.8 10.4 3.4 3.4 7-7.6" />
    </svg>
  );
}
function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <path d="M10 12.2V3.6" />
      <path d="m6.8 6.6 3.2-3.2 3.2 3.2" />
      <path d="M4.6 11v4.1c0 .7.6 1.3 1.3 1.3h8.2c.7 0 1.3-.6 1.3-1.3V11" />
    </svg>
  );
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded bg-verified px-2 py-1 text-[11px] font-semibold leading-none text-white ${className}`}>
      <CheckGlyph className="h-3 w-3" />
      Verified
    </span>
  );
}

/* Replaces the old window.alert: confirms inline, announces to screen readers */
function ShareButton({ slug, name, kind }: { slug: string; name: string; kind: "business" | "startup" }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const confirmCopied = () => {
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2200);
  };
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      confirmCopied();
    } catch {
      /* clipboard blocked; nothing more we can do silently */
    }
  };

  const share = async () => {
    const path = kind === "startup" ? "startups" : "businesses";
    const url = `${window.location.origin}${window.location.pathname}#/${path}/${encodeURIComponent(slug)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${name} | WS Hub`, text: `Explore ${name} on WS Hub`, url });
      else await copy(url);
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") await copy(url);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void share()}
        aria-label={`Share ${name} profile`}
        className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-[13px] font-semibold text-navy-800 transition-colors hover:bg-navy-50 motion-reduce:transition-none ${focusRing}`}
      >
        <ShareGlyph className="h-4 w-4" />
        {copied ? "Link copied" : "Share"}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Profile link copied" : ""}
      </span>
    </>
  );
}

type CardProps = {
  index: number;
  to: string;
  name: string;
  image?: string;
  imageAlt?: string;
  fallback: ReactNode;
  verified: boolean;
  category: string;
  place?: string;
  description?: string;
  founderName?: string;
  founderId?: string;
  rating?: number;
  reviews?: number;
  shareSlug: string;
  kind: "business" | "startup";
};

function ListingCard(p: CardProps) {
  return (
    <Reveal delay={p.index * 80} as="article" className="card hidden min-w-0 flex-col overflow-hidden sm:flex">
      {/* The title link is the real tab stop; the image link is a pointer convenience */}
      <Link to={p.to} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        {p.image ? <img src={p.image} alt={p.imageAlt ?? ""} loading="lazy" className="h-full w-full object-cover" /> : p.fallback}
        {p.verified && <VerifiedBadge className="absolute bottom-2.5 right-2.5" />}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[16px] font-semibold leading-snug text-navy-900">
          <Link to={p.to} className={`rounded-sm hover:underline hover:decoration-gold-500 hover:underline-offset-4 ${focusRing}`}>
            {p.name}
          </Link>
        </h3>
        <p className="mt-1 text-[13px] font-medium text-slate-700">{p.category}</p>
        {p.place && <p className="text-[13px] text-slate-600">{p.place}</p>}

        {p.description && <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">{p.description}</p>}

        {p.founderName && (
          <p className="mt-2.5 truncate text-[13px] text-slate-600">
            Founder{" "}
            {p.founderId ? (
              <Link to={`/members/${encodeURIComponent(p.founderId)}`} className={`rounded-sm font-semibold text-navy-700 hover:underline ${focusRing}`}>
                {p.founderName}
              </Link>
            ) : (
              <span className="font-semibold text-navy-700">{p.founderName}</span>
            )}
          </p>
        )}

        {p.kind === "business" && (
          <div className="mt-2.5">
            <Stars rating={p.rating ?? 0} reviews={p.reviews ?? 0} />
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-4">
          <Link to={p.to} className={`btn-navy flex h-10 min-w-0 flex-1 items-center justify-center text-[13px] ${focusRing}`}>
            View profile
          </Link>
          <ShareButton slug={p.shareSlug} name={p.name} kind={p.kind} />
        </div>
      </div>
    </Reveal>
  );
}

function MobileShareButton({ slug, name, kind }: { slug: string; name: string; kind: CardProps["kind"] }) {
  const share = async () => {
    const path = kind === "startup" ? "startups" : "businesses";
    const url = `${window.location.origin}${window.location.pathname}#/${path}/${encodeURIComponent(slug)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${name} | WS Hub`, text: `Explore ${name} on WS Hub`, url });
      else {
        await navigator.clipboard.writeText(url);
        window.alert("Profile link copied. Share it anywhere.");
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        await navigator.clipboard?.writeText(url).then(() => window.alert("Profile link copied. Share it anywhere.")).catch(() => undefined);
      }
    }
  };

  return (
    <button type="button" onClick={() => void share()} aria-label={`Share ${name} profile`} title="Share profile" className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 text-navy-800 hover:bg-navy-50">
      <Share2 className="h-4 w-4" />
    </button>
  );
}

function MobileListingCard(p: CardProps) {
  return (
    <Reveal delay={p.index * 80} as="article" className="card group flex min-w-0 flex-col overflow-hidden sm:hidden">
      <Link to={p.to} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        {p.image ? <img src={p.image} alt={p.imageAlt ?? ""} loading="lazy" className="h-full w-full object-cover" /> : p.fallback}
        {p.verified && <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-sm bg-verified px-1.5 py-[3px] text-[9px] font-semibold text-white shadow-sm"><BadgeCheck className="h-3 w-3" strokeWidth={2.4} />Verified</span>}
      </Link>
      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="line-clamp-2 text-[12.5px] font-bold leading-tight text-navy-900"><Link to={p.to}>{p.name}</Link></h3>
        <p className="mt-1 truncate text-[10.5px] text-slate-500">{p.category}</p>
        {p.place && <p className="mt-1 flex items-center gap-1 text-[10.5px] text-slate-500"><MapPin className="h-3 w-3 shrink-0" strokeWidth={2} />{p.place}</p>}
        {p.description && <p className="mt-2 line-clamp-2 min-h-8 text-[10.5px] leading-relaxed text-slate-600">{p.description}</p>}
        {p.founderName && <p className="mt-1 flex items-center gap-1 truncate text-[10.5px] font-medium text-navy-700"><UserRound className="h-3 w-3 shrink-0" />Founder: {p.founderId ? <Link to={`/members/${encodeURIComponent(p.founderId)}`} className="truncate hover:underline">{p.founderName}</Link> : p.founderName}</p>}
        {p.kind === "business" && <div className="mt-2"><Stars rating={p.rating ?? 0} reviews={p.reviews ?? 0} /></div>}
        <div className="mt-auto flex gap-2 pt-3">
          <Link to={p.to} className="btn-navy flex min-w-0 flex-1 items-center justify-center gap-1.5 py-2 text-[10.5px]">{p.kind === "startup" ? "View startup" : "View Profile"}{p.kind === "startup" && <ArrowRight className="h-3.5 w-3.5" />}</Link>
          <MobileShareButton slug={p.shareSlug} name={p.name} kind={p.kind} />
        </div>
      </div>
    </Reveal>
  );
}

export function FeaturedBusinesses({ items }: { items?: any[] }) {
  const list = items?.length
    ? items
        .filter((b) => String(b.listing_type ?? b.listingType ?? "").toLowerCase() === "business")
        .map((b) => ({
          slug: b.slug,
          name: b.name,
          category: b.category?.name || b.category || "Business",
          location: b.city || "Warangal",
          rating: b.avg_rating ?? b.rating ?? 0,
          reviews: b.review_count ?? b.reviews ?? 0,
          verified: Boolean(b.is_verified),
          image: b.logo_url || b.cover_url,
          founder: b.owner?.full_name || "",
          founderId: b.owner?.id || "",
        }))
    : [];

  return (
    <div>
      <SectionHeader title="Featured Businesses" to="/businesses" actionLabel="Explore more" />
      {list.length === 0 && (
        <EmptyDataCard
          title="Welcome — no featured businesses yet"
          text="Real published businesses will appear here once they are added."
          action="Add a business"
          to="/dashboard"
        />
      )}
      {list.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {list.slice(0, 4).map((b, i) => (
            <MobileListingCard
              key={`mobile-${b.slug || b.name}`}
              index={i}
              to={`/businesses/${b.slug}`}
              name={b.name}
              image={b.image}
              imageAlt={b.name}
              fallback={<BusinessMark />}
              verified={b.verified}
              category={b.category}
              place={b.location}
              founderName={b.founder}
              founderId={b.founderId}
              rating={b.rating}
              reviews={b.reviews}
              shareSlug={b.slug}
              kind="business"
            />
          ))}
        </div>
      )}
      {list.length > 0 && (
        <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-2">
          {list.slice(0, 4).map((b, i) => (
            <ListingCard
              key={b.slug || b.name}
              index={i}
              to={`/businesses/${b.slug}`}
              name={b.name}
              image={b.image}
              imageAlt={b.name}
              fallback={<BusinessMark />}
              verified={b.verified}
              category={b.category}
              place={b.location}
              founderName={b.founder}
              founderId={b.founderId}
              rating={b.rating}
              reviews={b.reviews}
              shareSlug={b.slug}
              kind="business"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FeaturedStartups({ items }: { items?: any[] }) {
  const startups = (items || []).filter((s) => String(s.listing_type ?? s.listingType ?? "").toLowerCase() === "startup");

  return (
    <div>
      <SectionHeader title="Featured Startups" to="/startups" actionLabel="Explore more" />
      {startups.length === 0 ? (
        <EmptyDataCard
          title="Welcome — no featured startups yet"
          text="Published startup profiles will appear here once available."
          action="Register startup"
          to="/dashboard?tab=startup"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {startups.slice(0, 4).map((s, i) => {
            const slug = s.slug || s.id;
            const place = [s.city, s.established_year ? `since ${s.established_year}` : ""].filter(Boolean).join(", ");
            return <MobileListingCard
              key={`mobile-${slug}`}
              index={i}
              to={`/startups/${encodeURIComponent(slug)}`}
              name={s.name}
              image={s.cover_url || s.logo_url}
              fallback={<div className="flex h-full w-full items-center justify-center bg-navy-50 font-serif text-[40px] text-navy-700" aria-hidden="true">{String(s.name || "?").trim().charAt(0).toUpperCase()}</div>}
              verified={Boolean(s.is_verified)}
              category={s.category?.name || s.category || "Startup"}
              place={place ? place.charAt(0).toUpperCase() + place.slice(1) : undefined}
              description={s.description || "Discover this startup on WS Hub."}
              founderName={s.owner?.full_name}
              founderId={s.owner?.id}
              shareSlug={slug}
              kind="startup"
            />;
          })}
        </div>
      )}
      {startups.length > 0 && (
        <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-2">
          {startups.slice(0, 4).map((s, i) => {
            const slug = s.slug || s.id;
            const place = [s.city, s.established_year ? `since ${s.established_year}` : ""].filter(Boolean).join(", ");
            return (
              <ListingCard
                key={slug}
                index={i}
                to={`/startups/${encodeURIComponent(slug)}`}
                name={s.name}
                image={s.cover_url || s.logo_url}
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-navy-50 font-serif text-[48px] text-navy-700" aria-hidden="true">
                    {String(s.name || "?").trim().charAt(0).toUpperCase()}
                  </div>
                }
                verified={Boolean(s.is_verified)}
                category={s.category?.name || s.category || "Startup"}
                place={place ? place.charAt(0).toUpperCase() + place.slice(1) : undefined}
                description={s.description || "Discover this startup on WS Hub."}
                founderName={s.owner?.full_name}
                founderId={s.owner?.id}
                shareSlug={slug}
                kind="startup"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
