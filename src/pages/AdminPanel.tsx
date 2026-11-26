import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { BadgeCheck, Building2, CreditCard, RefreshCw, Search, ShieldAlert, Users, X, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { adminApi, type ApiMeta } from "../api";
import { Shimmer } from "../components/ui/Shimmer";
import { useStore } from "../store";
import { cn } from "../utils/cn";

/* ───────────────────────── Types ───────────────────────── */

type AdminStats = { users: number; pendingUsers: number; businesses: number; published: number; revenueMinor: number };
type AdminUser = { id: string; email?: string; full_name: string; role: string; approval_status: string; created_at: string; city?: string; country?: string };
type AdminBusiness = { id: string; name: string; slug: string; owner_id: string; category_id?: string; city?: string; status: string; email?: string; phone?: string; created_at: string };
type AdminPayment = {
  id: string; user_id: string; business_id?: string; razorpay_order_id: string; razorpay_payment_id?: string;
  amount: number; currency: string; status: string; payment_type?: string; paid_at?: string; created_at: string;
  plan?: { code?: string; name?: string } | null; business?: { name?: string } | null;
  payer?: { full_name?: string; email?: string } | null;
};
type Tab = "users" | "businesses" | "payments";

/* ───────────────────────── Helpers & tokens ───────────────────────── */

const dateLabel = (value?: string) => (value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
const moneyLabel = (minor: number, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency }).format((minor || 0) / 100);

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const EASE = "transition-colors duration-200 motion-reduce:transition-none";
const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[14px] text-ink placeholder:text-slate-500 outline-none transition-shadow focus:border-navy-700 focus:ring-2 focus:ring-gold-500/60";

const TONES = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  bad: "border-red-200 bg-red-50 text-red-800",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
} as const;
const toneOf = (s: string): keyof typeof TONES =>
  s === "paid" || s === "approved" || s === "published" ? "good" : s === "failed" || s === "rejected" || s === "suspended" ? "bad" : "warn";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "users", label: "Users", icon: Users },
  { key: "businesses", label: "Businesses", icon: Building2 },
  { key: "payments", label: "Payments", icon: CreditCard },
];

