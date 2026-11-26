import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Bookmark,
  Briefcase,
  Calendar,
  CalendarCheck,
  Check,
  CreditCard,
  Eye,
  FileText,
  Handshake,
  Inbox,
  MessageCircle,
  PenSquare,
  Rocket,
  Send,
  Users,
  X,
} from "lucide-react";
import { businesses } from "../businesses";
import { getFounder } from "../founders";
import { getInvestor } from "../investors";
import { getOpportunity } from "../opportunities";
import { AuthForm } from "../components/ui/AuthForm";
import { BusinessCard } from "../components/BusinessCard";
import { FounderCard } from "./Founders";
import { InvestorCard } from "./Investors";
import { OpportunityCard } from "./Opportunities";
import { StartupCard } from "./Startups";
import { getStartup } from "../startups";
import { logout, markAllRead, markRead, respondReceived, timeAgo, toast, useStore, type AppStatus, type ReqStatus } from "../store";
import { cn } from "../utils/cn";
import { DashboardEvents, DashboardMembership, DashboardStories } from "./DashboardModules";
import { DashboardStartup } from "./DashboardStartup";
import { profileApi } from "../api";
import { Shimmer } from "../components/ui/Shimmer";

/* ───────────────────────── Constants & tokens ───────────────────────── */

const tabs = [
  { id: "overview", label: "Overview", icon: Eye },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "requests", label: "Requests", icon: Send },
  { id: "applications", label: "Applications", icon: FileText },
  { id: "meetings", label: "Meetings", icon: CalendarCheck },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "startup", label: "My Startup", icon: Rocket },
  { id: "events", label: "My Events", icon: Calendar },
  { id: "stories", label: "Stories", icon: PenSquare },
  { id: "membership", label: "Membership", icon: CreditCard },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "post", label: "Post Opportunity", icon: Inbox },
];

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const FOCUS_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900";
const EASE = "transition-all duration-200 ease-out motion-reduce:transition-none";

const TONES = {
  good: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-600" },
  warn: { box: "border-amber-200 bg-amber-50 text-amber-900", dot: "bg-amber-600" },
  bad: { box: "border-red-200 bg-red-50 text-red-800", dot: "bg-red-600" },
  neutral: { box: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-500" },
  info: { box: "border-indigo-200 bg-indigo-50 text-indigo-800", dot: "bg-indigo-600" },
  navy: { box: "border-navy-100 bg-navy-50 text-navy-800", dot: "bg-navy-700" },
} as const;
const statusTone: Record<string, keyof typeof TONES> = {
  Pending: "warn",
  Accepted: "good",
  Rejected: "bad",
  Applied: "neutral",
  Shortlisted: "good",
  Meeting: "info",
  Completed: "navy",
  Requested: "warn",
  Confirmed: "good",
  Declined: "bad",
  Sent: "neutral",
  Answered: "good",
  Replied: "good",
};
const appSteps: AppStatus[] = ["Applied", "Shortlisted", "Meeting", "Accepted", "Completed"];

const btnPrimary = "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-4 text-[13px] font-semibold text-white hover:bg-navy-800";
const btnOutline = "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-navy-800 hover:bg-navy-50";

const Status = ({ s }: { s: ReqStatus | AppStatus | string }) => {
  const t = TONES[statusTone[s] ?? "neutral"];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold", t.box)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden="true" />
      {s}
    </span>
  );
};

