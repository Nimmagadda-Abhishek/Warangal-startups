import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { businessApi } from "../api";
import { Shimmer } from "../components/ui/Shimmer";
import { ContactFounderBtn, FollowStartupBtn, InvestorInterestBtn, BookMeetingBtn } from "../components/ui/StartupActions";
import { IntroBtn } from "../components/ui/Actions";
import { toggleCompareStartup, useStore } from "../store";
import type { Startup } from "../startups";
import { ShareLinkButton } from "../components/ui/ShareLinkButton";

const unwrap = (value: any) => value?.data?.business ?? value?.data?.data ?? value?.data ?? value?.business ?? value;
const lines = (value?: string) => (typeof value === "string" ? value.split(",").map((part) => part.trim()).filter(Boolean) : []);
const initialsOf = (name: unknown, n = 2) =>
  String(name || "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, n)
    .join("")
    .toUpperCase();

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";
const btnPrimary = `inline-flex h-11 items-center justify-center rounded-md bg-navy-800 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-navy-700 motion-reduce:transition-none ${focusRing}`;
const btnOutline = `inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-[14px] font-semibold text-navy-800 transition-colors hover:bg-navy-50 motion-reduce:transition-none ${focusRing}`;
const chip = "rounded-md bg-slate-100 px-2.5 py-1 text-[13px] font-medium text-slate-700";
const linkCls = `rounded-sm font-semibold text-navy-700 underline decoration-navy-700/30 underline-offset-4 hover:decoration-gold-500 ${focusRing}`;

/* ---------- Small pieces, defined OUTSIDE the page so they keep their identity between renders.
   (When they lived inside the component, every state change rebuilt every section,
   which detached the elements the scroll-spy observer was watching.) ---------- */

function Glyph({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function ExtLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-[150px] rounded-xl border border-line bg-white p-5 sm:p-8">
      <div className="border-b border-line pb-4">
        <h2 id={`${id}-title`} className="font-serif text-[22px] font-medium text-navy-900">
          {title}
        </h2>
        {intro && <p className="mt-1 text-[14px] text-slate-600">{intro}</p>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Fact({ title, value }: { title: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-[13px] text-slate-600">{title}</p>
      <p className="mt-1 font-serif text-[22px] leading-tight text-navy-900">{value}</p>
    </div>
  );
}

function Avatar({ name, tone = "navy" }: { name: unknown; tone?: "navy" | "gold" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${tone === "gold" ? "bg-gold-100 text-gold-800" : "bg-navy-800 text-white"}`}
    >
      {initialsOf(name)}
    </span>
  );
}

const text = "break-words whitespace-pre-line text-[15px] leading-relaxed text-slate-700 [overflow-wrap:anywhere]";

export default function StartupListingProfile({ startupSlug }: { startupSlug?: string }) {
  const params = useParams();
  const slug = startupSlug || params.slug || "";
  const [startup, setStartup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const compareSlugs = useStore((state) => state.compareStartups);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setStartup(null);
    setError("");
    businessApi
      .get(slug)
      .then((result) => {
        const business = unwrap(result);
        if (!business?.id) throw new Error("This startup profile could not be found.");
        if (active) setStartup(business);
        businessApi.trackView(business.id).catch(() => undefined);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load this startup profile.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (startup) document.title = `${startup.name} — Startups — WS Hub`;
  }, [startup]);

  useEffect(() => {
    if (!startup) return;
    const sectionIds = ["overview", "products", "team", "traction", "funding", "gallery", "documents", "achievements", "jobs", "reviews", "events", "stories"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.2, 0.5] },
    );
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [startup]);

  if (loading)
    return (
      <main className="mx-auto max-w-[1180px] space-y-5 px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading startup profile">
        <Shimmer className="h-56 w-full rounded-xl" />
        <div className="card space-y-3 p-6">
          <Shimmer className="h-8 w-1/3" />
          <Shimmer className="h-5 w-2/3" />
          <Shimmer className="h-24 w-full" />
        </div>
        <div className="card space-y-3 p-6">
          <Shimmer className="h-6 w-1/4" />
          <Shimmer className="h-28 w-full" />
        </div>
      </main>
    );

  if (error || !startup)
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-[32px] font-medium text-navy-900">Startup profile unavailable</h1>
        <p className="mt-3 text-[15px] text-slate-600">{error || "This startup may have been unpublished or removed."}</p>
        <Link to="/startups" className={`${btnPrimary} mt-6`}>
          Back to startups
        </Link>
      </main>
    );

  const details = startup.startup_details || startup.startupDetails || {};
  const traction = details.traction || {};
  const funding = details.funding || {};
  const products = Array.isArray(startup.products) ? startup.products : [];
  const services = (Array.isArray(startup.services) ? startup.services : []).filter((item: any) => item.is_active !== false);
  const gallery = Array.isArray(startup.gallery) ? startup.gallery : [];
  const achievements = Array.isArray(details.achievements) ? details.achievements.filter(Boolean) : [];
  const team = Array.isArray(details.team) ? details.team : [];
  const documents = Array.isArray(details.documents) ? details.documents : [];
  const jobs = Array.isArray(details.jobs) ? details.jobs : [];
  const events = Array.isArray(details.events) ? details.events : [];
  const stories = Array.isArray(details.stories) ? details.stories : [];
  const fundingTimeline = Array.isArray(funding.timeline) ? funding.timeline : [];
  const investors = Array.isArray(funding.investors) ? funding.investors : [];
  const useOfFunds = Array.isArray(funding.useOfFunds) ? funding.useOfFunds : [];
  const capTable = Array.isArray(funding.capTable) ? funding.capTable : [];
  const lookingFor = Array.isArray(details.lookingFor) ? details.lookingFor : [];
  const technologies = Array.isArray(details.technologies) ? details.technologies : lines(startup.tags);
  const owner = startup.owner || {};
  const socialLinks = startup.social_links || startup.socialLinks || {};
  const location = [startup.city, startup.state, startup.country].filter(Boolean).join(", ");
  const actionStartup = {
    slug: startup.slug || startup.id,
    name: startup.name,
    stage: details.stage || "MVP",
    industry: startup.category?.name || "Startup",
    description: startup.description || "",
    founderSlug: owner.username || owner.id || startup.slug,
    followers: Number(details.followers || 0),
    funding: { status: funding.status || "Bootstrapped", seeking: funding.seeking || undefined },
  } as Startup;
  const inCompare = compareSlugs.includes(actionStartup.slug);
  const externalSocials = [
    ["LinkedIn", socialLinks.linkedin],
    ["Instagram", socialLinks.instagram],
    ["X", socialLinks.x || socialLinks.twitter],
  ].filter(([, url]) => typeof url === "string" && /^https?:\/\//i.test(url as string));
  const hasTraction = !!(traction.users || traction.customers || traction.revenue || traction.growth);
  const navTabs = (
    [
      ["overview", "Overview", true],
      ["products", "Products", products.length + services.length > 0],
      ["team", "Team", true],
      ["traction", "Traction", hasTraction],
      ["funding", "Funding", !!(funding.status || funding.amountRaised || funding.seeking)],
      ["gallery", "Gallery", gallery.length > 0],
      ["documents", "Documents", documents.length > 0],
      ["achievements", "Achievements", achievements.length > 0],
      ["jobs", "Jobs", jobs.length > 0],
      ["reviews", "Reviews", true],
      ["events", "Events", events.length > 0],
      ["stories", "Stories", stories.length > 0],
    ] as [string, string, boolean][]
  ).filter(([, , visible]) => visible);

  const description = String(startup.description || "");
  const longDescription = description.length > 240;
  const goTo = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setActiveSection(id);
  };
  const overviewCards = (
    [
      ["Problem", details.problem],
      ["Solution", details.solution],
      ["Target customers", details.targetAudience],
      ["What makes it different", details.uniqueValue],
      ["Business model", details.businessModel],
      ["Market opportunity", details.marketSize],
    ] as const
  ).filter(([, v]) => v);
  const glance = (
    [
      ["Stage", details.stage],
      ["Founded", startup.established_year],
      ["Team", startup.employee_count == null ? null : `${startup.employee_count} employees`],
      ["Location", location],
      ["Category", startup.category?.name],
    ] as const
  ).filter(([, v]) => v);
  const allSocials = Object.entries(socialLinks).filter(([, url]) => typeof url === "string" && url);
  const bars = ([["Use of funds", useOfFunds], ["Cap table summary", capTable]] as [string, any[]][]).filter(([, e]) => e.length > 0);

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* ---------------- Header ---------------- */}
      <header className="relative mb-10">
        <div className="relative h-[200px] bg-navy-950 sm:h-[260px] lg:h-[300px]">
          {startup.cover_url && <img src={startup.cover_url} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-b from-navy-950/55 via-navy-950/15 to-navy-950/75" />
          <div className="relative mx-auto max-w-[1520px] px-4 pt-6 sm:px-8">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-[14px] text-white/90">
                <li>
                  <Link to="/" className={`rounded-sm hover:underline ${focusRing} focus-visible:ring-offset-navy-950`}>Home</Link>
                </li>
                <li aria-hidden="true"><Glyph className="h-3.5 w-3.5 -rotate-90 text-white/60"><path d="m5.5 7.8 4.5 4.4 4.5-4.4" /></Glyph></li>
                <li>
                  <Link to="/startups" className={`rounded-sm hover:underline ${focusRing} focus-visible:ring-offset-navy-950`}>Startups</Link>
                </li>
                <li aria-hidden="true"><Glyph className="h-3.5 w-3.5 -rotate-90 text-white/60"><path d="m5.5 7.8 4.5 4.4 4.5-4.4" /></Glyph></li>
                <li aria-current="page" className="font-semibold text-white">{startup.name}</li>
              </ol>
            </nav>
          </div>
        </div>

        <div className="relative z-10 mx-auto -mt-14 max-w-[1520px] px-4 sm:-mt-16 sm:px-8">
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-4 rounded-xl border border-line bg-white p-4 shadow-[0_18px_40px_-24px_rgba(10,28,63,0.4)] sm:grid-cols-[112px_minmax(0,1fr)_320px] sm:gap-6 sm:p-6">
            <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-line bg-navy-50 font-serif text-[26px] text-navy-800 sm:h-[112px] sm:w-[112px] sm:text-[34px]">
              {startup.logo_url ? <img src={startup.logo_url} alt={`${startup.name} logo`} className="h-full w-full object-cover" /> : initialsOf(startup.name)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="break-words font-serif text-[28px] font-medium leading-tight tracking-[-0.01em] text-navy-950 sm:text-[38px]">{startup.name}</h1>
                {startup.is_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-navy-800 px-3 py-1.5 text-[13px] font-semibold leading-none text-white">
                    <Glyph className="h-3.5 w-3.5 text-gold-400"><path d="m4.8 10.4 3.4 3.4 7-7.6" /></Glyph>
                    Verified
                  </span>
                )}
                <ShareLinkButton slug={startup.slug || startup.id} name={startup.name} className="ml-auto sm:ml-0" />
              </div>

              <div className="mt-3 max-w-3xl min-w-0">
                <p className={`text-[16px] leading-relaxed text-slate-700 [overflow-wrap:anywhere] ${longDescription && !descriptionExpanded ? "line-clamp-3" : "whitespace-pre-line"}`}>
                  {description || "Startup profile"}
                </p>
                {longDescription && (
                  <button type="button" aria-expanded={descriptionExpanded} onClick={() => setDescriptionExpanded((v) => !v)} className={`mt-1 min-h-[36px] rounded-sm text-[14px] font-semibold text-navy-700 hover:underline ${focusRing}`}>
                    {descriptionExpanded ? "Show less" : "Read full description"}
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px] text-slate-600">
                <span className="font-medium text-slate-700">{startup.category?.name || "Startup"}</span>
                {location && <span>{location}{startup.established_year && `, since ${startup.established_year}`}</span>}
                {startup.website && (
                  <ExtLink href={startup.website} className={linkCls}>
                    {startup.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </ExtLink>
                )}
                {owner.id && owner.full_name && (
                  <span>
                    Founder{" "}
                    <Link to={`/members/${owner.id}`} className={linkCls}>{owner.full_name}</Link>
                  </span>
                )}
                {externalSocials.map(([label, url]) => (
                  <ExtLink key={String(label)} href={String(url)} className={`rounded-sm hover:text-navy-900 hover:underline ${focusRing}`}>
                    {label}
                  </ExtLink>
                ))}
                {typeof startup.views === "number" && <span>{startup.views.toLocaleString("en-IN")} views</span>}
              </div>

              {(details.stage || lines(details.businessModel).length > 0 || (funding.status === "Raising" && funding.seeking)) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {details.stage && <span className="rounded-md bg-gold-100 px-2.5 py-1 text-[13px] font-semibold text-gold-800">{details.stage}</span>}
                  {lines(details.businessModel).map((item) => <span key={item} className={chip}>{item}</span>)}
                  {funding.status === "Raising" && funding.seeking && (
                    <span className="rounded-md bg-navy-800 px-2.5 py-1 text-[13px] font-semibold text-white">Raising {funding.seeking}</span>
                  )}
                </div>
              )}
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1">
              {startup.isOwner && (
                <Link to={`/businesses/${startup.id}/edit`} className={`${btnPrimary} col-span-2`}>Edit startup profile</Link>
              )}
              <ContactFounderBtn s={actionStartup} />
              <InvestorInterestBtn s={actionStartup} />
              <IntroBtn targetType="founder" targetSlug={actionStartup.founderSlug} targetName={owner.full_name || startup.name} />
              <BookMeetingBtn s={actionStartup} />
              <FollowStartupBtn s={actionStartup} />
              <button
                type="button"
                aria-pressed={inCompare}
                onClick={() => toggleCompareStartup(actionStartup.slug)}
                className={`inline-flex h-11 items-center justify-center rounded-md border px-4 text-[14px] font-semibold transition-colors motion-reduce:transition-none ${focusRing} ${inCompare ? "border-navy-800 bg-navy-800 text-white" : "border-slate-300 bg-white text-navy-800 hover:bg-navy-50"}`}
              >
                {inCompare ? "In compare" : "Compare"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- Section navigation ---------------- */}
      <div className="sticky top-16 z-30 mb-6 border-y border-line bg-white/95 backdrop-blur lg:top-[68px]">
        <nav aria-label="Startup sections" className="mx-auto flex max-w-[1520px] gap-1 overflow-x-auto px-4 sm:px-8">
          {navTabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={activeSection === id ? "location" : undefined}
              onClick={() => goTo(id)}
              className={`group relative h-12 shrink-0 px-3.5 text-[14px] transition-colors motion-reduce:transition-none ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0 ${activeSection === id ? "font-semibold text-navy-900" : "font-medium text-slate-600 hover:text-navy-900"}`}
            >
              {label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-3 bottom-0 h-[3px] origin-center rounded-t-full bg-gold-500 transition-transform duration-300 motion-reduce:transition-none ${activeSection === id ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
              />
            </button>
          ))}
        </nav>
      </div>

      {/* ---------------- Body ---------------- */}
      <div className="mx-auto grid max-w-[1520px] items-start gap-6 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Section id="overview" title="Startup overview">
            {(startup.mission || startup.vision) && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                {startup.mission && (
                  <div className="rounded-lg border border-navy-100 bg-navy-50/60 p-5">
                    <h3 className="text-[14px] font-semibold text-navy-800">Mission</h3>
                    <p className={`mt-2 ${text}`}>{startup.mission}</p>
                  </div>
                )}
                {startup.vision && (
                  <div className="rounded-lg border border-gold-200 bg-gold-50 p-5">
                    <h3 className="text-[14px] font-semibold text-gold-800">Vision</h3>
                    <p className={`mt-2 ${text}`}>{startup.vision}</p>
                  </div>
                )}
              </div>
            )}
            {overviewCards.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {overviewCards.map(([label, value]) => (
                  <article key={label} className="rounded-lg border border-line p-5">
                    <h3 className="text-[14px] font-semibold text-navy-900">{label}</h3>
                    <p className={`mt-2 ${text}`}>{value}</p>
                  </article>
                ))}
              </div>
            )}
            {technologies.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-[14px] font-semibold text-navy-900">Technologies and focus areas</h3>
                <ul className="flex flex-wrap gap-2">
                  {technologies.map((item: string) => <li key={item} className="rounded-full bg-navy-50 px-3 py-1.5 text-[13px] font-medium text-navy-800">{item}</li>)}
                </ul>
              </div>
            )}
            {!startup.mission && !startup.vision && overviewCards.length === 0 && (
              <p className={text}>{startup.description || "More startup details will be added soon."}</p>
            )}
          </Section>

          {(products.length > 0 || services.length > 0) && (
            <Section id="products" title="Products and services">
              <div className="space-y-8">
                {products.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-[16px] font-semibold text-navy-900">Products</h3>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {products.map((product: any, index: number) => (
                        <article key={`${product.name}-${index}`} className="flex flex-col overflow-hidden rounded-lg border border-line">
                          {product.image && <img src={product.image} alt={product.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />}
                          <div className="flex flex-1 flex-col p-4">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-[16px] font-semibold text-navy-950">{product.name}</h4>
                              {product.price && <span className="shrink-0 rounded-md bg-gold-100 px-2 py-1 text-[13px] font-semibold text-gold-800">{product.price}</span>}
                            </div>
                            {product.description && <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{product.description}</p>}
                            {product.url && <ExtLink href={product.url} className={`${btnOutline} mt-4 h-10 self-start`}>View demo</ExtLink>}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                {services.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-[16px] font-semibold text-navy-900">Services</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {services.map((service: any) => (
                        <article key={service.id || service.name} className="rounded-lg border border-line p-5">
                          <h4 className="text-[16px] font-semibold text-navy-900">{service.name}</h4>
                          {service.description && <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{service.description}</p>}
                          {service.price != null && <p className="mt-3 text-[14px] font-semibold text-gold-800">{service.currency || "INR"} {service.price}</p>}
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section id="team" title="Team">
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line p-5">
              <Avatar name={owner.full_name || "Founder"} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-slate-600">Founder</p>
                <p className="text-[16px] font-semibold text-navy-900">{owner.full_name || "Founder details not provided"}</p>
                {owner.bio && <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{owner.bio}</p>}
              </div>
              {owner.id && <Link to={`/members/${owner.id}`} className={`${linkCls} text-[14px]`}>View profile</Link>}
            </div>
            <p className="mt-3 text-[14px] text-slate-600">{startup.employee_count == null ? "Team size not provided" : `${startup.employee_count} people`}</p>
            {team.length > 0 && (
              <>
                <h3 className="mb-3 mt-6 text-[16px] font-semibold text-navy-900">Core team</h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {team.map((member: any, index: number) => (
                    <article key={member.id || `${member.name}-${index}`} className="flex items-center gap-3 rounded-lg border border-line p-4">
                      <Avatar name={member.initials || member.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-navy-900">{member.name}</p>
                        <p className="truncate text-[13px] text-slate-600">{member.role || member.title}</p>
                      </div>
                      {member.linkedin && <ExtLink href={member.linkedin} className={`${linkCls} text-[13px]`}>LinkedIn</ExtLink>}
                    </article>
                  ))}
                </div>
              </>
            )}
          </Section>

          {hasTraction && (
            <Section id="traction" title="Traction">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([["Users", traction.users], ["Customers", traction.customers], ["Revenue", traction.revenue], ["Growth", traction.growth]] as const)
                  .filter(([, v]) => v)
                  .map(([label, value]) => <Fact key={label} title={label} value={value} />)}
              </div>
            </Section>
          )}

          {(funding.status || funding.amountRaised || funding.seeking || fundingTimeline.length > 0 || investors.length > 0 || useOfFunds.length > 0 || capTable.length > 0) && (
            <Section id="funding" title="Funding">
              <div className="grid gap-3 sm:grid-cols-3">
                <Fact title="Funding status" value={funding.status} />
                <Fact title="Amount raised" value={funding.amountRaised} />
                <Fact title="Seeking investment" value={funding.seeking} />
              </div>

              {funding.seeking && (
                <div className="mt-6 rounded-lg border border-gold-200 bg-gold-50 p-5">
                  <h3 className="text-[16px] font-semibold text-navy-950">Interested in investing?</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-slate-700">Express interest and the founder sees your profile. Book a meeting to move to due diligence.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <InvestorInterestBtn s={actionStartup} />
                    <BookMeetingBtn s={actionStartup} />
                  </div>
                </div>
              )}

              {bars.length > 0 && (
                <div className="mt-8 grid gap-8 md:grid-cols-2">
                  {bars.map(([title, entries]) => (
                    <div key={title}>
                      <h3 className="mb-3 text-[16px] font-semibold text-navy-900">{title}</h3>
                      <ul className="space-y-3.5">
                        {entries.map((entry: any, index: number) => {
                          const pct = entry.percent ?? entry.value;
                          return (
                            <li key={entry.name || entry.label || index}>
                              <div className="mb-1.5 flex justify-between gap-3 text-[14px]">
                                <span className="text-slate-700">{entry.name || entry.label}</span>
                                <strong className="text-navy-900">{pct}%</strong>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                                <div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.min(100, Number(pct) || 0)}%` }} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {investors.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-3 text-[16px] font-semibold text-navy-900">Investors</h3>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {investors.map((investor: any, index: number) => (
                      <div key={investor.id || `${investor.name}-${index}`} className="flex items-center gap-3 rounded-lg border border-line p-4">
                        <Avatar name={investor.initials || investor.name} tone="gold" />
                        <p className="text-[15px] font-semibold text-navy-900">
                          {investor.name}
                          {investor.type && <span className="block text-[13px] font-normal text-slate-600">{investor.type}</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fundingTimeline.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-4 text-[16px] font-semibold text-navy-900">Funding timeline</h3>
                  <ol className="space-y-5 border-l border-slate-300 pl-6">
                    {fundingTimeline.map((item: any, index: number) => (
                      <li key={item.id || index} className="relative">
                        <span aria-hidden="true" className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-gold-500 ring-4 ring-white" />
                        <p className="text-[14px] font-semibold text-gold-800">
                          {item.date || item.year}
                          <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[13px] font-medium text-slate-700">{item.type || "Funding"}</span>
                        </p>
                        <p className="mt-1 text-[16px] font-semibold text-navy-950">{item.title || item.amount}</p>
                        {item.description && <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{item.description}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </Section>
          )}

          {gallery.length > 0 && (
            <Section id="gallery" title="Gallery">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((item: any, index: number) => {
                  const image = typeof item === "string" ? item : item.image;
                  return image ? (
                    <figure key={`${image}-${index}`} className="overflow-hidden rounded-lg border border-line">
                      <img src={image} alt={item.label || startup.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                      {item.label && <figcaption className="px-3 py-2 text-[13px] text-slate-600">{item.label}</figcaption>}
                    </figure>
                  ) : null;
                })}
              </div>
            </Section>
          )}

          {achievements.length > 0 && (
            <Section id="achievements" title="Milestones and achievements">
              <ul className="space-y-3">
                {achievements.map((achievement: string, index: number) => (
                  <li key={`${achievement}-${index}`} className="border-l-2 border-gold-500 bg-slate-50 py-3 pl-4 pr-3 text-[15px] leading-relaxed text-slate-700">
                    {achievement}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {documents.length > 0 && (
            <Section id="documents" title="Documents" intro="Preview documents. Restricted files may need founder approval.">
              <ul className="space-y-2">
                {documents.map((document: any, index: number) => (
                  <li key={document.id || `${document.title}-${index}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-navy-900">{document.title || document.name}</p>
                      <p className="text-[13px] text-slate-600">{[document.type, document.size, document.restricted && "Restricted"].filter(Boolean).join(", ")}</p>
                    </div>
                    {document.url && <ExtLink href={document.url} className={`${btnOutline} h-10`}>Preview</ExtLink>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {jobs.length > 0 && (
            <Section id="jobs" title="Jobs" intro={`${jobs.length} open ${jobs.length === 1 ? "role" : "roles"}`}>
              <ul className="space-y-2">
                {jobs.map((job: any, index: number) => (
                  <li key={job.id || `${job.title}-${index}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[16px] font-semibold text-navy-900">{job.title || job.name}</h3>
                      <p className="text-[14px] text-slate-600">{[job.type, job.location, job.category].filter(Boolean).join(", ")}</p>
                    </div>
                    {job.url && <ExtLink href={job.url} className={`${btnPrimary} h-10`}>View and apply</ExtLink>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {events.length > 0 && (
            <Section id="events" title="Events">
              <div className="grid gap-4 md:grid-cols-2">
                {events.map((event: any, index: number) => (
                  <article key={event.id || `${event.title}-${index}`} className="overflow-hidden rounded-lg border border-line">
                    {event.image && <img src={event.image} alt="" className="aspect-[16/8] w-full object-cover" loading="lazy" />}
                    <div className="p-4">
                      <p className="text-[13px] font-semibold text-navy-700">{event.type || "Event"}</p>
                      <h3 className="mt-1 text-[16px] font-semibold text-navy-950">{event.title || event.name}</h3>
                      <p className="mt-1 text-[14px] text-slate-600">{[event.date, event.location].filter(Boolean).join(", ")}</p>
                      {event.description && <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{event.description}</p>}
                      {event.url && <ExtLink href={event.url} className={`${btnPrimary} mt-4 h-10`}>Register</ExtLink>}
                    </div>
                  </article>
                ))}
              </div>
            </Section>
          )}

          {stories.length > 0 && (
            <Section id="stories" title="Stories" intro="Published articles, founder stories and media.">
              <div className="grid gap-4 md:grid-cols-2">
                {stories.map((story: any, index: number) => (
                  <article key={story.id || `${story.title}-${index}`} className="overflow-hidden rounded-lg border border-line">
                    {story.image && <img src={story.image} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />}
                    <div className="p-4">
                      <span className="rounded-md bg-gold-100 px-2 py-1 text-[13px] font-semibold text-gold-800">{story.category || "Story"}</span>
                      <h3 className="mt-3 font-serif text-[18px] font-medium leading-snug text-navy-950">{story.title}</h3>
                      <p className="mt-2 text-[14px] text-slate-600">{[story.author, story.date, story.readTime].filter(Boolean).join(", ")}</p>
                      {story.url && <ExtLink href={story.url} className={`${btnOutline} mt-4 h-10`}>Read</ExtLink>}
                    </div>
                  </article>
                ))}
              </div>
            </Section>
          )}

          <Section id="reviews" title="Reviews">
            <div className="space-y-3">
              {(startup.recentReviews || []).length ? (
                startup.recentReviews.map((review: any) => {
                  const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
                  return (
                    <article key={review.id} className="rounded-lg border border-line p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-[15px] font-semibold text-navy-900">{review.reviewer?.full_name || "WS Hub member"}</h3>
                        <span className="text-[14px] font-semibold text-gold-800">Rated {rating} out of 5</span>
                      </div>
                      {review.comment && <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{review.comment}</p>}
                    </article>
                  );
                })
              ) : (
                <p className="text-[15px] text-slate-600">No reviews have been added yet.</p>
              )}
              <Link to={`/businesses/${startup.slug || startup.id}`} className={`${linkCls} inline-block pt-1 text-[14px]`}>View or write a review</Link>
            </div>
          </Section>
        </div>

        {/* ---------------- Sidebar ---------------- */}
        <aside className="space-y-4 lg:sticky lg:top-[148px] lg:self-start">
          <section className="rounded-xl border border-line bg-white p-5" aria-labelledby="glance-title">
            <h2 id="glance-title" className="font-serif text-[19px] font-medium text-navy-900">At a glance</h2>
            <dl className="mt-3 divide-y divide-line">
              {glance.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-3 text-[14px]">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="text-right font-semibold text-navy-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="contact" aria-labelledby="contact-title" className="scroll-mt-28 rounded-xl bg-navy-900 p-5 text-white">
            <h2 id="contact-title" className="font-serif text-[20px] font-medium">Contact {startup.name}</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-white/80">Get in touch with the startup team.</p>
            <div className="mt-4 space-y-3 text-[15px]">
              {startup.email && <a className="block break-all text-gold-300 underline underline-offset-4 hover:text-gold-200" href={`mailto:${startup.email}`}>{startup.email}</a>}
              {startup.phone && <a className="block text-gold-300 underline underline-offset-4 hover:text-gold-200" href={`tel:${startup.phone}`}>{startup.phone}</a>}
              {startup.address && <p className="text-white/90">{startup.address}{location ? `, ${location}` : ""}</p>}
              {startup.map_url && <ExtLink href={startup.map_url} className="inline-block text-gold-300 underline underline-offset-4 hover:text-gold-200">Open map</ExtLink>}
              {!startup.email && !startup.phone && !startup.address && <p className="text-white/80">Contact information has not been added yet.</p>}
            </div>
            {allSocials.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2 border-t border-white/15 pt-4">
                {allSocials.map(([platform, url]) => (
                  <li key={platform}>
                    <ExtLink href={String(url)} className="inline-flex h-10 items-center rounded-md border border-white/30 px-3 text-[14px] capitalize hover:bg-white/10">{platform}</ExtLink>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {lookingFor.length > 0 && (
            <section className="rounded-xl border border-line bg-white p-5" aria-labelledby="looking-title">
              <h2 id="looking-title" className="font-serif text-[19px] font-medium text-navy-900">Looking for</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {lookingFor.map((item: string) => <li key={item} className="rounded-md bg-slate-100 px-3 py-2 text-[14px] font-medium text-navy-800">{item}</li>)}
              </ul>
            </section>
          )}

          {(location || startup.map_url) && (
            <section className="rounded-xl border border-line bg-white p-5" aria-labelledby="location-title">
              <h2 id="location-title" className="font-serif text-[19px] font-medium text-navy-900">Location</h2>
              {startup.map_url && (
                <div className="mt-3 overflow-hidden rounded-lg border border-line">
                  <iframe
                    title={`${startup.name} map`}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(location || startup.address || startup.name)}&output=embed`}
                    className="h-48 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
              <p className="mt-3 text-[14px] text-slate-600">{startup.address ? `${startup.address}, ` : ""}{location}</p>
            </section>
          )}

          {funding.seeking && (
            <section className="rounded-xl border-l-4 border-gold-500 border-y border-r border-y-line border-r-line bg-white p-5" aria-labelledby="raising-title">
              <h2 id="raising-title" className="font-serif text-[20px] font-medium text-navy-950">Raising {funding.seeking}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">Sign in to contact the founder. Details stay private.</p>
              <div className="mt-4 grid gap-2">
                <InvestorInterestBtn s={actionStartup} />
                <IntroBtn targetType="founder" targetSlug={actionStartup.founderSlug} targetName={owner.full_name || startup.name} />
              </div>
            </section>
          )}

          {startup.is_verified && (
            <p className="rounded-xl bg-navy-50 px-4 py-3 text-[14px] font-medium text-navy-800">Verified by WS Hub. Documents checked.</p>
          )}

          <Link to={`/businesses/${startup.slug || startup.id}`} className={`${btnOutline} w-full`}>Open full business profile</Link>
        </aside>
      </div>
    </main>
  );
}