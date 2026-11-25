import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Award, BarChart3, Calendar, Download, PenSquare, Star, Ticket } from "lucide-react";
import { events, fmtEventDate, fmtTime, getEvent, isPast } from "../events";
import { getStory } from "../stories";
import { comparison, fmtINR, getPlan } from "../membership";
import { EventCard } from "./Events";
import { QrSvg } from "./EventDetails";
import { StoryCard, SubmitStoryModal } from "./Stories";
import { toast, useStore } from "../store";
import { cn } from "../utils/cn";
import { paymentApi } from "../api";

function Empty({ title, text, to, cta }: { title: string; text: string; to: string; cta: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="text-[15px] font-bold text-navy-900">{title}</h3><p className="mx-auto mt-1 max-w-sm text-[12.5px] text-slate-500">{text}</p><Link to={to} className="btn-navy mt-4 px-5 py-2.5 text-xs">{cta}</Link></div>;
}
const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => <section><h2 className="mb-3 text-[15px] font-bold text-navy-900">{title}</h2>{children}</section>;

/* ---------- My Events ---------- */
export function DashboardEvents() {
  const s = useStore((x) => x);
  const [sub, setSub] = useState<"Upcoming" | "Past" | "Saved" | "Certificates" | "Organizer">("Upcoming");
  const regs = s.registrations.filter((r) => r.status !== "Cancelled").map((r) => ({ r, e: getEvent(r.eventSlug)! })).filter((x) => x.e);
  const upcoming = regs.filter((x) => !isPast(x.e)); const past = regs.filter((x) => isPast(x.e));
  const saved = s.saved.event.map(getEvent).filter(Boolean);
  const download = (name: string, body: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/plain" })); a.download = name; a.click(); };
  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-[12px] font-semibold hide-scrollbar">{(["Upcoming", "Past", "Saved", "Certificates", "Organizer"] as const).map((k) => <button key={k} type="button" onClick={() => setSub(k)} className={cn("shrink-0 rounded-md px-3.5 py-1.5", sub === k ? "bg-white text-navy-900 shadow-sm" : "text-slate-500")}>{k}{k === "Upcoming" && upcoming.length > 0 && ` (${upcoming.length})`}{k === "Certificates" && s.certificates.length > 0 && ` (${s.certificates.length})`}</button>)}</div>
      {sub === "Upcoming" && (upcoming.length === 0 ? <Empty title="No upcoming events" text="Register for a meetup, workshop or investor connect to get your QR pass here." to="/events" cta="Explore events" /> : <div className="grid gap-3">{upcoming.map(({ r, e }) => <div key={r.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><QrSvg value={r.code} size={96} /><div className="min-w-0 flex-1"><p className="text-[10.5px] font-bold uppercase tracking-wide text-gold-800">{e.type} · {r.code}</p><Link to={`/events/${e.slug}`} className="block text-[15px] font-bold text-navy-900 hover:text-navy-600">{e.title}</Link><p className="text-[12px] text-slate-500">{fmtEventDate(e.start)} · {fmtTime(e.start)} · {e.venue}</p><p className="mt-1 text-[11.5px] text-slate-500">{r.name} · {r.role} · {r.food}</p></div><div className="flex gap-2"><Link to={`/events/${e.slug}`} className="btn-navy px-3 py-2"><Ticket className="h-3.5 w-3.5" /> View pass</Link><button type="button" onClick={() => download(`ticket-${r.code}.txt`, `WS HUB PASS\n${e.title}\n${r.code}\n${r.name}`)} className="rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800 hover:bg-navy-50"><Download className="h-3.5 w-3.5" /></button></div></div>)}</div>)}
      {sub === "Past" && (past.length === 0 ? <Empty title="No past events yet" text="Events you've attended will appear here with feedback and certificate options." to="/events?when=Past+Events" cta="Browse past events" /> : <div className="grid gap-3">{past.map(({ r, e }) => { const fb = s.feedback.find((f) => f.eventSlug === e.slug); const cert = s.certificates.find((c) => c.eventSlug === e.slug); return <div key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><img src={e.cover} alt="" className="h-16 w-24 rounded-lg object-cover" /><div className="min-w-0 flex-1"><Link to={`/events/${e.slug}`} className="block text-[14.5px] font-bold text-navy-900 hover:text-navy-600">{e.title}</Link><p className="text-[12px] text-slate-500">{fmtEventDate(e.start)} · {r.status}</p>{fb && <p className="mt-1 flex items-center gap-1 text-[11.5px] text-gold-800">{Array.from({ length: fb.rating }).map((_, i) => <Star key={i} className="h-3 w-3" fill="currentColor" strokeWidth={0} />)} Your rating</p>}</div><div className="flex gap-2">{!fb && <Link to={`/events/${e.slug}`} className="btn-navy px-3 py-2">Rate event</Link>}{cert ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-2 text-[11.5px] font-semibold text-emerald-700"><Award className="h-3.5 w-3.5" /> Certificate</span> : <Link to={`/events/${e.slug}`} className="rounded-md border border-slate-300 px-3 py-2 text-[11.5px] font-semibold text-navy-800">Get certificate</Link>}</div></div>; })}</div>)}
      {sub === "Saved" && (saved.length === 0 ? <Empty title="No saved events" text="Tap the bookmark on any event to keep it here." to="/events" cta="Explore events" /> : <div className="grid gap-4 md:grid-cols-2">{saved.map((e) => e && <EventCard key={e.slug} e={e} view="grid" />)}</div>)}
      {sub === "Certificates" && (s.certificates.length === 0 ? <Empty title="No certificates yet" text="Attend an event, rate it and request your certificate of participation." to="/events?when=Past+Events" cta="Past events" /> : <div className="grid gap-3 sm:grid-cols-2">{s.certificates.map((c) => <div key={c.id} className="card overflow-hidden"><div className="bg-navy-900 p-5 text-center text-white"><Award className="mx-auto h-8 w-8 text-gold-400" /><p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/70">Certificate of Participation</p><p className="mt-1 text-[15px] font-bold">{c.eventTitle}</p><p className="text-[11.5px] text-white/70">Awarded to {s.user?.name} · {new Date(c.issuedAt).toLocaleDateString("en-IN")}</p><p className="mt-1 text-[10px] text-gold-400">{c.id}</p></div><div className="flex gap-2 p-3"><button type="button" onClick={() => download(`${c.id}.txt`, `WS HUB CERTIFICATE\n${c.eventTitle}\nAwarded to ${s.user?.name}\n${c.id}`)} className="btn-navy flex-1 py-2"><Download className="h-3.5 w-3.5" /> Download</button><button type="button" onClick={() => toast("Shared to LinkedIn (demo)")} className="flex-1 rounded-md border border-slate-300 py-2 text-[11.5px] font-semibold text-navy-800">Share on LinkedIn</button></div></div>)}</div>)}
      {sub === "Organizer" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Events hosted", events.filter((e) => e.organizer.name === "WS Hub").length], ["Registrations", s.registrations.length + 128], ["Attendance", "82%"], ["Revenue", fmtINR(s.registrations.reduce((a, r) => a + r.amount, 0) + 24500)]].map(([k, v]) => <div key={k as string} className="card p-4"><p className="text-[22px] font-black text-navy-900">{v}</p><p className="text-[11.5px] text-slate-500">{k}</p></div>)}</div>
          <div className="card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[15px] font-bold text-navy-900">Organizer tools</p><p className="text-[12.5px] text-slate-600">Create events, manage registrations, check-in with QR, issue certificates and export CSV.</p></div><div className="flex gap-2"><button type="button" onClick={() => toast("Event builder opens with the Organizer Dashboard milestone — our team can publish for you today", "info")} className="btn-navy px-4 py-2.5"><Calendar className="h-4 w-4" /> Create event</button><button type="button" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([["name,email,event,code,status", ...s.registrations.map((r) => `${r.name},${r.email},${r.eventTitle},${r.code},${r.status}`)].join("\n")], { type: "text/csv" })); a.download = "registrations.csv"; a.click(); }} className="rounded-md border border-slate-300 px-4 py-2.5 text-[12.5px] font-semibold text-navy-800 hover:bg-navy-50">Export CSV</button></div></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-[12.5px]"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Attendee</th><th className="px-3 py-2">Event</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="divide-y divide-line">{s.registrations.slice(0, 6).map((r) => <tr key={r.id}><td className="px-3 py-2 font-semibold text-navy-900">{r.name}</td><td className="px-3 py-2 text-slate-600">{r.eventTitle}</td><td className="px-3 py-2 font-mono text-slate-600">{r.code}</td><td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold">{r.status}</span></td></tr>)}{s.registrations.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500">Registrations you receive will appear here.</td></tr>}</tbody></table></div></div>
        </div>
      )}
    </div>
  );
}

/* ---------- Stories ---------- */
export function DashboardStories() {
  const s = useStore((x) => x);
  const [open, setOpen] = useState(false);
  const saved = s.saved.story.map(getStory).filter(Boolean);
  const liked = s.storyLikes.map(getStory).filter(Boolean);
  const totals = { views: s.userStories.reduce((a, x) => a + x.views, 0), reads: Math.round(s.userStories.reduce((a, x) => a + x.views, 0) * 0.62), shares: s.userStories.filter((x) => x.status === "Published").length * 7, comments: Object.values(s.comments).reduce((a, c) => a + c.length, 0) };
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Views", totals.views], ["Reads", totals.reads], ["Shares", totals.shares], ["Comments", totals.comments]].map(([k, v]) => <div key={k as string} className="card px-4 py-3"><p className="text-[20px] font-black text-navy-900">{v}</p><p className="text-[11px] text-slate-500">{k}</p></div>)}</div><button type="button" onClick={() => setOpen(true)} className="btn-navy px-4 py-2.5"><PenSquare className="h-4 w-4" /> Write a story</button></div>
      <Sec title={`Your stories (${s.userStories.length})`}>{s.userStories.length === 0 ? <Empty title="No stories yet" text="Share your founder journey, funding news or lessons learned — reviewed within 2 days." to="/stories" cta="See examples" /> : <div className="overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full text-left text-[12.5px]"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Views</th><th className="px-4 py-2.5">Status</th></tr></thead><tbody className="divide-y divide-line">{s.userStories.map((x) => <tr key={x.id}><td className="px-4 py-3 font-semibold text-navy-900">{x.title}</td><td className="px-4 py-3 text-slate-600">{x.category}</td><td className="px-4 py-3 text-slate-600">{x.views}</td><td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-0.5 text-[10.5px] font-bold", x.status === "Published" ? "bg-emerald-100 text-emerald-800" : x.status === "Pending Review" ? "bg-amber-100 text-amber-800" : x.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600")}>{x.status}</span></td></tr>)}</tbody></table></div>}</Sec>
      {saved.length > 0 && <Sec title={`Bookmarked (${saved.length})`}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{saved.map((x) => x && <StoryCard key={x.slug} s={x} />)}</div></Sec>}
      {liked.length > 0 && <Sec title={`Liked (${liked.length})`}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{liked.map((x) => x && <StoryCard key={x.slug} s={x} />)}</div></Sec>}
      {s.follows.length > 0 && <p className="text-[12.5px] text-slate-600">Following {s.follows.length} author{s.follows.length > 1 && "s"} — you'll be alerted when they publish.</p>}
      <SubmitStoryModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/* ---------- Membership ---------- */
export function DashboardMembership() {
  const s = useStore((x) => x);
  const [membership, setMembership] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    Promise.all([paymentApi.membership(), paymentApi.history(1, 12)])
      .then(([accountPlan, history]: any[]) => {
        if (!current) return;
        setMembership(accountPlan?.data ?? accountPlan);
        const rows = history?.data ?? history;
        setPayments(Array.isArray(rows) ? rows : []);
      })
      .catch((reason) => { if (current) setError(reason instanceof Error ? reason.message : "Could not load membership details."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  const planCode = membership?.plan?.code;
  const billing = planCode === "member_yearly" ? "yearly" : "monthly";
  const end = membership?.current_period_end ? new Date(membership.current_period_end) : null;
  const isActive = membership?.status === "active" && !!end && end > new Date();
  const paidPlan = isActive && ["member_monthly", "member_yearly"].includes(planCode) ? getPlan("premium")! : getPlan("free")!;
  const paidStatus = isActive ? "active" : membership?.status === "cancelled" ? "cancelled" : membership?.status === "expired" || (end && end <= new Date()) ? "expired" : "inactive";
  const used = { events: s.registrations.filter((r) => r.status !== "Cancelled").length, messages: s.connections.filter((c) => c.status === "Accepted").length, stories: s.userStories.length, saves: Object.values(s.saved).reduce((a, v) => a + v.length, 0) };
  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-700">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className={cn("rounded-xl p-5 text-white", isActive ? "bg-navy-900" : "bg-navy-800")}>
          <div className="flex items-start justify-between"><div><p className="text-[11px] uppercase tracking-wide text-white/70">Account membership</p><p className="text-[28px] font-black">{loading ? "Loading…" : isActive ? "WS Hub Membership" : "No active membership"}<span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 align-middle text-[11px] font-semibold capitalize">{paidStatus}</span></p><p className="text-[12.5px] text-white/75">{loading ? "Checking your account subscription" : isActive ? billing === "monthly" ? `₹3,100 initial payment · then ₹299/month autopay · renews ${end?.toLocaleDateString("en-IN")}` : `₹5,200/year · auto-renews ${end?.toLocaleDateString("en-IN")}` : "Choose monthly or yearly autopay to activate membership for your account."}</p><p className="mt-1 text-[11px] text-white/65">One membership covers all business and startup listings on your account.</p></div><Star className="h-8 w-8 text-gold-400" fill="currentColor" /></div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/membership" className="rounded-md border border-white/40 px-4 py-2 text-[12.5px] font-semibold hover:bg-white/10">Compare plans</Link>
            <Link to="/businesses/manage" className="rounded-md bg-gold-500 px-4 py-2 text-[12.5px] font-bold text-navy-900 hover:bg-gold-400">Manage listings</Link>
          </div>
        </div>
        <div className="card p-5"><p className="flex items-center gap-2 text-[14px] font-bold text-navy-900"><BarChart3 className="h-4 w-4" /> Account activity</p><ul className="mt-3 space-y-2.5 text-[12.5px]">{[["Events joined", used.events], ["Connections", used.messages], ["Stories published", used.stories], ["Saved items", used.saves]].map(([label, value]) => <li key={label as string} className="flex justify-between"><span className="text-slate-600">{label}</span><span className="font-semibold text-navy-900">{value}</span></li>)}</ul></div>
      </div>
      <Sec title="Account membership benefits"><p className="mb-3 text-[12px] text-slate-500">{isActive ? "Your active account membership applies across your business and startup listings." : "Choose a paid plan to activate account membership and publish your listings."}</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{comparison.map((row) => { const value = row.values[paidPlan.id]; return <div key={row.feature} className={cn("flex items-center justify-between rounded-lg border p-3 text-[12.5px]", value === false ? "border-dashed border-slate-200 text-slate-400" : "border-line bg-white text-navy-900")}><span>{row.feature}</span><span className="font-semibold">{value === true ? "✓" : value === false ? "—" : value}</span></div>; })}</div></Sec>
      <Sec title="Payment history">{loading ? <p className="text-[12.5px] text-slate-500">Loading account payments…</p> : payments.length === 0 ? <p className="text-[12.5px] text-slate-500">No account membership payments yet.</p> : <div className="overflow-x-auto rounded-xl border border-line bg-white"><table className="w-full text-left text-[12.5px]"><thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-4 py-2.5">Plan</th><th className="px-4 py-2.5">Amount</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Date</th></tr></thead><tbody className="divide-y divide-line">{payments.map((payment) => <tr key={payment.id}><td className="px-4 py-3 font-semibold text-navy-900">{payment.plan?.name || "Membership"}</td><td className="px-4 py-3">{fmtINR(Number(payment.amount || 0) / 100)}</td><td className="px-4 py-3 capitalize">{payment.status}</td><td className="px-4 py-3 text-slate-600">{new Date(payment.paid_at || payment.created_at).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table></div>}</Sec>
    </div>
  );
}
