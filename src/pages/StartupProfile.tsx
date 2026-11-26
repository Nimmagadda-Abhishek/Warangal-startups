import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Briefcase, Building2, CalendarDays, CheckCircle2, ExternalLink, Eye, Globe, Landmark, Lightbulb, MapPin, ShieldCheck, Star, Target, TrendingUp } from "lucide-react";
import { fmtFunding, fmtStartupDate, getStartup, relatedStartups } from "../startups";
import { getFounder } from "../founders";
import { getInvestor } from "../investors";
import { getOpportunity, typeColor } from "../opportunities";
import { events, isPast } from "../events";
import { stories } from "../stories";
import { ProfileShell, Avatar, KV, SideCard, Tag, Timeline } from "../components/ProfileShell";
import { IntroBtn, ReportBtn, SaveBtn, useTrackView } from "../components/ui/Actions";
import { BookMeetingBtn, ContactFounderBtn, DocRow, FollowStartupBtn, InvestorInterestBtn, StartupShareBtn } from "../components/ui/StartupActions";
import { StartupCard } from "./Startups";
import { EventCard } from "./Events";
import { StoryCard } from "./Stories";
import { toggleCompareStartup, useStore } from "../store";
import { cn } from "../utils/cn";
import StartupListingProfile from "./StartupListingProfile";

