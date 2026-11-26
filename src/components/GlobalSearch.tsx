import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { homeApi } from "../api";
import { addRecentSearch, clearRecentSearches, useStore } from "../store";
import { cn } from "../utils/cn";

type Group = "Businesses" | "Categories";
interface Hit {
  group: Group;
  title: string;
  sub: string;
  to: string;
}

/* Direct routes shown before the person has typed anything */
const browse = [
  { label: "Businesses", to: "/businesses" },
  { label: "Startups", to: "/startups" },
  { label: "Founders", to: "/founders" },
  { label: "Investors", to: "/investors" },
  { label: "Events", to: "/events" },
  { label: "Jobs", to: "/jobs" },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

/* Same hand-drawn glyphs as the Navbar */
function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <circle cx="8.6" cy="8.6" r="5.4" />
      <path d="m12.7 12.7 4.1 4.1" />
    </svg>
  );
}
function CloseGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
      <path d="m5 5 10 10" />
      <path d="M15 5 5 15" />
    </svg>
  );
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [hits, setHits] = useState<Hit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const recent = useStore((s) => s.recentSearches);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const term = q.trim();

  /* Debounced search (200 ms) so we don't hit the API on every keystroke */
  useEffect(() => {
    if (term.length < 2) {
      setHits([]);
      setStatus("idle");
      return;
    }
    let active = true;
    setStatus("loading");
    const t = window.setTimeout(() => {
      homeApi
        .search(term)
        .then((result: any) => {
          if (!active) return;
          const businesses = Array.isArray(result?.businesses) ? result.businesses : [];
          const categories = Array.isArray(result?.categories) ? result.categories : [];
          setHits([
            ...businesses.slice(0, 5).map((b: any) => ({
              group: "Businesses" as const,
              title: b.name,
              sub: [b.category?.name, b.city].filter(Boolean).join(", "),
              to: `/businesses/${b.slug}`,
            })),
            ...categories.slice(0, 3).map((c: any) => ({
              group: "Categories" as const,
              title: c.name,
              sub: "",
              to: `/businesses?category=${encodeURIComponent(c.slug)}`,
            })),
          ]);
          setStatus("done");
        })
        .catch(() => {
          if (!active) return;
          setHits([]);
          setStatus("done");
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [term]);

  /* Open: reset, lock scroll, focus the input. Close: put focus back where it was. */
  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setQ("");
    setIdx(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      returnTo?.focus?.();
    };
  }, [open]);

  useEffect(() => setIdx(0), [term]);

  /* Keep the highlighted result visible while arrowing */
  useEffect(() => {
    document.getElementById(`gs-opt-${idx}`)?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  const go = (to: string, searched?: string) => {
    if (searched) addRecentSearch(searched);
    navigate(to);
    onClose();
  };
  const submitAll = () => {
    if (!term) return;
    go(`/businesses?q=${encodeURIComponent(term)}`, term);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && hits.length) {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, hits.length - 1));
    }
    if (e.key === "ArrowUp" && hits.length) {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (hits[idx]) go(hits[idx].to, term);
      else submitAll();
    }
  };

  /* Escape closes; Tab stays inside the dialog */
  const onDialogKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const nodes = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>('input, button:not([tabindex="-1"]):not([disabled])'),
    ).filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  const groups = (["Businesses", "Categories"] as Group[]).filter((g) => hits.some((h) => h.group === g));
  let running = -1;
  const showResults = term.length >= 2 && hits.length > 0;

  return createPortal(
    <div className="fade-in fixed inset-0 z-[85] bg-navy-950/70 backdrop-blur-[2px]" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search WS Hub"
        onKeyDown={onDialogKey}
        onClick={(e) => e.stopPropagation()}
        className="page-in mx-auto mt-4 w-[94%] max-w-2xl overflow-hidden rounded-xl bg-white shadow-[0_30px_80px_-20px_rgba(6,19,48,0.6)] sm:mt-[12vh]"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchGlyph className="h-5 w-5 shrink-0 text-navy-700" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search businesses and categories"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-label="Search"
            aria-expanded={showResults}
            aria-controls="gs-list"
            aria-autocomplete="list"
            aria-activedescendant={showResults ? `gs-opt-${idx}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-slate-500 focus:outline-none"
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-navy-900 ${focusRing}`}
            >
              <CloseGlyph className="h-[18px] w-[18px]" />
            </button>
          )}
          <kbd className="hidden rounded border border-slate-300 px-1.5 py-0.5 font-sans text-[12px] text-slate-600 sm:block">Esc</kbd>
        </div>

        {/* Screen-reader announcement of result count */}
        <p role="status" className="sr-only">
          {status === "done" && term.length >= 2 ? (hits.length ? `${hits.length} results` : "No quick matches") : ""}
        </p>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {term.length < 2 ? (
            <div className="p-2">
              {recent.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-2 pb-1">
                    <p className="text-[13px] font-semibold text-slate-700">Recent searches</p>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className={`rounded-sm px-1 text-[13px] font-semibold text-navy-700 hover:underline ${focusRing}`}
                    >
                      Clear
                    </button>
                  </div>
                  {recent.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setQ(r);
                        inputRef.current?.focus();
                      }}
                      className={`flex min-h-[44px] w-full items-center rounded-md px-2 text-left text-[14px] text-slate-700 hover:bg-navy-50 ${focusRing}`}
                    >
                      {r}
                    </button>
                  ))}
                </>
              )}

              <p className={cn("px-2 pb-1 text-[13px] font-semibold text-slate-700", recent.length > 0 && "mt-4")}>Browse the directory</p>
              <div className="flex flex-wrap gap-x-1 gap-y-0.5 px-1">
                {browse.map((b) => (
                  <button
                    key={b.to}
                    type="button"
                    onClick={() => go(b.to)}
                    className={`min-h-[40px] rounded-md px-3 text-[14px] font-medium text-navy-800 hover:bg-navy-50 ${focusRing}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          ) : status === "loading" && hits.length === 0 ? (
            <p className="px-4 py-8 text-center text-[14px] text-slate-600">Searching…</p>
          ) : hits.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-[15px] font-semibold text-navy-900">No quick matches for “{term}”</p>
              <p className="mt-1 text-[14px] text-slate-600">Search the full business directory instead.</p>
              <button type="button" onClick={submitAll} className={`btn-navy mt-4 px-5 py-2.5 text-[14px] ${focusRing}`}>
                Search all businesses
              </button>
            </div>
          ) : (
            <div id="gs-list" role="listbox" aria-label="Search results">
              {groups.map((g) => (
                <div key={g} role="group" aria-labelledby={`gs-grp-${g}`} className="mb-2">
                  <p id={`gs-grp-${g}`} className="px-3 pb-1 pt-2 font-serif text-[15px] font-medium text-navy-900">
                    {g}
                  </p>
                  {hits
                    .filter((h) => h.group === g)
                    .map((h) => {
                      running += 1;
                      const i = running;
                      const active = idx === i;
                      return (
                        <button
                          key={h.to}
                          id={`gs-opt-${i}`}
                          role="option"
                          aria-selected={active}
                          tabIndex={-1}
                          type="button"
                          onMouseEnter={() => setIdx(i)}
                          onClick={() => go(h.to, term)}
                          className={cn(
                            "flex min-h-[48px] w-full flex-col justify-center border-l-2 px-3 py-2 text-left transition-colors motion-reduce:transition-none",
                            active ? "border-gold-500 bg-navy-50" : "border-transparent hover:bg-slate-50",
                          )}
                        >
                          <span className="block truncate text-[14px] font-semibold text-navy-900">{h.title}</span>
                          {h.sub && <span className="block truncate text-[13px] text-slate-600">{h.sub}</span>}
                        </button>
                      );
                    })}
                </div>
              ))}
              <button
                type="button"
                onClick={submitAll}
                className={`mt-1 flex min-h-[44px] w-full items-center justify-center rounded-md border border-slate-300 text-[14px] font-semibold text-navy-700 hover:bg-navy-50 ${focusRing}`}
              >
                See all results for “{term}”
              </button>
            </div>
          )}
        </div>

        <p className="hidden border-t border-line bg-slate-50 px-4 py-2 text-[12px] text-slate-600 sm:block">
          Use the arrow keys to move, Enter to open, Esc to close.
        </p>
      </div>
    </div>,
    document.body,
  );
}