import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { BusinessRecord } from "../businesses";
import { Stars } from "./Stars";
import { getState, toggleSaved, useStore } from "../store";
import { cn } from "../utils/cn";
import { businessApi } from "../api";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

/* Hand-drawn glyphs, same family as the rest of the site */
function Glyph({ children, className, fill = "none", sw = 1.6 }: { children: ReactNode; className?: string; fill?: string; sw?: number }) {
  return (
    <svg viewBox="0 0 20 20" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/* Kept as an export in case other pages use it */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4ZM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8Zm8.4-18.2A11.8 11.8 0 0 0 12 .2C5.5.2.2 5.5.2 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.6c1.7.9 3.7 1.4 5.7 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4Z" />
    </svg>
  );
}

export function LogoBadge({ b, size = "md" }: { b: BusinessRecord; size?: "sm" | "md" | "lg" | "xl" }) {
  const dims = {
    sm: "h-10 w-10 text-[13px]",
    md: "h-14 w-14 text-[15px]",
    lg: "h-20 w-20 text-lg",
    xl: "h-24 w-24 text-xl sm:h-28 sm:w-28 sm:text-2xl",
  }[size];
  return (
    <span
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold tracking-tight ring-4 ring-white", dims)}
      style={{ background: b.logo.bg, color: b.logo.fg }}
      aria-hidden="true"
    >
      <span>{b.logo.initials}</span>
      {b.logoUrl && (
        <img
          src={b.logoUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}

/* Chip used on top of photographs (save, share) */
const overlayChip =
  "relative flex h-10 w-10 items-center justify-center rounded-md border border-white/70 bg-white/95 text-navy-800 backdrop-blur transition-colors hover:bg-white motion-reduce:transition-none";

export function SaveButton({ slug, className }: { slug: string; className?: string }) {
  const saved = useStore((s) => s.saved.business).includes(slug);
  const [pop, setPop] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label="Save business"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const willSave = !getState().saved.business.includes(slug);
        toggleSaved("business", slug);
        (willSave ? businessApi.addFavorite(slug) : businessApi.removeFavorite(slug)).catch(() => undefined);
        setPop(true);
        setTimeout(() => setPop(false), 450);
      }}
      className={cn(
        overlayChip,
        focusRing,
        /* Saved = dark chip with a gold bookmark: readable without relying on hue alone */
        saved && "border-navy-900 bg-navy-900 text-gold-400 hover:bg-navy-800",
        pop && "animate-[bookmark-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:animate-none",
        className,
      )}
    >
      <Glyph className="h-[18px] w-[18px]" fill={saved ? "currentColor" : "none"} sw={1.7}>
        <path d="M5.4 3.8h9.2v12.7L10 13.3l-4.6 3.2V3.8Z" />
      </Glyph>
    </button>
  );
}

/* Replaces the silent copy: confirms on screen and to screen readers */
function ShareCardButton({ b }: { b: BusinessRecord }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked */
    }
  };
  const share = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#/businesses/${encodeURIComponent(b.slug)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${b.name} digital card`, text: `Explore ${b.name} on WS Hub`, url });
      else await copy(url);
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") await copy(url);
    }
  };

  return (
    <div className="relative">
      <button type="button" onClick={share} aria-label={`Share ${b.name} digital card`} className={cn(overlayChip, focusRing)}>
        <Glyph className="h-[18px] w-[18px]" sw={1.7}>
          <path d="M10 12.2V3.6" />
          <path d="m6.8 6.6 3.2-3.2 3.2 3.2" />
          <path d="M4.6 11v4.1c0 .7.6 1.3 1.3 1.3h8.2c.7 0 1.3-.6 1.3-1.3V11" />
        </Glyph>
      </button>
      <span role="status" className={copied ? "absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded bg-navy-900 px-2.5 py-1.5 text-[12px] font-medium text-white" : "sr-only"}>
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}

export function VerifiedPill({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-navy-800 px-2.5 py-1 text-[12px] font-semibold leading-none text-white", className)}>
      <Glyph className="h-3 w-3 text-gold-400" sw={2.2}>
        <path d="m4.8 10.4 3.4 3.4 7-7.6" />
      </Glyph>
      Verified
    </span>
  );
}