/* -------------------------------------------------------------------------- */
/*  Design tokens — flat, high contrast, 44px targets, visible focus           */
/* -------------------------------------------------------------------------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

const btn =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-colors duration-200 " + focusRing;
const btnOutline = `${btn} border border-slate-300 bg-white text-navy-900 hover:border-navy-700 hover:bg-navy-50`;
const btnNavy = `${btn} bg-navy-800 text-white hover:bg-navy-700`;
const btnGold = `${btn} bg-gold-500 text-navy-900 hover:bg-gold-400`;

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-navy-50 text-navy-800",
  gold: "bg-gold-100 text-gold-800",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
} as const;

function Pill({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold", tones[tone])}>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function SectionTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-slate-600">
      {icon && <span aria-hidden="true" className="text-navy-700">{icon}</span>}
      {children}
    </h3>
  );
}

function Stat({ label, value, tone = "light" }: { label: string; value: ReactNode; tone?: "light" | "dark" | "success" }) {
  return (
    <div className={cn("rounded-xl p-4", tone === "dark" ? "bg-navy-900 text-white" : tone === "success" ? "border border-emerald-200 bg-emerald-50" : "border border-line bg-slate-50/70")}>
      <dt className={cn("text-[12px] font-medium", tone === "dark" ? "text-white/80" : "text-slate-600")}>{label}</dt>
      <dd className={cn("mt-1 text-[16px] font-bold leading-tight", tone === "dark" ? "text-gold-400" : "text-navy-900")}>{value}</dd>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center text-[13.5px] text-slate-600">{children}</div>;
}

const inlineLink = `rounded font-semibold text-navy-700 underline-offset-2 hover:underline ${focusRing}`;

/* ---------- Charts (values always visible, not hover-only) ---------- */
function Bars({ data }: { data: number[] }) {
  const max = Math.max(...data, 0.1);
  return (
    <div className="flex h-44 items-end gap-1.5 rounded-xl border border-line bg-slate-50/70 p-3 pt-6" role="img" aria-label={`Monthly metrics trend: ${data.join(", ")}`}>
      {data.map((v, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span aria-hidden="true" className="text-[11px] font-semibold leading-none text-slate-700">{v}</span>
          <div aria-hidden="true" className="w-full rounded-t bg-navy-700 motion-safe:transition-colors hover:bg-gold-500" style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

function Donut({ items, label }: { items: { label: string; pct: number }[]; label: string }) {
  const colors = ["#0f2a5c", "#e2b04a", "#14a37f", "#7c3aed", "#94a3b8"];
  let acc = 0;
  const stops = items.map((it, i) => { const s = acc; acc += it.pct; return `${colors[i % colors.length]} ${s}% ${acc}%`; }).join(", ");
  return (
    <div className="flex items-center gap-5">
      <div role="img" aria-label={`${label}: ${items.map((it) => `${it.label} ${it.pct}%`).join(", ")}`} className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="absolute inset-3 rounded-full bg-white" />
      </div>
      <ul className="space-y-2 text-[13.5px]">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ background: colors[i % colors.length] }} />
            <span className="text-slate-700">{it.label}</span>
            <span className="font-bold text-navy-900">{it.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StarRow({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => <Star key={i} aria-hidden="true" className={cn(size, i < value ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} />)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

export default function StartupProfile() {
  const { slug = "" } = useParams();
  const s = getStartup(slug);
  const user = useStore((x) => x.user);
  const inCompare = useStore((x) => x.compareStartups.includes(slug));
  useTrackView(`startup:${slug}`);
  useEffect(() => { if (s) document.title = `${s.name} — Startups — WS Hub`; }, [s]);
  if (!s) return <StartupListingProfile startupSlug={slug} />;

  const founder = getFounder(s.founderSlug);
  const investors = s.funding.investorSlugs.map(getInvestor).filter(Boolean);
  const upcoming = events.filter((e) => !isPast(e) && e.speakers.some((sp) => sp.founderSlug === s.founderSlug));
  const past = events.filter((e) => isPast(e) && e.speakers.some((sp) => sp.founderSlug === s.founderSlug));
  const sStories = stories.filter((st) => st.links.founder === s.founderSlug || st.links.business === s.businessSlug || st.author.founderSlug === s.founderSlug);
  const rating = s.reviews.length ? s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length : 0;

  return (
    <ProfileShell
      cover={s.cover}
      crumbs={[{ label: "Home", to: "/" }, { label: "Startups", to: "/startups" }, { label: s.name }]}
      avatar={<span aria-hidden="true" className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-[22px] font-black shadow-md ring-4 ring-white sm:h-28 sm:w-28 sm:text-[26px]" style={{ background: s.logo.bg, color: s.logo.fg }}>{s.logo.initials}</span>}
      title={s.name}
      verified={s.verified}
      subtitle={<>{s.tagline}<span className="mt-1 block text-slate-600">{s.description}</span></>}
      meta={<>
        <span className="inline-flex items-center gap-1.5"><Building2 aria-hidden="true" className="h-4 w-4" /> {s.industry}</span>
        <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4" /> {s.location} · Est. {s.founded}</span>
        <a href={`https://${s.website}`} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 ${inlineLink}`}><Globe aria-hidden="true" className="h-4 w-4" /> {s.website}<span className="sr-only"> (opens in a new tab)</span></a>
        <a href={`https://${s.social.linkedin}`} target="_blank" rel="noopener noreferrer" className={`${inlineLink} text-slate-700`}>LinkedIn<span className="sr-only"> (opens in a new tab)</span></a>
        <span>{s.social.twitter}</span><span>{s.social.instagram}</span>
        <span className="inline-flex items-center gap-1.5"><Eye aria-hidden="true" className="h-4 w-4" /> {s.views.toLocaleString("en-IN")} profile views</span>
      </>}
      badges={<>
        {s.verified && <Pill tone="success"><BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> Verified</Pill>}
        <Pill tone="gold">{s.stage}</Pill>
        <Pill tone={s.funding.status === "Raising" ? "success" : "neutral"}>{s.funding.status === "Raising" ? `Raising ${s.funding.seeking}` : s.funding.status}</Pill>
        {s.womenFounded && <Pill tone="brand">Women-founded</Pill>}
        {s.businessModel.map((m) => <Pill key={m}>{m}</Pill>)}
      </>}
      actions={<>
        <ContactFounderBtn s={s} />
        <InvestorInterestBtn s={s} />
        <BookMeetingBtn s={s} />
        <IntroBtn targetType="founder" targetSlug={s.founderSlug} targetName={founder?.name ?? s.name} />
        <FollowStartupBtn s={s} />
        <button type="button" aria-pressed={inCompare} onClick={() => toggleCompareStartup(s.slug)} className={cn(btn, "border", inCompare ? "border-gold-500 bg-gold-100 text-gold-800" : "border-slate-300 bg-white text-navy-900 hover:border-navy-700 hover:bg-navy-50")}>{inCompare ? "In compare" : "Compare"}</button>
      </>}
      topRight={<><StartupShareBtn s={s} /><SaveBtn type="startup" slug={s.slug} /></>}
      stickyActions={<><ContactFounderBtn s={s} /><InvestorInterestBtn s={s} /></>}
      tabs={[
        { id: "overview", label: "Overview", content: (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Stage" value={s.stage} />
              <Stat label="Funding raised" value={fmtFunding(s.fundingRaised)} />
              <Stat label="Revenue" value={s.traction.revenue} />
              <Stat label="Team size" value={`${s.teamSize} people`} />
            </dl>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line border-l-4 border-l-navy-700 bg-white p-5">
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-navy-700"><Target aria-hidden="true" className="h-4 w-4" /> Mission</p>
                <p className="mt-2 text-[14px] leading-6 text-slate-700">{s.overview.mission}</p>
              </div>
              <div className="rounded-xl border border-line border-l-4 border-l-gold-500 bg-white p-5">
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gold-800"><Eye aria-hidden="true" className="h-4 w-4" /> Vision</p>
                <p className="mt-2 text-[14px] leading-6 text-slate-700">{s.overview.vision}</p>
              </div>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[["Problem", s.overview.problem], ["Solution", s.overview.solution], ["Target audience", s.overview.audience], ["USP", s.overview.usp], ["Business model", s.overview.model], ["Market size", s.overview.market]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-white p-5">
                  <dt className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-slate-600"><Lightbulb aria-hidden="true" className="h-3.5 w-3.5 text-gold-500" /> {k}</dt>
                  <dd className="mt-2 text-[14px] leading-6 text-slate-700">{v}</dd>
                </div>
              ))}
            </dl>
            <section>
              <SectionTitle>Technologies</SectionTitle>
              <div className="flex flex-wrap gap-2">{s.technologies.map((t) => <Tag key={t} to={`/startups?tech=${encodeURIComponent(t)}`}>{t}</Tag>)}</div>
            </section>
          </div>
        ) },
        { id: "products", label: "Products", content: (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {s.products.map((p) => (
              <li key={p.name}>
                <article className="card group flex h-full flex-col overflow-hidden">
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100"><img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105" /></div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-bold text-navy-900">{p.name}</h3>
                      <Pill tone="gold">{p.price}</Pill>
                    </div>
                    <p className="mt-2 flex-1 text-[13.5px] leading-6 text-slate-700">{p.description}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {p.demo ? <BookMeetingBtn s={s} kind="Demo" size="sm" /> : <ContactFounderBtn s={s} size="sm" className="!bg-white !text-navy-800 border border-slate-300" />}
                      <a href={`https://${s.website}`} target="_blank" rel="noopener noreferrer" className={cn(btnNavy, "min-h-10 px-3 text-[12.5px]")}>Demo <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /><span className="sr-only">(opens in a new tab)</span></a>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) },
        { id: "team", label: "Team", subtitle: `${s.teamSize} people`, content: (
          <div className="space-y-6">
            {founder && (
              <Link to={`/founders/${founder.slug}`} className={`flex items-center gap-4 rounded-xl border border-gold-300 bg-gold-100/40 p-5 transition-colors duration-200 hover:bg-gold-100 ${focusRing}`}>
                <Avatar initials={founder.initials} color={founder.color} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-gold-800">Founder</p>
                  <p className="text-[17px] font-bold text-navy-900">{founder.name}</p>
                  <p className="text-[13px] text-slate-700">{founder.role} · {founder.experience} yrs experience · {founder.education[0]?.school}</p>
                  <p className="mt-1.5 text-[14px] leading-6 text-slate-700">{founder.bio}</p>
                </div>
                <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-navy-700" />
              </Link>
            )}
            {s.coFounders.length > 0 && (
              <section>
                <SectionTitle>Co-founders</SectionTitle>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {s.coFounders.map((c) => (
                    <li key={c.name} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
                      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[13px] font-black text-white">{c.initials}</span>
                      <div className="min-w-0 flex-1"><p className="text-[14px] font-bold text-navy-900">{c.name}</p><p className="text-[13px] text-slate-600">{c.role} · {c.experience}</p></div>
                      <a href={`https://${c.linkedin}`} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-10 items-center text-[13px] ${inlineLink}`}>LinkedIn<span className="sr-only"> for {c.name} (opens in a new tab)</span></a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <SectionTitle>Core team</SectionTitle>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {s.core.map((c) => {
                  const open = c.initials === "?";
                  return (
                    <li key={c.name} className={cn("flex items-center gap-3 rounded-xl border p-4", open ? "border-dashed border-gold-500 bg-gold-100/40" : "border-line bg-white")}>
                      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white" style={{ background: open ? "#a8741a" : "#163a78" }}>{c.initials}</span>
                      <div><p className="text-[14px] font-bold text-navy-900">{c.name}</p><p className="text-[13px] text-slate-600">{c.role}</p></div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        ) },
        { id: "traction", label: "Traction", content: (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Users", s.traction.users], ["Customers", s.traction.customers], ["Revenue", s.traction.revenue], ["Growth", s.traction.growth]].map(([k, v]) => <Stat key={k} label={k} value={v} tone="dark" />)}
            </dl>
            <section>
              <SectionTitle icon={<TrendingUp className="h-4 w-4" />}>{`Monthly metrics (last ${s.traction.monthly.length} months)`}</SectionTitle>
              <Bars data={s.traction.monthly} />
            </section>
            <section>
              <SectionTitle>Milestones</SectionTitle>
              <Timeline items={s.traction.milestones.map((m) => ({ year: fmtStartupDate(m.date + "-01"), title: m.title, type: "Milestone", description: "" }))} />
            </section>
          </div>
        ) },
        { id: "funding", label: "Funding", content: (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Funding status" value={s.funding.status} />
              <Stat label="Amount raised" value={fmtFunding(s.fundingRaised)} />
              <Stat label="Seeking investment" value={s.funding.seeking ?? "Not currently"} tone={s.funding.seeking ? "success" : "light"} />
            </dl>
            {s.funding.seeking && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-300 bg-gold-100/40 p-5">
                <div><p className="text-[15px] font-bold text-navy-900">Interested in investing?</p><p className="mt-0.5 text-[13.5px] leading-5 text-slate-700">Express interest and the founder sees your profile; book a meeting to move to diligence.</p></div>
                <div className="flex flex-wrap gap-2"><InvestorInterestBtn s={s} /><BookMeetingBtn s={s} /></div>
              </div>
            )}
            <div className="grid gap-6 md:grid-cols-2">
              <section><SectionTitle>Use of funds</SectionTitle><Donut items={s.funding.useOfFunds} label="Use of funds" /></section>
              <section><SectionTitle>Cap table summary</SectionTitle><Donut items={s.funding.capTable} label="Cap table" /></section>
            </div>
            {investors.length > 0 && (
              <section>
                <SectionTitle icon={<ShieldCheck className="h-4 w-4" />}>Investors</SectionTitle>
                <div className="flex flex-wrap gap-3">
                  {investors.map((i) => i && (
                    <Link key={i.slug} to={`/investors/${i.slug}`} className={`inline-flex min-h-11 items-center gap-2.5 rounded-lg border border-line bg-white px-3 text-[13.5px] font-semibold text-navy-900 transition-colors duration-200 hover:border-navy-700 hover:bg-navy-50 ${focusRing}`}>
                      <Avatar initials={i.initials} color={i.color} size="sm" /> {i.name} <span className="text-[12px] font-normal text-slate-600">· {i.type}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <section>
              <SectionTitle>Funding timeline</SectionTitle>
              {s.funding.timeline.length
                ? <Timeline items={s.funding.timeline.map((t) => ({ year: fmtStartupDate(t.date + "-01"), title: `${t.round} · ${t.amount}`, type: t.round, description: `Led by ${t.lead}` }))} />
                : <Empty>No rounds yet — bootstrapped.</Empty>}
            </section>
          </div>
        ) },
        { id: "gallery", label: "Gallery", content: (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {s.gallery.map((g, i) => <img key={i} src={g} alt={`${s.name} photo ${i + 1}`} loading="lazy" className={cn("aspect-[4/3] w-full rounded-xl border border-line object-cover", i === 0 && "col-span-2 row-span-2")} />)}
          </div>
        ) },
        { id: "documents", label: "Documents", subtitle: "Preview any document; restricted files need founder approval", content: <ul className="space-y-2">{s.documents.map((d) => <DocRow key={d.name} s={s} d={d} />)}</ul> },
        { id: "achievements", label: "Achievements", subtitle: "Awards, expansion, media, patents, partnerships", content: <Timeline items={s.achievements} /> },
        { id: "jobs", label: "Jobs", subtitle: `${s.jobs.length} open roles`, content: (
          <ul className="space-y-3">
            {s.jobs.map((j) => {
              const o = j.opportunitySlug ? getOpportunity(j.opportunitySlug) : undefined;
              return (
                <li key={j.title} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-50 text-navy-700"><Briefcase className="h-4 w-4" /></span>
                    <div>
                      <p className="text-[15px] font-bold text-navy-900">{j.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-slate-600">{j.type} · {j.location}{o && <span className={cn("rounded-md px-2 py-0.5 text-[12px] font-semibold", typeColor[o.type])}>{o.type}</span>}</p>
                    </div>
                  </div>
                  {o ? <Link to={`/opportunities/${o.slug}`} className="btn-navy min-h-11 px-4 py-2">View &amp; Apply <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link> : <ContactFounderBtn s={s} size="sm" />}
                </li>
              );
            })}
            {s.jobs.length === 0 && <li><Empty>No open roles. Follow the startup to be notified.</Empty></li>}
          </ul>
        ) },
        { id: "reviews", label: "Reviews", content: s.reviews.length ? (
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="rounded-xl border border-line bg-slate-50/70 p-5 text-center">
              <p className="text-[40px] font-extrabold leading-none text-navy-900">{rating.toFixed(1)}</p>
              <div className="mt-2 flex justify-center"><StarRow value={Math.round(rating)} /></div>
              <p className="mt-1.5 text-[13px] text-slate-600">{s.reviews.length} review{s.reviews.length > 1 ? "s" : ""}</p>
              <button type="button" onClick={() => document.getElementById("contact-cta")?.scrollIntoView({ behavior: "smooth" })} className="btn-navy mt-4 min-h-11 w-full py-2">Recommend</button>
            </div>
            <ul className="space-y-3">
              {s.reviews.map((r) => (
                <li key={r.name} className="rounded-xl border border-line bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[14px] font-bold text-navy-900">{r.name}</p><p className="text-[12.5px] text-slate-600">{r.role}</p></div>
                    <StarRow value={r.rating} />
                  </div>
                  <p className="mt-3 text-[14px] leading-6 text-slate-700">{r.text}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : <Empty>No reviews yet. Worked with {s.name}? Contact the founder to be added as a reference.</Empty> },
        { id: "events", label: "Events", content: (
          <div className="space-y-6">
            {upcoming.length > 0 && <section><SectionTitle>Upcoming</SectionTitle><div className="grid gap-4 md:grid-cols-2">{upcoming.map((e) => <EventCard key={e.slug} e={e} view="grid" />)}</div></section>}
            {past.length > 0 && (
              <section>
                <SectionTitle>Past</SectionTitle>
                <ul className="space-y-2">
                  {past.map((e) => (
                    <li key={e.slug}>
                      <Link to={`/events/${e.slug}`} className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line bg-white p-3.5 text-[13.5px] transition-colors duration-200 hover:border-navy-700 hover:bg-navy-50 ${focusRing}`}>
                        <span className="font-semibold text-navy-900">{e.title}</span>
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] text-slate-600"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" /> {new Date(e.start).toLocaleDateString("en-IN")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {upcoming.length + past.length === 0 && <Empty>No events yet. <Link to="/events" className={inlineLink}>Browse events →</Link></Empty>}
          </div>
        ) },
        { id: "stories", label: "Stories", subtitle: "Published articles, founder stories & media", content: sStories.length
          ? <div className="grid gap-4 sm:grid-cols-2">{sStories.map((st) => <StoryCard key={st.slug} s={st} />)}</div>
          : <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5"><p className="text-[13.5px] text-slate-700">No stories yet about {s.name}.</p><Link to="/stories?submit=1" className="btn-navy min-h-11 px-4 py-2">Nominate for a story</Link></div> },
      ]}
      sidebar={<>
        {s.verified && (
          <SideCard className="border-emerald-200 bg-emerald-50/60">
            <div className="flex gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
              <div>
                <h3 className="text-[14px] font-bold text-navy-900">Verified by WS Hub</h3>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] leading-5 text-slate-700"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-700" /> Documents checked</p>
              </div>
            </div>
          </SideCard>
        )}
        <SideCard title="At a glance">
          <KV rows={[["Stage", s.stage], ["Founded", s.founded], ["Team size", s.teamSize], ["Funding raised", fmtFunding(s.fundingRaised)], ["Revenue", s.traction.revenue], ["Followers", s.followers], ["Updated", new Date(s.updatedAt).toLocaleDateString("en-IN")]]} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <ReportBtn targetType="startup" targetSlug={s.slug} />
            {s.businessSlug && <Link to={`/businesses/${s.businessSlug}`} className={`inline-flex min-h-10 items-center text-[13px] ${inlineLink}`}>Company profile →</Link>}
          </div>
        </SideCard>
        <SideCard title="Looking for">
          <div className="flex flex-wrap gap-2">
            {s.lookingFor.map((l) => (
              <Link key={l} to={`/startups?looking=${encodeURIComponent(l)}`} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-navy-50 px-3 text-[13px] font-semibold text-navy-800 transition-colors duration-200 hover:bg-navy-800 hover:text-white ${focusRing}`}>
                <Target aria-hidden="true" className="h-3.5 w-3.5" /> {l}
              </Link>
            ))}
          </div>
        </SideCard>
        <SideCard title="Location">
          <iframe title={`Map of ${s.name}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(s.mapQuery)}&z=13&output=embed`} className="h-44 w-full rounded-lg border border-line" loading="lazy" />
          <p className="mt-2 text-[13px] text-slate-600">{s.mapQuery}</p>
        </SideCard>
        <div id="contact-cta" className="rounded-xl bg-navy-900 p-5 text-white shadow-[var(--shadow-card)]">
          <Landmark aria-hidden="true" className="h-6 w-6 text-gold-400" />
          <h3 className="mt-3 text-[16px] font-bold">{s.funding.seeking ? `Raising ${s.funding.seeking}` : "Open to partnerships"}</h3>
          <p className="mt-1.5 text-[13px] leading-5 text-white/85">{user ? "Reach the founder directly or ask WS Hub for a warm intro." : "Sign in to contact the founder — details stay private."}</p>
          <div className="mt-4 grid gap-2">
            <InvestorInterestBtn s={s} className="w-full" />
            <IntroBtn targetType="founder" targetSlug={s.founderSlug} targetName={founder?.name ?? s.name} className="w-full !border-white/50 !bg-transparent !text-white hover:!bg-white/10" />
          </div>
        </div>
      </>}
      related={{ title: "Related Startups", subtitle: "Similar industry, stage or technology", to: `/startups?industry=${encodeURIComponent(s.industry)}`, children: <div className="hide-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">{relatedStartups(s).map((r) => <div key={r.slug} className="w-[320px] shrink-0 snap-start"><StartupCard s={r} /></div>)}</div> }}
      footer={
        <section className="mt-6 border-t-4 border-gold-500 bg-navy-950 py-12 text-white">
          <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div className="max-w-[60ch]">
              <h2 className="text-[26px] font-bold leading-tight">Building a startup in <span className="text-gold-400">Warangal</span>?</h2>
              <p className="mt-2 text-[14px] leading-6 text-white/85">List it on WS Hub and get discovered by investors, partners and customers.</p>
            </div>
            <Link to="/dashboard?tab=startup" className={`${btnGold} min-h-12 px-6 focus-visible:ring-offset-navy-950`}>Register your startup <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
        </section>
      }
    />
  );
}