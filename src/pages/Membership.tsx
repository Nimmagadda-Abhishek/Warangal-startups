import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, BadgeCheck, BookOpen, Calendar, Check, CheckCircle2, ChevronDown, ChevronRight, Headphones, Landmark, Loader2, Lock, Play, ShieldCheck, Star, Users, X, Zap } from "lucide-react";
import { comparison, fmtINR, getPlan, membershipFaq, planRank, plans, testimonials, type Plan } from "../membership";
import { Reveal } from "../components/Reveal";
import { AuthForm } from "../components/ui/AuthForm";
import { toast, useStore, type PlanId } from "../store";
import { cn } from "../utils/cn";
import { paymentApi } from "../api";

type Billing = "monthly" | "yearly";
const price = (p: Plan, b: Billing) => (b === "yearly" ? p.yearly : p.monthly);
const benefitIcons = [{ t: "Exclusive Events", i: Calendar }, { t: "Networking", i: Users }, { t: "Priority Access", i: Zap }, { t: "Learning Resources", i: BookOpen }, { t: "Community Support", i: Headphones }];

/* -------------------------------------------------------------------------- */
/*  Design tokens — flat, high contrast, 44px targets, visible focus           */
/* -------------------------------------------------------------------------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

const btnBase =
  "inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-[14px] font-bold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 " + focusRing;
const btnGold = `${btnBase} bg-gold-500 text-navy-900 hover:bg-gold-400`;
const btnNavy = `${btnBase} bg-navy-800 text-white hover:bg-navy-700`;

const crumbLink = `rounded hover:text-navy-800 hover:underline ${focusRing}`;

function H2({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-[22px] font-extrabold leading-tight text-navy-900", className)}>{children}</h2>;
}

function CurrentBadge({ label = "Current plan" }: { label?: string }) {
  return (
    <span role="status" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-[14px] font-bold text-emerald-800">
      <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

function PlanCard({ p, billing, current, currentBilling, currentStatus }: { p: Plan; billing: Billing; current: PlanId; currentBilling: Billing; currentStatus: string }) {
  const isCurrent = current === p.id && currentBilling === billing && currentStatus === "active";
  const downgrade = planRank[p.id] < planRank[current];
  return (
    <div className={cn("card relative flex flex-col p-6", p.popular && "border-2 border-gold-500")}>
      {p.popular && <span className="absolute -top-3 left-6 rounded-md bg-gold-500 px-3 py-1 text-[12px] font-bold text-navy-900">Most Popular</span>}
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[22px] font-extrabold text-navy-900">{p.name}</h3>
        <span className="rounded-md bg-navy-50 px-2.5 py-1 text-[12px] font-bold capitalize text-navy-800">{billing}</span>
      </div>
      <p className="mt-1 text-[13.5px] text-slate-600">{p.tagline}</p>

      <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[36px] font-extrabold leading-none text-navy-900">{fmtINR(price(p, billing))}</span>
        <span className="text-[13.5px] text-slate-600">{billing === "yearly" ? "/ year · auto-renew" : "first payment"}{p.monthly === 0 && " · forever"}</span>
      </p>
      {billing === "monthly" && p.monthlyAutopay && <p className="mt-1.5 text-[14px] font-semibold text-navy-700">Then {fmtINR(p.monthlyAutopay)}/month autopay</p>}
      {billing === "yearly" && p.monthly > 0 && <p className="mt-1.5 text-[13.5px] font-semibold text-emerald-800">Auto-renews once each year</p>}

      <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5">
        {p.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2.5 text-[14px] leading-6 text-slate-700">
            <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-verified" /> {h}
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-1">
        {isCurrent ? <CurrentBadge />
          : <Link to={p.id === "free" ? "/signup" : `/membership/checkout?plan=${p.id}&billing=${billing}`} className={p.popular ? btnGold : btnNavy}>{downgrade ? "Downgrade at renewal" : p.cta}</Link>}
        <Link to={`/membership/${p.id}`} className={`flex min-h-11 items-center justify-center rounded text-[13.5px] font-semibold text-navy-700 hover:underline ${focusRing}`}>Plan details &amp; FAQs</Link>
      </div>
    </div>
  );
}

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <><Check aria-hidden="true" className="mx-auto h-4 w-4 text-verified" /><span className="sr-only">Included</span></>;
  if (v === false) return <><X aria-hidden="true" className="mx-auto h-4 w-4 text-slate-400" /><span className="sr-only">Not included</span></>;
  return <span className="text-[13px] text-slate-800">{v}</span>;
}

export function Comparison({ highlight }: { highlight?: PlanId }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left">
        <caption className="sr-only">Membership plan comparison</caption>
        <thead>
          <tr className="bg-slate-50 text-[13px]">
            <th scope="col" className="px-4 py-3.5 font-semibold text-slate-700">Feature</th>
            {plans.map((p) => <th scope="col" key={p.id} className={cn("px-4 py-3.5 text-center font-bold text-navy-900", highlight === p.id && "bg-gold-100/70")}>{p.name}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {comparison.map((r) => (
            <tr key={r.feature}>
              <th scope="row" className="px-4 py-3.5 text-[13.5px] font-medium text-navy-900">{r.feature}</th>
              {plans.map((p) => <td key={p.id} className={cn("px-4 py-3.5 text-center", highlight === p.id && "bg-gold-100/40")}><Cell v={r.values[p.id]} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <li key={f.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-btn-${i}`}
                className={`flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 px-5 py-3 text-left text-[14.5px] font-semibold text-navy-900 transition-colors hover:bg-navy-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-700`}
              >
                {f.q}
                <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 motion-safe:transition-transform", isOpen && "rotate-180")} />
              </button>
            </h3>
            <div id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} hidden={!isOpen}>
              <p className="px-5 pb-5 text-[14px] leading-6 text-slate-700">{f.a}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
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
      <section className="relative overflow-hidden border-b-4 border-gold-500 bg-navy-900 text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 right-0 w-full md:w-[55%]"><img src="/images/hero.jpg" alt="" className="h-full w-full object-cover" /></div>
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/40 md:via-45%" />
        </div>
        <div className="relative mx-auto max-w-[1280px] px-4 pb-12 pt-7 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-white/85">
            <Link to="/" className={`rounded hover:text-white hover:underline ${focusRing}`}>Home</Link>
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            <span aria-current="page" className="font-semibold text-white">Membership</span>
          </nav>
          <div className="mt-5 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <h1 className="text-[36px] font-extrabold leading-[1.1] tracking-tight sm:text-[48px]">Become a <span className="text-gold-400">WS Hub Member</span></h1>
              <p className="mt-4 max-w-[580px] text-[16px] leading-7 text-white/90">Grow faster. Connect better. Unlock opportunities. Access exclusive events, investor connects, mentorship and more.</p>
            </div>
            <div className="hidden lg:block">
              <p className="text-[17px] font-bold leading-snug">A stronger community<br />A brighter Warangal</p>
              <span aria-hidden="true" className="mt-2 block h-[3px] w-20 bg-gold-500" />
            </div>
          </div>
          <p className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-gold-400" /> Choose monthly or yearly automatic renewal
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div id="plans" className="grid gap-6 pt-10 md:grid-cols-2">
          {(["monthly", "yearly"] as const).map((cycle, i) => (
            <Reveal key={cycle} delay={i * 70}><PlanCard p={memberPlan} billing={cycle} current={current} currentBilling={currentBilling} currentStatus={currentStatus} /></Reveal>
          ))}
        </div>

        <Reveal className="mt-14">
          <H2>Membership Benefits</H2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {benefitIcons.map((b) => (
              <li key={b.t} className="card flex flex-col items-center gap-3 p-5 text-center">
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><b.i className="h-6 w-6" strokeWidth={1.6} /></span>
                <span className="text-[13.5px] font-semibold text-navy-900">{b.t}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {testimonials.length > 0 && (
          <Reveal className="mt-14">
            <H2>What members say</H2>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <li key={t.name}>
                  <Link to={t.to} className={`card flex h-full flex-col p-5 transition-shadow duration-200 hover:shadow-md ${focusRing}`}>
                    <span role="img" aria-label="5 out of 5 stars" className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} aria-hidden="true" className="h-4 w-4 text-gold-500" fill="currentColor" strokeWidth={0} />)}
                    </span>
                    <p className="mt-3 flex-1 text-[14.5px] leading-6 text-slate-700">“{t.text}”</p>
                    <p className="mt-4 text-[14px] font-bold text-navy-900">{t.name}</p>
                    <p className="text-[13px] text-slate-600">{t.role}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <Reveal className="my-14 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <H2>Frequently asked questions</H2>
            <p className="mt-2 text-[14.5px] leading-6 text-slate-700">Still unsure? <Link to="/dashboard?tab=membership" className={`font-semibold text-navy-700 underline-offset-2 hover:underline ${focusRing} rounded`}>Talk to us</Link> or start free and upgrade anytime.</p>
            <div className="mt-6 rounded-xl bg-navy-900 p-6 text-white">
              <ShieldCheck aria-hidden="true" className="h-7 w-7 text-gold-400" />
              <p className="mt-3 text-[16px] font-bold">7-day money-back guarantee</p>
              <p className="mt-1 text-[14px] leading-6 text-white/85">Not the right fit? Cancel within 7 days for a full refund.</p>
            </div>
          </div>
          <Faq items={membershipFaq} />
        </Reveal>
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
  const isCurrent = current === p.id && currentBilling === billing && currentStatus === "active";
  return (
    <div className="page-in mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-slate-600">
        <Link to="/" className={crumbLink}>Home</Link><ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        <Link to="/membership" className={crumbLink}>Membership</Link><ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        <span aria-current="page" className="font-semibold text-navy-900">{p.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <span className="inline-flex rounded-md bg-gold-100 px-2.5 py-1 text-[12px] font-bold text-gold-800">{p.audience}</span>
          <h1 className="mt-3 text-[34px] font-extrabold leading-tight text-navy-900">{p.name} <span className="text-gold-600">Membership</span></h1>
          <p className="mt-2 text-[16px] leading-7 text-slate-700">{p.tagline}</p>

          <button type="button" aria-label={`Watch: What ${p.name} members get (2:10)`} onClick={() => toast("Plan walkthrough video opens in the full release", "info")} className={`group relative mt-6 block w-full cursor-pointer overflow-hidden rounded-xl ${focusRing}`}>
            <img src="https://images.pexels.com/photos/9275222/pexels-photo-9275222.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=1000" alt="" loading="lazy" className="aspect-[2/1] w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-navy-950/50">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-navy-900 motion-safe:transition-transform motion-safe:group-hover:scale-105"><Play aria-hidden="true" className="ml-1 h-7 w-7" fill="currentColor" /></span>
            </span>
            <span className="absolute bottom-3 left-4 text-[14px] font-semibold text-white">Watch: What {p.name} members get (2:10)</span>
          </button>

          <H2 className="mt-10 text-[20px]">Benefits</H2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {p.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5 rounded-xl border border-line bg-white p-4 text-[14px] leading-6 text-slate-700">
                <BadgeCheck aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-verified" /> {h}
              </li>
            ))}
          </ul>

          <H2 className="mt-10 text-[20px]">Compared with other plans</H2>
          <div className="mt-4"><Comparison highlight={p.id} /></div>

          {testimonials.length > 0 && (
            <>
              <H2 className="mt-10 text-[20px]">Testimonials</H2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {testimonials.slice(0, 2).map((t) => (
                  <li key={t.name} className="rounded-xl border border-line bg-white p-5">
                    <p className="text-[14.5px] leading-6 text-slate-700">“{t.text}”</p>
                    <p className="mt-3 text-[13.5px] font-bold text-navy-900">{t.name} <span className="font-normal text-slate-600">· {t.role}</span></p>
                  </li>
                ))}
              </ul>
            </>
          )}

          <H2 className="mt-10 text-[20px]">FAQs</H2>
          <div className="mt-4"><Faq items={membershipFaq} /></div>
          <p className="mt-6 text-[13px] leading-5 text-slate-600">Monthly membership charges ₹3,100 initially and then ₹299 each month by autopay. Yearly membership is ₹5,200 for 12 months. See <Link to="/terms-of-service" className={`underline ${focusRing} rounded`}>Terms of Service</Link>.</p>
        </div>

        <aside className="lg:sticky lg:top-[80px] lg:self-start">
          <div className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <div role="group" aria-label="Billing period" className="flex rounded-lg bg-slate-100 p-1 text-[13.5px] font-semibold">
              {(["monthly", "yearly"] as const).map((b) => (
                <button key={b} type="button" aria-pressed={billing === b} onClick={() => setBilling(b)} className={cn("min-h-11 flex-1 cursor-pointer rounded-md capitalize transition-colors duration-200", focusRing, billing === b ? "bg-white text-navy-900 shadow-sm" : "text-slate-700 hover:text-navy-900")}>{b}</button>
              ))}
            </div>
            <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
              <span className="text-[36px] font-extrabold leading-none text-navy-900">{fmtINR(price(p, billing))}</span>
              <span className="text-[13.5px] text-slate-600">{billing === "yearly" ? "/ year · auto-renew" : "first payment"}</span>
            </p>
            {billing === "monthly" && p.monthlyAutopay && <p className="mt-1.5 text-[14px] font-medium text-slate-700">Then {fmtINR(p.monthlyAutopay)}/month by autopay</p>}
            <div className="mt-5">
              {isCurrent ? <CurrentBadge label="Your current plan" />
                : <Link to={p.id === "free" ? "/signup" : `/membership/checkout?plan=${p.id}&billing=${billing}`} className={btnGold}>{p.cta} <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>}
            </div>
            <ul className="mt-5 space-y-2 border-t border-line pt-4 text-[13.5px] text-slate-700">
              {["Payment verification", "Membership linked to your listing", "UPI, Card, Net banking"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check aria-hidden="true" className="h-4 w-4 text-verified" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4 rounded-xl bg-navy-900 p-5 text-white">
            <Landmark aria-hidden="true" className="h-6 w-6 text-gold-400" />
            <p className="mt-2 text-[15px] font-bold">See what you unlock</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-semibold">
              {[["Investor Connect", "/events/investor-connect-2026"], ["Investors", "/investors"], ["Opportunities", "/opportunities"]].map(([l, to]) => (
                <Link key={l} to={to} className="inline-flex min-h-10 items-center rounded-lg bg-white/10 px-3 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">{l}</Link>
              ))}
            </div>
          </div>
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

  if (!user) {
    return (
      <div className="page-in mx-auto max-w-md px-4 py-12">
        <h1 className="text-[26px] font-extrabold text-navy-900">Sign in to continue</h1>
        <p className="mt-2 text-[14.5px] leading-6 text-slate-700">Create a free account first — then complete your {p.name} membership.</p>
        <div className="mt-6 rounded-xl border border-line bg-white p-6 shadow-[var(--shadow-card)]"><AuthForm compact /></div>
      </div>
    );
  }
  if (p.id === "free") return <Navigate to="/dashboard" replace />;
  if (p.id !== "premium") return <Navigate to="/membership" replace />;

  const steps = ["Choose plan", "Payment", "Membership active"];
  const stepIdx = success ? 2 : 1;

  return (
    <div className="page-in mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-slate-600">
        <Link to="/membership" className={crumbLink}>Membership</Link><ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        <Link to={`/membership/${p.id}`} className={crumbLink}>Choose Plan</Link><ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        <span aria-current="page" className="font-semibold text-navy-900">Payment</span>
      </nav>
      <h1 className="mt-3 text-[28px] font-extrabold text-navy-900">Membership Checkout</h1>

      <ol aria-label="Checkout progress" className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === stepIdx ? "step" : undefined} className={cn("flex items-center gap-2 font-semibold", i <= stepIdx ? "text-navy-900" : "text-slate-500")}>
            <span aria-hidden="true" className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold", i < stepIdx ? "bg-emerald-600 text-white" : i === stepIdx ? "bg-navy-800 text-white" : "bg-slate-200 text-slate-600")}>
              {i < stepIdx ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {success ? (
        <section role="status" className="mx-auto mt-8 max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12 text-emerald-700" />
          <h2 className="mt-3 text-[22px] font-extrabold text-navy-900">Account membership active</h2>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-6 text-slate-700">Your payment was verified. This membership applies to the business and startup listings on your account.</p>
          <button type="button" onClick={() => navigate("/businesses/manage")} className={`${btnGold} mx-auto mt-6 max-w-xs`}>Manage my listings</button>
        </section>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="rounded-xl border border-line bg-white p-5">
              <p className="text-[12px] font-bold uppercase tracking-wider text-slate-600">Selected membership</p>
              <div className="mt-3 flex items-center gap-4">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-navy-900"><Star className="h-5 w-5" fill="currentColor" /></span>
                <div>
                  <p className="text-[17px] font-bold text-navy-900">{p.name} Membership</p>
                  <p className="text-[13.5px] text-slate-700">{billing === "monthly" ? "First payment" : "One payment for 12 months"}: <strong className="text-navy-900">{fmtINR(amount)}</strong></p>
                  {billing === "monthly" && <p className="text-[13.5px] font-medium text-navy-700">Then ₹299/month by autopay</p>}
                </div>
              </div>
            </section>
            <section className="rounded-xl border border-line bg-white p-5">
              <h2 className="text-[15px] font-bold text-navy-900">Account membership</h2>
              <p className="mt-2 text-[14px] leading-6 text-slate-700">This plan belongs to your WS Hub account. Once payment is verified, you can publish any business or startup listing you own while the membership is active.</p>
            </section>
            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[14px] leading-6 text-red-800">
                <AlertCircle aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" /> {error}
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-[80px] lg:self-start">
            <div className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-[15px] font-bold text-navy-900">Payment summary</h2>
              <dl className="mt-4 space-y-2.5 text-[14px]">
                <div className="flex justify-between gap-4"><dt className="text-slate-700">{billing === "monthly" ? "Initial membership payment" : "Yearly membership"}</dt><dd className="font-semibold text-navy-900">{fmtINR(amount)}</dd></div>
                {billing === "monthly" && <div className="flex justify-between gap-4"><dt className="text-slate-700">Monthly autopay after initial payment</dt><dd className="shrink-0 font-semibold text-navy-900">₹299/month</dd></div>}
                <div className="flex justify-between border-t border-line pt-3 text-[17px]"><dt className="font-bold text-navy-900">Due today</dt><dd className="font-extrabold text-navy-900">{fmtINR(amount)}</dd></div>
              </dl>
              <button type="button" disabled={paying} aria-busy={paying} onClick={() => void startPayment()} className={`${btnNavy} mt-5`}>
                {paying ? <><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> Waiting for Razorpay…</> : <><Lock aria-hidden="true" className="h-4 w-4" /> Pay {fmtINR(amount)}</>}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-slate-700"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-700" /> Secure payment through Razorpay</p>
              <p className="mt-2 text-center text-[12.5px] leading-5 text-slate-600">{billing === "monthly" ? "₹3,100 today, then ₹299/month by autopay." : "₹5,200 today, renewing automatically each year."}</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}