/* ───────────────────────── Small UI pieces ───────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const tone = toneOf(status);
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold capitalize", TONES[tone])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone === "good" ? "bg-emerald-600" : tone === "bad" ? "bg-red-600" : "bg-amber-600")} aria-hidden="true" />
      {status}
    </span>
  );
}

function Meta({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-slate-600">{children}</p>;
}
function IdLine({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 break-all font-mono text-[12px] text-slate-500">{children}</p>;
}
function EmptyRow({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-700" aria-hidden="true"><Search className="h-5 w-5" /></span>
      <p className="text-[14px] font-medium text-slate-700">{text}</p>
      <p className="text-[13px] text-slate-500">Try a different status or clear the search.</p>
    </div>
  );
}
function PagerBtn(props: { disabled: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn("inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-navy-800 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40", EASE, FOCUS)}
    >
      {props.children}
      <span className="sr-only sm:not-sr-only">{props.label}</span>
    </button>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function AdminPanel() {
  const user = useStore((state) => state.user);
  const [tab, setTab] = useState<Tab>("users");
  const [status, setStatus] = useState("pending");
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [confirming, setConfirming] = useState("");
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [homepageOrder, setHomepageOrder] = useState<"latest" | "rating">("latest");
  const [homepageOrderSaved, setHomepageOrderSaved] = useState<"latest" | "rating">("latest");
  const [savingHomepageOrder, setSavingHomepageOrder] = useState(false);
  const [homepageOrderMessage, setHomepageOrderMessage] = useState("");
  const [homepageOrderError, setHomepageOrderError] = useState("");

  const metrics: { label: string; value: number | string; icon: LucideIcon; highlight?: boolean }[] = [
    { label: "Total users", value: stats?.users ?? "—", icon: Users },
    { label: "Awaiting approval", value: stats?.pendingUsers ?? "—", icon: BadgeCheck, highlight: (stats?.pendingUsers ?? 0) > 0 },
    { label: "Businesses", value: stats?.businesses ?? "—", icon: Building2 },
    { label: "Paid revenue", value: stats ? moneyLabel(stats.revenueMinor) : "—", icon: CreditCard },
  ];

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [statsResult, listResult] = await Promise.all([
        adminApi.stats(),
        tab === "users"
          ? adminApi.users({ page, limit: 20, q: query.trim() || undefined, approvalStatus: status === "all" ? undefined : status })
          : tab === "businesses"
            ? adminApi.businesses({ page, limit: 20, status: status === "all" ? undefined : status })
            : adminApi.payments({ page, limit: 20, status: status === "all" ? undefined : status }),
      ]);
      setStats(statsResult);
      setMeta(listResult.meta);
      if (tab === "users") setUsers(listResult.data as AdminUser[]);
      else if (tab === "businesses") setBusinesses(listResult.data as AdminBusiness[]);
      else setPayments(listResult.data as AdminPayment[]);
      setAuthorized(true);
    } catch (reason) {
      const apiError = reason as Error & { status?: number };
      if (apiError.status === 401 || apiError.status === 403) setAuthorized(false);
      setError(apiError.message || "Could not load the admin console.");
    } finally { setLoading(false); }
  }, [page, query, status, tab]);

  useEffect(() => { void load(); }, [load]);

  // Debounce the name search so we don't hit the API on every keystroke.
  useEffect(() => {
    if (queryInput === query) return;
    const t = setTimeout(() => { setQuery(queryInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [queryInput, query]);

  useEffect(() => {
    adminApi.homepageFeaturedOrder().then(({ order }) => { setHomepageOrder(order); setHomepageOrderSaved(order); })
      .catch((reason: unknown) => setHomepageOrderError(reason instanceof Error ? reason.message : "Could not load homepage display order."));
  }, []);

  const changeTab = (next: Tab) => {
    setTab(next); setPage(1); setQuery(""); setQueryInput(""); setConfirming("");
    setStatus(next === "users" ? "pending" : "all");
  };
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].key;
    changeTab(next);
    requestAnimationFrame(() => document.getElementById(`admin-tab-${next}`)?.focus());
  };

  const reviewUser = async (id: string, nextStatus: "approved" | "rejected") => {
    setBusy(id); setError(""); setConfirming("");
    try { await adminApi.approveUser(id, nextStatus, nextStatus === "rejected" ? "Please contact WS Hub support for next steps." : undefined); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update account approval."); }
    finally { setBusy(""); }
  };

  const saveHomepageOrder = async () => {
    setSavingHomepageOrder(true); setHomepageOrderError(""); setHomepageOrderMessage("");
    try {
      const result = await adminApi.setHomepageFeaturedOrder(homepageOrder);
      setHomepageOrderSaved(result.order);
      setHomepageOrderMessage("Homepage display order saved.");
    } catch (reason) {
      setHomepageOrderError(reason instanceof Error ? reason.message : "Could not save homepage display order.");
    } finally { setSavingHomepageOrder(false); }
  };

  if (!user) return <Navigate to="/login" replace state={{ from: "/admin" }} />;
  if (user.role !== "Admin") return <Navigate to="/dashboard" replace />;

  const filterOptions =
    tab === "users" ? (
      <>
        <option value="pending">Pending review</option><option value="approved">Approved</option>
        <option value="rejected">Rejected</option><option value="all">All users</option>
      </>
    ) : tab === "businesses" ? (
      <>
        <option value="all">All businesses</option><option value="draft">Drafts</option>
        <option value="published">Published</option><option value="suspended">Suspended</option>
      </>
    ) : (
      <>
        <option value="all">All payments</option><option value="created">Pending</option>
        <option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
      </>
    );

  return (
    <main className="page-in mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
      {/* ═════════ Header ═════════ */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-gold-500 pb-5">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-gold-800">WS Hub administration</p>
          <h1 className="mt-1.5 text-[30px] font-bold leading-tight tracking-tight text-navy-900">Admin panel</h1>
          <p className="mt-1 text-[14px] text-slate-600">Review accounts, inspect businesses, and track payments.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className={cn("inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-[13px] font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-60", EASE, FOCUS)}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin motion-reduce:animate-none")} aria-hidden="true" /> Refresh
        </button>
      </header>

      {error && (
        <div role="alert" className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error" className={cn("rounded p-0.5 hover:bg-red-100", FOCUS)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {authorized === false ? (
        <section className="mt-8 rounded-xl border border-line border-t-[3px] border-t-gold-500 bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700" aria-hidden="true"><ShieldAlert className="h-7 w-7" /></span>
          <h2 className="mt-4 text-[19px] font-bold tracking-tight text-navy-900">Administrator access required</h2>
          <p className="mx-auto mt-1.5 max-w-md text-[14px] text-slate-600">Sign in with an account assigned the admin role to use this page.</p>
          <Link to="/dashboard" className={cn("btn-navy mt-6 inline-flex min-h-[44px] items-center px-6 text-[13px]", FOCUS)}>Return to dashboard</Link>
        </section>
      ) : (
        <>
          {/* ═════════ Metrics ═════════ */}
          <section aria-label="Key metrics" className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon, highlight }) => (
              <article key={label} className="flex items-center gap-4 rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", highlight ? "bg-gold-100 text-gold-800" : "bg-navy-900 text-gold-400")} aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  {loading && !stats ? <Shimmer className="h-7 w-20" /> : <p className="truncate text-[24px] font-bold leading-none tracking-tight text-navy-900 tabular-nums">{value}</p>}
                  <p className="mt-1.5 text-[13px] text-slate-600">{label}</p>
                </div>
              </article>
            ))}
          </section>

          {/* ═════════ Homepage order ═════════ */}
          <section className="mt-6 rounded-xl border border-line border-l-4 border-l-gold-500 bg-white p-5 shadow-[var(--shadow-card)] sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div>
              <h2 className="text-[16px] font-bold tracking-tight text-navy-900">Homepage business and startup order</h2>
              <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-slate-600">
                Choose which published listings appear first in Featured Businesses and Featured Startups. The same order applies to both sections.
              </p>
              {homepageOrderError && <p role="alert" className="mt-2 text-[13px] font-medium text-red-700">{homepageOrderError}</p>}
              {homepageOrderMessage && <p role="status" className="mt-2 text-[13px] font-semibold text-emerald-700">{homepageOrderMessage}</p>}
            </div>
            <div className="mt-4 flex shrink-0 items-center gap-2 sm:mt-0">
              <label className="sr-only" htmlFor="homepage-feature-order">Homepage featured order</label>
              <select
                id="homepage-feature-order"
                className={cn(inputClass, "w-auto min-w-44")}
                value={homepageOrder}
                onChange={(event) => { setHomepageOrder(event.target.value as "latest" | "rating"); setHomepageOrderMessage(""); }}
              >
                <option value="latest">Latest added</option>
                <option value="rating">Highest rated</option>
              </select>
              <button
                type="button"
                disabled={savingHomepageOrder || homepageOrder === homepageOrderSaved}
                onClick={() => void saveHomepageOrder()}
                className={cn("min-h-[44px] rounded-lg bg-navy-900 px-6 text-[13px] font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50", EASE, FOCUS)}
              >
                {savingHomepageOrder ? "Saving…" : "Save"}
              </button>
            </div>
          </section>

          {/* ═════════ Console ═════════ */}
          <section className="mt-7 overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50/60 p-4">
              <div role="tablist" aria-label="Admin sections" className="inline-flex gap-1 rounded-lg bg-slate-200/70 p-1">
                {TABS.map(({ key, label, icon: Icon }, i) => {
                  const on = tab === key;
                  return (
                    <button
                      key={key}
                      id={`admin-tab-${key}`}
                      role="tab"
                      type="button"
                      aria-selected={on}
                      aria-controls="admin-panel"
                      tabIndex={on ? 0 : -1}
                      onClick={() => changeTab(key)}
                      onKeyDown={(e) => onTabKey(e, i)}
                      className={cn("inline-flex min-h-[40px] items-center gap-2 rounded-md px-4 text-[13px] font-semibold", EASE, FOCUS, on ? "bg-navy-900 text-white shadow-sm" : "text-slate-700 hover:bg-white/70 hover:text-navy-900")}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" /> {label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {tab === "users" && (
                  <div className="relative">
                    <label htmlFor="admin-user-search" className="sr-only">Search users by name</label>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <input
                      id="admin-user-search"
                      type="search"
                      className={cn(inputClass, "pl-9 sm:w-64")}
                      value={queryInput}
                      onChange={(event) => setQueryInput(event.target.value)}
                      placeholder="Search by name"
                      autoComplete="off"
                    />
                  </div>
                )}
                <select className={cn(inputClass, "w-auto min-w-44")} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label={`Filter ${tab} by status`}>
                  {filterOptions}
                </select>
              </div>
            </div>

            <div id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`} aria-busy={loading}>
              {loading ? (
                <div role="status" aria-label={`Loading ${tab}`} className="space-y-3 p-4">
                  {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-lg border border-line p-4">
                      <Shimmer className="h-11 w-11 rounded-full" />
                      <div className="flex-1 space-y-2"><Shimmer className="h-4 w-1/3" /><Shimmer className="h-3 w-2/3" /></div>
                      <Shimmer className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : tab === "users" ? (
                <div className="divide-y divide-line">
                  {users.length === 0 && <EmptyRow text="No users match this filter." />}
                  {users.map((u) => {
                    const st = u.approval_status || "pending";
                    const asking = confirming === u.id;
                    return (
                      <article key={u.id} className="flex flex-col gap-4 p-5 hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h2 className="truncate text-[15px] font-bold text-navy-900">{u.full_name || "Unnamed member"}</h2>
                          <Meta>{u.email || "No email on profile"} · {u.role}</Meta>
                          <p className="mt-1 text-[13px] text-slate-500">
                            Joined {dateLabel(u.created_at)}{u.city ? ` · ${u.city}${u.country ? `, ${u.country}` : ""}` : ""}
                          </p>
                          <IdLine>{u.id}</IdLine>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <StatusBadge status={st} />
                          {st !== "approved" && (
                            <button
                              type="button"
                              disabled={busy === u.id}
                              onClick={() => void reviewUser(u.id, "approved")}
                              className={cn("min-h-[40px] rounded-lg bg-emerald-700 px-4 text-[13px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50", EASE, FOCUS)}
                            >
                              {busy === u.id ? "Saving…" : "Approve"}
                            </button>
                          )}
                          {st !== "rejected" && (asking ? (
                            <>
                              <button
                                type="button"
                                disabled={busy === u.id}
                                onClick={() => void reviewUser(u.id, "rejected")}
                                className={cn("min-h-[40px] rounded-lg bg-red-700 px-4 text-[13px] font-semibold text-white hover:bg-red-800 disabled:opacity-50", EASE, FOCUS)}
                              >
                                Confirm reject
                              </button>
                              <button type="button" onClick={() => setConfirming("")} className={cn("min-h-[40px] rounded-lg px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-100", EASE, FOCUS)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={busy === u.id}
                              onClick={() => setConfirming(u.id)}
                              className={cn("min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:opacity-50", EASE, FOCUS)}
                            >
                              Reject
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : tab === "businesses" ? (
                <div className="divide-y divide-line">
                  {businesses.length === 0 && <EmptyRow text="No businesses match this filter." />}
                  {businesses.map((b) => (
                    <article key={b.id} className="flex flex-col gap-3 p-5 hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate text-[15px] font-bold text-navy-900">{b.name}</h2>
                        <Meta>{b.city || "Location not set"} · Owner {b.owner_id}</Meta>
                        <p className="mt-1 text-[13px] text-slate-500">{b.email || b.phone || "No public contact"} · Added {dateLabel(b.created_at)}</p>
                        <IdLine>{b.id}</IdLine>
                      </div>
                      <StatusBadge status={b.status} />
                    </article>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {payments.length === 0 && <EmptyRow text="No payments match this filter." />}
                  {payments.map((pm) => (
                    <article key={pm.id} className="grid gap-3 p-5 hover:bg-slate-50/60 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="text-[16px] font-bold tabular-nums text-navy-900">{moneyLabel(pm.amount, pm.currency)}</h2>
                          <StatusBadge status={pm.status} />
                        </div>
                        <p className="mt-1.5 text-[14px] text-slate-700">
                          {pm.payer?.full_name || pm.payer?.email || "Account"}
                          {pm.payer?.email && pm.payer.full_name ? ` · ${pm.payer.email}` : ""}
                        </p>
                        <p className="mt-1 text-[13px] text-slate-500">
                          {pm.payment_type === "signup_fee" ? "Account joining fee" : pm.business?.name || "No business"} ·{" "}
                          {pm.payment_type === "business_listing" ? "Business listing fee" : pm.payment_type === "signup_fee" ? "One-time signup fee" : pm.plan?.name || pm.plan?.code || "Membership plan"} · Created {dateLabel(pm.created_at)}
                        </p>
                        <IdLine>Order {pm.razorpay_order_id}{pm.razorpay_payment_id ? ` · Payment ${pm.razorpay_payment_id}` : ""}</IdLine>
                        <IdLine>User {pm.user_id}</IdLine>
                      </div>
                      <div className="text-left text-[13px] text-slate-600 md:text-right">
                        <span className="block font-semibold text-slate-800">{pm.status === "paid" ? "Paid" : "Last updated"}</span>
                        {dateLabel(pm.paid_at || pm.created_at)}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-slate-50/60 p-4 sm:flex-row">
                <p className="text-[13px] text-slate-600" aria-live="polite">
                  Page <span className="font-semibold text-navy-900">{meta.page}</span> of <span className="font-semibold text-navy-900">{meta.totalPages}</span> · {meta.total.toLocaleString("en-IN")} records
                </p>
                <div className="flex gap-2">
                  <PagerBtn disabled={page <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))} label="Previous"><ArrowLeft className="h-4 w-4" aria-hidden="true" /></PagerBtn>
                  <PagerBtn disabled={page >= meta.totalPages} onClick={() => setPage((n) => n + 1)} label="Next"><ArrowRight className="order-last h-4 w-4" aria-hidden="true" /></PagerBtn>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}