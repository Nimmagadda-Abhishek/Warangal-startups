import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, MapPin, Rocket, Share2, UserRound } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Stars } from "./Stars";
import { Reveal } from "./Reveal";
import { BusinessMark } from "./BrandMarks";
import { EmptyDataCard } from "./EmptyDataCard";

function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm bg-verified px-1.5 py-[3px] text-[9px] font-semibold text-white shadow-sm ${className}`}
    >
      <BadgeCheck className="h-3 w-3" strokeWidth={2.4} />
      Verified
    </span>
  );
}

function Location({ name }: { name: string }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-[10.5px] text-slate-500">
      <MapPin className="h-3 w-3" strokeWidth={2} />
      {name}
    </p>
  );
}

function ShareProfileButton({ slug, name, kind }: { slug: string; name: string; kind: "business" | "startup" }) {
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
  return <button type="button" onClick={() => void share()} aria-label={`Share ${name} profile`} title="Share digital card" className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 text-navy-800 hover:bg-navy-50"><Share2 className="h-4 w-4" /></button>;
}

export function FeaturedBusinesses({ items }: { items?: any[] }) {
  const list = items?.length ? items.filter((b) => String(b.listing_type ?? b.listingType ?? "").toLowerCase() === "business").map((b) => ({
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
  })) : [];
  return (
    <div>
      <SectionHeader title="Featured Businesses" to="/businesses" actionLabel="Explore more" />
      {list.length === 0 && <EmptyDataCard title="Welcome — no featured businesses yet" text="Real published businesses will appear here once they are added." action="Add a business" to="/dashboard" />}
      {list.length > 0 && (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-2 xl:gap-3">
        {list.slice(0, 4).map((b, i) => (
          <Reveal key={b.slug || b.name} delay={i * 80} as="article" className="card group flex flex-col overflow-hidden">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              {b.image ? (
                <img
                  src={b.image}
                  alt={b.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <BusinessMark />
              )}
              {b.verified && <VerifiedBadge className="absolute bottom-1.5 right-1.5" />}
            </div>
            <div className="flex flex-1 flex-col p-2.5">
              <h3 className="text-[12.5px] font-bold leading-tight text-navy-900">{b.name}</h3>
              <p className="mt-1 text-[10.5px] text-slate-500">{b.category}</p>
              <Location name={b.location} />
              {b.founder && <p className="mt-1 flex items-center gap-1 truncate text-[10.5px] font-medium text-navy-700"><UserRound className="h-3 w-3 shrink-0" />Founder: {b.founderId ? <Link to={`/members/${encodeURIComponent(b.founderId)}`} className="truncate hover:underline">{b.founder}</Link> : b.founder}</p>}
              <div className="mt-2">
                <Stars rating={b.rating} reviews={b.reviews} />
              </div>
              <div className="mt-3 flex gap-2"><Link to={`/businesses/${b.slug}`} className="btn-navy min-w-0 flex-1 text-[11px]">View Profile</Link><ShareProfileButton slug={b.slug} name={b.name} kind="business" /></div>
            </div>
          </Reveal>
        ))}
      </div>
      )}
    </div>
  );
}

export function FeaturedStartups({ items }: { items?: any[] }) {
  const startups = (items || []).filter((startup) => String(startup.listing_type ?? startup.listingType ?? "").toLowerCase() === "startup");
  return (
    <div>
      <SectionHeader title="Featured Startups" to="/startups" actionLabel="Explore more" />
      {startups.length === 0 ? <EmptyDataCard title="Welcome — no featured startups yet" text="Published startup profiles will appear here once available." action="Register startup" to="/dashboard?tab=startup" /> : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-2 xl:gap-3">
          {startups.slice(0, 4).map((startup, index) => <Reveal key={startup.slug || startup.id} delay={index * 80} as="article" className="card group flex min-w-0 flex-col overflow-hidden">
            <Link to={`/startups/${encodeURIComponent(startup.slug || startup.id)}`} className="relative block aspect-[4/3] overflow-hidden bg-navy-50">
              {startup.cover_url || startup.logo_url ? <img src={startup.cover_url || startup.logo_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-navy-50 text-navy-500"><Rocket className="h-10 w-10" /></div>}
              {startup.is_verified && <VerifiedBadge className="absolute bottom-2 right-2" />}
            </Link>
            <div className="flex flex-1 flex-col p-3">
              <h3 className="truncate text-[13px] font-bold leading-tight text-navy-900"><Link to={`/startups/${encodeURIComponent(startup.slug || startup.id)}`} className="hover:text-navy-600">{startup.name}</Link></h3>
              <p className="mt-1 truncate text-[10.5px] text-slate-500">{startup.category?.name || startup.category || "Startup"}{startup.city ? ` · ${startup.city}` : ""}{startup.established_year ? ` · Est. ${startup.established_year}` : ""}</p>
              <p className="mt-2 line-clamp-2 min-h-9 text-[11px] leading-relaxed text-slate-600">{startup.description || "Discover this startup on WS Hub."}</p>
              {startup.owner?.full_name && <p className="mb-1 flex items-center gap-1 truncate text-[10.5px] font-medium text-navy-700"><UserRound className="h-3 w-3 shrink-0" />Founder: {startup.owner?.id ? <Link to={`/members/${encodeURIComponent(startup.owner.id)}`} className="truncate hover:underline">{startup.owner.full_name}</Link> : startup.owner.full_name}</p>}
              <div className="mt-2 flex gap-2"><Link to={`/startups/${encodeURIComponent(startup.slug || startup.id)}`} className="btn-navy min-w-0 flex-1 flex items-center justify-center gap-1.5 py-2 text-[10.5px]">View startup <ArrowRight className="h-3.5 w-3.5" /></Link><ShareProfileButton slug={startup.slug || startup.id} name={startup.name} kind="startup" /></div>
            </div>
          </Reveal>)}
        </div>
      )}
    </div>
  );
}
