import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2, ExternalLink, Globe2, ImagePlus, Info, LoaderCircle, MailCheck, MapPin, Plus, Save, ShieldCheck, Store, Trash2, UserRound } from "lucide-react";
import { authApi, businessApi, getAccessToken, homeApi, paymentApi, profileApi, setSession, type Session } from "../api";
import { filterListingCategories } from "../businesses";
import { Field, inputCls, Modal, textareaCls } from "../components/ui/Modal";
import { Shimmer } from "../components/ui/Shimmer";
import { login, useStore, type Role } from "../store";
import { cn } from "../utils/cn";

type ProfileForm = { full_name: string; username: string; bio: string; phone: string; city: string; country: string; socialLinks: Record<string, string> };
const profileSocialPlatforms = ["instagram", "linkedin", "portfolio", "website", "youtube", "x"];
const blankProfile: ProfileForm = { full_name: "", username: "", bio: "", phone: "", city: "", country: "", socialLinks: {} };

/* -------------------------------------------------------------------------- */
/*  Design tokens — flat, high contrast, 44px targets, visible focus           */
/* -------------------------------------------------------------------------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

const btnBase =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 " + focusRing;
const btnOutline = `${btnBase} border border-slate-300 bg-white text-navy-900 hover:border-navy-700 hover:bg-navy-50`;
const btnOutlineSm = `${btnOutline} min-h-10 px-3.5 text-[12.5px]`;
const btnDanger = `inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const backLink = `mb-6 inline-flex min-h-11 items-center gap-2 rounded text-[13px] font-semibold text-navy-700 hover:text-navy-900 hover:underline ${focusRing}`;
const smallLabel = "text-[12px] font-bold uppercase tracking-wider text-slate-600";
const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

function readSavedDraft<T>(key: string): T | undefined {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return undefined;
    const value: unknown = JSON.parse(saved);
    return value && typeof value === "object" ? value as T : undefined;
  } catch {
    return undefined;
  }
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-7">
      <p className="text-[12px] font-bold uppercase tracking-[.14em] text-gold-800">{eyebrow}</p>
      <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight text-navy-900 sm:text-[36px]">{title}</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-700">{description}</p>
    </div>
  );
}

function Notice({ children, error = false }: { children: string; error?: boolean }) {
  const Icon = error ? AlertCircle : CheckCircle2;
  return (
    <div role={error ? "alert" : "status"} className={cn("mb-4 flex items-start gap-3 rounded-xl border px-4 py-3.5 text-[14px] leading-6", error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>
      <Icon aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" /> <span>{children}</span>
    </div>
  );
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="mb-5 flex items-start gap-2 text-[13px] leading-5 text-slate-600">
      <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" /> {children}
    </p>
  );
}

function SectionCard({ icon, title, description, action, children }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          {icon && <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">{icon}</span>}
          <div>
            <h2 className="text-[16px] font-bold text-navy-900">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] leading-5 text-slate-600">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyBox({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-[13.5px] text-slate-600">{children}</p>;
}

function FileButton({ children, disabled, onPick, className }: { children: ReactNode; disabled?: boolean; onPick: (file?: File) => void; className?: string }) {
  return (
    <label className={cn(btnOutlineSm, "focus-within:ring-2 focus-within:ring-navy-700 focus-within:ring-offset-2", disabled && "pointer-events-none opacity-60", className)}>
      {children}
      <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={disabled} onChange={(event) => { onPick(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const published = status === "published";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize ring-1 ring-inset", published ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200")}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", published ? "bg-emerald-600" : "bg-amber-600")} /> {status}
    </span>
  );
}

function formError(reason: unknown, fallback: string) {
  if (!reason || typeof reason !== "object") return fallback;
  const error = reason as { message?: string; details?: unknown };
  if (Array.isArray(error.details) && error.details.length) {
    const details = error.details.map((item) => {
      const detail = item as { path?: string; message?: string };
      return `${detail.path || "Field"}: ${detail.message || "Invalid value"}`;
    });
    return `${error.message || "Please check the entered details."} ${details.join("; ")}`;
  }
  return error.message || fallback;
}

type RazorpayResponse = { razorpay_order_id?: string; razorpay_subscription_id?: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = { key: string; order_id?: string; subscription_id?: string; amount?: number; currency?: string; name: string; description: string; prefill?: { email?: string }; handler: (response: RazorpayResponse) => void | Promise<void>; modal?: { ondismiss?: () => void }; theme?: { color: string } };
declare global { interface Window { Razorpay?: new (options: RazorpayOptions) => { open: () => void } } }
let razorpayLoader: Promise<void> | null = null;
function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayLoader) razorpayLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => { razorpayLoader = null; reject(new Error("Could not load Razorpay checkout. Check your connection and try again.")); };
    document.body.appendChild(script);
  });
  return razorpayLoader;
}

/* ================= Edit profile ================= */
export function EditProfilePage() {
  const user = useStore((state) => state.user);
  const profileDraftKey = user?.email ? `wshub:draft:profile:${user.email.toLowerCase()}` : "";
  const lastSavedProfile = useRef<string | null>(null);
  const [profile, setProfile] = useState<ProfileForm>(blankProfile);
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Edit profile — WS Hub";
    let current = true;
    profileApi.get().then((result) => {
      const data = result?.data?.profile ?? result?.data ?? result?.profile ?? result ?? {};
      if (current) {
        const serverProfile: ProfileForm = {
          full_name: data.full_name || "", username: data.username || "", bio: data.bio || "",
          phone: data.phone || "", city: data.city || data.location || "", country: data.country || "",
          socialLinks: data.social_links && typeof data.social_links === "object" ? data.social_links : data.socialLinks && typeof data.socialLinks === "object" ? data.socialLinks : {},
        };
        lastSavedProfile.current = JSON.stringify(serverProfile);
        const savedDraft = profileDraftKey ? readSavedDraft<ProfileForm>(profileDraftKey) : undefined;
        setProfile(savedDraft ? { ...serverProfile, ...savedDraft, socialLinks: { ...serverProfile.socialLinks, ...savedDraft.socialLinks } } : serverProfile);
        setAvatar(data.avatar_url || "");
      }
    }).catch((reason) => current && setError(reason instanceof Error ? reason.message : "Could not load your profile."))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [user?.email]);

  useEffect(() => {
    if (loading || !profileDraftKey) return;
    try {
      const serialized = JSON.stringify(profile);
      if (serialized === lastSavedProfile.current) localStorage.removeItem(profileDraftKey);
      else localStorage.setItem(profileDraftKey, serialized);
    } catch { /* Storage may be disabled or full; the form remains usable. */ }
  }, [profile, loading, profileDraftKey]);

  if (!user && !getAccessToken()) return <Navigate to="/login?next=%2Fprofile%2Fedit" replace />;

  const update = (key: Exclude<keyof ProfileForm, "socialLinks">, value: string) => setProfile((old) => ({ ...old, [key]: value }));
  const updateProfileSocial = (key: string, value: string) => setProfile((old) => ({ ...old, socialLinks: { ...old.socialLinks, [key]: value } }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage(""); setError(""); setSaving(true);
    try {
      await profileApi.update({ fullName: profile.full_name.trim(), username: profile.username.trim().toLowerCase(), bio: profile.bio.trim(), phone: profile.phone.trim(), city: profile.city.trim(), country: profile.country.trim(), socialLinks: Object.fromEntries(Object.entries(profile.socialLinks).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)) });
      lastSavedProfile.current = JSON.stringify(profile);
      if (profileDraftKey) localStorage.removeItem(profileDraftKey);
      setMessage("Your profile was saved."); scrollTop();
    } catch (reason) { setError(formError(reason, "Could not save your profile.")); scrollTop(); }
    finally { setSaving(false); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setError(""); setMessage(""); setUploading(true);
    try {
      const result = await profileApi.uploadAvatar(file);
      setAvatar(result?.avatar_url || result?.profile?.avatar_url || "");
      setMessage("Profile photo updated.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not upload your photo."); }
    finally { setUploading(false); }
  };

  return (
    <div className="page-in mx-auto max-w-[1040px] px-4 pb-24 pt-9 sm:px-6 lg:px-8 lg:pb-14">
      <Link to="/dashboard" className={backLink}><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to dashboard</Link>
      <PageHeading eyebrow="Your account" title="Edit your profile" description="Keep your details current so people across the WS Hub community can find and connect with you." />
      <InfoNote>Your unfinished changes are saved on this device automatically until you save your profile.</InfoNote>
      {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
      {loading ? (
        <div role="status" aria-label="Loading your profile" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="card space-y-4 p-6">{[0, 1, 2, 3, 4, 5].map((item) => <Shimmer key={item} className="h-11 w-full" />)}</div>
          <div className="card space-y-4 p-6"><Shimmer className="h-24 w-24 rounded-full" /><Shimmer className="h-10 w-full" /><Shimmer className="h-10 w-full" /></div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form onSubmit={submit} className="card p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-line pb-5">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><UserRound className="h-5 w-5" /></span>
              <div><h2 className="text-[16px] font-bold text-navy-900">Public information</h2><p className="text-[13px] text-slate-600">Fields marked as required are visible on your profile.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="profile-name"><input id="profile-name" className={inputCls} minLength={2} maxLength={100} required value={profile.full_name} onChange={(event) => update("full_name", event.target.value)} autoComplete="name" /></Field>
              <Field label="Username" htmlFor="profile-username" hint="3–30 characters: lowercase letters, numbers and underscores."><input id="profile-username" className={inputCls} minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" required value={profile.username} onChange={(event) => update("username", event.target.value)} autoComplete="username" /></Field>
              <div className="sm:col-span-2"><Field label="About you" htmlFor="profile-bio" hint={`${profile.bio.length}/500`}><textarea id="profile-bio" className={`${textareaCls} min-h-28`} maxLength={500} value={profile.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Share a little about what you do and what you’re looking for." /></Field></div>
              <Field label="Phone" htmlFor="profile-phone"><input id="profile-phone" type="tel" className={inputCls} maxLength={20} value={profile.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" /></Field>
              <Field label="City" htmlFor="profile-city"><input id="profile-city" className={inputCls} maxLength={80} value={profile.city} onChange={(event) => update("city", event.target.value)} autoComplete="address-level2" /></Field>
              <Field label="Country" htmlFor="profile-country"><input id="profile-country" className={inputCls} maxLength={80} value={profile.country} onChange={(event) => update("country", event.target.value)} autoComplete="country-name" /></Field>
              <div className="sm:col-span-2">
                <h3 className="mb-1 text-[14px] font-bold text-navy-900">Social links and portfolio</h3>
                <p className="mb-3 text-[13px] text-slate-600">Add public links people can use to learn more about you.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[...new Set([...profileSocialPlatforms, ...Object.keys(profile.socialLinks)])].map((platform) => (
                    <Field key={platform} label={platform === "x" ? "X (Twitter)" : platform === "linkedin" ? "LinkedIn" : platform[0].toUpperCase() + platform.slice(1)} htmlFor={`profile-social-${platform}`}>
                      <input id={`profile-social-${platform}`} type="url" className={inputCls} value={profile.socialLinks[platform] || ""} onChange={(event) => updateProfileSocial(platform, event.target.value)} placeholder={platform === "portfolio" ? "https://yourportfolio.com" : "https://…"} />
                    </Field>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap gap-3 border-t border-line pt-5">
              <button className="btn-gold min-h-11 px-5 py-2.5" type="submit" disabled={saving}><Save aria-hidden="true" className="h-4 w-4" />{saving ? "Saving…" : "Save changes"}</button>
              <Link to="/dashboard" className={btnOutline}>Cancel</Link>
            </div>
          </form>

          <aside className="space-y-4">
            <section className="card p-5">
              <h2 className="text-[15px] font-bold text-navy-900">Profile photo</h2>
              <p className="mt-1 text-[13px] text-slate-600">PNG, JPG, WEBP or GIF · up to 5 MB</p>
              <div className="mt-4 flex items-center gap-4">
                {avatar ? <img src={avatar} alt="Your profile" className="h-16 w-16 rounded-full object-cover ring-1 ring-line" /> : <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-100 text-navy-700"><UserRound className="h-6 w-6" /></span>}
                <FileButton disabled={uploading} onPick={(file) => { void upload(file); }}>{uploading ? "Uploading…" : "Choose photo"}</FileButton>
              </div>
            </section>
            <section className="rounded-xl border border-navy-800 bg-navy-900 p-5 text-white">
              <Building2 aria-hidden="true" className="h-6 w-6 text-gold-400" />
              <h2 className="mt-3 text-[15px] font-bold">Represent a business?</h2>
              <p className="mt-1.5 text-[13px] leading-5 text-white/85">Create a listing and manage its public profile from WS Hub.</p>
              <Link to="/businesses/manage" className={`${btnBase} mt-4 bg-gold-500 text-navy-900 hover:bg-gold-400 focus-visible:ring-offset-navy-900`}>Manage businesses <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ================= Business manager ================= */
type BusinessItem = { id: string; slug: string; name: string; city?: string; status: string; description?: string; logo_url?: string; listing_type?: "business" | "startup" };

export function BusinessManagerPage() {
  const user = useStore((state) => state.user);
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [name, setName] = useState("");
  const [listingType, setListingType] = useState<"business" | "startup">("business");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { document.title = "Your businesses — WS Hub"; }, []);
  useEffect(() => {
    let current = true;
    businessApi.mine().then((result) => current && setItems(Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []))
      .catch((reason) => current && setError(reason instanceof Error ? reason.message : "Could not load your businesses."))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [refresh]);
  if (!user && !getAccessToken()) return <Navigate to="/login?next=%2Fbusinesses%2Fmanage" replace />;

  const create = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice(""); setBusy("new");
    try {
      const result = await businessApi.create({ name: name.trim(), listingType });
      const business = result?.data?.business ?? result?.data ?? result?.business ?? result;
      window.location.hash = `#/businesses/${encodeURIComponent(business.id)}/edit`;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the business draft."); }
    finally { setBusy(""); }
  };
  const businessCount = items.filter((item) => (item.listing_type || "business") === "business").length;
  const startupCount = items.filter((item) => item.listing_type === "startup").length;
  const selectedTypeCount = listingType === "startup" ? startupCount : businessCount;
  const changeStatus = async (item: BusinessItem) => {
    if (item.status !== "published") {
      window.location.hash = `#/businesses/${encodeURIComponent(item.id)}/edit`;
      return;
    }
    setBusy(item.id); setError(""); setNotice("");
    try {
      await businessApi.unpublish(item.id);
      setNotice("The listing is now a draft.");
      setRefresh((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update the listing status."); }
    finally { setBusy(""); }
  };

  const darkInput = "min-h-11 w-full rounded-lg border border-white/20 bg-white px-3 text-[14px] text-navy-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-400";

  return (
    <div className="page-in mx-auto max-w-[1080px] px-4 pb-24 pt-9 sm:px-6 lg:px-8 lg:pb-14">
      <Link to="/dashboard" className={backLink}><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to dashboard</Link>
      <PageHeading eyebrow="Business owner space" title="Your businesses" description="Create a draft, complete its details, choose a membership package, and pay securely to publish your business or startup listing." />
      {error && <Notice error>{error}</Notice>}{notice && <Notice>{notice}</Notice>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-navy-900">Your listings</h2>
              <p className="mt-1 text-[13px] leading-5 text-slate-600">Up to two businesses and two startups. Drafts remain private until published.</p>
            </div>
            <span className="rounded-md bg-navy-50 px-3 py-1.5 text-[12.5px] font-semibold text-navy-800">{businessCount} / 2 businesses · {startupCount} / 2 startups</span>
          </div>
          {loading ? (
            <div role="status" aria-label="Loading business listings" className="mt-4 space-y-3">
              {Array.from({ length: 3 }, (_, item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-line p-4"><Shimmer className="h-11 w-11 rounded-lg" /><div className="flex-1 space-y-2"><Shimmer className="h-4 w-1/3" /><Shimmer className="h-3 w-1/2" /></div><Shimmer className="h-8 w-20" /></div>)}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
              <Store aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-[15px] font-bold text-navy-900">No business listings yet</p>
              <p className="mt-1 text-[13.5px] text-slate-600">Create your first draft to get started.</p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    {item.logo_url ? <img src={item.logo_url} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700"><Building2 className="h-5 w-5" /></span>}
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-navy-900">{item.name}</p>
                      <p className="mt-0.5 truncate text-[13px] text-slate-600">{item.city || "Location not added"} · {item.slug}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={item.status} />
                    <Link to={`/businesses/${encodeURIComponent(item.id)}/edit`} className={btnOutlineSm}>Edit</Link>
                    {item.status === "published" && <Link to={`/businesses/${encodeURIComponent(item.slug)}`} aria-label={`View ${item.name}`} className={cn(btnOutlineSm, "w-10 px-0")}><ExternalLink aria-hidden="true" className="h-4 w-4" /></Link>}
                    <button type="button" disabled={busy === item.id} onClick={() => void changeStatus(item)} className={`${btnBase} min-h-10 bg-navy-800 px-3.5 text-[12.5px] text-white hover:bg-navy-700`}>{busy === item.id ? "Saving…" : item.status === "published" ? "Unpublish" : "Publish"}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="h-fit rounded-xl border border-navy-800 bg-navy-900 p-5 text-white sm:p-6">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gold-400"><Plus className="h-5 w-5" /></span>
          <h2 className="mt-4 text-[17px] font-bold">Add a listing</h2>
          <p className="mt-1.5 text-[13.5px] leading-5 text-white/85">Create up to two businesses and two startups, then add details before publishing.</p>
          <form onSubmit={create} className="mt-5 space-y-3">
            <label htmlFor="new-business-type" className="block text-[13px] font-semibold text-white">Listing type</label>
            <select id="new-business-type" className={darkInput} value={listingType} onChange={(event) => setListingType(event.target.value as "business" | "startup")}>
              <option value="business" disabled={businessCount >= 2}>Business{businessCount >= 2 ? " (limit reached)" : ""}</option>
              <option value="startup" disabled={startupCount >= 2}>Startup{startupCount >= 2 ? " (limit reached)" : ""}</option>
            </select>
            <label htmlFor="new-business-name" className="block text-[13px] font-semibold text-white">Name</label>
            <input id="new-business-name" className={darkInput} minLength={2} maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Listing name" />
            <button type="submit" disabled={busy === "new" || selectedTypeCount >= 2} className={`${btnBase} w-full bg-gold-500 py-2.5 text-navy-900 hover:bg-gold-400 focus-visible:ring-offset-navy-900`}><Plus aria-hidden="true" className="h-4 w-4" />{busy === "new" ? "Creating…" : selectedTypeCount >= 2 ? "Category limit reached" : "Create draft"}</button>
          </form>
        </aside>
      </div>
      <p className="mt-6 text-[13.5px] text-slate-700">Looking for a public listing? <Link to="/businesses" className={`inline-flex items-center gap-1 rounded font-semibold text-navy-700 hover:underline ${focusRing}`}>Explore businesses <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link></p>
    </div>
  );
}

/* ================= Edit business ================= */
type OpeningHours = Record<string, { open?: string; close?: string; closed?: boolean }>;
type ProductForm = { name: string; description: string; price: string; image: string };
type GalleryForm = { image: string; label: string; group: "Office" | "Team" | "Events" | "Products" | "Other" };
type BusinessService = { id: string; name: string; description?: string; price?: number; currency?: string; is_active?: boolean };
type StartupDetailsForm = { stage: string; problem: string; solution: string; targetAudience: string; uniqueValue: string; businessModel: string; marketSize: string; technologies: string; users: string; customers: string; revenue: string; growth: string; fundingStatus: "Bootstrapped" | "Raising" | "Funded"; amountRaised: string; seeking: string; followers: string; xProfile: string; achievements: string };
type BusinessForm = { name: string; description: string; mission: string; vision: string; categoryId: string; email: string; phone: string; website: string; address: string; mapUrl: string; city: string; state: string; country: string; postalCode: string; latitude: string; longitude: string; tags: string; hours: OpeningHours; socialLinks: Record<string, string>; logoUrl: string; coverUrl: string; listingType: "business" | "startup"; establishedYear: string; employeeCount: string; products: ProductForm[]; gallery: GalleryForm[]; startupDetails: StartupDetailsForm };
type BusinessTextKey = Exclude<keyof BusinessForm, "hours" | "socialLinks" | "products" | "gallery" | "listingType" | "startupDetails">;
const openingDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const socialPlatforms = ["instagram", "facebook", "linkedin", "youtube"];
const blankStartupDetails: StartupDetailsForm = { stage: "", problem: "", solution: "", targetAudience: "", uniqueValue: "", businessModel: "", marketSize: "", technologies: "", users: "", customers: "", revenue: "", growth: "", fundingStatus: "Bootstrapped", amountRaised: "", seeking: "", followers: "", xProfile: "", achievements: "" };
const blankBusiness: BusinessForm = { name: "", description: "", mission: "", vision: "", categoryId: "", email: "", phone: "", website: "", address: "", mapUrl: "", city: "", state: "", country: "", postalCode: "", latitude: "", longitude: "", tags: "", hours: {}, socialLinks: {}, logoUrl: "", coverUrl: "", listingType: "business", establishedYear: "", employeeCount: "", products: [], gallery: [], startupDetails: blankStartupDetails };

function StartupDetailsEditor({ value, update }: { value: StartupDetailsForm; update: (key: keyof StartupDetailsForm, value: string) => void }) {
  return (
    <SectionCard title="Startup profile" description="Optional details about your idea, progress and funding. Only share information you’re comfortable making public.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Startup stage" htmlFor="startup-stage"><select id="startup-stage" className="select" value={value.stage} onChange={(event) => update("stage", event.target.value)}><option value="">Choose a stage</option>{["Idea", "MVP", "Pre-Seed", "Seed", "Series A", "Growth", "Scaleup"].map((stage) => <option key={stage}>{stage}</option>)}</select></Field>
        <Field label="Business model" htmlFor="startup-business-model"><input id="startup-business-model" className={inputCls} maxLength={250} value={value.businessModel} onChange={(event) => update("businessModel", event.target.value)} placeholder="e.g. B2B SaaS, marketplace, D2C" /></Field>
        <div className="sm:col-span-2"><Field label="Problem you are solving" htmlFor="startup-problem"><textarea id="startup-problem" className={`${textareaCls} min-h-20`} maxLength={2000} value={value.problem} onChange={(event) => update("problem", event.target.value)} placeholder="What problem are your customers facing?" /></Field></div>
        <div className="sm:col-span-2"><Field label="Your solution" htmlFor="startup-solution"><textarea id="startup-solution" className={`${textareaCls} min-h-20`} maxLength={2000} value={value.solution} onChange={(event) => update("solution", event.target.value)} placeholder="How does your startup solve it?" /></Field></div>
        <Field label="Target customers" htmlFor="startup-audience"><textarea id="startup-audience" className={`${textareaCls} min-h-20`} maxLength={1000} value={value.targetAudience} onChange={(event) => update("targetAudience", event.target.value)} placeholder="Who is this for?" /></Field>
        <Field label="What makes it different?" htmlFor="startup-unique-value"><textarea id="startup-unique-value" className={`${textareaCls} min-h-20`} maxLength={1000} value={value.uniqueValue} onChange={(event) => update("uniqueValue", event.target.value)} placeholder="Your unique value or advantage" /></Field>
        <Field label="Market opportunity (optional)" htmlFor="startup-market"><input id="startup-market" className={inputCls} maxLength={250} value={value.marketSize} onChange={(event) => update("marketSize", event.target.value)} placeholder="e.g. Telangana smallholder farms" /></Field>
        <Field label="Technologies or areas" htmlFor="startup-technologies" hint="Separate items with commas."><input id="startup-technologies" className={inputCls} value={value.technologies} onChange={(event) => update("technologies", event.target.value)} placeholder="e.g. AI, IoT, mobile app" /></Field>
        <Field label="X profile link" htmlFor="startup-x-profile"><input id="startup-x-profile" type="url" className={inputCls} value={value.xProfile} onChange={(event) => update("xProfile", event.target.value)} placeholder="https://x.com/yourstartup" /></Field>
        <div className="sm:col-span-2">
          <h3 className="mb-2 text-[14px] font-bold text-navy-900">Progress and traction <span className="font-normal text-slate-600">(optional)</span></h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {([["users", "Users", "e.g. 1,200"], ["customers", "Customers", "e.g. 45 businesses"], ["revenue", "Revenue", "e.g. Pre-revenue or ₹2L/month"], ["growth", "Growth", "e.g. 12% month over month"]] as const).map(([key, label, placeholder]) => (
              <Field key={key} label={label} htmlFor={`startup-${key}`}><input id={`startup-${key}`} className={inputCls} maxLength={80} value={value[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} /></Field>
            ))}
          </div>
        </div>
        <Field label="Funding status" htmlFor="startup-funding-status"><select id="startup-funding-status" className="select" value={value.fundingStatus} onChange={(event) => update("fundingStatus", event.target.value)}>{["Bootstrapped", "Raising", "Funded"].map((status) => <option key={status}>{status}</option>)}</select></Field>
        <Field label="Funding raised (optional)" htmlFor="startup-funding-raised"><input id="startup-funding-raised" className={inputCls} maxLength={80} value={value.amountRaised} onChange={(event) => update("amountRaised", event.target.value)} placeholder="e.g. ₹25 lakh" /></Field>
        {value.fundingStatus === "Raising" && <Field label="Funding sought (optional)" htmlFor="startup-funding-seeking"><input id="startup-funding-seeking" className={inputCls} maxLength={80} value={value.seeking} onChange={(event) => update("seeking", event.target.value)} placeholder="e.g. ₹50 lakh seed round" /></Field>}
        <Field label="Follower count to display (optional)" htmlFor="startup-followers"><input id="startup-followers" type="number" min="0" step="1" className={inputCls} value={value.followers} onChange={(event) => update("followers", event.target.value)} placeholder="e.g. 412" /></Field>
        <div className="sm:col-span-2"><Field label="Milestones and achievements" htmlFor="startup-achievements" hint="One per line, up to 30 items."><textarea id="startup-achievements" className={`${textareaCls} min-h-24`} maxLength={9000} value={value.achievements} onChange={(event) => update("achievements", event.target.value)} placeholder={"e.g. Launched pilot with 10 farms\nSelected for an accelerator programme"} /></Field></div>
      </div>
    </SectionCard>
  );
}

export function EditBusinessPage() {
  const user = useStore((state) => state.user);
  const location = useLocation();
  const { id = "" } = useParams();
  const businessDraftKey = user?.email ? `wshub:draft:business:${user.email.toLowerCase()}:${id}` : "";
  const lastSavedBusiness = useRef<string | null>(null);
  const [form, setForm] = useState<BusinessForm>(blankBusiness);
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<BusinessService[]>([]);
  const [newService, setNewService] = useState({ name: "", description: "", price: "" });
  const [serviceBusy, setServiceBusy] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState((location.state as { message?: string } | null)?.message || "");
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>((location.state as { missing?: string[] } | null)?.missing || []);
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  useEffect(() => {
    document.title = "Edit business — WS Hub";
    let current = true;
    Promise.all([businessApi.getMine(id), homeApi.categories(), businessApi.services.list(id).catch(() => [])]).then(([businessResult, categoryResult, serviceResult]) => {
      if (!current) return;
      const business = businessResult?.data?.business ?? businessResult?.data ?? businessResult?.business ?? businessResult ?? {};
      const startupDetails = business.startup_details || business.startupDetails || {};
      const startupTraction = startupDetails.traction || {};
      const startupFunding = startupDetails.funding || {};
      setCategories(filterListingCategories(Array.isArray(categoryResult?.data) ? categoryResult.data : Array.isArray(categoryResult) ? categoryResult : []));
      const serverForm: BusinessForm = {
        ...blankBusiness, name: business.name || "", description: business.description || "", mission: business.mission || "", vision: business.vision || "", categoryId: business.category_id || business.categoryId || "",
        email: business.email || "", phone: business.phone || "", website: business.website || "", address: business.address || "", mapUrl: business.map_url || business.mapUrl || "",
        city: business.city || "", state: business.state || "", country: business.country || "", postalCode: business.postal_code || business.postalCode || "",
        latitude: business.latitude == null ? "" : String(business.latitude), longitude: business.longitude == null ? "" : String(business.longitude),
        tags: Array.isArray(business.tags) ? business.tags.join(", ") : "", hours: business.hours && typeof business.hours === "object" ? business.hours : {},
        socialLinks: business.social_links && typeof business.social_links === "object" ? business.social_links : business.socialLinks && typeof business.socialLinks === "object" ? business.socialLinks : {}, logoUrl: business.logo_url || business.logoUrl || "", coverUrl: business.cover_url || business.coverUrl || "",
        listingType: business.listing_type === "startup" || business.listingType === "startup" ? "startup" : "business",
        establishedYear: business.established_year == null ? "" : String(business.established_year), employeeCount: business.employee_count == null ? "" : String(business.employee_count),
        startupDetails: {
          ...blankStartupDetails, stage: startupDetails.stage || "", problem: startupDetails.problem || "", solution: startupDetails.solution || "",
          targetAudience: startupDetails.targetAudience || "", uniqueValue: startupDetails.uniqueValue || "", businessModel: startupDetails.businessModel || "",
          marketSize: startupDetails.marketSize || "", technologies: Array.isArray(startupDetails.technologies) ? startupDetails.technologies.join(", ") : "", followers: startupDetails.followers == null ? "" : String(startupDetails.followers), xProfile: business.social_links?.x || business.social_links?.twitter || "",
          users: startupTraction.users || "", customers: startupTraction.customers || "", revenue: startupTraction.revenue || "", growth: startupTraction.growth || "",
          fundingStatus: ["Bootstrapped", "Raising", "Funded"].includes(startupFunding.status) ? startupFunding.status : "Bootstrapped",
          amountRaised: startupFunding.amountRaised || "", seeking: startupFunding.seeking || "",
          achievements: Array.isArray(startupDetails.achievements) ? startupDetails.achievements.join("\n") : "",
        },
        products: Array.isArray(business.products) ? business.products.map((product: any) => ({ name: product.name || "", description: product.description || "", price: product.price || "", image: product.image || "" })) : [],
        gallery: Array.isArray(business.gallery) ? business.gallery.map((image: any) => ({ image: image.image || "", label: image.label || image.caption || "", group: image.group || "Office" })) : [],
      };
      lastSavedBusiness.current = JSON.stringify(serverForm);
      setForm(businessDraftKey ? readSavedDraft<BusinessForm>(businessDraftKey) ?? serverForm : serverForm);
      const loadedServices = Array.isArray(serviceResult) ? serviceResult : Array.isArray(serviceResult?.data) ? serviceResult.data : Array.isArray(serviceResult?.data?.data) ? serviceResult.data.data : [];
      setServices(loadedServices);
    }).catch((reason) => current && setError(reason instanceof Error ? reason.message : "Could not load this business."))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [id, user?.email]);
  useEffect(() => {
    if (loading || !businessDraftKey) return;
    try {
      const serialized = JSON.stringify(form);
      if (serialized === lastSavedBusiness.current) localStorage.removeItem(businessDraftKey);
      else localStorage.setItem(businessDraftKey, serialized);
    } catch { /* Storage may be disabled or full; the form remains usable. */ }
  }, [form, loading, businessDraftKey]);
  if (!user && !getAccessToken()) return <Navigate to={`/login?next=${encodeURIComponent(`/businesses/${id}/edit`)}`} replace />;

  const update = (key: BusinessTextKey, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const updateStartup = (key: keyof StartupDetailsForm, value: string) => setForm((old) => ({ ...old, startupDetails: { ...old.startupDetails, [key]: value } }));
  const updateHours = (day: string, key: "open" | "close" | "closed", value: string | boolean) => setForm((old) => ({ ...old, hours: { ...old.hours, [day]: { ...old.hours[day], [key]: value } } }));
  const updateSocialLink = (platform: string, value: string) => setForm((old) => ({ ...old, socialLinks: { ...old.socialLinks, [platform]: value } }));
  const uploadBusinessImage = async (kind: "logo" | "cover", file?: File) => {
    if (!file) return;
    setError(""); setMessage("");
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { setError("Choose a PNG, JPG, WEBP or GIF image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("The image must be 5 MB or smaller."); return; }
    setUploadingMedia(kind);
    try {
      const result = kind === "logo" ? await businessApi.uploadLogo(id, file) : await businessApi.uploadCover(id, file);
      const business = result?.data ?? result;
      const imageUrl = kind === "logo" ? business?.logo_url : business?.cover_url;
      if (!imageUrl) throw new Error("The image uploaded, but its URL was not returned.");
      update(kind === "logo" ? "logoUrl" : "coverUrl", imageUrl);
      setMessage(kind === "logo" ? "Business logo uploaded." : "Cover image uploaded.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not upload this image."); }
    finally { setUploadingMedia(null); }
  };
  const uploadPortfolioImage = async (kind: "product" | "gallery", index: number, file?: File) => {
    if (!file) return;
    setError("");
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { setError("Choose a PNG, JPG, WEBP or GIF image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("The image must be 5 MB or smaller."); return; }
    const key = `${kind}-${index}`;
    setUploadingMedia(key);
    try {
      const result = await businessApi.uploadPortfolioMedia(id, kind, file);
      const url = result?.url || (result as any)?.data?.url;
      if (!url) throw new Error("The image was uploaded, but its URL was not returned.");
      setForm((old) => kind === "product"
        ? { ...old, products: old.products.map((product, item) => item === index ? { ...product, image: url } : product) }
        : { ...old, gallery: old.gallery.map((image, item) => item === index ? { ...image, image: url } : image) });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not upload this image."); }
    finally { setUploadingMedia(null); }
  };
  const addService = async () => {
    setServiceError(""); setServiceBusy(true);
    try {
      const created = await businessApi.services.create(id, { name: newService.name.trim(), description: newService.description.trim(), ...(newService.price.trim() && { price: Number(newService.price) }), currency: "INR", isActive: true });
      const service = (created as any)?.data ?? created;
      setServices((current) => [...current, service]); setNewService({ name: "", description: "", price: "" });
    } catch (reason) { setServiceError(formError(reason, "Could not add this service.")); }
    finally { setServiceBusy(false); }
  };
  const removeService = async (serviceId: string) => {
    setServiceError(""); setServiceBusy(true);
    try { await businessApi.services.remove(id, serviceId); setServices((current) => current.filter((service) => service.id !== serviceId)); }
    catch (reason) { setServiceError(formError(reason, "Could not remove this service.")); }
    finally { setServiceBusy(false); }
  };
  const businessPayload = () => ({
    name: form.name.trim(), description: form.description.trim(), mission: form.mission.trim() || null, vision: form.vision.trim() || null, categoryId: form.categoryId || null, email: form.email.trim() || null, phone: form.phone.trim() || null,
    website: form.website.trim() || null, address: form.address.trim() || null, mapUrl: form.mapUrl.trim() || null, city: form.city.trim() || null, state: form.state.trim() || null, country: form.country.trim() || null,
    postalCode: form.postalCode.trim() || null, latitude: form.latitude.trim() ? Number(form.latitude) : null, longitude: form.longitude.trim() ? Number(form.longitude) : null,
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean), hours: form.hours, socialLinks: Object.fromEntries([...Object.entries(form.socialLinks).map(([key, value]) => [key, value.trim()] as const), ...(form.listingType === "startup" && form.startupDetails.xProfile.trim() ? [["x", form.startupDetails.xProfile.trim()] as const] : [])].filter(([, value]) => value)), logoUrl: form.logoUrl.trim() || null, coverUrl: form.coverUrl.trim() || null,
    listingType: form.listingType, establishedYear: form.establishedYear.trim() ? Number(form.establishedYear) : null, employeeCount: form.employeeCount.trim() ? Number(form.employeeCount) : null,
    products: form.products.map((product) => ({ name: product.name.trim(), description: product.description.trim(), ...(product.price.trim() && { price: product.price.trim() }), image: product.image.trim() || null })),
    gallery: form.gallery.filter((image) => image.image.trim()).map((image) => ({ image: image.image.trim(), label: image.label.trim(), group: image.group })),
    startupDetails: {
      stage: form.startupDetails.stage.trim(), problem: form.startupDetails.problem.trim(), solution: form.startupDetails.solution.trim(),
      targetAudience: form.startupDetails.targetAudience.trim(), uniqueValue: form.startupDetails.uniqueValue.trim(), businessModel: form.startupDetails.businessModel.trim(), marketSize: form.startupDetails.marketSize.trim(),
      technologies: form.startupDetails.technologies.split(",").map((value) => value.trim()).filter(Boolean),
      traction: { users: form.startupDetails.users.trim(), customers: form.startupDetails.customers.trim(), revenue: form.startupDetails.revenue.trim(), growth: form.startupDetails.growth.trim() },
      funding: { status: form.startupDetails.fundingStatus, amountRaised: form.startupDetails.amountRaised.trim(), seeking: form.startupDetails.seeking.trim() },
      ...(form.startupDetails.followers.trim() && { followers: Number(form.startupDetails.followers) }),
      achievements: form.startupDetails.achievements.split("\n").map((value) => value.trim()).filter(Boolean),
    },
  });
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage(""); setMissing([]);
    try {
      await businessApi.update(id, businessPayload());
      lastSavedBusiness.current = JSON.stringify(form);
      if (businessDraftKey) localStorage.removeItem(businessDraftKey);
      setMessage("Business details saved."); scrollTop();
    } catch (reason) {
      const details = (reason as { details?: { missing?: string[] } })?.details;
      setMissing(details?.missing || []);
      setError(formError(reason, "Could not save business details.")); scrollTop();
    } finally { setSaving(false); }
  };
  const publish = async () => {
    setSaving(true); setError(""); setMessage(""); setMissing([]);
    const payload = businessPayload();
    const required = [!payload.name && "Business name", !payload.description && "Description", !payload.categoryId && "Category", !payload.city && "City", !payload.phone && !payload.email && "Phone or business email"].filter(Boolean) as string[];
    const invalid: string[] = [];
    if (payload.establishedYear != null && (!Number.isInteger(payload.establishedYear) || payload.establishedYear < 1800 || payload.establishedYear > new Date().getFullYear())) invalid.push("Established year must be a valid year no later than this year.");
    if (payload.employeeCount != null && (!Number.isInteger(payload.employeeCount) || payload.employeeCount < 0 || payload.employeeCount > 10000000)) invalid.push("Employee count must be a whole number from 0 to 10,000,000.");
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) invalid.push("Business email must be a valid email address.");
    const checkUrl = (value: string, label: string) => { try { const parsed = new URL(value); if (!/^https?:$/.test(parsed.protocol)) throw new Error(); } catch { invalid.push(`${label} must be a complete URL beginning with https:// or http://.`); } };
    if (payload.website) checkUrl(payload.website, "Website");
    if (payload.mapUrl) checkUrl(payload.mapUrl, "Google Maps link");
    Object.entries(payload.socialLinks).forEach(([platform, value]) => checkUrl(value, `${platform} link`));
    payload.products.forEach((product, index) => {
      if (!product.name) invalid.push(`Product ${index + 1} needs a name.`);
      if (product.image) checkUrl(product.image, `Product ${index + 1} image`);
    });
    payload.gallery.forEach((image, index) => checkUrl(image.image, `Gallery image ${index + 1}`));
    if (payload.tags.length > 15) invalid.push("Use no more than 15 business tags.");
    if (payload.tags.some((tag) => tag.length > 30)) invalid.push("Each business tag must be 30 characters or fewer.");
    if (payload.latitude != null && (!Number.isFinite(payload.latitude) || payload.latitude < -90 || payload.latitude > 90)) invalid.push("Latitude must be between -90 and 90.");
    if (payload.longitude != null && (!Number.isFinite(payload.longitude) || payload.longitude < -180 || payload.longitude > 180)) invalid.push("Longitude must be between -180 and 180.");
    if (required.length || invalid.length) { const message = [...required.length ? [`Complete the required fields: ${required.join(", ")}.`] : [], ...invalid].join(" "); setMissing(required); setError(message); scrollTop(); setSaving(false); return; }
    try {
      await businessApi.update(id, payload);
      lastSavedBusiness.current = JSON.stringify(form);
      if (businessDraftKey) localStorage.removeItem(businessDraftKey);
      const existingResult = await paymentApi.subscription(id) as any;
      const existingSubscription = existingResult?.data ?? existingResult;
      const existingPlan = existingSubscription?.plan?.code;
      const periodEnd = existingSubscription?.current_period_end ? new Date(existingSubscription.current_period_end) : null;
      if (existingSubscription?.status === "active" && ["member_monthly", "member_yearly"].includes(existingPlan) && (!periodEnd || periodEnd > new Date())) {
        await businessApi.publish(id);
        setMessage("Your active membership has been confirmed. The listing is now live.");
        window.location.hash = "#/businesses/manage";
        return;
      }
      setMembershipDialogOpen(true);
      setMessage("Your listing is saved. Choose a membership package to publish it.");
    }
    catch (reason) { const details = (reason as { details?: { missing?: string[] } })?.details; setMissing(details?.missing || []); setError(formError(reason, "Could not save your business before checkout.")); scrollTop(); }
    finally { setSaving(false); }
  };
  const startMembershipPayment = async (billing: "monthly" | "yearly") => {
    setPaymentBusy(true); setPaymentError("");
    try {
      await loadRazorpayCheckout();
      const result = await paymentApi.checkout(billing === "monthly" ? "member_monthly" : "member_yearly") as any;
      const checkout = result?.data ?? result;
      const subscriptionId = checkout.subscriptionId as string | undefined;
      const orderId = checkout.orderId as string | undefined;
      if (!subscriptionId && !orderId) throw new Error("The payment service did not return a checkout session.");
      const RazorpayCheckout = window.Razorpay;
      if (!RazorpayCheckout) throw new Error("Razorpay checkout did not load. Please try again.");
      const options: RazorpayOptions = {
        key: checkout.keyId,
        ...(subscriptionId ? { subscription_id: subscriptionId } : { order_id: orderId, amount: checkout.amount, currency: checkout.currency }),
        name: "WS Hub",
        description: billing === "monthly" ? "₹3,100 first payment, then ₹299 monthly autopay" : "₹5,200 for one year",
        prefill: checkout.prefill,
        theme: { color: "#0f2a5c" },
        handler: async (response) => {
          try {
            await paymentApi.verify({
              ...(subscriptionId ? { razorpay_subscription_id: response.razorpay_subscription_id || subscriptionId } : { razorpay_order_id: response.razorpay_order_id || orderId }),
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await businessApi.publish(id);
            setMembershipDialogOpen(false);
            setMessage("Payment confirmed. Your listing is now live.");
            window.location.hash = "#/businesses/manage";
          } catch (reason) {
            setPaymentError(formError(reason, "Payment could not be verified. Your listing has not been published."));
          } finally { setPaymentBusy(false); }
        },
        modal: { ondismiss: () => setPaymentBusy(false) },
      };
      new RazorpayCheckout(options).open();
    } catch (reason) {
      setPaymentError(formError(reason, "Could not start Razorpay checkout."));
      setPaymentBusy(false);
    }
  };
  const textField = (key: BusinessTextKey, label: string, options: { type?: string; max?: number; placeholder?: string; hint?: string } = {}) => <Field label={label} htmlFor={`business-${key}`} hint={options.hint}><input id={`business-${key}`} className={inputCls} type={options.type || "text"} maxLength={options.max} placeholder={options.placeholder} value={form[key]} onChange={(event) => update(key, event.target.value)} /></Field>;

  const patchProduct = (index: number, patch: Partial<ProductForm>) => setForm((old) => ({ ...old, products: old.products.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  const patchGallery = (index: number, patch: Partial<GalleryForm>) => setForm((old) => ({ ...old, gallery: old.gallery.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  const planOption = "group flex min-h-[44px] cursor-pointer flex-col rounded-xl border-2 border-line bg-white p-5 text-left transition-colors duration-200 hover:border-gold-500 hover:bg-gold-50 disabled:cursor-not-allowed disabled:opacity-60 " + focusRing;

  return (
    <div className="page-in mx-auto max-w-[1040px] px-4 pb-24 pt-9 sm:px-6 lg:px-8 lg:pb-14">
      <Link to="/businesses/manage" className={backLink}><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Your businesses</Link>
      <PageHeading eyebrow="Business listing" title="Edit business profile" description="Add the details customers need to discover, understand and contact your business." />
      <InfoNote>Your unfinished changes are saved on this device automatically until you save or publish.</InfoNote>
      {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
      {missing.length > 0 && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-[14px] leading-6 text-amber-900">
          <AlertCircle aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
          <div><p className="font-bold">Complete these fields to publish</p><p className="mt-0.5">{missing.join(", ")}</p></div>
        </div>
      )}

      {loading ? (
        <div role="status" aria-label="Loading business profile" className="space-y-5">
          <div className="card space-y-3 p-6"><Shimmer className="h-6 w-1/3" /><Shimmer className="h-11 w-full" /><Shimmer className="h-11 w-full" /><Shimmer className="h-24 w-full" /></div>
          <div className="card space-y-3 p-6"><Shimmer className="h-6 w-1/4" /><Shimmer className="h-28 w-full" /><Shimmer className="h-11 w-full" /></div>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3.5 text-[14px] leading-6 text-navy-900">
            <Info aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-gold-800" />
            <p><span className="font-bold">* Required to publish.</span> Business name, category, description and city are required. Enter at least one contact method: business email or phone.</p>
          </div>

          <SectionCard icon={<Building2 className="h-5 w-5" />} title="Business details" description="Start with a clear name, category and description.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name *" htmlFor="business-name"><input id="business-name" className={inputCls} minLength={2} maxLength={120} required value={form.name} onChange={(event) => update("name", event.target.value)} /></Field>
              <Field label="Category *" htmlFor="business-category" hint="Required to publish."><select id="business-category" className="select" required value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)}><option value="">Choose a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></Field>
              <div className="sm:col-span-2"><Field label="Description *" htmlFor="business-description" hint={`${form.description.length}/5000 · Required to publish.`}><textarea id="business-description" className={`${textareaCls} min-h-32`} maxLength={5000} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="What does your business do? What makes it useful to customers?" /></Field></div>
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <Field label="Mission" htmlFor="business-mission"><textarea id="business-mission" className={`${textareaCls} min-h-24`} maxLength={2000} value={form.mission} onChange={(event) => update("mission", event.target.value)} placeholder="What is your business or startup here to accomplish?" /></Field>
                <Field label="Vision" htmlFor="business-vision"><textarea id="business-vision" className={`${textareaCls} min-h-24`} maxLength={2000} value={form.vision} onChange={(event) => update("vision", event.target.value)} placeholder="What future are you working toward?" /></Field>
              </div>
              <div className="sm:col-span-2"><Field label="Tags" htmlFor="business-tags" hint="Separate up to 15 tags with commas."><input id="business-tags" className={inputCls} value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="e.g. consulting, manufacturing, Warangal" /></Field></div>
            </div>
          </SectionCard>

          <SectionCard title="Where should this listing appear?" description="Choose the directory that best describes this profile.">
            <fieldset>
              <legend className="sr-only">Listing directory</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[{ value: "business", title: "Business directory", text: "For local businesses, shops, and established companies." }, { value: "startup", title: "Startups directory", text: "For new ventures and startup teams." }].map((choice) => (
                  <label key={choice.value} className={cn("flex min-h-[72px] cursor-pointer gap-3 rounded-xl border-2 p-4 transition-colors duration-200 focus-within:ring-2 focus-within:ring-navy-700 focus-within:ring-offset-2", form.listingType === choice.value ? "border-navy-800 bg-navy-50" : "border-line bg-white hover:border-slate-400")}>
                    <input type="radio" name="listing-type" className="mt-1 h-4 w-4 shrink-0 accent-navy-800" checked={form.listingType === choice.value} onChange={() => setForm((old) => ({ ...old, listingType: choice.value as "business" | "startup" }))} />
                    <span><span className="block text-[14.5px] font-bold text-navy-900">{choice.title}</span><span className="mt-1 block text-[13px] leading-5 text-slate-700">{choice.text}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Year established" htmlFor="business-established-year"><input id="business-established-year" type="number" min="1800" max={new Date().getFullYear()} className={inputCls} value={form.establishedYear} onChange={(event) => update("establishedYear", event.target.value)} placeholder="e.g. 2021" /></Field>
              <Field label="Number of employees" htmlFor="business-employee-count"><input id="business-employee-count" type="number" min="0" step="1" className={inputCls} value={form.employeeCount} onChange={(event) => update("employeeCount", event.target.value)} placeholder="e.g. 12" /></Field>
            </div>
          </SectionCard>

          <SectionCard icon={<MapPin className="h-5 w-5" />} title="Contact and location" description="At least one contact method is needed before publishing.">
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("email", "Business email *", { type: "email", hint: "Enter email or phone; one is required." })}
              {textField("phone", "Phone *", { type: "tel", max: 20, hint: "Enter email or phone; one is required." })}
              {textField("website", "Website", { type: "url", placeholder: "https://example.com" })}
              <div className="sm:col-span-2">{textField("address", "Street address", { max: 250 })}</div>
              <div className="sm:col-span-2">{textField("mapUrl", "Google Maps link", { type: "url", placeholder: "Paste the share link from Google Maps", hint: "Paste a Google Maps share link so visitors can open directions." })}</div>
              {textField("city", "City *", { max: 80, hint: "Required to publish." })}
              {textField("state", "State", { max: 80 })}
              {textField("country", "Country", { max: 80 })}
              {textField("postalCode", "Postal code", { max: 15 })}
              {textField("latitude", "Latitude", { type: "number" })}
              {textField("longitude", "Longitude", { type: "number" })}
            </div>
          </SectionCard>

          <SectionCard icon={<Globe2 className="h-5 w-5" />} title="More details" description="Upload your business images, set opening times, and add social media links.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-4">
                <p className="text-[14px] font-semibold text-navy-900">Business logo</p>
                <p className="mt-1 text-[13px] text-slate-600">Square image recommended · PNG, JPG, WEBP or GIF · up to 5 MB</p>
                <div className="mt-3 flex items-center gap-3">
                  {form.logoUrl ? <img src={form.logoUrl} alt="Business logo preview" className="h-16 w-16 rounded-lg border border-line object-cover" /> : <div aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-lg bg-navy-50 text-navy-600"><Building2 className="h-6 w-6" /></div>}
                  <FileButton disabled={!!uploadingMedia} onPick={(file) => { void uploadBusinessImage("logo", file); }}><ImagePlus aria-hidden="true" className="h-4 w-4" />{uploadingMedia === "logo" ? "Uploading…" : form.logoUrl ? "Change logo" : "Upload logo"}</FileButton>
                </div>
              </div>
              <div className="rounded-xl border border-line p-4">
                <p className="text-[14px] font-semibold text-navy-900">Cover image</p>
                <p className="mt-1 text-[13px] text-slate-600">Wide image recommended · PNG, JPG, WEBP or GIF · up to 5 MB</p>
                {form.coverUrl ? <img src={form.coverUrl} alt="Business cover preview" className="mt-3 aspect-[3/1] w-full rounded-lg border border-line object-cover" /> : <div aria-hidden="true" className="mt-3 flex aspect-[3/1] items-center justify-center rounded-lg bg-navy-50 text-navy-600"><ImagePlus className="h-6 w-6" /></div>}
                <FileButton className="mt-3" disabled={!!uploadingMedia} onPick={(file) => { void uploadBusinessImage("cover", file); }}><ImagePlus aria-hidden="true" className="h-4 w-4" />{uploadingMedia === "cover" ? "Uploading…" : form.coverUrl ? "Change cover" : "Upload cover image"}</FileButton>
              </div>

              <div className="sm:col-span-2">
                <p className="mb-2 text-[14px] font-semibold text-navy-900">Opening hours <span className="font-normal text-slate-600">(leave times blank if not set)</span></p>
                <div className="space-y-2">
                  {openingDays.map((day) => {
                    const schedule = form.hours[day] || {};
                    return (
                      <div key={day} className="grid items-center gap-2 rounded-xl border border-line p-3 sm:grid-cols-[110px_1fr_1fr_auto]">
                        <span className="text-[13.5px] font-semibold capitalize text-navy-900">{day}</span>
                        <label className="sr-only" htmlFor={`hours-${day}-open`}>{day} opening time</label>
                        <input id={`hours-${day}-open`} type="time" className={inputCls} disabled={schedule.closed} value={schedule.open || ""} onChange={(event) => updateHours(day, "open", event.target.value)} />
                        <label className="sr-only" htmlFor={`hours-${day}-close`}>{day} closing time</label>
                        <input id={`hours-${day}-close`} type="time" className={inputCls} disabled={schedule.closed} value={schedule.close || ""} onChange={(event) => updateHours(day, "close", event.target.value)} />
                        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-700"><input type="checkbox" className="h-4 w-4 accent-navy-800" checked={schedule.closed === true} onChange={(event) => updateHours(day, "closed", event.target.checked)} /> Closed</label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <p className="mb-2 text-[14px] font-semibold text-navy-900">Social media links</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[...new Set([...socialPlatforms, ...Object.keys(form.socialLinks)])].filter((platform) => !["x", "twitter", "tiktok"].includes(platform.toLowerCase())).map((platform) => (
                    <Field key={platform} label={platform[0].toUpperCase() + platform.slice(1)} htmlFor={`social-${platform}`}><input id={`social-${platform}`} type="url" className={inputCls} value={form.socialLinks[platform] || ""} onChange={(event) => updateSocialLink(platform, event.target.value)} placeholder="https://…" /></Field>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {form.listingType === "startup" && <StartupDetailsEditor value={form.startupDetails} update={updateStartup} />}

          <SectionCard title="Products" description="Add the products you want visitors to see." action={<button type="button" onClick={() => setForm((old) => ({ ...old, products: [...old.products, { name: "", description: "", price: "", image: "" }] }))} className={btnOutlineSm}><Plus aria-hidden="true" className="h-4 w-4" />Add product</button>}>
            {form.products.length === 0 ? <EmptyBox>No products added yet.</EmptyBox> : (
              <div className="space-y-4">
                {form.products.map((product, index) => (
                  <article key={index} aria-label={`Product ${index + 1}`} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
                    <Field label="Product name" htmlFor={`product-${index}-name`}><input id={`product-${index}-name`} className={inputCls} maxLength={120} value={product.name} onChange={(event) => patchProduct(index, { name: event.target.value })} placeholder="Product name" /></Field>
                    <Field label="Price or range (optional)" htmlFor={`product-${index}-price`}><input id={`product-${index}-price`} className={inputCls} maxLength={50} value={product.price} onChange={(event) => patchProduct(index, { price: event.target.value })} placeholder="e.g. From ₹499" /></Field>
                    <div className="sm:col-span-2"><Field label="Description" htmlFor={`product-${index}-description`}><textarea id={`product-${index}-description`} className={`${textareaCls} min-h-20`} maxLength={1000} value={product.description} onChange={(event) => patchProduct(index, { description: event.target.value })} placeholder="Describe this product" /></Field></div>
                    <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                      {product.image && <img src={product.image} alt="Product preview" className="h-16 w-16 rounded-lg object-cover ring-1 ring-line" />}
                      <FileButton disabled={!!uploadingMedia} onPick={(file) => { void uploadPortfolioImage("product", index, file); }}>{uploadingMedia === `product-${index}` ? "Uploading…" : product.image ? "Change product image" : "Upload product image"}</FileButton>
                      <button type="button" onClick={() => setForm((old) => ({ ...old, products: old.products.filter((_, i) => i !== index) }))} className={`${btnDanger} ml-auto`}><Trash2 aria-hidden="true" className="h-4 w-4" />Remove product</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Services" description="Add services offered by your business. Changes save immediately.">
            {serviceError && <Notice error>{serviceError}</Notice>}
            {services.length > 0 && (
              <ul className="mb-4 divide-y divide-line rounded-xl border border-line px-4">
                {services.map((service) => (
                  <li key={service.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-navy-900">{service.name}</p>
                      <p className="line-clamp-2 text-[13px] text-slate-600">{service.description || "No description"}{service.price != null ? ` · ${service.currency || "INR"} ${service.price}` : ""}</p>
                    </div>
                    <button type="button" disabled={serviceBusy} aria-label={`Remove ${service.name}`} onClick={() => void removeService(service.id)} className={btnDanger}><Trash2 aria-hidden="true" className="h-4 w-4" />Remove</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Service name" htmlFor="new-service-name"><input id="new-service-name" className={inputCls} maxLength={120} value={newService.name} onChange={(event) => setNewService((old) => ({ ...old, name: event.target.value }))} placeholder="e.g. Website design" /></Field>
              <Field label="Starting price (optional)" htmlFor="new-service-price"><input id="new-service-price" type="number" min="0" step="0.01" className={inputCls} value={newService.price} onChange={(event) => setNewService((old) => ({ ...old, price: event.target.value }))} placeholder="₹" /></Field>
              <div className="sm:col-span-2"><Field label="Description" htmlFor="new-service-description"><textarea id="new-service-description" className={`${textareaCls} min-h-20`} maxLength={1000} value={newService.description} onChange={(event) => setNewService((old) => ({ ...old, description: event.target.value }))} placeholder="What does this service include?" /></Field></div>
              <button type="button" disabled={serviceBusy || newService.name.trim().length < 2} onClick={() => void addService()} className="btn-navy min-h-11 w-fit px-5 py-2.5 text-[13px] disabled:opacity-50"><Plus aria-hidden="true" className="mr-1 inline h-4 w-4" />{serviceBusy ? "Saving…" : "Add service"}</button>
            </div>
          </SectionCard>

          <SectionCard title="Gallery" description="Add photos with captions and categories for your public profile." action={<button type="button" onClick={() => setForm((old) => ({ ...old, gallery: [...old.gallery, { image: "", label: "", group: "Office" }] }))} className={btnOutlineSm}><Plus aria-hidden="true" className="h-4 w-4" />Add photo</button>}>
            {form.gallery.length === 0 ? <EmptyBox>No gallery photos added yet.</EmptyBox> : (
              <div className="grid gap-4 sm:grid-cols-2">
                {form.gallery.map((image, index) => (
                  <article key={index} aria-label={`Gallery photo ${index + 1}`} className="rounded-xl border border-line p-4">
                    <div className="mb-3 aspect-[16/9] overflow-hidden rounded-lg bg-slate-100">
                      {image.image ? <img src={image.image} alt={image.label || "Gallery preview"} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[13px] text-slate-600">Upload a photo</div>}
                    </div>
                    <div className="space-y-3">
                      <FileButton disabled={!!uploadingMedia} onPick={(file) => { void uploadPortfolioImage("gallery", index, file); }}>{uploadingMedia === `gallery-${index}` ? "Uploading…" : image.image ? "Change photo" : "Upload photo"}</FileButton>
                      <Field label="Caption" htmlFor={`gallery-${index}-caption`}><input id={`gallery-${index}-caption`} className={inputCls} maxLength={200} value={image.label} onChange={(event) => patchGallery(index, { label: event.target.value })} placeholder="Describe this photo" /></Field>
                      <Field label="Category" htmlFor={`gallery-${index}-category`}><select id={`gallery-${index}-category`} className="select" value={image.group} onChange={(event) => patchGallery(index, { group: event.target.value as GalleryForm["group"] })}>{["Office", "Team", "Events", "Products", "Other"].map((group) => <option key={group}>{group}</option>)}</select></Field>
                      <button type="button" onClick={() => setForm((old) => ({ ...old, gallery: old.gallery.filter((_, i) => i !== index) }))} className={btnDanger}><Trash2 aria-hidden="true" className="h-4 w-4" />Remove photo</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Sticky action bar keeps Save / Publish reachable on this long form */}
          <div className="sticky bottom-[57px] z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border lg:bottom-4">
            <Link to="/businesses/manage" className={`${btnBase} text-slate-700 hover:text-navy-900 hover:underline`}>Cancel</Link>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={saving || !!uploadingMedia} className="btn-gold min-h-11 px-5 py-2.5"><Save aria-hidden="true" className="h-4 w-4" />{saving ? "Saving…" : "Save draft"}</button>
              <button type="button" disabled={saving || !!uploadingMedia} onClick={() => void publish()} className="btn-navy min-h-11 px-5 py-2.5"><BadgeCheck aria-hidden="true" className="h-4 w-4" />Publish listing</button>
            </div>
          </div>
        </form>
      )}

      <Modal open={membershipDialogOpen} onClose={() => { if (!paymentBusy) setMembershipDialogOpen(false); }} title="Choose a membership package" subtitle={`Select a plan to publish this ${form.listingType === "startup" ? "startup" : "business"} listing.`} size="md">
        {paymentError && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] leading-6 text-red-800">
            <AlertCircle aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" /> {paymentError}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={paymentBusy} onClick={() => void startMembershipPayment("monthly")} className={planOption}>
            <span className={smallLabel}>Monthly autopay</span>
            <span className="mt-2 block text-[30px] font-extrabold leading-none text-navy-900">₹3,100</span>
            <span className="mt-1.5 block text-[14px] font-semibold text-navy-700">Then ₹299/month</span>
            <span className="mt-3 block text-[13px] leading-5 text-slate-700">₹3,100 is charged now. Razorpay sets up monthly automatic payments of ₹299.</span>
          </button>
          <button type="button" disabled={paymentBusy} onClick={() => void startMembershipPayment("yearly")} className={planOption}>
            <span className={smallLabel}>Yearly</span>
            <span className="mt-2 block text-[30px] font-extrabold leading-none text-navy-900">₹5,200</span>
            <span className="mt-1.5 block text-[14px] font-semibold text-navy-700">One payment for one year</span>
            <span className="mt-3 block text-[13px] leading-5 text-slate-700">Razorpay will automatically renew the ₹5,200 membership once each year.</span>
          </button>
        </div>
        {paymentBusy && <p role="status" className="mt-4 flex items-center justify-center gap-2 text-[13.5px] font-semibold text-navy-700"><LoaderCircle aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> Connecting to Razorpay…</p>}
        <p className="mt-4 flex items-start gap-2 text-[13px] leading-5 text-slate-700"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> Secure payment is handled by Razorpay. Your listing stays a draft until payment is verified.</p>
      </Modal>
    </div>
  );
}

/* ================= Auth callbacks ================= */
function callbackParams() {
  const params = new URLSearchParams(window.location.search);
  const routeQuery = window.location.hash.split("?")[1]?.split("#")[0] || "";
  const tokenFragment = window.location.hash.split("#").slice(2).join("#");
  for (const [key, value] of new URLSearchParams(routeQuery)) if (!params.has(key)) params.set(key, value);
  for (const [key, value] of new URLSearchParams(tokenFragment)) if (!params.has(key)) params.set(key, value);
  return params;
}

export function EmailVerifiedPage() {
  const [status, setStatus] = useState<"checking" | "verified" | "error">("checking");
  const [message, setMessage] = useState("Confirming your email address…");
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  useEffect(() => {
    document.title = "Email confirmed — WS Hub";
    let active = true;
    const confirm = async () => {
      let approvalPending = false;
      const params = callbackParams();
      const token = params.get("access_token");
      const errorDescription = params.get("error_description");
      if (errorDescription) throw new Error(errorDescription.replace(/\+/g, " "));
      if (token) {
        const expiresIn = Number(params.get("expires_in")) || 3600;
        const expiresAt = Number(params.get("expires_at")) || Math.floor(Date.now() / 1000) + expiresIn;
        setSession({ access_token: token, refresh_token: params.get("refresh_token") || "", expires_in: expiresIn, expires_at: expiresAt, token_type: params.get("token_type") || "bearer" } as Session);
        const result = await authApi.me();
        const profile = result?.profile || {};
        if (profile.role === "admin" || profile.approval_status === "approved") {
          const role: Role = profile.role === "admin" ? "Admin" : profile.role === "business_owner" ? "Business" : "Founder";
          login({ name: profile.full_name || result.email?.split("@")[0] || "WS Hub member", email: result.email || "", role });
        } else {
          approvalPending = true;
          setAwaitingApproval(true);
          setSession(null);
        }
      }
      if (active) {
        setStatus("verified");
        setMessage(approvalPending ? "Your email is confirmed. Your account is waiting for administrator approval." : token ? "Your email is confirmed and your account is ready." : "Your email is confirmed. Sign in to continue to WS Hub.");
      }
    };
    confirm().catch((reason) => { if (active) { setStatus("error"); setMessage(reason instanceof Error ? reason.message : "This confirmation link may have expired."); } });
    return () => { active = false; };
  }, []);

  const iconWrap = status === "error" ? "bg-red-50 text-red-700" : status === "checking" ? "bg-navy-50 text-navy-700" : "bg-emerald-50 text-emerald-700";
  return (
    <div className="page-in mx-auto max-w-xl px-4 py-16 sm:py-24">
      <section className="card border-t-4 border-t-gold-500 p-7 text-center sm:p-10" aria-live="polite">
        <span aria-hidden="true" className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-full", iconWrap)}>
          {status === "checking" ? <LoaderCircle className="h-6 w-6 motion-safe:animate-spin" /> : status === "error" ? <AlertCircle className="h-6 w-6" /> : <CheckCircle2 className="h-7 w-7" />}
        </span>
        <p className="mt-5 text-[12px] font-bold uppercase tracking-[.14em] text-gold-800">Account confirmation</p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-navy-900">{status === "error" ? "Couldn’t confirm your email" : status === "checking" ? "One moment" : "You’re all set"}</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-7 text-slate-700">{message}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {status === "error" && <Link to="/auth/verified" className="btn-navy min-h-11 px-5 py-2.5">Try again</Link>}
          <Link to={status === "verified" && !awaitingApproval ? "/dashboard" : status === "verified" ? "/" : "/login"} className="btn-gold min-h-11 px-5 py-2.5">{status === "verified" && !awaitingApproval ? "Go to dashboard" : status === "verified" ? "Back to WS Hub" : "Sign in to WS Hub"}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          <Link to="/" className={btnOutline}>Back to home</Link>
        </div>
      </section>
    </div>
  );
}

export function AuthResetPasswordPage() {
  const params = callbackParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const accessToken = params.get("access_token") || "";
  useEffect(() => { document.title = "Reset password — WS Hub"; }, []);
  const requestReset = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError("");
    try { await authApi.forgotPassword(email.trim()); setSent(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send the reset email. Try again shortly."); }
    finally { setSubmitting(false); }
  };
  const savePassword = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError("");
    try { await authApi.resetPassword(password, accessToken); setComplete(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update your password. The link may have expired."); }
    finally { setSubmitting(false); }
  };
  return (
    <div className="page-in mx-auto max-w-xl px-4 py-12 sm:py-20">
      <Link to="/" className={`${backLink} mb-4`}><ArrowLeft aria-hidden="true" className="h-4 w-4" /> WS Hub home</Link>
      <section className="card border-t-4 border-t-gold-500 p-6 sm:p-9">
        <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-700">{complete ? <CheckCircle2 className="h-6 w-6" /> : <MailCheck className="h-6 w-6" />}</span>
        <p className="mt-5 text-[12px] font-bold uppercase tracking-[.14em] text-gold-800">Account security</p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-navy-900">{complete ? "Password updated" : accessToken ? "Choose a new password" : "Reset your password"}</h1>
        <p className="mt-3 text-[15px] leading-7 text-slate-700">{complete ? "Your password has been changed. Sign in with the new password to continue." : accessToken ? "Choose a strong password with at least 8 characters." : sent ? "If there’s an account for this email, a reset link is on its way. Check your inbox." : "Enter the email address on your account and we’ll send you a reset link."}</p>
        {error && (
          <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] leading-6 text-red-800">
            <AlertCircle aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {!complete && (accessToken ? (
          <form onSubmit={savePassword} className="mt-6 space-y-4">
            <Field label="New password" htmlFor="reset-password" hint="Use 8–72 characters."><input id="reset-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={inputCls} value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            <button type="submit" disabled={submitting} className="btn-gold min-h-12 w-full py-3">{submitting ? "Updating…" : "Update password"}</button>
          </form>
        ) : !sent && (
          <form onSubmit={requestReset} className="mt-6 space-y-4">
            <Field label="Email address" htmlFor="reset-email"><input id="reset-email" type="email" autoComplete="email" required className={inputCls} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></Field>
            <button type="submit" disabled={submitting} className="btn-gold min-h-12 w-full py-3">{submitting ? "Sending…" : "Send reset link"}</button>
          </form>
        ))}
        <div className="mt-6 border-t border-line pt-4 text-center text-[14px] text-slate-700"><Link to="/login" className={`inline-flex min-h-11 items-center rounded font-semibold text-navy-700 hover:underline ${focusRing}`}>Return to sign in</Link></div>
      </section>
    </div>
  );
}