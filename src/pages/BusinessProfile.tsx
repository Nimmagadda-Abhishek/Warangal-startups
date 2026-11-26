import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Download,
  Eye,
  Flag,
  Globe,
  Handshake,
  Mail,
  MapPin,
  Navigation,
  Newspaper,
  Phone,
  Share2,
  ShieldCheck,
  Star,
  Target,
  ThumbsUp,
  TrendingUp,
  User,
  Users,
  X,
  Wrench,
} from "lucide-react";
import { relatedBusinesses, type Achievement, type GalleryItem } from "../businesses";
import { ActionButtons, LogoBadge, SaveButton, VerifiedPill, WhatsAppIcon } from "../components/BusinessCard";
import { Stars } from "../components/Stars";
import { founders } from "../founders";
import { startups } from "../startups";
import { opportunities, typeColor } from "../opportunities";
import { Avatar, SideCard } from "../components/ProfileShell";
import { Reveal } from "../components/Reveal";
import { cn } from "../utils/cn";
import { useTrackView } from "../components/ui/Actions";
import { businessApi } from "../api";
import { Shimmer } from "../components/ui/Shimmer";

/* ───────────────────────── Constants & tokens ───────────────────────── */

const tabs = ["Overview", "Products", "Services", "Gallery", "Achievements", "Reviews", "Contact"] as const;
type Tab = (typeof tabs)[number];