export function ActionButtons({ b, compact = false }: { b: BusinessRecord; compact?: boolean }) {
  const base = cn(
    "inline-flex items-center justify-center rounded-md font-semibold transition-colors motion-reduce:transition-none",
    focusRing,
    compact ? "h-10 px-3.5 text-[13px]" : "h-11 px-4 text-[14px]",
  );
  const secondary = "border border-slate-300 text-navy-800 hover:bg-navy-50";
  const phone = b.contact?.phone?.replace(/\s/g, "");
  const whatsapp = b.contact?.whatsapp?.replace(/\D/g, "");

  return (
    <div className="flex flex-wrap gap-2">
      <Link to={`/businesses/${b.slug}`} className={cn(base, "min-w-[110px] flex-1 bg-navy-800 text-white hover:bg-navy-700")}>
        View profile
      </Link>
      {phone && (
        <a href={`tel:${phone}`} className={cn(base, secondary)}>
          Call
        </a>
      )}
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={cn(base, secondary)}>
          WhatsApp
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}

/* ---------- shared bits for both card layouts ---------- */

function FounderLine({ b }: { b: BusinessRecord }) {
  if (!b.founder) return null;
  return (
    <p className="mt-2 truncate text-[13px] text-slate-600">
      Founder{" "}
      {b.founderId ? (
        <Link to={`/members/${encodeURIComponent(b.founderId)}`} className={cn("rounded-sm font-semibold text-navy-700 hover:underline", focusRing)}>
          {b.founder}
        </Link>
      ) : (
        <span className="font-semibold text-navy-700">{b.founder}</span>
      )}
    </p>
  );
}

function Tags({ tags }: { tags?: string[] }) {
  const list = tags || [];
  if (!list.length) return null;
  const shown = list.slice(0, 4);
  const extra = list.length - shown.length;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
      {shown.map((t) => (
        <li key={t} className="rounded-md bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-700">
          {t}
        </li>
      ))}
      {extra > 0 && <li className="px-1 py-1 text-[12px] font-medium text-slate-600">+{extra} more</li>}
    </ul>
  );
}

function categoryLine(b: BusinessRecord) {
  return [b.category, b.industry].filter((v, i, a) => v && a.indexOf(v) === i).join(", ");
}

function Cover({ b, className }: { b: BusinessRecord; className: string }) {
  /* Image link is a pointer convenience; the title link is the tab stop */
  return (
    <Link to={`/businesses/${b.slug}`} tabIndex={-1} aria-hidden="true" className={cn("block overflow-hidden bg-navy-50", className)}>
      {b.cover && <img src={b.cover} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </Link>
  );
}

function CardActions({ b }: { b: BusinessRecord }) {
  return (
    <div className="absolute right-3 top-3 flex gap-2">
      <ShareCardButton b={b} />
      <SaveButton slug={b.slug} />
    </div>
  );
}

interface Props {
  b: BusinessRecord;
  view?: "grid" | "list";
}

export function BusinessCard({ b, view = "grid" }: Props) {
  const place = [b.location, b.established ? `since ${b.established}` : ""].filter(Boolean).join(", ");

  if (view === "list") {
    return (
      <article className="card grid overflow-hidden sm:grid-cols-[240px_1fr]">
        <div className="relative">
          <Cover b={b} className="aspect-[16/10] sm:aspect-auto sm:h-full" />
          <CardActions b={b} />
        </div>
        <div className="flex flex-col p-5">
          <div className="flex items-start gap-3">
            <LogoBadge b={b} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h3 className="text-[17px] font-semibold leading-snug text-navy-900">
                  <Link to={`/businesses/${b.slug}`} className={cn("rounded-sm hover:underline hover:decoration-gold-500 hover:underline-offset-4", focusRing)}>
                    {b.name}
                  </Link>
                </h3>
                {b.verified && <VerifiedPill />}
              </div>
              <p className="mt-0.5 text-[13px] font-medium text-slate-700">{categoryLine(b)}</p>
            </div>
            <div className="hidden shrink-0 sm:block">
              <Stars rating={b.rating} reviews={b.reviews} />
            </div>
          </div>

          <FounderLine b={b} />
          <p className="mt-2.5 text-[14px] leading-relaxed text-slate-600">{b.description}</p>
          <p className="mt-2.5 text-[13px] text-slate-600">{place}</p>
          <div className="mt-2 sm:hidden">
            <Stars rating={b.rating} reviews={b.reviews} />
          </div>
          <Tags tags={b.tags} />

          <div className="mt-auto pt-5">
            <ActionButtons b={b} compact />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="relative">
        <Cover b={b} className="aspect-[16/9]" />
        {b.verified && <VerifiedPill className="absolute bottom-3 left-3" />}
        <CardActions b={b} />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <LogoBadge b={b} size="sm" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold leading-snug text-navy-900">
              <Link to={`/businesses/${b.slug}`} className={cn("rounded-sm hover:underline hover:decoration-gold-500 hover:underline-offset-4", focusRing)}>
                {b.name}
              </Link>
            </h3>
            <p className="mt-0.5 text-[13px] font-medium text-slate-700">{categoryLine(b)}</p>
          </div>
        </div>

        <div className="mt-2.5">
          <Stars rating={b.rating} reviews={b.reviews} />
        </div>
        <p className="mt-2 text-[13px] text-slate-600">{place}</p>
        <FounderLine b={b} />
        <p className="mt-2.5 line-clamp-2 text-[14px] leading-relaxed text-slate-600">{b.description}</p>
        <Tags tags={b.tags} />

        <div className="mt-auto pt-4">
          <ActionButtons b={b} compact />
        </div>
      </div>
    </article>
  );
}