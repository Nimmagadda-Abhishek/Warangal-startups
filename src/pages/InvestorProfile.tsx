import { useEffect, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, CheckCircle2, Eye, Globe, Landmark, MapPin, PieChart, ShieldCheck, TrendingUp, Wallet, ExternalLink } from "lucide-react";
import { getInvestor, relatedInvestors, ticketLabel } from "../investors";
import { getFounder } from "../founders";
import { opportunities, typeColor } from "../opportunities";
import { ProfileShell, Avatar, KV, SideCard, Tag } from "../components/ProfileShell";
import { InterestedBtn, IntroBtn, MeetingBtn, ReportBtn, SaveBtn, ShareBtn, useTrackView } from "../components/ui/Actions";
import { events, isPast } from "../events";
import { stories } from "../stories";
import { startups } from "../startups";
import { EventCard } from "./Events";
import { InvestorCard } from "./Investors";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- */
/*  Design tokens — flat, high contrast, 44px targets, visible focus           */
/* -------------------------------------------------------------------------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

const btnOutline =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-navy-900 " +
  "transition-colors duration-200 hover:border-navy-700 hover:bg-navy-50 " + focusRing;

const panel = "rounded-xl border border-line bg-white p-5";

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

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-slate-600">{children}</h3>;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-slate-50/70 p-4">
      <dt className="text-[12px] font-medium text-slate-600">{label}</dt>
      <dd className="mt-1 text-[15px] font-bold leading-snug text-navy-900">{value}</dd>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center text-[13.5px] text-slate-600">{children}</div>;
}

const inlineLink = `rounded font-semibold text-navy-700 underline-offset-2 hover:underline ${focusRing}`;

/* -------------------------------------------------------------------------- */

