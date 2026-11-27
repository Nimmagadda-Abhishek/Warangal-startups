import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";
import { EmptyDataCard } from "./EmptyDataCard";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

/* ------------------------------------------------------------------ */
/*  Helpers: tolerant of different API field names                     */
/* ------------------------------------------------------------------ */

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

function eventWhen(d: Date) {
  const day = d.toLocaleDateString("en-IN", { weekday: "long" });
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return hasTime ? `${day}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}` : day;
}

function eventPlace(e: any): string {
  if (e.is_online || String(e.mode ?? "").toLowerCase() === "online") return "Online";
  return e.venue || e.location || e.city || "";
}

/* ------------------------------------------------------------------ */
/*  Events                                                             */
/* ------------------------------------------------------------------ */

export function UpcomingEvents({ items }: { items?: any[] }) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const upcoming = (items || [])
    .map((e) => ({ ...e, date: parseDate(e.start_date ?? e.starts_at ?? e.event_date ?? e.date) }))
    .filter((e) => e.date && e.date >= startOfToday)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  return (
    <div>
      <SectionHeader title="Upcoming Events" to="/events" />
      {upcoming.length === 0 ? (
        <EmptyDataCard title="Welcome — no upcoming events" text="Real events and workshops will appear here." action="Host an event" to="/dashboard?tab=events" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:gap-2.5 xl:gap-3">
          {upcoming.map((e, i) => (
            <Reveal key={e.slug || e.id || i} delay={i * 90} as="article" className="card group flex min-w-0 flex-col overflow-hidden">
              <Link to={`/events/${encodeURIComponent(e.slug || e.id)}`} className="relative block aspect-[16/10] overflow-hidden bg-navy-50">
                <img src={e.banner_url || e.image || "/images/hero.jpg"} alt={e.title || "Event"} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/40 to-transparent" />
                <time dateTime={e.start_date?.toISOString?.() || e.start_date} className="absolute left-2 top-2 flex flex-col items-center rounded-md bg-white px-2.5 py-1.5 leading-none shadow-md">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-navy-800">{e.date.toLocaleDateString("en-IN", { month: "short" })}</span>
                  <span className="mt-0.5 text-[20px] font-black text-navy-900">{e.date.getDate()}</span>
                </time>
              </Link>
              <div className="flex flex-1 flex-col p-3">
                <h3 className="text-[13px] font-bold leading-snug text-navy-900"><Link to={`/events/${encodeURIComponent(e.slug || e.id)}`} className="hover:underline">{e.title || e.name}</Link></h3>
                <p className="mt-2 text-[10.5px] text-slate-600">{e.date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {eventWhen(e.date)}</p>
                {(e.venue || e.location) && <p className="mt-1 truncate text-[10.5px] text-slate-600">{eventPlace(e)}</p>}
                <Link to={`/events/${encodeURIComponent(e.slug || e.id)}`} className="btn-navy mt-3 inline-flex w-full items-center justify-center gap-2 py-2 text-[11.5px]">
                  View event <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stories                                                            */
/* ------------------------------------------------------------------ */

function StoryRow({ s, index }: { s: any; index: number }) {
  const to = `/stories/${encodeURIComponent(s.slug || s.id)}`;
  const image = s.cover_url || s.image_url || s.image;
  const author = s.author?.full_name || s.author_name || (typeof s.author === "string" ? s.author : "");
  const published = parseDate(s.published_at ?? s.created_at);
  const excerpt = s.excerpt || s.summary || s.description;

  return (
    <Reveal delay={index * 80} as="article" className="card flex min-w-0 gap-4 p-4">
      <Link to={to} tabIndex={-1} aria-hidden="true" className="block aspect-[4/3] w-28 shrink-0 self-start overflow-hidden rounded-md bg-navy-50 sm:w-36">
        {image ? (
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-serif text-[36px] text-navy-700">
            {String(s.title || "?").trim().charAt(0).toUpperCase()}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-[18px] font-medium leading-snug text-navy-900">
          <Link to={to} className={`rounded-sm hover:underline hover:decoration-gold-500 hover:underline-offset-4 ${focusRing}`}>
            {s.title}
          </Link>
        </h3>
        {excerpt && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">{excerpt}</p>}
        {(author || published) && (
          <p className="mt-2 text-[13px] text-slate-600">
            {author && <>By <span className="font-medium text-slate-700">{author}</span></>}
            {author && published && ", "}
            {published && published.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>
    </Reveal>
  );
}

export function LatestStories({ items }: { items?: any[] }) {
  const stories = (items || []).filter((s) => s?.title).slice(0, 3);

  return (
    <div>
      <SectionHeader title="Latest Startup Stories" to="/stories" />
      {stories.length === 0 ? (
        <EmptyDataCard title="Welcome — no stories yet" text="Published founder and startup stories will appear here." action="Submit a story" to="/stories?submit=1" />
      ) : (
        <div className="flex flex-col gap-3">
          {stories.map((s, i) => (
            <StoryRow key={s.slug || s.id || i} s={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
