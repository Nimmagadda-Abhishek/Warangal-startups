import { useEffect, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, Briefcase, Building2, CalendarDays, ExternalLink, Eye, Globe,
  GraduationCap, Languages, Lock, MapPin, MessageCircle, ShieldCheck, Star, Target, Users,
} from "lucide-react";
import { getFounder, relatedFounders } from "../founders";
import { getOpportunity, typeColor } from "../opportunities";
import { investors } from "../investors";
import { eventsForFounder } from "../events";
import { startupByFounder } from "../startups";
import { stories } from "../stories";
import { ProfileShell, Avatar, KV, LockedNote, SideCard, Tag, Timeline } from "../components/ProfileShell";
import { ConnectBtn, IntroBtn, ReportBtn, SaveBtn, ShareBtn, useTrackView } from "../components/ui/Actions";
import { StoryCard } from "./Stories";
import { EventCard } from "./Events";
import { FounderCard } from "./Founders";
import { connectionWith, toast, useStore } from "../store";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- */
/*  Design tokens (flat, high-contrast, 44px touch targets, visible focus)     */
/* -------------------------------------------------------------------------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

const btn =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold " +
  "transition-colors duration-200 " + focusRing;
const btnOutline = `${btn} border border-slate-300 bg-white text-navy-900 hover:border-navy-700 hover:bg-navy-50`;
const btnGold = `${btn} bg-gold-500 text-navy-900 hover:bg-gold-400`;

const panel = "rounded-xl border border-line bg-white p-5";

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-navy-50 text-navy-800",
  gold: "bg-gold-100 text-gold-800",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
} as const;

/** Compact label: one line, never wraps, min 12px for legibility. */
function Pill({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold", tones[tone])}>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function SectionTitle({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-slate-600">
        {icon && <span aria-hidden="true" className="text-navy-700">{icon}</span>}
        {children}
      </h3>
      {action}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-slate-50/70 p-4">
      <dt className="text-[12px] font-medium text-slate-600">{label}</dt>
      <dd className="mt-1 text-[16px] font-bold leading-tight text-navy-900">{value}</dd>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center text-[13.5px] text-slate-600">
      {children}
    </div>
  );
}

const inlineLink = `font-semibold text-navy-700 underline-offset-2 hover:underline ${focusRing} rounded`;

/* -------------------------------------------------------------------------- */