export default function InvestorProfile() {
  const { slug = "" } = useParams();
  const i = getInvestor(slug);
  useTrackView(`investor:${slug}`);
  useEffect(() => {
    if (i) document.title = `${i.name} — Investors — WS Hub`;
  }, [i]);
  if (!i) return <Navigate to="/investors" replace />;

  const postedOpps = opportunities.filter((o) => o.postedBy.slug === i.slug);
  const invEvents = events.filter((e) => !isPast(e) && (e.speakers.some((sp) => sp.investorSlug === i.slug) || e.sponsors.some((sp) => sp.to === `/investors/${i.slug}`) || e.organizer.to === `/investors/${i.slug}`));

  const pfSlugs = i.portfolio.map((p) => p.founderSlug).filter(Boolean) as string[];
  const pfStories = stories.filter((st) => st.links.investor === i.slug || (st.links.founder && pfSlugs.includes(st.links.founder))).slice(0, 3);

  return (
    <ProfileShell
      cover={i.cover}
      crumbs={[{ label: "Home", to: "/" }, { label: "Investors", to: "/investors" }, { label: i.name }]}
      avatar={<Avatar initials={i.initials} color={i.color} />}
      title={i.name}
      verified={i.verified}
      subtitle={
        <>
          {i.type}{i.firm !== "Independent" && ` · ${i.firm}`}
          <span className="mt-1 block text-slate-600">{i.bio}</span>
        </>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4" /> {i.location}</span>
          <span className="inline-flex items-center gap-1.5"><Wallet aria-hidden="true" className="h-4 w-4" /> {ticketLabel(i)}</span>
          <span className="inline-flex items-center gap-1.5"><PieChart aria-hidden="true" className="h-4 w-4" /> {i.portfolioSize} investments</span>
          <span className="inline-flex items-center gap-1.5"><Eye aria-hidden="true" className="h-4 w-4" /> {i.views.toLocaleString("en-IN")} profile views</span>
        </>
      }
      badges={
        <>
          {i.verified && <Pill tone="success"><BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> Verified</Pill>}
          <Pill tone={i.active ? "success" : "neutral"}>{i.active ? "Actively investing" : "Not currently active"}</Pill>
          {i.stages.map((s) => <Pill key={s} tone="gold">{s}</Pill>)}
        </>
      }
      actions={
        <>
          <InterestedBtn investorSlug={i.slug} investorName={i.name} />
          <MeetingBtn investorSlug={i.slug} investorName={i.name} />
          <IntroBtn targetType="investor" targetSlug={i.slug} targetName={i.name} variant="gold" />
          <a href={`https://${i.website}`} target="_blank" rel="noopener noreferrer" className={btnOutline}>
            <Globe aria-hidden="true" className="h-4 w-4" /> Website <span className="sr-only">(opens in a new tab)</span>
          </a>
          <a href={`https://${i.linkedin}`} target="_blank" rel="noopener noreferrer" className={btnOutline}>
            LinkedIn <span className="sr-only">(opens in a new tab)</span>
          </a>
        </>
      }
      topRight={<><ShareBtn title={`${i.name} — ${i.type}`} path={`/investors/${i.slug}`} /><SaveBtn type="investor" slug={i.slug} /></>}
      tabs={[
        {
          id: "overview",
          label: "Overview",
          content: (
            <div className="space-y-6">
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Ticket size" value={ticketLabel(i)} />
                <Stat label="Portfolio" value={`${i.portfolioSize} investments`} />
                <Stat label="Stages" value={i.stages.join(", ")} />
                <Stat label="Location" value={i.location} />
              </dl>
              <section>
                <SectionTitle>About</SectionTitle>
                <p className="max-w-[72ch] text-[15px] leading-7 text-slate-700">{i.about}</p>
              </section>
            </div>
          ),
        },
        {
          id: "thesis",
          label: "Investment Thesis",
          content: (
            <div className="space-y-6">
              <blockquote className="rounded-xl border border-line border-l-4 border-l-gold-500 bg-white p-5 text-[15px] italic leading-7 text-navy-900">“{i.thesis.what}”</blockquote>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[["Average ticket", i.thesis.avgTicket], ["Cheque size", i.thesis.checkSize], ["Geography", i.thesis.geography], ["Preferred revenue", i.thesis.preferredRevenue], ["Preferred team size", i.thesis.preferredTeamSize], ["Formats", i.format.join(", ")]].map(([k, v]) => <Stat key={k} label={k} value={v} />)}
              </dl>
              <section>
                <SectionTitle>Preferred industries</SectionTitle>
                <div className="flex flex-wrap gap-2">{i.thesis.industries.map((s) => <Tag key={s} to={`/investors?sector=${encodeURIComponent(s)}`}>{s}</Tag>)}</div>
              </section>
            </div>
          ),
        },
        {
          id: "portfolio",
          label: "Portfolio",
          subtitle: `${i.portfolioSize} investments · ${i.portfolio.length} listed on WS Hub`,
          content: (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {i.portfolio.map((p) => {
                const f = p.founderSlug ? getFounder(p.founderSlug) : undefined;
                const st = startups.find((x) => x.name === p.name);
                const target = st ? `/startups/${st.slug}` : f ? `/founders/${f.slug}` : null;
                const title = <span className="truncate">{p.name}</span>;
                return (
                  <li key={p.name} className={cn("relative flex h-full items-center gap-3 rounded-xl border border-line bg-white p-4 transition-colors duration-200", target && "hover:border-navy-700 hover:bg-navy-50/50 focus-within:ring-2 focus-within:ring-navy-700")}>
                    {f
                      ? <Avatar initials={f.initials} color={f.color} size="md" />
                      : <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-black text-slate-700">{p.name.slice(0, 2).toUpperCase()}</span>}
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-navy-900">
                        {/* Stretched link: whole card is clickable without nesting anchors */}
                        {target ? <Link to={target} className="after:absolute after:inset-0 focus-visible:outline-none">{title}</Link> : title}
                      </p>
                      <p className="text-[12.5px] text-slate-600">{p.sector} · {p.stage} · {p.year}</p>
                      {f && (
                        <p className="mt-0.5 text-[12.5px] text-navy-700">
                          Founder: {f.name}
                          {f.businessSlug && <> · <Link to={`/businesses/${f.businessSlug}`} className="relative z-10 underline">Startup profile</Link></>}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ),
        },
        {
          id: "focus",
          label: "Focus Areas",
          content: <div className="flex flex-wrap gap-2">{i.focus.map((s) => <span key={s} className="inline-flex min-h-10 items-center rounded-lg bg-navy-50 px-3.5 text-[13px] font-semibold text-navy-800">{s}</span>)}</div>,
        },
        {
          id: "team",
          label: "Team",
          content: (
            <ul className="grid gap-3 sm:grid-cols-2">
              {i.team.map((t) => (
                <li key={t.name} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
                  <Avatar initials={t.initials} color={i.color} size="sm" />
                  <div><p className="text-[14px] font-bold text-navy-900">{t.name}</p><p className="text-[13px] text-slate-600">{t.role}</p></div>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: "past",
          label: "Past Investments",
          subtitle: "Exits and earlier cheques",
          content: (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {i.pastInvestments.map((p) => (
                <li key={p.name} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div><p className="text-[14px] font-bold text-navy-900">{p.name}</p><p className="text-[12.5px] text-slate-600">{p.sector} · {p.year}</p></div>
                  <Pill tone="success"><TrendingUp aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> {p.outcome}</Pill>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: "events",
          label: "Events",
          subtitle: "Demo days, pitch events and workshops",
          content: invEvents.length ? (
            <div className="grid gap-4 md:grid-cols-2">{invEvents.slice(0, 4).map((e) => <EventCard key={e.slug} e={e} view="grid" />)}</div>
          ) : i.events.length ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {(["Upcoming", "Past"] as const).map((k) => {
                const list = i.events.filter((e) => (k === "Past") === e.past);
                return (
                  <section key={k}>
                    <SectionTitle>{k}</SectionTitle>
                    <ul className="space-y-2">
                      {list.map((e) => (
                        <li key={e.title}>
                          <Link to="/events" className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line bg-white p-3.5 text-[13.5px] transition-colors duration-200 hover:border-navy-700 hover:bg-navy-50 ${focusRing}`}>
                            <span className="font-semibold text-navy-900">{e.title}</span>
                            <span className="shrink-0 text-[12.5px] text-slate-600">{e.date}</span>
                          </Link>
                        </li>
                      ))}
                      {list.length === 0 && <li className="text-[13px] text-slate-600">None</li>}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : <Empty>No events listed.</Empty>,
        },
        {
          id: "requirements",
          label: "Requirements",
          subtitle: "What this investor looks for",
          content: (
            <div className="space-y-6">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Sectors", i.thesis.industries.join(", ")], ["Revenue stage", i.thesis.preferredRevenue], ["Traction", i.stages.join(" / ")], ["Geography", i.thesis.geography]].map(([k, v]) => <Stat key={k} label={k} value={v} />)}
              </dl>
              <ul className={cn(panel, "space-y-3")}>
                {i.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-[14px] leading-6 text-slate-700">
                    <CheckCircle2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-verified" /> {r}
                  </li>
                ))}
              </ul>
              {postedOpps.length > 0 && (
                <section>
                  <SectionTitle>Open programmes</SectionTitle>
                  <ul className="space-y-3">
                    {postedOpps.map((o) => (
                      <li key={o.slug}>
                        <Link to={`/opportunities/${o.slug}`} className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 transition-colors duration-200 hover:border-navy-700 hover:bg-navy-50 ${focusRing}`}>
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
              )}
            </div>
          ),
        },
      ]}
      sidebar={
        <>
          {i.verified && (
            <SideCard className="border-emerald-200 bg-emerald-50/60">
              <div className="flex gap-3">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                <div>
                  <h3 className="text-[14px] font-bold text-navy-900">Verified investor</h3>
                  <p className="mt-1 text-[13px] leading-5 text-slate-700">Identity and investment details have been reviewed by the WS Hub team.</p>
                </div>
              </div>
            </SideCard>
          )}
          <SideCard title="At a glance">
            <KV rows={[
              ["Type", i.type], ["Stages", i.stages.join(", ")], ["Ticket size", ticketLabel(i)], ["Portfolio", i.portfolioSize], ["Location", i.location],
              ["Website", <a key="w" href={`https://${i.website}`} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 break-all ${inlineLink}`}>{i.website} <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="sr-only">(opens in a new tab)</span></a>],
            ]} />
            <div className="mt-3 border-t border-line pt-3"><ReportBtn targetType="investor" targetSlug={i.slug} /></div>
          </SideCard>
          {pfStories.length > 0 && (
            <SideCard title="Portfolio stories">
              <ul className="space-y-1">
                {pfStories.map((st) => (
                  <li key={st.slug}>
                    <Link to={`/stories/${st.slug}`} className={`group flex min-h-14 gap-3 rounded-lg p-1 ${focusRing}`}>
                      <img src={st.cover} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-md object-cover" />
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-[13.5px] font-bold leading-snug text-navy-900 group-hover:text-navy-700">{st.title}</span>
                        <span className="text-[12.5px] text-slate-600">{st.category}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SideCard>
          )}
          <SideCard className="bg-navy-900 text-white">
            <Landmark aria-hidden="true" className="h-7 w-7 text-gold-400" />
            <h3 className="mt-3 text-[16px] font-bold">Raising for your startup?</h3>
            <p className="mt-1.5 text-[13px] leading-5 text-white/85">Share your deck with {i.name} or request a warm intro via WS Hub.</p>
            <div className="mt-4 grid gap-2">
              <InterestedBtn investorSlug={i.slug} investorName={i.name} className="w-full !bg-gold-500 !text-navy-900 hover:!bg-gold-400" />
              <IntroBtn targetType="investor" targetSlug={i.slug} targetName={i.name} className="w-full !border-white/50 !bg-transparent !text-white hover:!bg-white/10" />
            </div>
          </SideCard>
        </>
      }
      stickyActions={<><InterestedBtn investorSlug={i.slug} investorName={i.name} /><MeetingBtn investorSlug={i.slug} investorName={i.name} /></>}
      related={{
        title: "Related Investors",
        subtitle: "Similar stage and sector focus",
        to: `/investors?type=${encodeURIComponent(i.type)}`,
        children: (
          <div className="hide-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
            {relatedInvestors(i).map((r) => <div key={r.slug} className="w-[300px] shrink-0 snap-start"><InvestorCard i={r} /></div>)}
          </div>
        ),
      }}
    />
  );
}