function downloadIcs(summary: string, description?: string) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `SUMMARY:${summary}`];
  if (description) lines.push(`DESCRIPTION:${description}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "meeting.ics";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ───────────────────────── Shared pieces ───────────────────────── */

function Empty({ icon: Icon, title, text, to, cta }: { icon: typeof Bell; title: string; text: string; to: string; cta: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 border-t-2 border-t-gold-500 bg-white px-6 py-12 text-center shadow-[var(--shadow-card)]">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-700" aria-hidden="true"><Icon className="h-6 w-6" /></span>
      <h3 className="mt-4 text-[18px] font-bold tracking-tight text-navy-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-slate-600">{text}</p>
      <Link to={to} className={cn("btn-navy mt-6 inline-flex min-h-[44px] items-center px-6 text-[13px]", FOCUS)}>{cta}</Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="h-5 w-1 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
        <h2 className="text-[17px] font-bold tracking-tight text-navy-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-[var(--shadow-card)]">
      <table className="w-full text-left text-[14px]">
        <thead className="border-b border-line bg-slate-50 text-[12px] uppercase tracking-[0.08em] text-slate-600">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-5 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50/60">
              {r.map((c, j) => <td key={j} className="px-5 py-3.5 text-slate-700">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Avatar2({ text, tone = "navy" }: { text: string; tone?: "navy" | "gold" }) {
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold", tone === "gold" ? "bg-gold-500 text-navy-900" : "bg-navy-900 text-white")} aria-hidden="true">
      {text}
    </span>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const s = useStore((x) => x);
  const [apiProfile, setApiProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const tabNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Dashboard — WS Hub";
  }, []);
  useEffect(() => {
    if (!s.user) return;
    let active = true;
    setProfileLoading(true);
    profileApi.get().then((profile) => { if (active) setApiProfile(profile); }).catch(() => { if (active) setApiProfile(null); }).finally(() => { if (active) setProfileLoading(false); });
    profileApi.notifications(1, 12, true).catch(() => undefined);
    return () => { active = false; };
  }, [Boolean(s.user)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the active tab visible in the scrolling tab bar.
  useEffect(() => {
    const nav = tabNavRef.current;
    const btn = nav?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!nav || !btn) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nav.scrollTo({ left: btn.offsetLeft - nav.clientWidth / 2 + btn.clientWidth / 2, behavior: reduce ? "auto" : "smooth" });
  }, [tab, s.user]);

  if (!s.user) {
    return (
      <div className="page-in mx-auto max-w-md px-4 py-14">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-gold-800">Member Dashboard</p>
        <h1 className="mt-1.5 text-[30px] font-bold tracking-tight text-navy-900">Your dashboard</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">Sign in to see saved profiles, requests, applications and notifications.</p>
        <div className="mt-6 rounded-xl border border-line border-t-[3px] border-t-gold-500 bg-white p-6 shadow-[var(--shadow-card)]"><AuthForm /></div>
      </div>
    );
  }

  if (profileLoading) return <main role="status" aria-label="Loading your dashboard" className="mx-auto max-w-[1280px] space-y-6 px-4 py-8 sm:px-6 lg:px-8"><div className="card space-y-3 p-6"><Shimmer className="h-4 w-1/4" /><Shimmer className="h-8 w-1/2" /><Shimmer className="h-4 w-2/3" /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Shimmer key={index} className="h-28 rounded-xl" />)}</div><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><Shimmer className="h-80 rounded-xl" /><Shimmer className="h-80 rounded-xl" /></div></main>;

  const savedB = businesses.filter((b) => s.saved.business.includes(b.slug));
  const savedF = s.saved.founder.map(getFounder).filter(Boolean);
  const savedI = s.saved.investor.map(getInvestor).filter(Boolean);
  const savedO = s.saved.opportunity.map(getOpportunity).filter(Boolean);
  const savedS = s.saved.startup.map(getStartup).filter(Boolean);
  const savedCount = savedB.length + savedF.length + savedI.length + savedO.length + savedS.length;
  const requestsCount = s.connections.length + s.intros.length + s.interests.length;
  const pendingReceived = s.received.filter((r) => r.status === "Pending").length;
  const unread = s.notifications.filter((n) => !n.read).length;
  const connections = s.connections.filter((c) => c.status === "Accepted");

  const stats = [
    { label: "Profile views", value: s.profileViews, icon: Eye, to: "?tab=overview" },
    { label: "Saved", value: savedCount, icon: Bookmark, to: "?tab=saved" },
    { label: "Requests sent", value: requestsCount, icon: Send, to: "?tab=requests" },
    { label: "Connections", value: connections.length, icon: Users, to: "?tab=messages" },
    { label: "Applications", value: s.applications.length, icon: FileText, to: "?tab=applications" },
    { label: "Unread alerts", value: unread, icon: Bell, to: "?tab=notifications" },
  ];

  const firstName = (apiProfile?.full_name || s.user.name).split(" ")[0];
  const profileComplete = 45;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i + tabs.length - 1) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setParams({ tab: tabs[next].id });
    requestAnimationFrame(() => document.getElementById(`dash-tab-${tabs[next].id}`)?.focus());
  };

  return (
    <div className="page-in mx-auto max-w-[1280px] px-4 pb-24 pt-9 sm:px-6 lg:px-8 lg:pb-14">
      {/* ═════════ Header ═════════ */}
      <header className="flex flex-col gap-4 border-b-2 border-gold-500 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-gold-800">Member Dashboard</p>
          <h1 className="mt-1.5 text-[30px] font-bold leading-tight tracking-tight text-navy-900">Welcome back, {firstName}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-slate-600">
            <span>{s.user.role} · {s.user.email}</span>
            {s.user.verified && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-800">Verified member</span>
            )}
          </p>
        </div>
        <button type="button" onClick={logout} className={cn(btnOutline, "min-h-[44px] self-start px-5", EASE, FOCUS)}>Sign out</button>
      </header>

      {/* ═════════ Tabs ═════════ */}
      <div ref={tabNavRef} role="tablist" aria-label="Dashboard sections" className="mt-6 flex gap-1 overflow-x-auto border-b border-line hide-scrollbar">
        {tabs.map((t, i) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              id={`dash-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="dash-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setParams({ tab: t.id })}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn("relative inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-md px-4 text-[14px] font-semibold transition-colors duration-200 motion-reduce:transition-none", FOCUS, on ? "text-navy-900" : "text-slate-600 hover:text-navy-900")}
            >
              <t.icon className="h-4 w-4" aria-hidden="true" /> {t.label}
              {t.id === "notifications" && unread > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[12px] font-bold leading-none text-white"><span className="sr-only">{unread} unread</span><span aria-hidden="true">{unread}</span></span>
              )}
              {t.id === "requests" && pendingReceived > 0 && (
                <span className="rounded-full bg-gold-500 px-1.5 py-0.5 text-[12px] font-bold leading-none text-navy-900"><span className="sr-only">{pendingReceived} pending</span><span aria-hidden="true">{pendingReceived}</span></span>
              )}
              <span className={cn("absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-gold-500 transition-transform duration-300 motion-reduce:transition-none", on ? "scale-x-100" : "scale-x-0")} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <div id="dash-panel" role="tabpanel" aria-labelledby={`dash-tab-${tab}`} className="mt-7">
        {/* ───── Overview ───── */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {stats.map((st) => (
                <Link key={st.label} to={st.to} className={cn("card group p-4 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0", EASE, FOCUS)}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-400" aria-hidden="true"><st.icon className="h-5 w-5" /></span>
                  <p className="mt-3 text-[26px] font-bold leading-none tracking-tight text-navy-900 tabular-nums">{st.value}</p>
                  <p className="mt-1.5 text-[13px] text-slate-600">{st.label}</p>
                </Link>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
                <h2 className="text-[17px] font-bold tracking-tight text-navy-900">Recent activity</h2>
                <ul className="mt-4 text-[14px]">
                  {[
                    ...s.connections.map((c) => ({ at: c.at, text: `Connection request to ${c.founderName}`, status: c.status })),
                    ...s.intros.map((i) => ({ at: i.at, text: `Intro to ${i.targetName} via ${i.via}`, status: i.status })),
                    ...s.applications.map((a) => ({ at: a.at, text: `Applied: ${a.opportunityTitle}`, status: a.status })),
                  ]
                    .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)
                    .map((r, i) => (
                      <li key={`${r.at}-${i}`} className="flex items-center justify-between gap-3 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0">
                        <span className="text-slate-700">{r.text}</span>
                        <Status s={r.status} />
                      </li>
                    ))}
                  {requestsCount + s.applications.length === 0 && (
                    <li className="text-slate-600">
                      Nothing yet — explore <Link to="/founders" className={cn("rounded font-semibold text-navy-700 hover:underline", FOCUS)}>founders</Link>, <Link to="/investors" className={cn("rounded font-semibold text-navy-700 hover:underline", FOCUS)}>investors</Link> or <Link to="/opportunities" className={cn("rounded font-semibold text-navy-700 hover:underline", FOCUS)}>opportunities</Link>.
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-xl border-b-2 border-gold-500 bg-navy-900 p-6 text-white shadow-[var(--shadow-card)]">
                <h2 className="text-[17px] font-bold tracking-tight">Complete your profile</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-white/80">Profiles with a photo, bio and requirements get 4× more connection requests.</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileComplete} aria-label="Profile completion">
                  <div className="h-full rounded-full bg-gold-500" style={{ width: `${profileComplete}%` }} />
                </div>
                <p className="mt-2 text-[13px] text-white/70">{profileComplete}% complete</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/profile/edit" className={cn("inline-flex min-h-[44px] items-center rounded-lg bg-gold-500 px-5 text-[13px] font-bold text-navy-900 hover:bg-gold-400", EASE, FOCUS_DARK)}>Edit profile</Link>
                  <Link to="/businesses/manage" className={cn("inline-flex min-h-[44px] items-center rounded-lg border border-white/40 px-5 text-[13px] font-semibold text-white hover:bg-white/10", EASE, FOCUS_DARK)}>Manage businesses</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───── Saved ───── */}
        {tab === "saved" && (savedCount === 0 ? <Empty icon={Bookmark} title="Nothing saved yet" text="Tap the bookmark on any business, founder, investor or opportunity to keep it here." to="/founders" cta="Browse founders" /> : (
          <div className="space-y-10">
            {savedS.length > 0 && <Section title={`Saved Startups (${savedS.length})`}><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{savedS.map((x) => x && <StartupCard key={x.slug} s={x} />)}</div></Section>}
            {savedF.length > 0 && <Section title={`Saved Founders (${savedF.length})`}><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{savedF.map((f) => f && <FounderCard key={f.slug} f={f} />)}</div></Section>}
            {savedI.length > 0 && <Section title={`Saved Investors (${savedI.length})`}><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{savedI.map((i) => i && <InvestorCard key={i.slug} i={i} />)}</div></Section>}
            {savedO.length > 0 && <Section title={`Saved Opportunities (${savedO.length})`}><div className="grid gap-5">{savedO.map((o) => o && <OpportunityCard key={o.slug} o={o} />)}</div></Section>}
            {savedB.length > 0 && <Section title={`Saved Businesses (${savedB.length})`}><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{savedB.map((b) => <BusinessCard key={b.slug} b={b} />)}</div></Section>}
          </div>
        ))}

        {/* ───── Requests ───── */}
        {tab === "requests" && (
          <div className="space-y-8">
            <Section title={`Requests received${pendingReceived ? ` (${pendingReceived} pending)` : ""}`}>
              {s.received.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-[14px] text-slate-600">Requests from other members will appear here once your profile is published.</p>
              ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                  {s.received.map((r) => (
                    <li key={r.id} className="card flex flex-col gap-4 p-5">
                      <div className="flex items-start gap-3">
                        <Avatar2 text={r.fromInitials} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold text-navy-900">
                            {r.fromTo ? <Link to={r.fromTo} className={cn("rounded hover:text-navy-600", FOCUS)}>{r.fromName}</Link> : r.fromName}{" "}
                            <span className="font-normal text-slate-600">· {r.fromRole}</span>
                          </p>
                          <p className="mt-1 text-[14px] leading-relaxed text-slate-700">{r.message}</p>
                          <p className="mt-1.5 text-[13px] text-slate-500">{timeAgo(r.at)}</p>
                        </div>
                        <Status s={r.status} />
                      </div>
                      {r.status === "Pending" && (
                        <div className="flex gap-2.5">
                          <button type="button" onClick={() => respondReceived(r.id, "Accepted")} className={cn(btnPrimary, "flex-1", EASE, FOCUS)}><Check className="h-4 w-4" aria-hidden="true" /> Accept</button>
                          <button type="button" onClick={() => respondReceived(r.id, "Rejected")} className={cn(btnOutline, "flex-1", EASE, FOCUS)}><X className="h-4 w-4" aria-hidden="true" /> Decline</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {requestsCount === 0 && <Empty icon={Send} title="No requests sent yet" text="Connect with founders, request intros, or share your startup with investors." to="/investors" cta="Find investors" />}

            {s.connections.length > 0 && (
              <Section title="Connection requests">
                <Table
                  head={["Founder", "Relationship", "Sent", "Status"]}
                  rows={s.connections.map((c) => [
                    <Link key="a" to={`/founders/${c.founderSlug}`} className={cn("rounded font-semibold text-navy-900 hover:underline", FOCUS)}>{c.founderName}</Link>,
                    `As ${c.relationship}`,
                    timeAgo(c.at),
                    <Status key="s" s={c.status} />,
                  ])}
                />
              </Section>
            )}

            {s.intros.length > 0 && (
              <Section title="Introduction requests">
                <Table
                  head={["To", "Via", "Sent", "Status"]}
                  rows={s.intros.map((i) => [
                    <Link key="a" to={`/${i.targetType}s/${i.targetSlug}`} className={cn("rounded font-semibold text-navy-900 hover:underline", FOCUS)}>{i.targetName}</Link>,
                    `Via ${i.via}`,
                    timeAgo(i.at),
                    <Status key="s" s={i.status} />,
                  ])}
                />
              </Section>
            )}

            {s.interests.length > 0 && (
              <Section title="Investor pipeline">
                <div className="grid gap-4 sm:grid-cols-3">
                  {(["Pending", "Accepted", "Rejected"] as const).map((col) => (
                    <div key={col} className="rounded-xl border border-line bg-slate-50/70 p-4">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        {col === "Pending" ? "Shared / reviewing" : col === "Accepted" ? "Interested" : "Passed"} ({s.interests.filter((i) => i.status === col).length})
                      </p>
                      <ul className="mt-3 space-y-2.5">
                        {s.interests.filter((i) => i.status === col).map((i) => {
                          const inv = getInvestor(i.investorSlug);
                          return (
                            <li key={i.id} className="rounded-lg border border-line bg-white p-3.5">
                              <Link to={`/investors/${i.investorSlug}`} className={cn("rounded text-[14px] font-bold text-navy-900 hover:text-navy-600", FOCUS)}>{i.investorName}</Link>
                              <p className="text-[13px] text-slate-600">{i.startup} · {inv?.type}</p>
                              <p className="mt-1 text-[12px] text-slate-500">{timeAgo(i.at)}{i.pitch && " · deck attached"}{i.companyProfile && " · profile attached"}</p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ───── Applications ───── */}
        {tab === "applications" && (s.applications.length === 0 ? <Empty icon={FileText} title="No applications yet" text="Apply to funding, grants, hiring and partnership opportunities." to="/opportunities" cta="Explore opportunities" /> : (
          <Section title={`Applications (${s.applications.length})`}>
            <ul className="grid gap-4">
              {s.applications.map((a) => {
                const idx = appSteps.indexOf(a.status);
                return (
                  <li key={a.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link to={`/opportunities/${a.opportunitySlug}`} className={cn("rounded text-[16px] font-bold text-navy-900 hover:text-navy-600", FOCUS)}>{a.opportunityTitle}</Link>
                        <p className="mt-0.5 text-[13px] text-slate-600">{a.role}, {a.company} · {timeAgo(a.at)}{a.attachments.length > 0 && ` · ${a.attachments.map((x) => x.split(":")[0]).join(", ")}`}</p>
                      </div>
                      <Status s={a.status} />
                    </div>
                    <ol className="mt-5 flex items-center gap-1.5" aria-label="Application progress">
                      {appSteps.map((st, i) => {
                        const done = a.status === "Rejected" ? i === 0 : i <= idx;
                        return (
                          <li key={st} aria-current={a.status === st ? "step" : undefined} className="flex flex-1 items-center gap-1.5">
                            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold", done ? "bg-verified text-white" : "bg-slate-200 text-slate-600")}>{i + 1}</span>
                            <span className={cn("hidden text-[13px] sm:block", done ? "font-semibold text-emerald-800" : "text-slate-600")}>{st}</span>
                            <span className="sr-only sm:hidden">{st}{done ? " (reached)" : ""}</span>
                            {i < appSteps.length - 1 && <span className={cn("h-0.5 flex-1", i < idx ? "bg-verified" : "bg-slate-200")} aria-hidden="true" />}
                          </li>
                        );
                      })}
                    </ol>
                    {a.status === "Shortlisted" && (
                      <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[14px] text-emerald-900"><span className="font-bold">Response:</span> Congratulations — you've been shortlisted. The poster will propose an interview/meeting slot shortly.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        ))}
        {tab === "applications" && s.infoRequests.length > 0 && (
          <div className="mt-10">
            <Section title="Information requests & responses">
              <ul className="grid gap-4 md:grid-cols-2">
                {s.infoRequests.map((r) => (
                  <li key={r.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/opportunities/${r.opportunitySlug}`} className={cn("rounded text-[15px] font-bold text-navy-900 hover:text-navy-600", FOCUS)}>{r.opportunityTitle}</Link>
                      <Status s={r.status} />
                    </div>
                    <p className="mt-2 text-[14px] text-slate-700">Q: {r.question}</p>
                    {r.answer && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[14px] text-emerald-900">A: {r.answer}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}

        {/* ───── Meetings ───── */}
        {tab === "meetings" && (s.meetings.length === 0 && s.startupMeetings.length === 0 && s.connections.filter((c) => c.status === "Accepted").length === 0 ? <Empty icon={CalendarCheck} title="No meetings yet" text="Request a meeting from any investor profile, or connect with founders to schedule calls." to="/investors" cta="Find investors" /> : (
          <div className="space-y-8">
            <Section title="Investor meetings">
              <ul className="grid gap-4 md:grid-cols-2">
                {s.meetings.map((m) => (
                  <li key={m.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link to={`/investors/${m.investorSlug}`} className={cn("rounded text-[16px] font-bold text-navy-900 hover:text-navy-600", FOCUS)}>{m.investorName}</Link>
                        <p className="text-[13px] text-slate-600">{m.startup} · {m.slot} IST</p>
                      </div>
                      <Status s={m.status} />
                    </div>
                    <p className="mt-3 text-[14px] leading-relaxed text-slate-700">{m.agenda}</p>
                    {m.status === "Confirmed" && (
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        <button type="button" onClick={() => downloadIcs(`Meeting with ${m.investorName} (WS Hub)`, m.agenda)} className={cn(btnPrimary, EASE, FOCUS)}>Add to calendar</button>
                        <button type="button" onClick={() => toast("Video link will be shared 15 minutes before the meeting", "info")} className={cn(btnOutline, EASE, FOCUS)}>Join link</button>
                      </div>
                    )}
                  </li>
                ))}
                {s.meetings.length === 0 && <li className="text-[14px] text-slate-600">No investor meetings requested yet.</li>}
              </ul>
            </Section>

            {s.startupMeetings.length > 0 && (
              <Section title="Startup meetings & demos">
                <ul className="grid gap-4 md:grid-cols-2">
                  {s.startupMeetings.map((m) => (
                    <li key={m.id} className="card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link to={`/startups/${m.startupSlug}`} className={cn("rounded text-[16px] font-bold text-navy-900 hover:text-navy-600", FOCUS)}>{m.startupName}</Link>
                          <p className="text-[13px] text-slate-600">{m.kind} · {m.date} · {m.slot} · {m.mode}</p>
                        </div>
                        <Status s={m.status} />
                      </div>
                      {m.status === "Confirmed" && <button type="button" onClick={() => downloadIcs(`${m.kind} with ${m.startupName} (WS Hub)`)} className={cn(btnPrimary, "mt-4", EASE, FOCUS)}>Add to calendar</button>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {s.connections.filter((c) => c.status === "Accepted").length > 0 && (
              <Section title="Suggested next step">
                <p className="text-[14px] leading-relaxed text-slate-700">
                  You're connected with {s.connections.filter((c) => c.status === "Accepted").map((c) => c.founderName).join(", ")}. Propose a call from <Link to="/dashboard?tab=messages" className={cn("rounded font-semibold text-navy-700 hover:underline", FOCUS)}>Messages</Link>, or meet in person at the <Link to="/events/warangal-startup-meetup" className={cn("rounded font-semibold text-navy-700 hover:underline", FOCUS)}>Warangal Startup Meetup</Link>.
                </p>
              </Section>
            )}
          </div>
        ))}

        {/* ───── Analytics ───── */}
        {tab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {([["views", "Profile views"], ["clicks", "Card clicks"], ["saves", "Saves"], ["requests", "Requests"], ["shares", "Shares"], ["applications", "Applications"]] as const).map(([k, l]) => (
                <div key={k} className="card p-4">
                  <p className="text-[26px] font-bold leading-none tracking-tight text-navy-900 tabular-nums">{s.analytics[k]}</p>
                  <p className="mt-1.5 text-[13px] text-slate-600">{l}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="card p-6">
                <h3 className="text-[16px] font-bold tracking-tight text-navy-900">Engagement funnel (this session)</h3>
                <ul className="mt-4 space-y-3.5">
                  {([["views", "Viewed"], ["clicks", "Clicked"], ["saves", "Saved"], ["requests", "Requested"], ["applications", "Applied"]] as const).map(([k, l]) => {
                    const max = Math.max(1, s.analytics.views);
                    return (
                      <li key={k}>
                        <div className="flex justify-between text-[14px]"><span className="text-slate-600">{l}</span><span className="font-semibold tabular-nums text-navy-900">{s.analytics[k]}</span></div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gold-500 transition-all motion-reduce:transition-none" style={{ width: `${Math.min(100, (s.analytics[k] / max) * 100)}%` }} /></div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="card p-6">
                <h3 className="text-[16px] font-bold tracking-tight text-navy-900">Your profile</h3>
                <dl className="mt-4 text-[14px]">
                  {[
                    ["Profile views (30d)", s.profileViews],
                    ["Investor views", s.notifications.filter((n) => n.title.includes("Investor viewed")).length + 3],
                    ["Connections", s.connections.filter((c) => c.status === "Accepted").length + s.received.filter((r) => r.status === "Accepted").length],
                    ["Search appearances", s.profileViews * 3],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-line py-3 first:pt-0 last:border-0 last:pb-0"><dt className="text-slate-600">{k}</dt><dd className="font-semibold tabular-nums text-navy-900">{v}</dd></div>
                  ))}
                </dl>
                <p className="mt-4 text-[13px] text-slate-600">Upgrade to <Link to="/membership/premium" className={cn("rounded font-semibold text-navy-700 hover:underline", FOCUS)}>Premium</Link> for advanced analytics and exports.</p>
              </div>
            </div>
          </div>
        )}

        {tab === "startup" && <DashboardStartup />}
        {tab === "events" && <DashboardEvents />}
        {tab === "stories" && <DashboardStories />}
        {tab === "membership" && <DashboardMembership />}

        {/* ───── Messages ───── */}
        {tab === "messages" && s.startupContacts.length > 0 && (
          <div className="mb-8">
            <Section title="Founder conversations">
              <ul className="grid gap-4">
                {s.startupContacts.map((c) => (
                  <li key={c.id} className="card flex items-center gap-4 p-5">
                    <Avatar2 text={c.startupName.slice(0, 2).toUpperCase()} tone="gold" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/startups/${c.startupSlug}`} className={cn("rounded text-[15px] font-bold text-navy-900 hover:text-navy-600", FOCUS)}>{c.startupName}</Link>
                      <p className="truncate text-[13px] text-slate-600">{c.purpose}: {c.message}</p>
                      {c.status === "Replied" && <p className="mt-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[13px] text-emerald-900">Founder: Thanks for reaching out — happy to talk. Book a slot from our profile.</p>}
                    </div>
                    <Status s={c.status} />
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}
        {tab === "messages" && (connections.length === 0 && s.startupContacts.length === 0 ? <Empty icon={MessageCircle} title="No conversations yet" text="Messaging unlocks once a founder accepts your connection request." to="/founders" cta="Connect with founders" /> : (
          <div className="grid gap-4">
            {connections.map((c) => (
              <div key={c.id} className="card flex items-center gap-4 p-5">
                <Avatar2 text={c.founderName.split(" ").map((w) => w[0]).slice(0, 2).join("")} />
                <div className="min-w-0 flex-1"><p className="text-[15px] font-bold text-navy-900">{c.founderName}</p><p className="truncate text-[13px] text-slate-600">You: {c.message}</p></div>
                <button type="button" onClick={() => toast("Real-time messaging arrives with the Collaboration milestone", "info")} className={cn(btnPrimary, EASE, FOCUS)}>Open</button>
              </div>
            ))}
          </div>
        ))}

        {/* ───── Notifications ───── */}
        {tab === "notifications" && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-bold tracking-tight text-navy-900">Notifications</h2>
              {unread > 0 && <button type="button" onClick={markAllRead} className={cn("inline-flex min-h-[40px] items-center rounded-md px-3 text-[13px] font-semibold text-navy-700 hover:bg-navy-50 hover:underline", FOCUS)}>Mark all as read</button>}
            </div>
            {s.notifications.length === 0 ? (
              <Empty icon={Bell} title="You're all caught up" text="We'll alert you when a founder accepts, an investor views your pitch, or an application moves forward." to="/opportunities" cta="Explore opportunities" />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-card)]">
                {s.notifications.map((n) => (
                  <li key={n.id} className={cn("flex items-start gap-3.5 p-5", !n.read && "bg-navy-50/60")}>
                    <span className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-gold-500")} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-navy-900">{!n.read && <span className="sr-only">Unread: </span>}{n.title}</p>
                      <p className="mt-0.5 text-[14px] text-slate-600">{n.body}</p>
                      <p className="mt-1.5 text-[13px] text-slate-500">{timeAgo(n.at)}</p>
                    </div>
                    {n.to && <Link to={n.to} onClick={() => markRead(n.id)} className={cn("inline-flex min-h-[40px] items-center rounded-md px-3 text-[13px] font-semibold text-navy-700 hover:bg-navy-50 hover:underline", FOCUS)}>View</Link>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ───── Post ───── */}
        {tab === "post" && (
          <div className="mx-auto max-w-xl rounded-xl border border-line border-t-[3px] border-t-gold-500 bg-white p-8 text-center shadow-[var(--shadow-card)]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-gold-400" aria-hidden="true"><Briefcase className="h-6 w-6" /></span>
            <h2 className="mt-4 text-[20px] font-bold tracking-tight text-navy-900">Post an opportunity</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-600">Funding, partnership, hiring, tender or collaboration — posting opens with the Collaboration milestone. Meanwhile our team can post on your behalf.</p>
            <button type="button" onClick={() => toast("Request sent — WS Hub team will contact you within 1 business day", "success")} className={cn("mt-6 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-gold-500 px-6 text-[14px] font-bold text-navy-900 hover:bg-gold-400", EASE, FOCUS)}>
              <Handshake className="h-4 w-4" aria-hidden="true" /> Ask WS Hub team to post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}