export default function FounderProfile() {
  const { slug = "" } = useParams();
  const f = getFounder(slug);
  const user = useStore((s) => s.user);
  const conn = useStore((s) => connectionWith(s, slug));
  useTrackView(`founder:${slug}`);
  useEffect(() => {
    if (f) document.title = `${f.name} — Founders — WS Hub`;
  }, [f]);
  if (!f) return <Navigate to="/founders" replace />;

  const backers = investors.filter((i) => i.portfolio.some((p) => p.founderSlug === f.slug));
  const openOpps = f.openRequirements.map(getOpportunity).filter(Boolean);
  const speaking = eventsForFounder(f.slug);
  const startup = startupByFounder(f.slug);
  const fStories = stories.filter((st) => st.links.founder === f.slug || st.author.founderSlug === f.slug);
  const canMessage = conn?.status === "Accepted";
  const firstName = f.name.split(" ")[0];
  const funding = f.fundingRaised ? `₹${f.fundingRaised} L` : "Bootstrapped";
  const avgRating = f.reviews.length ? f.reviews.reduce((a, r) => a + r.rating, 0) / f.reviews.length : 0;

  const message = () => {
    if (!user) return toast("Sign in to message founders", "info", "/login");
    if (!canMessage) return toast("Connect first — messaging unlocks once your request is accepted", "info");
    toast(`Conversation with ${f.name} opened`, "success", "/dashboard?tab=messages");
  };

  return (
    <ProfileShell
      cover={f.cover}
      crumbs={[{ label: "Home", to: "/" }, { label: "Founders", to: "/founders" }, { label: f.name }]}
      avatar={<Avatar initials={f.initials} color={f.color} />}
      title={f.name}
      verified={f.verified}
      subtitle={
        <>
          {f.role},{" "}
          {f.businessSlug ? (
            <Link to={`/businesses/${f.businessSlug}`} className={inlineLink}>{f.company}</Link>
          ) : f.company}
          <span className="mt-1 block text-slate-600">{f.bio}</span>
        </>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1.5"><Building2 aria-hidden="true" className="h-4 w-4" /> {f.industry}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4" /> {f.location}</span>
          <span className="inline-flex items-center gap-1.5"><Briefcase aria-hidden="true" className="h-4 w-4" /> {f.experience} yrs experience</span>
          <span className="inline-flex items-center gap-1.5"><Eye aria-hidden="true" className="h-4 w-4" /> {f.views.toLocaleString("en-IN")} profile views</span>
        </>
      }
      badges={
        <>
          {f.verified && <Pill tone="success"><BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> Verified</Pill>}
          <Pill tone="gold">{f.stage}</Pill>
          <Pill tone={f.availability === "Open to connect" ? "success" : "neutral"}>{f.availability}</Pill>
          {f.women && <Pill tone="brand">Women Founder</Pill>}
          {f.student && <Pill tone="brand">Student Founder</Pill>}
          {f.tags.map((t) => <Pill key={t}>{t}</Pill>)}
        </>
      }
      actions={
        <>
          {/* Primary → secondary → tertiary hierarchy */}
          <ConnectBtn founderSlug={f.slug} founderName={f.name} />
          <button
            type="button"
            onClick={message}
            aria-label={canMessage ? `Message ${f.name}` : `Message ${f.name} — unlocks after connecting`}
            className={canMessage ? btnGold : btnOutline}
          >
            {canMessage ? <MessageCircle aria-hidden="true" className="h-4 w-4" /> : <Lock aria-hidden="true" className="h-4 w-4" />}
            Message
          </button>
          <IntroBtn targetType="founder" targetSlug={f.slug} targetName={f.name} />
          <a href={`https://${f.social.website}`} target="_blank" rel="noopener noreferrer" className={btnOutline}>
            <Globe aria-hidden="true" className="h-4 w-4" /> Website
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <a href={`https://${f.social.linkedin}`} target="_blank" rel="noopener noreferrer" className={btnOutline}>
            LinkedIn <span className="sr-only">(opens in a new tab)</span>
          </a>
        </>
      }
      topRight={<><ShareBtn title={`${f.name} — ${f.company}`} path={`/founders/${f.slug}`} /><SaveBtn type="founder" slug={f.slug} /></>}
      tabs={[
        {
          id: "overview",
          label: "Overview",
          content: (
            <div className="space-y-8">
              {/* At-a-glance credibility facts */}
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Experience" value={`${f.experience} years`} />
                <Stat label="Funding" value={funding} />
                <Stat label="Team size" value={`${f.team.length} members`} />
                <Stat label="Mutual connections" value={f.mutual} />
              </dl>

              <section aria-labelledby="about-h">
                <SectionTitle><span id="about-h">About</span></SectionTitle>
                <p className="max-w-[72ch] text-[15px] leading-7 text-slate-700">{f.about}</p>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-line border-l-4 border-l-navy-700 bg-white p-5">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-navy-700">Mission</p>
                  <p className="mt-2 text-[14px] leading-6 text-slate-700">{f.mission}</p>
                </div>
                <div className="rounded-xl border border-line border-l-4 border-l-gold-500 bg-white p-5">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-gold-800">Vision</p>
                  <p className="mt-2 text-[14px] leading-6 text-slate-700">{f.vision}</p>
                </div>
              </div>

              <section>
                <SectionTitle>Skills</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {f.skills.map((s) => <Tag key={s} to={`/founders?skills=${encodeURIComponent(s)}`}>{s}</Tag>)}
                </div>
              </section>

              <div className="grid gap-6 sm:grid-cols-2">
                <section>
                  <SectionTitle icon={<GraduationCap className="h-4 w-4" />}>Education</SectionTitle>
                  <ul className="space-y-2">
                    {f.education.map((e) => (
                      <li key={e.degree} className="text-[14px] text-navy-900">
                        <span className="font-semibold">{e.degree}</span>
                        <span className="block text-[13px] text-slate-600">{e.school}, {e.year}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <SectionTitle icon={<Languages className="h-4 w-4" />}>Languages</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {f.languages.map((l) => <Tag key={l} to={`/founders?language=${encodeURIComponent(l)}`}>{l}</Tag>)}
                  </div>
                </section>
              </div>

              <div className={panel}>
                <SectionTitle
                  action={
                    <button
                      type="button"
                      onClick={() => document.getElementById("startup")?.scrollIntoView({ behavior: "smooth" })}
                      className={`min-h-11 cursor-pointer px-2 text-[13px] font-semibold text-navy-700 hover:underline ${focusRing} rounded`}
                    >
                      Full details ↓
                    </button>
                  }
                >
                  Startup summary
                </SectionTitle>
                <p className="text-[14px] leading-6 text-slate-700">
                  <span className="font-semibold text-navy-900">{f.company}</span> — {f.startup.description}
                </p>
                <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-slate-600">
                  <span>Revenue: <strong className="text-navy-900">{f.revenueRange}</strong></span>
                  <span>Funding: <strong className="text-navy-900">{funding}</strong></span>
                  <span>Team: <strong className="text-navy-900">{f.team.length}</strong></span>
                </p>
              </div>
            </div>
          ),
        },
        {
          id: "startup",
          label: "Startup",
          content: (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[20px] font-bold text-navy-900">{f.company}</h3>
                <span className="flex flex-wrap gap-4">
                  {startup && <Link to={`/startups/${startup.slug}`} className="view-all">Startup profile <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>}
                  {f.businessSlug && <Link to={`/businesses/${f.businessSlug}`} className="view-all">Company profile <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>}
                </span>
              </div>
              <p className="max-w-[72ch] text-[15px] leading-7 text-slate-700">{f.startup.description}</p>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Revenue" value={f.startup.revenue} />
                <Stat label="Revenue range" value={f.revenueRange} />
                <Stat label="Customers" value={f.startup.customers} />
                <Stat label="Funding" value={f.startup.funding} />
                <Stat label="Funding status" value={<>{f.fundingRaised ? `Raised ₹${f.fundingRaised} L` : "Bootstrapped"}{f.lookingFor.includes("Investment") && <span className="block text-[12px] font-semibold text-gold-800">Currently raising</span>}</>} />
                <Stat label="Team" value={`${f.team.length} members`} />
              </dl>

              <a
                href={`https://${f.startup.website.replace(/^https?:\/\//, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-11 items-center gap-2 text-[13.5px] ${inlineLink}`}
              >
                <Globe aria-hidden="true" className="h-4 w-4" /> {f.startup.website}
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>

              <div className="grid gap-6 sm:grid-cols-2">
                <section>
                  <SectionTitle>Products</SectionTitle>
                  <div className="flex flex-wrap gap-2">{f.startup.products.map((p) => <Tag key={p}>{p}</Tag>)}</div>
                </section>
                <section>
                  <SectionTitle>Services</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {f.lookingFor.includes("Customers") ? <Tag>Enterprise onboarding</Tag> : null}
                    <Tag>Consulting</Tag><Tag>Implementation</Tag><Tag>Support</Tag>
                  </div>
                </section>
              </div>

              {backers.length > 0 && (
                <section>
                  <SectionTitle icon={<ShieldCheck className="h-4 w-4" />}>Backed by</SectionTitle>
                  <div className="flex flex-wrap gap-3">
                    {backers.map((b) => (
                      <Link
                        key={b.slug}
                        to={`/investors/${b.slug}`}
                        className={`inline-flex min-h-11 items-center gap-2.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-navy-900 transition-colors duration-200 hover:border-navy-700 hover:bg-navy-50 ${focusRing}`}
                      >
                        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ background: b.color }}>{b.initials}</span>
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ),
        },
        {
          id: "experience",
          label: "Experience",
          content: (
            <ol className="relative space-y-6 border-l-2 border-slate-200 pl-6">
              {f.experienceList.map((e) => (
                <li key={e.role + e.org} className="relative">
                  <span aria-hidden="true" className="absolute -left-[37px] flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-navy-50 text-navy-700 ring-1 ring-line">
                    <Briefcase className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[15px] font-bold text-navy-900">{e.role}</p>
                  <p className="mt-0.5 text-[13px] text-slate-600">{e.org} · {e.period}</p>
                </li>
              ))}
            </ol>
          ),
        },
        { id: "achievements", label: "Achievements", subtitle: "Awards, funding, expansion, media, patents and recognition", content: <Timeline items={f.achievements} /> },
        {
          id: "team",
          label: "Team",
          content: (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {f.team.map((t) => {
                const open = t.initials === "?";
                return (
                  <li key={t.name} className={cn("flex items-center gap-3 rounded-xl border p-4", open ? "border-dashed border-gold-500 bg-gold-100/40" : "border-line bg-white")}>
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-black text-white" style={{ background: open ? "#a8741a" : f.color }}>{t.initials}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-navy-900">{t.name}</p>
                      <p className="text-[13px] text-slate-600">{t.role}</p>
                      {open && openOpps[0] && <Link to={`/opportunities/${openOpps[0]!.slug}`} className={`inline-flex min-h-8 items-center text-[12.5px] text-gold-800 ${inlineLink}`}>Apply for this role →</Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
          ),
        },
        {
          id: "events",
          label: "Events",
          subtitle: "Where you can meet this founder",
          content: speaking.length
            ? <div className="grid gap-4 md:grid-cols-2">{speaking.map((ev) => <EventCard key={ev.slug} e={ev} view="grid" />)}</div>
            : <Empty>No upcoming talks. <Link to="/events" className={inlineLink}>Browse all events →</Link></Empty>,
        },
        {
          id: "stories",
          label: "Stories",
          content: fStories.length
            ? <div className="grid gap-4 sm:grid-cols-2">{fStories.map((st) => <StoryCard key={st.slug} s={st} />)}</div>
            : <Empty>No stories yet. <Link to="/stories?submit=1" className={inlineLink}>Nominate this founder for a story →</Link></Empty>,
        },
        {
          id: "looking",
          label: "Looking For",
          content: (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {f.lookingFor.map((l) => (
                  <span key={l} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gold-100 px-3.5 text-[13px] font-semibold text-gold-800">
                    <Target aria-hidden="true" className="h-4 w-4" /> {l}
                  </span>
                ))}
              </div>
              {openOpps.length > 0 ? (
                <section>
                  <SectionTitle>Open requirements</SectionTitle>
                  <ul className="space-y-3">
                    {openOpps.map((o) => o && (
                      <li key={o.slug}>
                        <Link
                          to={`/opportunities/${o.slug}`}
                          className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 transition-colors duration-200 hover:border-navy-700 hover:bg-navy-50 ${focusRing}`}
                        >
                          <div>
                            <span className={cn("rounded-md px-2 py-0.5 text-[12px] font-semibold", typeColor[o.type])}>{o.type}</span>
                            <p className="mt-1.5 text-[14px] font-semibold text-navy-900">{o.title}</p>
                          </div>
                          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-navy-700" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : <Empty>No open requirements posted. Connect to start a conversation.</Empty>}
            </div>
          ),
        },
        {
          id: "gallery",
          label: "Gallery",
          content: (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {f.gallery.map((g) => (
                <figure key={g.image} className="group overflow-hidden rounded-xl border border-line bg-white">
                  <div className="overflow-hidden bg-slate-100">
                    <img src={g.image} alt={g.label} loading="lazy" className="aspect-[4/3] w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105" />
                  </div>
                  <figcaption className="px-3 py-2 text-[12.5px] text-slate-600">{g.label}</figcaption>
                </figure>
              ))}
            </div>
          ),
        },
        {
          id: "reviews",
          label: "Reviews",
          content: f.reviews.length ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-line bg-slate-50/70 p-4">
                <span className="text-[28px] font-extrabold leading-none text-navy-900">{avgRating.toFixed(1)}</span>
                <div>
                  <span role="img" aria-label={`${avgRating.toFixed(1)} out of 5 stars`} className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} aria-hidden="true" className={cn("h-4 w-4", i < Math.round(avgRating) ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} />)}
                  </span>
                  <p className="mt-0.5 text-[12.5px] text-slate-600">Based on {f.reviews.length} review{f.reviews.length > 1 ? "s" : ""} from collaborators</p>
                </div>
              </div>
              <ul className="space-y-3">
                {f.reviews.map((r) => (
                  <li key={r.name} className={panel}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-bold text-navy-900">{r.name}</p>
                        <p className="text-[12.5px] text-slate-600">{r.role}</p>
                      </div>
                      <span role="img" aria-label={`${r.rating} out of 5 stars`} className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => <Star key={i} aria-hidden="true" className={cn("h-4 w-4", i < r.rating ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} />)}
                      </span>
                    </div>
                    <p className="mt-3 text-[14px] leading-6 text-slate-700">{r.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : <Empty>No reviews yet. Worked with {firstName}? Be the first to leave one.</Empty>,
        },
        {
          id: "activity",
          label: "Activity",
          content: (
            <ul className="space-y-3">
              {f.activity.map((a) => (
                <li key={a.title} className="flex items-start gap-3 rounded-xl border border-line bg-white p-4">
                  <span className="mt-0.5 shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11.5px] font-semibold uppercase tracking-wide text-slate-700">{a.type}</span>
                  <div className="min-w-0 flex-1">
                    {a.to
                      ? <Link to={a.to} className={`text-[14px] text-navy-900 hover:text-navy-700 ${inlineLink}`}>{a.title}</Link>
                      : <p className="text-[14px] font-semibold text-navy-900">{a.title}</p>}
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-slate-600"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" /> {a.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          ),
        },
      ]}
      sidebar={
        <>
          {f.verified && (
            <SideCard className="border-emerald-200 bg-emerald-50/60">
              <div className="flex gap-3">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                <div>
                  <h3 className="text-[14px] font-bold text-navy-900">Verified founder</h3>
                  <p className="mt-1 text-[13px] leading-5 text-slate-700">Identity and company details have been reviewed by the WS Hub team.</p>
                </div>
              </div>
            </SideCard>
          )}
          <SideCard title="Quick Info">
            <KV rows={[["Stage", f.stage], ["Industry", f.industry], ["Experience", `${f.experience} years`], ["Funding raised", funding], ["Languages", f.languages.join(", ")], ["Mutual connections", f.mutual]]} />
          </SideCard>
          <SideCard title="Contact">
            {user ? (
              <ul className="space-y-1 text-[13.5px]">
                <li><a href={`mailto:${f.social.email}`} className={`inline-flex min-h-10 items-center break-all font-medium text-navy-700 hover:underline ${focusRing} rounded`}>{f.social.email}</a></li>
                <li>
                  <a href={`https://${f.social.linkedin}`} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-10 items-center gap-1.5 break-all font-medium text-navy-700 hover:underline ${focusRing} rounded`}>
                    {f.social.linkedin} <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
                <li className="py-2 text-slate-700">{f.social.instagram}</li>
              </ul>
            ) : <LockedNote text="Contact details are visible to members." />}
            <div className="mt-3 border-t border-line pt-3"><ReportBtn targetType="founder" targetSlug={f.slug} /></div>
          </SideCard>
          <SideCard className="bg-navy-900 text-white">
            <Users aria-hidden="true" className="h-7 w-7 text-gold-400" />
            <h3 className="mt-3 text-[16px] font-bold">Want a warm intro?</h3>
            <p className="mt-1.5 text-[13px] leading-5 text-white/85">WS Hub team or a mutual member can introduce you to {firstName}.</p>
            <div className="mt-4"><IntroBtn targetType="founder" targetSlug={f.slug} targetName={f.name} variant="gold" className="w-full" /></div>
          </SideCard>
        </>
      }
      related={{
        title: "Related Founders",
        subtitle: `More founders in ${f.industry}`,
        to: `/founders?industry=${encodeURIComponent(f.industry)}`,
        children: (
          <div className="hide-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
            {relatedFounders(f).map((r) => <div key={r.slug} className="w-[300px] shrink-0 snap-start"><FounderCard f={r} /></div>)}
          </div>
        ),
      }}
      stickyActions={<><ConnectBtn founderSlug={f.slug} founderName={f.name} /><IntroBtn targetType="founder" targetSlug={f.slug} targetName={f.name} variant="gold" /></>}
      footer={
        <section className="mt-6 border-t-4 border-gold-500 bg-navy-950 py-12 text-white">
          <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div className="max-w-[60ch]">
              <h2 className="text-[26px] font-bold leading-tight">Become a <span className="text-gold-400">Founder</span> on WS Hub</h2>
              <p className="mt-2 text-[14px] leading-6 text-white/85">Tell your story, list your requirements and get discovered by investors and partners.</p>
            </div>
            <Link to="/signup?role=founder" className={`${btnGold} min-h-12 px-6 focus-visible:ring-offset-navy-950`}>
              Create founder profile <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      }
    />
  );
}