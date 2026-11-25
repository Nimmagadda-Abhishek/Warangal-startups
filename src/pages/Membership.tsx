import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, BookOpen, Calendar, Check, CheckCircle2, ChevronDown, ChevronRight, Headphones, Landmark, Play, ShieldCheck, Star, Users, X, Zap } from "lucide-react";
import { comparison, fmtINR, getPlan, membershipFaq, planRank, plans, testimonials, type Plan } from "../membership";
import { Reveal } from "../components/Reveal";
import { AuthForm } from "../components/ui/AuthForm";
import { toast, useStore, type PlanId } from "../store";
import { cn } from "../utils/cn";
import { paymentApi } from "../api";

type Billing = "monthly" | "yearly";
const price = (p: Plan, b: Billing) => (b === "yearly" ? p.yearly : p.monthly);
const benefitIcons = [{ t: "Exclusive Events", i: Calendar }, { t: "Networking", i: Users }, { t: "Priority Access", i: Zap }, { t: "Learning Resources", i: BookOpen }, { t: "Community Support", i: Headphones }];

function PlanCard({ p, billing, current, currentBilling, currentStatus }: { p: Plan; billing: Billing; current: PlanId; currentBilling: Billing; currentStatus: string }) {
  const isCurrent = current === p.id && currentBilling === billing && currentStatus === "active";
  const downgrade = planRank[p.id] < planRank[current];
  return (
    <div className={cn("card relative flex flex-col p-5", p.popular && "border-2 border-gold-500 shadow-[0_18px_40px_-16px_rgba(226,176,74,0.5)]")}>
      {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-3 py-1 text-[10.5px] font-bold text-navy-900">Most Popular</span>}
      <h3 className="text-[20px] font-black text-navy-900">{p.name}</h3>
      <p className="text-[12px] text-slate-500">{p.tagline}</p>
      <p className="mt-4"><span className="text-[30px] font-black text-navy-900">{fmtINR(price(p, billing))}</span><span className="text-[12px] text-slate-500"> {billing === "yearly" ? "/ year · auto-renew" : "first payment"}</span>{p.monthly === 0 && <span className="text-[12px] text-slate-500"> · forever</span>}</p>
      {billing === "monthly" && p.monthlyAutopay && <p className="mt-1 text-[12px] font-semibold text-navy-700">Then {fmtINR(p.monthlyAutopay)}/month autopay</p>}
      {billing === "yearly" && p.monthly > 0 && <p className="text-[11px] font-semibold text-verified">Auto-renews once each year</p>}
      <ul className="mt-4 flex-1 space-y-2">{p.highlights.map((h) => <li key={h} className="flex items-start gap-2 text-[12.5px] text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-verified" /> {h}</li>)}</ul>
      <div className="mt-5 space-y-2">
        {isCurrent ? <span className="flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-50 py-2.5 text-[12.5px] font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Current plan</span>
          : <Link to={p.id === "free" ? "/signup" : `/membership/checkout?plan=${p.id}&billing=${billing}`} className={cn("flex w-full items-center justify-center rounded-md py-2.5 text-[12.5px] font-bold transition-all hover:-translate-y-0.5", p.popular ? "bg-gold-500 text-navy-900 hover:bg-gold-400" : "bg-navy-800 text-white hover:bg-navy-700")}>{downgrade ? "Downgrade at renewal" : p.cta}</Link>}
        <Link to={`/membership/${p.id}`} className="block text-center text-[11.5px] font-semibold text-navy-700 hover:underline">Plan details & FAQs</Link>
      </div>
    </div>
  );
}

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-verified" />;
  if (v === false) return <X className="mx-auto h-4 w-4 text-slate-300" />;
  return <span className="text-[12px] text-slate-700">{v}</span>;
}