const achievementIcon: Record<Achievement["type"], typeof Award> = {
  Award: Award,
  Certification: ShieldCheck,
  Expansion: TrendingUp,
  Media: Newspaper,
};

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const FOCUS_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900";
const EASE = "transition-all duration-200 ease-out motion-reduce:transition-none";
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const toUrl = (v?: string) => (!v ? "" : /^https?:\/\//i.test(v) ? v : `https://${v}`);

const btnBase = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold";

/** Keeps Tab focus inside a dialog. */
function trapTab(e: ReactKeyboardEvent<HTMLElement>) {
  if (e.key !== "Tab") return;
  const nodes = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'),
  );
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/** Moves focus into a dialog when it opens and restores it on close. */
function useDialogFocus(open: boolean, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => ref.current?.focus(), 0);
    return () => { window.clearTimeout(t); prev?.focus?.(); };
  }, [open, ref]);
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function SectionCard({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Reveal as="section" className="scroll-mt-[128px] rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
      <div id={id} className="scroll-mt-[128px]" />
      <div className="flex items-start gap-3">
        <span className="mt-1.5 h-5 w-1 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
        <div>
          <h2 className="text-[19px] font-bold tracking-tight text-navy-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-slate-600">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </Reveal>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-[14px] text-slate-600">{children}</p>;
}

/* ───────────────────────── Page ───────────────────────── */

export default function BusinessProfile() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  useTrackView("business:" + slug);
  const [apiBusiness, setApiBusiness] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  useEffect(() => {
    setProfileLoading(true);
    businessApi.get(slug).then(async (raw: any) => {
      if (!raw) throw new Error("Business not found");
      const b = raw?.business ?? raw.data?.data ?? raw.data ?? raw;
      let serviceRows = Array.isArray(b.services) ? b.services : [];
      if (serviceRows.length === 0 && b.id) {
        const response: any = await businessApi.services.list(b.id).catch(() => []);
        serviceRows = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.data) ? response.data.data : [];
      }
      setApiBusiness({
        id: b.id,
        slug: b.slug,
        name: b.name,
        category: b.category?.name || "Business",
        industry: b.category?.slug || "General",
        location: b.city || b.location || "",
        area: b.address || b.city || "",
        tagline: b.description || "",
        description: b.description || "",
        mission: b.mission || "This business has not added a mission statement yet.",
        vision: b.vision || "This business has not added a vision statement yet.",
        founder: b.owner?.full_name || "",
        employees: b.employee_count == null ? "Not listed" : String(b.employee_count),
        established: b.established_year == null ? null : Number(b.established_year),
        hours: "",
        businessType: b.listing_type === "startup" ? "Startup" : "SME",
        membership: b.plan_code || "Free",
        verified: Boolean(b.is_verified),
        rating: Number(b.avg_rating || 0),
        reviews: Number(b.review_count || 0),
        views: Number(b.view_count || 0),
        addedAt: b.created_at || "",
        verifiedAt: "",
        tags: b.tags || [],
        products: Array.isArray(b.products) ? b.products : [],
        services: serviceRows.filter((service: any) => service.is_active !== false && service.isActive !== false).map((service: any) => ({ name: service.name || service.title || "Service", description: service.description || service.details || "", price: service.price, currency: service.currency || "INR" })),
        gallery: Array.isArray(b.gallery) ? b.gallery : [],
        achievements: [],
        reviewList: (b.recentReviews || []).map((review: any) => ({ name: review.reviewer?.full_name || "WS Hub member", role: "Customer", date: new Date(review.created_at).toLocaleDateString("en-IN"), rating: Number(review.rating), text: review.comment || "", helpful: 0, id: review.id })),
        contact: {
          phone: b.phone || "",
          whatsapp: b.phone || "",
          email: b.email || "",
          website: b.website || "",
          address: b.address || b.city || "",
          maps: b.map_url || "",
          instagram: b.social_links?.instagram,
          linkedin: b.social_links?.linkedin,
        },
        cover: b.cover_url || b.coverUrl || "/images/hero.jpg",
        logoUrl: b.logo_url || b.logoUrl || undefined,
        logo: { initials: b.name?.slice(0, 2).toUpperCase() || "WS", bg: "#0f2a4a", fg: "#ffffff" },
      });
    }).catch(() => setApiBusiness(null)).finally(() => setProfileLoading(false));
  }, [slug]);
  const b = apiBusiness;
  const [active, setActive] = useState<Tab>("Overview");
  const [galleryGroup, setGalleryGroup] = useState<"All" | GalleryItem["group"]>("All");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [collab, setCollab] = useState(false);
  const [sent, setSent] = useState(false);
  const [helpful, setHelpful] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabNavRef = useRef<HTMLElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const collabRef = useRef<HTMLDivElement>(null);

  useDialogFocus(!!lightbox, lightboxRef);
  useDialogFocus(collab, collabRef);

  useEffect(() => {
    if (b) document.title = `${b.name} — WS Hub`;
  }, [b]);

  useEffect(() => {
    if (!slug) return;
    businessApi.trackView(slug).catch(() => undefined);
  }, [slug]);

  // Scroll-spy
  useEffect(() => {
    if (!b) return;
    const els = tabs.map((t) => document.getElementById(t.toLowerCase())).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive((e.target.id.charAt(0).toUpperCase() + e.target.id.slice(1)) as Tab);
        });
      },
      { rootMargin: "-130px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [b]);

  // Keep the active tab visible in the horizontally scrolling nav.
  useEffect(() => {
    const nav = tabNavRef.current;
    const btn = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !btn) return;
    nav.scrollTo({ left: btn.offsetLeft - nav.clientWidth / 2 + btn.clientWidth / 2, behavior: reduceMotion() ? "auto" : "smooth" });
  }, [active]);

  useEffect(() => {
    document.body.style.overflow = collab || lightbox ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [collab, lightbox]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCollab(false);
        setLightbox(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (profileLoading) {
    return <main role="status" aria-label="Loading business profile" className="page-in mx-auto max-w-[1280px] space-y-6 px-4 py-10 sm:px-6 lg:px-8"><Shimmer className="h-64 rounded-xl sm:h-80" /><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="card space-y-4 p-6"><Shimmer className="h-8 w-2/3" /><Shimmer className="h-4 w-1/3" /><Shimmer className="h-24 w-full" /><Shimmer className="h-12 w-full" /></section><aside className="card space-y-3 p-6"><Shimmer className="h-6 w-1/2" /><Shimmer className="h-10 w-full" /><Shimmer className="h-10 w-full" /><Shimmer className="h-10 w-full" /></aside></div></main>;
  }
  if (!b) return <Navigate to="/businesses" replace />;

  const related = relatedBusinesses(b);
  const galleryItems = galleryGroup === "All" ? b.gallery : b.gallery.filter((g) => g.group === galleryGroup);
  const publicShareUrl = businessApi.shareUrl(b.slug);
  const mapsHref = b.contact.maps || (b.contact.address ? `https://maps.google.com/?q=${encodeURIComponent(b.contact.address)}` : "");
  const openCollab = () => { setSent(false); setCollab(true); };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: b.name, text: b.description || `Discover ${b.name} on WS Hub.`, url: publicShareUrl });
      else {
        await navigator.clipboard.writeText(publicShareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* dismissed */
    }
  };

  const buildVCard = () => {
    const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
    const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escape(b.name)}`, `ORG:${escape(b.name)}`];
    if (b.contact.phone) lines.push(`TEL;TYPE=WORK,VOICE:${escape(b.contact.phone)}`);
    if (b.contact.email) lines.push(`EMAIL;TYPE=WORK:${escape(b.contact.email)}`);
    if (b.contact.website) lines.push(`URL:${escape(b.contact.website)}`);
    if (b.contact.address) lines.push(`ADR;TYPE=WORK:;;${escape(b.contact.address)};;;;`);
    lines.push(`NOTE:${escape(publicShareUrl)}`, "END:VCARD");
    return lines.join("\r\n");
  };

  const downloadVCard = () => {
    const url = URL.createObjectURL(new Blob([buildVCard()], { type: "text/vcard;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${b.slug || "business"}.vcf`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shareDigitalCard = async () => {
    const file = new File([buildVCard()], `${b.slug || "business"}.vcf`, { type: "text/vcard;charset=utf-8" });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${b.name} digital visiting card`, text: `Save ${b.name}'s contact card`, files: [file] });
      } else if (navigator.share) {
        downloadVCard();
        await navigator.share({ title: `${b.name} digital visiting card`, text: `Save ${b.name}'s contact details`, url: publicShareUrl });
      } else {
        downloadVCard();
        await navigator.clipboard.writeText(publicShareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        downloadVCard();
        try { await navigator.clipboard.writeText(publicShareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } catch { /* Clipboard may be unavailable in older browsers. */ }
      }
    }
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault(); setReviewError(""); setReviewSuccess(""); setReviewBusy(true);
    try {
      const response: any = await businessApi.reviews.submit(b.id, reviewRating, reviewComment.trim() || undefined);
      const saved = response?.data?.data ?? response?.data ?? response;
      const savedRow = { id: saved.id, name: "You", role: "Customer", date: new Date(saved.created_at || Date.now()).toLocaleDateString("en-IN"), rating: Number(saved.rating || reviewRating), text: saved.comment || reviewComment.trim(), helpful: 0 };
      setApiBusiness((current: any) => ({ ...current, reviewList: [savedRow, ...(current.reviewList || []).filter((item: any) => item.id !== saved.id)].slice(0, 5) }));
      setReviewComment(""); setReviewOpen(false); setReviewSuccess("Your review was submitted.");

      // A successful write should not be reported as a failed review just because
      // a follow-up read is temporarily unavailable.
      const [listResult, businessResult] = await Promise.allSettled([businessApi.reviews.list(b.id, 1, 5), businessApi.get(slug)]);
      if (listResult.status === "fulfilled") {
        const rows = listResult.value?.data || [];
        setApiBusiness((current: any) => ({ ...current, reviewList: rows.map((item: any) => ({ id: item.id, name: item.reviewer?.full_name || "WS Hub member", role: "Customer", date: new Date(item.created_at).toLocaleDateString("en-IN"), rating: Number(item.rating), text: item.comment || "", helpful: 0 })) }));
      }
      if (businessResult.status === "fulfilled") {
        const fresh = businessResult.value?.data?.data ?? businessResult.value?.data ?? businessResult.value;
        setApiBusiness((current: any) => ({ ...current, rating: Number(fresh.avg_rating ?? current.rating), reviews: Number(fresh.review_count ?? current.reviews) }));
      }
    } catch (error) {
      if ((error as { status?: number })?.status === 401) navigate(`/login?next=${encodeURIComponent(window.location.hash.slice(1))}`);
      setReviewError(error instanceof Error ? error.message : "Could not submit your review.");
    }
    finally { setReviewBusy(false); }
  };

  const jump = (t: Tab) => {
    document.getElementById(t.toLowerCase())?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    setActive(t);
  };

  const submitCollab = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const ratingDist = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    pct: b.reviewList.length ? Math.round((b.reviewList.filter((r) => r.rating === s).length / b.reviewList.length) * 100) : 0,
  }));

  const contactRows = [
    { icon: Phone, label: "Phone", value: b.contact.phone, href: b.contact.phone ? `tel:${b.contact.phone.replace(/\s/g, "")}` : "" },
    { icon: Mail, label: "Email", value: b.contact.email, href: b.contact.email ? `mailto:${b.contact.email}` : "" },
    { icon: Globe, label: "Website", value: b.contact.website, href: toUrl(b.contact.website) },
    { icon: LinkedinIcon, label: "LinkedIn", value: b.contact.linkedin, href: toUrl(b.contact.linkedin) },
    { icon: InstagramIcon, label: "Instagram", value: b.contact.instagram, href: toUrl(b.contact.instagram) },
    { icon: MapPin, label: "Address", value: b.contact.address, href: mapsHref },
  ].filter((r) => r.value);

  return (
    <div className="page-in pb-20 lg:pb-0">
      {/* ═════════ Cover ═════════ */}
      <div className="relative z-0 isolate h-[210px] overflow-hidden border-b-2 border-gold-500 bg-navy-900 sm:h-[260px] lg:h-[300px]">
        <img src={b.cover} alt="" className="ken-burns h-full w-full object-cover motion-reduce:animate-none" onError={(event) => { if (!event.currentTarget.src.endsWith("/images/hero.jpg")) event.currentTarget.src = "/images/hero.jpg"; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/25 to-navy-950/55" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0">
          <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 pr-28 text-[13px] text-white/85">
              <Link to="/" className={cn("rounded hover:text-white", FOCUS_DARK)}>Home</Link>
              <ChevronRight className="h-3.5 w-3.5 text-white/50" aria-hidden="true" />
              <Link to="/businesses" className={cn("rounded hover:text-white", FOCUS_DARK)}>Businesses</Link>
              <ChevronRight className="h-3.5 w-3.5 text-white/50" aria-hidden="true" />
              <span aria-current="page" className="max-w-[220px] truncate font-medium text-white">{b.name}</span>
            </nav>
          </div>
        </div>
        <div className="absolute right-4 top-4 flex gap-2 sm:right-6 lg:right-8">
          <button type="button" onClick={share} aria-label="Share this business" className={cn("relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/60 bg-white/95 text-navy-800 shadow-sm hover:bg-white", EASE, FOCUS_DARK)}>
            <Share2 className="h-4 w-4" />
            {copied && <span role="status" className="fade-in absolute right-0 top-12 whitespace-nowrap rounded-md bg-navy-900 px-2.5 py-1 text-[12px] font-semibold text-white">Link copied</span>}
          </button>
          <SaveButton slug={b.slug} />
        </div>
      </div>

      {/* ═════════ Identity card ═════════ */}
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="-mt-12 rounded-xl border border-line border-t-[3px] border-t-gold-500 bg-white p-5 shadow-[var(--shadow-card)] sm:-mt-14 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <LogoBadge b={b} size="xl" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="text-[26px] font-bold leading-tight tracking-tight text-navy-900 sm:text-[32px]">{b.name}</h1>
                  {b.verified && <VerifiedPill />}
                </div>
                {b.tagline && <p className="mt-1.5 line-clamp-2 max-w-2xl text-[15px] font-medium text-slate-700">{b.tagline}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-slate-500" aria-hidden="true" /> {b.category} · {b.industry}</span>
                  {(b.area || b.location) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-500" aria-hidden="true" /> {[b.area, b.location].filter(Boolean).join(", ")}</span>}
                  <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4 text-slate-500" aria-hidden="true" /> {b.views.toLocaleString("en-IN")} views</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Stars rating={b.rating} reviews={b.reviews} size={14} />
                  <button type="button" onClick={() => jump("Reviews")} className={cn("rounded text-[13px] font-semibold text-navy-700 hover:underline", FOCUS)}>Read reviews</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap md:max-w-[380px] md:justify-end">
              {b.contact.phone && (
                <a href={`tel:${b.contact.phone.replace(/\s/g, "")}`} className={cn(btnBase, "bg-navy-50 text-navy-800 hover:bg-navy-100", EASE, FOCUS)}><Phone className="h-4 w-4" aria-hidden="true" /> Call</a>
              )}
              {b.contact.whatsapp && (
                <a href={`https://wa.me/${b.contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className={cn(btnBase, "bg-emerald-50 text-emerald-800 hover:bg-emerald-100", EASE, FOCUS)}><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
              )}
              {b.contact.website && (
                <a href={toUrl(b.contact.website)} target="_blank" rel="noreferrer" className={cn(btnBase, "border border-slate-300 text-navy-800 hover:border-navy-700 hover:bg-navy-50", EASE, FOCUS)}><Globe className="h-4 w-4" aria-hidden="true" /> Website</a>
              )}
              {mapsHref && (
                <a href={mapsHref} target="_blank" rel="noreferrer" className={cn(btnBase, "border border-slate-300 text-navy-800 hover:border-navy-700 hover:bg-navy-50", EASE, FOCUS)}><Navigation className="h-4 w-4" aria-hidden="true" /> Directions</a>
              )}
              <button type="button" onClick={openCollab} className={cn(btnBase, "col-span-2 bg-gold-500 px-5 font-bold text-navy-900 hover:-translate-y-0.5 hover:bg-gold-400 hover:shadow-[0_12px_24px_-10px_rgba(226,176,74,0.9)] motion-reduce:hover:translate-y-0 sm:col-span-1", EASE, FOCUS)}>
                <Handshake className="h-4 w-4" aria-hidden="true" /> Collaborate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════ Section tabs ═════════ */}
      <div ref={tabsRef} className="sticky top-[60px] z-30 mt-6 border-y border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <nav ref={tabNavRef} className="flex gap-1 overflow-x-auto hide-scrollbar" aria-label="Profile sections">
            {tabs.map((t) => {
              const on = active === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => jump(t)}
                  aria-current={on ? "true" : undefined}
                  className={cn("relative min-h-[48px] shrink-0 rounded-md px-4 text-[14px] font-semibold transition-colors duration-200 motion-reduce:transition-none", FOCUS, on ? "text-navy-900" : "text-slate-600 hover:text-navy-900")}
                >
                  {t}
                  <span className={cn("absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-gold-500 transition-transform duration-300 motion-reduce:transition-none", on ? "scale-x-100" : "scale-x-0")} aria-hidden="true" />
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ═════════ Body ═════════ */}
      <div className="mx-auto max-w-[1280px] px-4 pt-7 sm:px-6 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {/* Overview */}
            <SectionCard id="overview" title="Overview">
              <p className="text-[15px] leading-relaxed text-slate-700">{b.description}{b.location ? ` Based in ${[b.area, b.location].filter(Boolean).join(", ")},` : ""} {b.name} is a {b.businessType.toLowerCase()} in the {b.industry.toLowerCase()} space{b.established ? `, established in ${b.established}` : ""}.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-navy-100 bg-navy-50/60 p-5">
                  <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-navy-700"><Target className="h-4 w-4" aria-hidden="true" /> Mission</p>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-slate-700">{b.mission}</p>
                </div>
                <div className="rounded-lg border border-gold-100 bg-gold-100/50 p-5">
                  <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-gold-800"><Eye className="h-4 w-4" aria-hidden="true" /> Vision</p>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-slate-700">{b.vision}</p>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-5 border-t border-line pt-6 sm:grid-cols-4">
                {[
                  { icon: User, k: "Founder", v: b.founder || "Not listed" },
                  { icon: Users, k: "Employees", v: b.employees },
                  { icon: CalendarDays, k: "Established", v: b.established == null ? "Not listed" : String(b.established) },
                  { icon: Clock, k: "Working Hours", v: b.hours || "Not listed" },
                ].map(({ icon: Icon, k, v }) => (
                  <div key={k} className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-gold-400" aria-hidden="true"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <dt className="text-[12px] text-slate-500">{k}</dt>
                      <dd className="text-[14px] font-semibold leading-snug text-navy-900">{v}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </SectionCard>

            {/* Products */}
            <SectionCard id="products" title="Products" subtitle={`${b.products.length} products & offerings`}>
              {b.products.length === 0 ? (
                <EmptyNote>No products have been added yet.</EmptyNote>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {b.products.map((p) => (
                    <article key={p.name} className="card group flex flex-col overflow-hidden">
                      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                        {p.image ? <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" /> : <div className="flex h-full items-center justify-center px-3 text-center text-[13px] text-slate-500">{p.name}</div>}
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] font-bold text-navy-900">{p.name}</h3>
                          {p.price && <span className="shrink-0 rounded-md bg-gold-100 px-2 py-0.5 text-[12px] font-bold text-gold-800">{p.price}</span>}
                        </div>
                        <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-slate-600">{p.description}</p>
                        <button type="button" onClick={openCollab} className={cn("mt-4 inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-navy-900 px-3 text-[13px] font-semibold text-navy-900 hover:bg-navy-900 hover:text-white", EASE, FOCUS)}>Send Enquiry</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Services */}
            <SectionCard id="services" title="Services">
              <div className="grid gap-4 sm:grid-cols-3">
                {b.services.map((s, i) => (
                  <div key={s.name + i} className="group rounded-lg border border-line p-5 transition-all duration-300 hover:-translate-y-1 hover:border-navy-100 hover:shadow-[var(--shadow-card-hover)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900 text-gold-400" aria-hidden="true">
                      {i % 3 === 0 ? <Target className="h-5 w-5" /> : i % 3 === 1 ? <Wrench className="h-5 w-5" /> : <Handshake className="h-5 w-5" />}
                    </span>
                    <h3 className="mt-3.5 text-[15px] font-bold text-navy-900">{s.name}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{s.description}</p>
                  </div>
                ))}
                {b.services.length === 0 && <div className="sm:col-span-3"><EmptyNote>No services have been added yet.</EmptyNote></div>}
              </div>
            </SectionCard>

            {/* Gallery */}
            <SectionCard id="gallery" title="Gallery">
              <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Gallery category">
                {(["All", "Office", "Team", "Events", "Products", "Other"] as const).map((g) => (
                  <button key={g} type="button" onClick={() => setGalleryGroup(g)} aria-pressed={galleryGroup === g} className={cn("inline-flex min-h-[40px] items-center rounded-full border px-4 text-[13px] font-medium", EASE, FOCUS, galleryGroup === g ? "border-navy-900 bg-navy-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-navy-700 hover:bg-navy-50")}>{g}</button>
                ))}
              </div>
              {galleryItems.length === 0 ? (
                <EmptyNote>No photos in this category yet.</EmptyNote>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryItems.map((g, i) => (
                    <button key={g.image + i} type="button" onClick={() => setLightbox(g)} aria-label={`View ${g.label}`} className={cn("group relative overflow-hidden rounded-lg", FOCUS, i === 0 && "col-span-2 row-span-2 sm:col-span-2")}>
                      <img src={g.image} alt={g.label} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 to-transparent px-3 pb-2.5 pt-10 text-left text-[13px] font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">{g.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Achievements */}
            <SectionCard id="achievements" title="Achievements" subtitle="Awards, certifications, expansion and media">
              {b.achievements.length === 0 ? (
                <EmptyNote>No achievements have been added yet.</EmptyNote>
              ) : (
                <ol className="relative ml-3 border-l-2 border-navy-100 pl-7">
                  {b.achievements.map((a, i) => {
                    const Icon = achievementIcon[a.type];
                    return (
                      <li key={`${a.year}-${a.title}-${i}`} className="relative pb-7 last:pb-0">
                        <span className="absolute -left-[41px] flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-navy-900 ring-4 ring-white" aria-hidden="true"><Icon className="h-3.5 w-3.5" strokeWidth={2.2} /></span>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[14px] font-bold text-gold-800">{a.year}</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-slate-600">{a.type}</span>
                        </div>
                        <h3 className="mt-1.5 text-[15px] font-bold text-navy-900">{a.title}</h3>
                        <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{a.description}</p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </SectionCard>

            {/* Reviews */}
            <SectionCard id="reviews" title="Reviews">
              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                <div className="self-start rounded-xl border border-navy-100 bg-navy-50/70 p-5 text-center">
                  <p className="text-[44px] font-bold leading-none tracking-tight text-navy-900 tabular-nums">{b.rating.toFixed(1)}</p>
                  <div className="mt-2.5 flex justify-center"><Stars rating={b.rating} reviews={b.reviews} size={14} /></div>
                  <div className="mt-5 space-y-2">
                    {ratingDist.map((r) => (
                      <div key={r.star} className="flex items-center gap-2 text-[12px] text-slate-600">
                        <span className="w-3 tabular-nums">{r.star}</span>
                        <Star className="h-3 w-3 text-gold-500" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-gold-500" style={{ width: `${r.pct}%` }} /></span>
                        <span className="w-9 text-right tabular-nums">{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setReviewOpen((open) => !open)} aria-expanded={reviewOpen} className={cn("btn-navy mt-5 min-h-[44px] w-full text-[13px]", FOCUS)}>{reviewOpen ? "Cancel review" : "Write a Review"}</button>
                </div>

                <div className="space-y-4">
                  {reviewOpen && (
                    <form onSubmit={(event) => void submitReview(event)} className="rounded-xl border border-line bg-slate-50/60 p-5">
                      <h3 className="text-[15px] font-bold text-navy-900">Share your experience</h3>
                      <div className="my-3 flex gap-0.5" role="radiogroup" aria-label="Your rating">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button key={rating} type="button" role="radio" aria-checked={reviewRating === rating} aria-label={`${rating} star${rating === 1 ? "" : "s"}`} onClick={() => setReviewRating(rating)} className={cn("flex h-11 w-11 items-center justify-center rounded-md", FOCUS)}>
                            <Star className={cn("h-7 w-7", rating <= reviewRating ? "text-gold-500" : "text-slate-300")} fill="currentColor" />
                          </button>
                        ))}
                      </div>
                      <label htmlFor="review-comment" className="mb-1.5 block text-[13px] font-semibold text-navy-900">Comment <span className="font-normal text-slate-500">(optional)</span></label>
                      <textarea id="review-comment" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={2000} rows={4} placeholder="What was your experience like?" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-[14px] outline-none placeholder:text-slate-500 focus:border-navy-700 focus:ring-2 focus:ring-gold-500/60" />
                      {reviewError && <p role="alert" className="mt-2 text-[13px] font-medium text-red-700">{reviewError}</p>}
                      <button type="submit" disabled={reviewBusy} className={cn("btn-navy mt-3 min-h-[44px] px-6 text-[13px] disabled:opacity-60", FOCUS)}>{reviewBusy ? "Submitting…" : "Submit review"}</button>
                    </form>
                  )}
                  {reviewSuccess && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-800">{reviewSuccess}</p>}
                  {b.reviewList.length === 0 && !reviewOpen && <EmptyNote>No reviews yet. Be the first to share your experience.</EmptyNote>}
                  <ul className="space-y-4">
                    {b.reviewList.map((r, i) => (
                      <li key={r.id || `${r.name}-${r.date}-${i}`} className="rounded-xl border border-line p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-[13px] font-bold text-white" aria-hidden="true">{r.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                            <div>
                              <p className="text-[14px] font-bold text-navy-900">{r.name}</p>
                              <p className="text-[13px] text-slate-500">{r.role} · {r.date}</p>
                            </div>
                          </div>
                          <span className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5 stars`}>
                            {Array.from({ length: 5 }).map((_, s) => <Star key={s} className={cn("h-4 w-4", s < r.rating ? "text-gold-500" : "text-slate-300")} fill="currentColor" strokeWidth={0} />)}
                          </span>
                        </div>
                        {r.text && <p className="mt-3 text-[14px] leading-relaxed text-slate-700">{r.text}</p>}
                        <div className="mt-3 flex items-center gap-2 text-[13px]">
                          <button type="button" onClick={() => setHelpful((h) => ({ ...h, [i]: !h[i] }))} aria-pressed={!!helpful[i]} className={cn("inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2.5 font-medium transition-colors", FOCUS, helpful[i] ? "bg-navy-50 text-navy-900" : "text-slate-600 hover:bg-slate-50 hover:text-navy-900")}>
                            <ThumbsUp className="h-4 w-4" fill={helpful[i] ? "currentColor" : "none"} aria-hidden="true" /> Helpful ({r.helpful + (helpful[i] ? 1 : 0)})
                          </button>
                          <button type="button" className={cn("inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2.5 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700", FOCUS)}><Flag className="h-4 w-4" aria-hidden="true" /> Report</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SectionCard>

            {/* Contact */}
            <SectionCard id="contact" title="Contact">
              <div className={cn("grid gap-6", b.contact.address && "md:grid-cols-2")}>
                {contactRows.length === 0 ? (
                  <EmptyNote>No contact details have been added yet.</EmptyNote>
                ) : (
                  <ul className="space-y-4 text-[14px]">
                    {contactRows.map(({ icon: Icon, label, value, href }) => (
                      <li key={label} className="flex items-start gap-3.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700" aria-hidden="true"><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">{label}</p>
                          <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cn("group inline-flex items-center gap-1.5 break-all rounded font-semibold text-navy-900 hover:text-navy-600", FOCUS)}>
                            {value}
                            {href.startsWith("http") && <ExternalLink className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {b.contact.address && (
                  <div className="overflow-hidden rounded-xl border border-line">
                    <iframe
                      title={`Map of ${b.name}`}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(b.contact.address)}&z=14&output=embed`}
                      className="h-[260px] w-full md:h-full md:min-h-[300px]"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <button type="button" onClick={() => void shareDigitalCard()} className={cn(btnBase, "bg-navy-900 text-white hover:bg-navy-800", EASE, FOCUS)}><Share2 className="h-4 w-4" aria-hidden="true" />Share digital card</button>
                <button type="button" onClick={downloadVCard} className={cn(btnBase, "border border-navy-900 text-navy-900 hover:bg-navy-50", EASE, FOCUS)}><Download className="h-4 w-4" aria-hidden="true" />Download contact card</button>
                {copied && <span role="status" className="text-[13px] font-medium text-emerald-700">Profile link copied. The contact card was downloaded.</span>}
              </div>
            </SectionCard>
          </div>

          {/* ═════════ Sidebar ═════════ */}
          <aside className="space-y-5 lg:sticky lg:top-[124px] lg:self-start" aria-label="Summary">
            <SideCard title="Quick Info">
              <dl className="text-[14px]">
                {[
                  ["Business Type", b.businessType],
                  ["Membership", b.membership],
                  ["Established", b.established == null ? "Not listed" : String(b.established)],
                  ["Employees", b.employees],
                  ["Location", b.location || "Not listed"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-line py-2.5 first:pt-0 last:border-0 last:pb-0">
                    <dt className="text-slate-600">{k}</dt>
                    <dd className="text-right font-semibold text-navy-900">{v}</dd>
                  </div>
                ))}
              </dl>
              {b.verified && (
                <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] font-medium text-emerald-800"><BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> Verified by WS Hub team</p>
              )}
            </SideCard>

            {(() => {
              const founder = founders.find((f) => f.businessSlug === b.slug);
              const startup = startups.find((st) => st.businessSlug === b.slug);
              const opps = opportunities.filter((o) => o.postedBy.slug === b.slug);
              if (!founder && opps.length === 0 && !startup) return null;
              return (
                <SideCard title="Connected profiles">
                  {startup && (
                    <Link to={`/startups/${startup.slug}`} className={cn("mb-3 flex items-center gap-3 rounded-lg border border-gold-300 bg-gold-100/40 p-3 hover:bg-gold-100", EASE, FOCUS)}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold" style={{ background: startup.logo.bg, color: startup.logo.fg }} aria-hidden="true">{startup.logo.initials}</span>
                      <span className="min-w-0"><span className="block text-[12px] text-slate-600">Startup profile</span><span className="block truncate text-[14px] font-bold text-navy-900">{startup.name} · {startup.stage}</span></span>
                    </Link>
                  )}
                  {founder && (
                    <Link to={`/founders/${founder.slug}`} className={cn("flex items-center gap-3 rounded-lg border border-line p-3 hover:border-navy-700 hover:bg-navy-50", EASE, FOCUS)}>
                      <Avatar initials={founder.initials} color={founder.color} size="sm" />
                      <span className="min-w-0"><span className="block truncate text-[14px] font-bold text-navy-900">{founder.name}</span><span className="block text-[13px] text-slate-600">Founder · {founder.role} · {founder.stage}</span></span>
                    </Link>
                  )}
                  {opps.length > 0 && (
                    <>
                      <h4 className={cn("text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500", (founder || startup) && "mt-5")}>Active opportunities</h4>
                      <ul className="mt-3 space-y-2">
                        {opps.map((o) => (
                          <li key={o.slug}>
                            <Link to={`/opportunities/${o.slug}`} className={cn("block rounded-lg border border-line p-3 hover:border-navy-700 hover:bg-navy-50", EASE, FOCUS)}>
                              <span className={cn("rounded-md px-2 py-0.5 text-[12px] font-semibold", typeColor[o.type])}>{o.type}</span>
                              <span className="mt-1.5 block text-[14px] font-semibold text-navy-900">{o.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </SideCard>
              );
            })()}

            {[...b.tags, ...b.services.map((s) => s.name)].length > 0 && (
              <SideCard title="Products & Services">
                <div className="flex flex-wrap gap-2">
                  {[...b.tags, ...b.services.map((s) => s.name)].map((t) => (
                    <Link key={t} to={`/businesses?q=${encodeURIComponent(t)}`} className={cn("inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:border-navy-900 hover:bg-navy-900 hover:text-white", EASE, FOCUS)}>{t}</Link>
                  ))}
                </div>
              </SideCard>
            )}

            <div className="overflow-hidden rounded-xl border-b-2 border-gold-500 bg-navy-900 p-6 text-white shadow-[var(--shadow-card)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-gold-400" aria-hidden="true"><Handshake className="h-6 w-6" /></span>
              <h3 className="mt-4 text-[17px] font-bold tracking-tight">Want to work with {b.name}?</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-white/80">Send a collaboration request for partnerships, supply or investment.</p>
              <button type="button" onClick={openCollab} className={cn("mt-5 min-h-[46px] w-full rounded-lg bg-gold-500 text-[14px] font-bold text-navy-900 hover:bg-gold-400", EASE, FOCUS_DARK)}>Request Collaboration</button>
            </div>
          </aside>
        </div>

        {/* ═════════ Related ═════════ */}
        <section className="mb-10 mt-14" aria-labelledby="related">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-3">
            <div className="flex items-center gap-3">
              <span className="h-6 w-1 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
              <div>
                <h2 id="related" className="text-[21px] font-bold leading-tight tracking-tight text-navy-900">Similar Businesses</h2>
                <p className="text-[13px] text-slate-600">More in {b.category} and {b.industry}</p>
              </div>
            </div>
            <Link to={`/businesses?category=${encodeURIComponent(b.category)}`} className={cn("view-all shrink-0 rounded", FOCUS)}>View All <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((r, i) => (
              <Reveal key={r.slug} delay={i * 50}>
                <article className="card group flex h-full flex-col overflow-hidden">
                  <Link to={`/businesses/${r.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/8] overflow-hidden">
                    <img src={r.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
                  </Link>
                  <div className="px-4 pb-4">
                    <div className="-mt-6 flex items-end justify-between">
                      <LogoBadge b={r} size="sm" />
                      {r.verified && <VerifiedPill className="mb-0.5" />}
                    </div>
                    <h3 className="mt-2.5 truncate text-[15px] font-bold text-navy-900"><Link to={`/businesses/${r.slug}`} className={cn("rounded hover:text-navy-600", FOCUS)}>{r.name}</Link></h3>
                    <p className="text-[13px] text-slate-600">{r.industry} · {r.location}</p>
                    <div className="mt-2"><Stars rating={r.rating} reviews={r.reviews} /></div>
                    <div className="mt-3.5"><ActionButtons b={r} compact /></div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      {/* ═════════ Lightbox ═════════ */}
      {lightbox && createPortal(
        <div
          ref={lightboxRef}
          tabIndex={-1}
          onKeyDown={trapTab}
          className="fade-in fixed inset-0 z-[70] flex items-center justify-center bg-navy-950/92 p-4 outline-none"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.label}
        >
          <button type="button" aria-label="Close image" onClick={() => setLightbox(null)} className={cn("absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20", FOCUS_DARK)}><X className="h-5 w-5" /></button>
          <figure className="max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.image} alt={lightbox.label} className="max-h-[80vh] w-full rounded-lg object-contain" />
            <figcaption className="mt-3 text-center text-[14px] text-white/85">{lightbox.label}</figcaption>
          </figure>
        </div>,
        document.body,
      )}

      {/* ═════════ Collaboration modal ═════════ */}
      {collab && createPortal(
        <div className="fade-in fixed inset-0 z-[70] flex items-end justify-center bg-navy-950/70 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={() => setCollab(false)}>
          <div
            ref={collabRef}
            tabIndex={-1}
            onKeyDown={trapTab}
            role="dialog"
            aria-modal="true"
            aria-labelledby="collab-title"
            className="page-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t-[3px] border-gold-500 bg-white p-6 shadow-2xl outline-none sm:rounded-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="collab-title" className="text-[20px] font-bold tracking-tight text-navy-900">Request Collaboration</h2>
                <p className="mt-0.5 text-[14px] text-slate-600">with {b.name}</p>
              </div>
              <button type="button" aria-label="Close dialog" onClick={() => setCollab(false)} className={cn("flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100", FOCUS)}><X className="h-5 w-5" /></button>
            </div>
            {sent ? (
              <div className="py-8 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-verified" aria-hidden="true" />
                <h3 className="mt-3 text-[18px] font-bold text-navy-900">Request sent!</h3>
                <p className="mt-1 text-[14px] text-slate-600">{b.name} will get back to you within 2 business days.</p>
                <button type="button" onClick={() => setCollab(false)} className={cn("btn-navy mt-6 min-h-[44px] px-8 text-[14px]", FOCUS)}>Done</button>
              </div>
            ) : (
              <form onSubmit={submitCollab} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Your name" placeholder="Full name" autoComplete="name" required />
                  <Input label="Phone / WhatsApp" placeholder="+91" type="tel" autoComplete="tel" required />
                </div>
                <Input label="Company (optional)" placeholder="Your business or startup" autoComplete="organization" />
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-navy-900" htmlFor="ctype">Collaboration type</label>
                  <select id="ctype" className="select w-full text-[14px]">
                    {["Partnership", "Supplier / Vendor", "Distribution", "Investment", "Service Enquiry", "Other"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-navy-900" htmlFor="msg">Message</label>
                  <textarea id="msg" required rows={4} placeholder="Briefly describe what you'd like to collaborate on…" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[14px] placeholder:text-slate-500 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-gold-500/60" />
                </div>
                <button type="submit" className={cn(btnBase, "w-full bg-gold-500 py-3 text-[14px] font-bold text-navy-900 hover:bg-gold-400", EASE, FOCUS)}><Handshake className="h-4 w-4" aria-hidden="true" /> Send Request</button>
                <p className="text-center text-[13px] text-slate-500">Your details are shared only with {b.name}.</p>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function Input({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-navy-900">{label}</label>
      <input id={id} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-[14px] placeholder:text-slate-500 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-gold-500/60" {...rest} />
    </div>
  );
}