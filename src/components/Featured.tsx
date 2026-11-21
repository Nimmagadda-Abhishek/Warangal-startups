import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, MapPin, Rocket } from "lucide-react";
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
  })) : [];
  return (
    <div>
      <SectionHeader title="Featured Businesses" />
      {list.length === 0 && <EmptyDataCard title="Welcome — no featured businesses yet" text="Real published businesses will appear here once they are added." action="Add a business" to="/dashboard" />}
      {list.length > 0 && (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-2.5 xl:gap-3">
        {list.map((b, i) => (
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
              <div className="mt-2">
                <Stars rating={b.rating} reviews={b.reviews} />
              </div>
              <Link to={`/businesses/${b.slug}`} className="btn-navy mt-3 w-full text-[11px]">
                View Profile
              </Link>
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
      <SectionHeader title="Featured Startups" to="/startups" />
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
              <Link to={`/startups/${encodeURIComponent(startup.slug || startup.id)}`} className="btn-navy mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-[10.5px]">View startup <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </Reveal>)}
        </div>
      )}
    </div>
  );
}