export function Comparison({ highlight }: { highlight?: PlanId }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left">
        <thead><tr className="bg-slate-50 text-[12px]"><th className="px-4 py-3 font-semibold text-slate-500">Feature</th>{plans.map((p) => <th key={p.id} className={cn("px-4 py-3 text-center font-bold text-navy-900", highlight === p.id && "bg-gold-100/60")}>{p.name}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{comparison.map((r) => <tr key={r.feature}><td className="px-4 py-3 text-[12.5px] font-medium text-navy-900">{r.feature}</td>{plans.map((p) => <td key={p.id} className={cn("px-4 py-3 text-center", highlight === p.id && "bg-gold-100/30")}><Cell v={r.values[p.id]} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return <ul className="divide-y divide-line rounded-xl border border-line bg-white">{items.map((f, i) => <li key={f.q}><button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[13.5px] font-semibold text-navy-900">{f.q}<ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open === i && "rotate-180")} /></button><div className={cn("grid transition-all duration-300", open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}><p className="overflow-hidden px-4 text-[13px] text-slate-600"><span className="block pb-4">{f.a}</span></p></div></li>)}</ul>;
}

/* ================= Landing ================= */
export default function Membership() {
  const [params] = useSearchParams();
  const user = useStore((s) => s.user);
  const localMembership = useStore((s) => s.membership);
  const [accountMembership, setAccountMembership] = useState<any>(null);
  useEffect(() => { document.title = "Membership — WS Hub"; }, []);
  useEffect(() => { const p = params.get("plan"); if (p) setTimeout(() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }), 200); }, [params]);
  useEffect(() => {
    if (!user) { setAccountMembership(null); return; }
    let active = true;
    paymentApi.membership().then((data) => { if (active) setAccountMembership(data); }).catch(() => { if (active) setAccountMembership(null); });
    return () => { active = false; };
  }, [user]);
  const accountPlanCode = accountMembership?.plan?.code;
  const current: PlanId = accountMembership
    ? (["member_monthly", "member_yearly"].includes(accountPlanCode) && accountMembership.status === "active" ? "premium" : "free")
    : localMembership.plan;
  const currentBilling: Billing = accountPlanCode === "member_yearly" ? "yearly" : accountPlanCode === "member_monthly" ? "monthly" : localMembership.billing;
  const currentStatus = accountMembership ? accountMembership.status : localMembership.status;
  const memberPlan = plans.find((p) => p.id === "premium")!;

  return (
    <div className="page-in pb-20 lg:pb-0">
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0"><div className="absolute inset-y-0 right-0 w-full md:w-[55%]"><img src="/images/hero.jpg" alt="" className="h-full w-full object-cover" /></div><div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/30 md:via-45%" /></div>
        <div className="relative mx-auto max-w-[1280px] px-4 pb-10 pt-7 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-white/80"><Link to="/" className="hover:text-white">Home</Link><ChevronRight className="h-3 w-3" /><span className="font-semibold text-white">Membership</span></nav>
          <div className="mt-4 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
            <div><h1 className="text-[38px] font-black leading-none tracking-tight sm:text-[50px]">Become a <span className="text-gold-500">WS Hub Member</span></h1><p className="mt-3 max-w-[560px] text-[15px] text-white/90">Grow faster. Connect better. Unlock opportunities. Access exclusive events, investor connects, mentorship and more.</p></div>
            <div className="hidden lg:block"><p className="text-[17px] font-bold leading-snug">A stronger community<br />A brighter Warangal</p><span className="mt-2 block h-[2px] w-20 bg-gold-500" /></div>
          </div>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-semibold text-white"><ShieldCheck className="h-4 w-4 text-gold-400" /> Choose monthly or yearly automatic renewal</p>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div id="plans" className="-mt-4 grid gap-5 pt-8 md:grid-cols-2">{(["monthly", "yearly"] as const).map((cycle, i) => <Reveal key={cycle} delay={i * 70}><PlanCard p={memberPlan} billing={cycle} current={current} currentBilling={currentBilling} currentStatus={currentStatus} /></Reveal>)}</div>

        <Reveal className="mt-12"><h2 className="text-[20px] font-bold text-navy-900">Membership Benefits</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{benefitIcons.map((b) => <div key={b.t} className="card flex flex-col items-center gap-2 p-5 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><b.i className="h-6 w-6" strokeWidth={1.6} /></span><span className="text-[12.5px] font-semibold text-navy-900">{b.t}</span></div>)}</div></Reveal>

        {testimonials.length > 0 && <Reveal className="mt-12"><h2 className="text-[20px] font-bold text-navy-900">What members say</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{testimonials.map((t) => <Link key={t.name} to={t.to} className="card p-5"><div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 text-gold-500" fill="currentColor" strokeWidth={0} />)}</div><p className="mt-3 text-[13.5px] leading-relaxed text-slate-700">“{t.text}”</p><p className="mt-3 text-[12.5px] font-bold text-navy-900">{t.name}</p><p className="text-[11px] text-slate-500">{t.role}</p></Link>)}</div></Reveal>}

        <Reveal className="my-12 grid gap-8 lg:grid-cols-[1fr_1.2fr]"><div><h2 className="text-[20px] font-bold text-navy-900">Frequently asked questions</h2><p className="mt-1 text-[13px] text-slate-600">Still unsure? <Link to="/dashboard?tab=membership" className="font-semibold text-navy-700">Talk to us</Link> or start free and upgrade anytime.</p><div className="mt-5 rounded-xl bg-navy-900 p-5 text-white"><ShieldCheck className="h-7 w-7 text-gold-400" /><p className="mt-2 text-[15px] font-bold">7-day money-back guarantee</p><p className="text-[12.5px] text-white/75">Not the right fit? Cancel within 7 days for a full refund.</p></div></div><Faq items={membershipFaq} /></Reveal>
      </div>
    </div>
  );
}

/* ================= Plan detail ================= */
export function PlanDetail() {
  const { plan = "" } = useParams();
  const p = getPlan(plan);
  const current = useStore((s) => s.membership.plan);
  const currentBilling = useStore((s) => s.membership.billing);
  const currentStatus = useStore((s) => s.membership.status);
  const [billing, setBilling] = useState<Billing>("monthly");
  useEffect(() => { if (p) document.title = `${p.name} plan — Membership — WS Hub`; }, [p]);
  if (!p) return <Navigate to="/membership" replace />;
  return (
    <div className="page-in mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-slate-500"><Link to="/" className="hover:text-navy-800">Home</Link><ChevronRight className="h-3 w-3" /><Link to="/membership" className="hover:text-navy-800">Membership</Link><ChevronRight className="h-3 w-3" /><span className="font-semibold text-navy-900">{p.name}</span></nav>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <span className="rounded-md bg-gold-100 px-2 py-0.5 text-[11px] font-bold text-gold-800">{p.audience}</span>
          <h1 className="mt-2 text-[34px] font-black text-navy-900">{p.name} <span className="text-gold-500">Membership</span></h1>
          <p className="mt-1 text-[15px] text-slate-600">{p.tagline}</p>
          <button type="button" onClick={() => toast("Plan walkthrough video opens in the full release", "info")} className="group relative mt-6 block w-full overflow-hidden rounded-xl"><img src="https://images.pexels.com/photos/9275222/pexels-photo-9275222.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=1000" alt="" className="aspect-[2/1] w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center bg-navy-950/40"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-navy-900 transition-transform group-hover:scale-110"><Play className="ml-1 h-7 w-7" fill="currentColor" /></span></span><span className="absolute bottom-3 left-4 text-[13px] font-semibold text-white">Watch: What {p.name} members get (2:10)</span></button>
          <h2 className="mt-8 text-[18px] font-bold text-navy-900">Benefits</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">{p.highlights.map((h) => <li key={h} className="flex items-start gap-2 rounded-lg border border-line bg-white p-3 text-[13px] text-slate-700"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-verified" /> {h}</li>)}</ul>
          <h2 className="mt-8 text-[18px] font-bold text-navy-900">Compared with other plans</h2><div className="mt-3"><Comparison highlight={p.id} /></div>
          {testimonials.length > 0 && <><h2 className="mt-8 text-[18px] font-bold text-navy-900">Testimonials</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{testimonials.slice(0, 2).map((t) => <div key={t.name} className="rounded-lg border border-line bg-white p-4"><p className="text-[13px] text-slate-700">“{t.text}”</p><p className="mt-2 text-[12px] font-bold text-navy-900">{t.name} <span className="font-normal text-slate-500">· {t.role}</span></p></div>)}</div></>}
          <h2 className="mt-8 text-[18px] font-bold text-navy-900">FAQs</h2><div className="mt-3"><Faq items={membershipFaq} /></div>
          <p className="mt-6 text-[11.5px] text-slate-500">Monthly membership charges ₹3,100 initially and then ₹299 each month by autopay. Yearly membership is ₹5,200 for 12 months. See <Link to="/terms-of-service" className="underline">Terms of Service</Link>.</p>
        </div>
        <aside className="lg:sticky lg:top-[80px] lg:self-start">
          <div className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex rounded-md bg-slate-100 p-1 text-[12px] font-semibold">{(["monthly", "yearly"] as const).map((b) => <button key={b} type="button" onClick={() => setBilling(b)} className={cn("flex-1 rounded py-1.5 capitalize", billing === b ? "bg-white text-navy-900 shadow-sm" : "text-slate-500")}>{b}</button>)}</div>
            <p className="mt-4"><span className="text-[34px] font-black text-navy-900">{fmtINR(price(p, billing))}</span><span className="text-[12px] text-slate-500"> {billing === "yearly" ? "/ year · auto-renew" : "first payment"}</span></p>
            {billing === "monthly" && p.monthlyAutopay && <p className="mt-1 text-[12px] font-medium text-slate-600">Then {fmtINR(p.monthlyAutopay)}/month by autopay</p>}
            {current === p.id && currentBilling === billing && currentStatus === "active" ? <span className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-50 py-3 text-[13px] font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Your current plan</span>
              : <Link to={p.id === "free" ? "/signup" : `/membership/checkout?plan=${p.id}&billing=${billing}`} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-gold-500 py-3 text-[13px] font-bold text-navy-900 hover:bg-gold-400">{p.cta} <ArrowRight className="h-4 w-4" /></Link>}
            <ul className="mt-4 space-y-1.5 text-[12px] text-slate-600"><li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-verified" /> Payment verification</li><li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-verified" /> Membership linked to your listing</li><li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-verified" /> UPI, Card, Net banking</li></ul>
          </div>
          <div className="mt-4 rounded-xl bg-navy-900 p-5 text-white"><Landmark className="h-6 w-6 text-gold-400" /><p className="mt-2 text-[14px] font-bold">See what you unlock</p><div className="mt-2 flex flex-wrap gap-2 text-[11.5px] font-semibold">{[["Investor Connect", "/events/investor-connect-2026"], ["Investors", "/investors"], ["Opportunities", "/opportunities"]].map(([l, to]) => <Link key={l} to={to} className="rounded-md bg-white/10 px-2.5 py-1.5 hover:bg-white/20">{l}</Link>)}</div></div>
        </aside>
      </div>
    </div>
  );
}

/* ================= Checkout ================= */
let razorpayScriptPromise: Promise<void> | null = null;
function loadMembershipRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { razorpayScriptPromise = null; reject(new Error("Could not load Razorpay checkout. Check your connection and try again.")); };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

export function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const p = getPlan(params.get("plan") || "premium") ?? plans[2];
  const billing = (params.get("billing") as Billing) || "monthly";
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const amount = billing === "yearly" ? 5200 : 3100;
  useEffect(() => { document.title = "Membership Checkout — WS Hub"; }, []);
  const startPayment = async () => {
    setError(null); setPaying(true);
    try {
      await loadMembershipRazorpay();
      const response = await paymentApi.checkout(billing === "monthly" ? "member_monthly" : "member_yearly") as any;
      const checkout = response?.data ?? response;
      const subscriptionId = checkout.subscriptionId as string | undefined;
      const orderId = checkout.orderId as string | undefined;
      if (!subscriptionId && !orderId) throw new Error("The payment service did not return a checkout session.");
      const RazorpayCheckout = window.Razorpay;
      if (!RazorpayCheckout) throw new Error("Razorpay checkout did not load. Please try again.");
      new RazorpayCheckout({
        key: checkout.keyId,
        ...(subscriptionId ? { subscription_id: subscriptionId } : { order_id: orderId, amount: checkout.amount, currency: checkout.currency }),
        name: "WS Hub",
        description: billing === "monthly" ? "₹3,100 first payment, then ₹299 monthly autopay" : "₹5,200 yearly auto-renewing membership",
        prefill: checkout.prefill,
        theme: { color: "#0f2a5c" },
        handler: async (payment) => {
          try {
            await paymentApi.verify({
              ...(subscriptionId ? { razorpay_subscription_id: payment.razorpay_subscription_id || subscriptionId } : { razorpay_order_id: payment.razorpay_order_id || orderId }),
              razorpay_payment_id: payment.razorpay_payment_id,
              razorpay_signature: payment.razorpay_signature,
            });
            setSuccess(true);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Payment could not be verified. Your account membership has not been activated.");
          } finally { setPaying(false); }
        },
        modal: { ondismiss: () => setPaying(false) },
      }).open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start Razorpay checkout.");
      setPaying(false);
    }
  };

  if (!user) return <div className="page-in mx-auto max-w-md px-4 py-12"><h1 className="text-[24px] font-black text-navy-900">Sign in to continue</h1><p className="mt-1 text-[13px] text-slate-600">Create a free account first — then complete your {p.name} membership.</p><div className="mt-5 rounded-xl border border-line bg-white p-6 shadow-[var(--shadow-card)]"><AuthForm compact /></div></div>;
  if (p.id === "free") return <Navigate to="/dashboard" replace />;
  if (p.id !== "premium") return <Navigate to="/membership" replace />;

  return (
    <div className="page-in mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-slate-500"><Link to="/membership" className="hover:text-navy-800">Membership</Link><ChevronRight className="h-3 w-3" /><Link to={`/membership/${p.id}`} className="hover:text-navy-800">Choose Plan</Link><ChevronRight className="h-3 w-3" /><span className="font-semibold text-navy-900">Payment</span></nav>
      <h1 className="mt-3 text-[26px] font-black text-navy-900">Membership Checkout</h1>
      {success ? <section className="mx-auto mt-8 max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h2 className="mt-3 text-[21px] font-black text-navy-900">Account membership active</h2><p className="mt-2 text-[13px] text-slate-700">Your payment was verified. This membership applies to the business and startup listings on your account.</p><button type="button" onClick={() => navigate("/businesses/manage")} className="mt-5 rounded-md bg-gold-500 px-5 py-3 text-[13px] font-bold text-navy-900 hover:bg-gold-400">Manage my listings</button></section> : <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-line bg-white p-5"><p className="text-[12px] font-bold uppercase tracking-wide text-slate-500">Selected membership</p><div className="mt-2 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold-500 text-navy-900"><Star className="h-5 w-5" fill="currentColor" /></span><div><p className="text-[16px] font-bold text-navy-900">{p.name} Membership</p><p className="text-[12px] text-slate-500">{billing === "monthly" ? "First payment" : "One payment for 12 months"}: {fmtINR(amount)}</p>{billing === "monthly" && <p className="text-[12px] font-medium text-navy-700">Then ₹299/month by autopay</p>}</div></div></section>
          <section className="rounded-xl border border-line bg-white p-5"><p className="text-[14px] font-bold text-navy-900">Account membership</p><p className="mt-2 text-[12px] leading-relaxed text-slate-600">This plan belongs to your WS Hub account. Once payment is verified, you can publish any business or startup listing you own while the membership is active.</p></section>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{error}</p>}
        </div>
        <aside className="lg:sticky lg:top-[80px] lg:self-start"><div className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]"><p className="text-[14px] font-bold text-navy-900">Payment summary</p><dl className="mt-3 space-y-2 text-[13px]"><div className="flex justify-between"><dt className="text-slate-600">{billing === "monthly" ? "Initial membership payment" : "Yearly membership"}</dt><dd className="font-semibold">{fmtINR(amount)}</dd></div>{billing === "monthly" && <div className="flex justify-between"><dt className="text-slate-600">Monthly autopay after initial payment</dt><dd className="font-semibold">₹299/month</dd></div>}<div className="flex justify-between border-t border-line pt-2 text-[16px]"><dt className="font-bold text-navy-900">Due today</dt><dd className="font-black text-navy-900">{fmtINR(amount)}</dd></div></dl><button type="button" disabled={paying} onClick={() => void startPayment()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-navy-800 py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-60">{paying ? "Waiting for Razorpay…" : `Pay ${fmtINR(amount)}`}</button><p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Secure payment through Razorpay</p><p className="mt-2 text-center text-[10.5px] text-slate-500">{billing === "monthly" ? "₹3,100 today, then ₹299/month by autopay." : "₹5,200 today, renewing automatically each year."}</p></div></aside>
      </div>}
    </div>
  );
}
