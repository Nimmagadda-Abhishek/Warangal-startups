import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, ExternalLink, Globe2, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { directoryApi, type ApiMeta, type DirectoryMember } from "../api";
import { BusinessCardShimmer, MemberProfileShimmer } from "../components/ui/Shimmer";
import { cn } from "../utils/cn";

type DirectoryKind = "founders" | "investors";
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "M";

/* -------------------------------------------------------------------------- */
/*  Design tokens — flat, high contrast, 44px targets, visible focus           */
/* -------------------------------------------------------------------------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

const btnOutline =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-navy-900 " +
  "transition-colors duration-200 hover:border-navy-700 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:bg-white " + focusRing;

const inlineLink = `inline-flex min-h-9 items-center gap-1.5 rounded text-navy-700 underline-offset-2 hover:underline ${focusRing}`;

function Pill({ tone = "neutral", children }: { tone?: "neutral" | "gold" | "brand"; children: ReactNode }) {
  const t = { neutral: "bg-slate-100 text-slate-700", gold: "bg-gold-100 text-gold-800", brand: "bg-navy-50 text-navy-800" }[tone];
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize", t)}>{children}</span>;
}

function Label({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-slate-600">
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </p>
  );
}

function Empty({ icon, title, children }: { icon?: ReactNode; title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      {icon && <div aria-hidden="true" className="mx-auto w-fit text-slate-400">{icon}</div>}
      {title && <h2 className="mt-3 text-[17px] font-bold text-navy-900">{title}</h2>}
      <p className={cn("text-[14px] text-slate-600", title && "mt-1")}>{children}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export default function MemberDirectory({ kind }: { kind: DirectoryKind }) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const load = kind === "founders" ? directoryApi.founders(page) : directoryApi.investors(page);
    load.then((result) => {
      if (!active) return;
      setMembers(result.data); setMeta(result.meta);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Could not load member profiles.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, page]);

  const title = kind === "founders" ? "Founders & Businesses" : "Investors & Mentors";
  const description = kind === "founders"
    ? "Meet approved founders and business owners in the WS Hub community."
    : "Connect with approved investors and mentors in the WS Hub community.";
  const noun = kind === "founders" ? "founders and businesses" : "investors and mentors";

  return (
    <main className="page-in mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-2xl border-t-4 border-gold-500 bg-navy-900 px-6 py-9 text-white sm:px-9">
        <p className="text-[12px] font-bold uppercase tracking-[.15em] text-gold-400">WS Hub community</p>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight sm:text-[38px]">{title}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-white/85">{description}</p>
        {meta && (
          <p role="status" className="mt-5 inline-flex items-center rounded-md bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white">
            {meta.total} approved {noun}
          </p>
        )}
      </header>

      {error && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-[14px] text-red-800">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-7" aria-busy="true"><span className="sr-only" role="status">Loading members…</span><BusinessCardShimmer count={6} /></div>
      ) : members.length === 0 ? (
        <section className="mt-7">
          <Empty icon={<UserRound className="h-8 w-8" />} title="No approved profiles yet">
            Approved {kind === "founders" ? "founders and business owners" : "investors and mentors"} will appear here.
          </Empty>
        </section>
      ) : (
        <section aria-label={title} className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <article key={member.id} className="card flex flex-col p-5 transition-shadow duration-200 hover:shadow-md">
              <div className="flex items-start gap-3.5">
                <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-100 text-[15px] font-black text-navy-800">
                  {member.avatar_url ? <img src={member.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : initials(member.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[16px] font-bold text-navy-900">{member.full_name}</h2>
                  <div className="mt-1"><Pill tone="gold">{member.member_type}</Pill></div>
                  {(member.city || member.country) && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-600"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{[member.city, member.country].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              </div>

              <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-[13.5px] leading-6 text-slate-700">{member.bio || "WS Hub community member."}</p>

              {(member.email || member.phone) && (
                <div className="mt-2 flex flex-wrap gap-x-4 text-[13px]">
                  {member.email && <a href={`mailto:${member.email}`} className={inlineLink}><Mail aria-hidden="true" className="h-3.5 w-3.5" />Email<span className="sr-only"> {member.full_name}</span></a>}
                  {member.phone && <a href={`tel:${member.phone}`} className={inlineLink}><Phone aria-hidden="true" className="h-3.5 w-3.5" />Call<span className="sr-only"> {member.full_name}</span></a>}
                </div>
              )}

              <div className="mt-3 border-t border-line pt-3">
                <div className="mb-2"><Label icon={<Building2 className="h-3.5 w-3.5" />}>{kind === "investors" ? "Businesses & portfolio" : "Businesses"}</Label></div>
                {member.businesses.length ? (
                  <ul className="space-y-1">
                    {member.businesses.map((business) => (
                      <li key={business.id}>
                        <Link to={`/businesses/${business.slug}`} className={`group flex min-h-11 items-center gap-2.5 rounded-lg px-1.5 text-[13.5px] font-semibold text-navy-900 transition-colors duration-200 hover:bg-navy-50 ${focusRing}`}>
                          {business.logo_url
                            ? <img src={business.logo_url} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded-md object-cover" />
                            : <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy-50 text-[11px] font-black text-navy-800">{initials(business.name)}</span>}
                          <span className="truncate">{business.name}</span>
                          <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-slate-400 group-hover:text-navy-700" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-[13px] text-slate-600">No published business or portfolio links yet.</p>}
              </div>

              <Link to={`/members/${member.id}`} className="btn-navy mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 py-2.5 text-[13px]">
                View member profile <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section>
      )}

      {meta && meta.totalPages > 1 && (
        <nav aria-label="Member pages" className="mt-7 flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 text-[13.5px] text-slate-700">
          <span aria-live="polite" className="pl-2">Page {meta.page} of {meta.totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className={btnOutline}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Previous</button>
            <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} className={btnOutline}>Next<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
          </div>
        </nav>
      )}
    </main>
  );
}

export function MemberProfilePage() {
  const { id = "" } = useParams();
  const [member, setMember] = useState<DirectoryMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setMember(null); setError("");
    directoryApi.member(id).then((result) => {
      if (!result?.id) throw new Error("The member profile response was incomplete.");
      if (active) setMember(result);
    })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Member profile not found."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <MemberProfileShimmer />;
  if (error || !member) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-[26px] font-extrabold text-navy-900">Profile unavailable</h1>
        {error && <p role="alert" className="mt-2 text-[14px] text-slate-700">{error}</p>}
        <Link to="/founders" className="btn-navy mt-6 inline-flex min-h-11 items-center px-5 py-2.5">Browse members</Link>
      </main>
    );
  }

  const directory = member.member_type === "investor" || member.member_type === "mentor" ? "/investors" : "/founders";
  const socialLinks = Object.entries(member.social_links || {}).filter(([, url]) => typeof url === "string" && /^https?:\/\//i.test(url));
  const firstName = member.full_name.split(" ")[0];

  return (
    <main className="page-in mx-auto max-w-[1120px] px-4 py-10 sm:px-6 lg:px-8">
      <Link to={directory} className={`inline-flex min-h-11 items-center gap-1.5 rounded text-[13px] font-semibold text-navy-700 hover:underline ${focusRing}`}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to directory
      </Link>

      <div className="mt-3 grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="card p-5 sm:p-6">
          <div className="mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl bg-navy-100 text-3xl font-black text-navy-800">
            {member.avatar_url ? <img src={member.avatar_url} alt={`${member.full_name} profile`} className="h-full w-full object-cover" /> : <span aria-hidden="true">{initials(member.full_name)}</span>}
          </div>
          <div className="mt-5 text-center">
            <Pill tone="gold">{member.member_type}</Pill>
            <h1 className="mt-2 text-[24px] font-extrabold leading-tight text-navy-900">{member.full_name}</h1>
            {(member.city || member.country) && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[13.5px] text-slate-600"><MapPin aria-hidden="true" className="h-4 w-4" />{[member.city, member.country].filter(Boolean).join(", ")}</p>
            )}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-600">Contact</h2>
            <div className="mt-2 space-y-1">
              {member.email && <a href={`mailto:${member.email}`} className={`${inlineLink} min-h-10 break-all text-[13.5px]`}><Mail aria-hidden="true" className="h-4 w-4 shrink-0" />{member.email}</a>}
              {member.phone && <a href={`tel:${member.phone}`} className={`${inlineLink} min-h-10 text-[13.5px]`}><Phone aria-hidden="true" className="h-4 w-4 shrink-0" />{member.phone}</a>}
              {!member.email && !member.phone && <p className="text-[13px] text-slate-600">Contact details have not been added yet.</p>}
            </div>
          </div>

          {socialLinks.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-600">Online profiles</h2>
              <ul className="mt-2 space-y-1">
                {socialLinks.map(([name, url]) => (
                  <li key={name}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className={`${inlineLink} min-h-10 text-[13.5px] capitalize`}>
                      <Globe2 aria-hidden="true" className="h-4 w-4" />{name === "x" ? "X (Twitter)" : name}<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="space-y-6">
          <section className="card p-5 sm:p-7">
            <h2 className="text-[18px] font-bold text-navy-900">About {firstName}</h2>
            <p className="mt-3 max-w-[72ch] whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{member.bio || "This member has not added a profile synopsis yet."}</p>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-[20px] font-extrabold text-navy-900">{directory === "/investors" ? "Businesses & portfolio" : "Businesses"}</h2>
                <p className="mt-1 text-[13.5px] text-slate-600">Published listings linked to this member.</p>
              </div>
              <Pill tone="brand">{member.businesses.length} listed</Pill>
            </div>

            {member.businesses.length ? (
              <ul className="mt-4 grid gap-4">
                {member.businesses.map((business) => (
                  <li key={business.id} className="card overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {business.logo_url
                        ? <img src={business.logo_url} alt={`${business.name} logo`} loading="lazy" className="h-36 w-full object-cover sm:h-auto sm:w-44" />
                        : <div aria-hidden="true" className="flex h-28 w-full items-center justify-center bg-navy-50 text-navy-700 sm:h-auto sm:w-44"><Building2 className="h-8 w-8" /></div>}
                      <div className="min-w-0 flex-1 p-4 sm:p-5">
                        <p className="text-[12px] font-bold uppercase tracking-wider text-gold-800">{business.city || "WS Hub business"}</p>
                        <h3 className="mt-1 text-[17px] font-bold text-navy-900">{business.name}</h3>
                        <p className="mt-2 line-clamp-3 text-[14px] leading-6 text-slate-700">{business.description || "Business profile and portfolio details are available on its listing."}</p>
                        <Link to={`/businesses/${business.slug}`} className={`${inlineLink} mt-2 min-h-11 text-[13.5px] font-semibold`}>
                          View business profile<ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4"><Empty>No published business or portfolio listings are linked to this profile yet.</Empty></div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}