import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { GlobalSearch } from "./GlobalSearch";
import { logout, markAllRead, markRead, timeAgo, useStore } from "../store";
import { cn } from "../utils/cn";

/* Hand-drawn glyphs: one weight, round joins, slightly open shapes.
   Only used where an icon does real work (search, alerts, disclosure). */
type GlyphProps = { className?: string };
const glyph = (d: React.ReactNode, vb = "0 0 20 20") =>
  function Glyph({ className }: GlyphProps) {
    return (
      <svg viewBox={vb} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false">
        {d}
      </svg>
    );
  };
const SearchGlyph = glyph(<><circle cx="8.6" cy="8.6" r="5.4" /><path d="m12.7 12.7 4.1 4.1" /></>);
const BellGlyph = glyph(<><path d="M4.8 8.2a5.2 5.2 0 0 1 10.4 0c0 4.2 1.4 5.2 1.6 5.8H3.2c.2-.6 1.6-1.6 1.6-5.8Z" /><path d="M8.3 16.6a1.9 1.9 0 0 0 3.4 0" /></>);
const ChevronGlyph = glyph(<path d="m5.5 7.8 4.5 4.4 4.5-4.4" />);
const MenuGlyph = glyph(<><path d="M3.5 6.5h13" /><path d="M3.5 13.5h13" /></>);
const CloseGlyph = glyph(<><path d="m5 5 10 10" /><path d="M15 5 5 15" /></>);

/* ------------------------------------------------------------------ */
/*  Navigation model                                                   */
/*  9 flat links was too many to scan. They are now grouped into       */
/*  4 top-level destinations, with two grouped menus.                  */
/* ------------------------------------------------------------------ */

type NavItem = { label: string; to: string; desc: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    id: "network",
    label: "Network",
    items: [
      { label: "Businesses", to: "/businesses", desc: "Verified company directory" },
      { label: "Startups", to: "/startups", desc: "Emerging ventures worth following" },
      { label: "Founders", to: "/founders", desc: "The people building what's next" },
      { label: "Investors", to: "/investors", desc: "Funds and angels backing growth" },
    ],
  },
  {
    id: "explore",
    label: "Explore",
    items: [
      { label: "Events", to: "/events", desc: "Summits, meetups and webinars" },
      { label: "Stories", to: "/stories", desc: "Insights and founder journeys" },
    ],
  },
];

const directLinks = {
  opportunities: { label: "Opportunities", to: "/opportunities" },
  membership: { label: "Membership", to: "/membership" },
};

/* Shared interaction styles (visible keyboard focus on the dark bar) */
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900";
const focusRingLight =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-700";

const barLink =
  "relative inline-flex h-11 items-center rounded-md px-3 text-[13px] font-medium tracking-[0.01em] transition-colors duration-200 motion-reduce:transition-none xl:px-3.5";

const menuRow =
  "flex items-center px-5 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-navy-900";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);

  const user = useStore((s) => s.user);
  const notifications = useStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const rootRef = useRef<HTMLElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);

  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform),
    []
  );

  const closeMenus = () => {
    setNotifOpen(false);
    setUserOpen(false);
    setGroupOpen(null);
  };

  /* Scroll state */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close everything on route change */
  useEffect(() => {
    setOpen(false);
    closeMenus();
  }, [pathname]);

  /* Lock body scroll while the mobile drawer is open */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /* Shortcuts, Escape, outside click */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        closeMenus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        closeMenus();
        setOpen(false);
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeMenus();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, []);

  /* Close the mobile drawer if the viewport grows to desktop */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const initials =
    user?.name
      ?.split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "";

  const groupActive = (g: NavGroup) => g.items.some((i) => pathname === i.to || pathname.startsWith(i.to + "/"));

  /* Hover-intent for desktop menus; click and keyboard also work */
  const hoverOpen = (id: string) => {
    window.clearTimeout(hoverTimer.current);
    setNotifOpen(false);
    setUserOpen(false);
    setGroupOpen(id);
  };
  const hoverClose = () => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setGroupOpen(null), 120);
  };

  const topUnderline = (active: boolean) => (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-3 bottom-1.5 h-[2px] origin-center rounded-full bg-gold-500 transition-transform duration-300 ease-out motion-reduce:transition-none xl:inset-x-3.5",
        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
      )}
    />
  );

  return (
    <header
      ref={rootRef}
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 motion-reduce:transition-none",
        scrolled
          ? "border-white/10 bg-navy-900/95 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]"
          : "border-white/5 bg-navy-900"
      )}
    >
      {/* Gold hairline — the one signature detail */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/70 to-transparent transition-opacity duration-300",
          scrolled ? "opacity-100" : "opacity-40"
        )}
      />

      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[68px] lg:px-8">
        <div className="shrink-0">
          <Logo />
        </div>

        {/* ---------------- Desktop navigation ---------------- */}
        <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Primary">
          {/* Network (menu) */}
          {groups.slice(0, 1).map((g) => renderGroupMenu(g))}

          <NavLink
            to={directLinks.opportunities.to}
            className={({ isActive }) =>
              cn("group", barLink, focusRing, isActive ? "text-white" : "text-white/75 hover:text-white")
            }
          >
            {({ isActive }) => (
              <>
                {directLinks.opportunities.label}
                {topUnderline(isActive)}
              </>
            )}
          </NavLink>

          {/* Explore (menu) */}
          {groups.slice(1).map((g) => renderGroupMenu(g))}

          <NavLink
            to={directLinks.membership.to}
            className={({ isActive }) =>
              cn("ml-2 rounded-full border px-4 transition-colors", barLink, focusRing, isActive ? "border-gold-400 bg-gold-500/10 text-gold-300" : "border-gold-500/45 text-gold-400 hover:border-gold-400 hover:bg-gold-500/10 hover:text-gold-300")
            }
          >
            {() => (
              <>
                {directLinks.membership.label}
              </>
            )}
          </NavLink>
        </nav>

        {/* ---------------- Right cluster ---------------- */}
        <div className="flex shrink-0 items-center gap-2 lg:gap-2.5">
          <button
            type="button"
            aria-label={`Search (${isMac ? "Command" : "Control"} K)`}
            onClick={() => {
              closeMenus();
              setSearchOpen(true);
            }}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition-colors hover:border-white/25 hover:bg-white/10 motion-reduce:transition-none lg:h-10 lg:w-auto lg:gap-2.5 lg:px-3.5",
              focusRing
            )}
          >
            <SearchGlyph className="h-[18px] w-[18px]" />
            <span className="hidden text-[12.5px] text-white/65 lg:block">Search</span>
            <kbd className="hidden rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-sans text-[10px] font-medium text-white/55 xl:block">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>

          {user && (
            <div className="relative">
              <button
                type="button"
                aria-label={`Notifications, ${unread} unread`}
                aria-haspopup="true"
                aria-expanded={notifOpen}
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setUserOpen(false);
                  setGroupOpen(null);
                }}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition-colors hover:border-white/25 hover:bg-white/10 motion-reduce:transition-none lg:h-10 lg:w-10",
                  focusRing
                )}
              >
                <BellGlyph className="h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold leading-none text-navy-900 ring-2 ring-navy-900">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="page-in fixed inset-x-3 top-[72px] z-50 overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-[0_24px_60px_-16px_rgba(10,20,50,0.45)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[52px] sm:w-[380px]">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-navy-900">Notifications</p>
                      {unread > 0 && (
                        <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-700">
                          {unread} new
                        </span>
                      )}
                    </div>
                    {unread > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className={cn(
                          "inline-flex min-h-[32px] items-center rounded-md px-2 text-[12px] font-semibold text-navy-700 hover:bg-slate-50",
                          focusRingLight
                        )}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <ul className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 && (
                      <li className="px-6 py-10 text-center">
                        <p className="text-[13px] font-semibold text-navy-900">You're all caught up</p>
                        <p className="mt-1 text-[12px] text-slate-500">New activity will appear here.</p>
                      </li>
                    )}
                    {notifications.slice(0, 6).map((n) => (
                      <li key={n.id} className="border-b border-line last:border-0">
                        <button
                          type="button"
                          onClick={() => {
                            markRead(n.id);
                            setNotifOpen(false);
                            if (n.to) navigate(n.to);
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50",
                            !n.read && "bg-navy-50/50",
                            focusRingLight
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-slate-200" : "bg-gold-500")}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-navy-900">{n.title}</span>
                            <span className="mt-0.5 block text-[12px] leading-snug text-slate-600">{n.body}</span>
                            <span className="mt-1 block text-[11px] text-slate-500">{timeAgo(n.at)}</span>
                          </span>
                          {!n.read && <span className="sr-only">Unread</span>}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/dashboard?tab=notifications"
                    className={cn(
                      "block border-t border-line bg-slate-50/60 py-3 text-center text-[12.5px] font-semibold text-navy-700 hover:bg-slate-100",
                      focusRingLight
                    )}
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  setUserOpen((v) => !v);
                  setNotifOpen(false);
                  setGroupOpen(null);
                }}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-1 pl-1 pr-3 text-white transition-colors hover:border-white/25 hover:bg-white/10 motion-reduce:transition-none",
                  focusRing
                )}
                aria-haspopup="menu"
                aria-expanded={userOpen}
                aria-label="Account menu"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-[11.5px] font-bold text-navy-900">
                  {initials}
                </span>
                <span className="max-w-[90px] truncate text-[13px] font-semibold">{user.name.split(" ")[0]}</span>
                <ChevronGlyph className={cn("h-3.5 w-3.5 text-white/70 transition-transform duration-200 motion-reduce:transition-none", userOpen && "rotate-180")}/>
              </button>

              {userOpen && (
                <div
                  role="menu"
                  className="page-in absolute right-0 top-[52px] w-[272px] overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-[0_24px_60px_-16px_rgba(10,20,50,0.45)]"
                >
                  <div className="flex items-center gap-3 border-b border-line bg-slate-50/70 px-4 py-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[13px] font-bold text-gold-400">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-navy-900">{user.name}</p>
                      <p className="truncate text-[12px] text-slate-500">{user.email}</p>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-navy-800">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="py-1.5">
                    <Link to="/dashboard" role="menuitem" className={cn(menuRow, focusRingLight)}>
                      Dashboard
                    </Link>
                    <Link to="/profile/edit" role="menuitem" className={cn(menuRow, focusRingLight)}>
                      Edit profile
                    </Link>
                    <Link to="/businesses/manage" role="menuitem" className={cn(menuRow, focusRingLight)}>
                      Manage businesses
                    </Link>
                    <Link to="/dashboard?tab=saved" role="menuitem" className={cn(menuRow, focusRingLight)}>
                      Saved items
                    </Link>
                    {user.role === "Admin" && (
                      <Link to="/admin" role="menuitem" className={cn(menuRow, focusRingLight)}>
                        Admin panel
                      </Link>
                    )}
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className={cn(
                      "flex w-full items-center border-t border-line px-5 py-3 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50",
                      focusRingLight
                    )}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2.5 lg:flex">
              <Link
                to="/login"
                className={cn(
                  "inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white motion-reduce:transition-none",
                  focusRing
                )}
              >
                Log in
              </Link>
              <Link to="/signup" className={cn("btn-gold whitespace-nowrap", focusRing)}>
                Sign up
              </Link>
            </div>
          )}

          <button
            type="button"
            className={cn("flex h-11 w-11 items-center justify-center rounded-md text-white hover:bg-white/10 lg:hidden", focusRing)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => {
              closeMenus();
              setOpen((v) => !v);
            }}
          >
            {open ? <CloseGlyph className="h-6 w-6" /> : <MenuGlyph className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* ---------------- Mobile drawer ---------------- */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className={cn(
          "fixed inset-x-0 bottom-0 top-16 overflow-y-auto overscroll-contain bg-navy-900 transition-[opacity,transform,visibility] duration-300 ease-out motion-reduce:transition-none lg:hidden",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
        )}
      >
        <nav className="mx-auto flex max-w-xl flex-col px-5 pb-10 pt-3" aria-label="Mobile">
          {user && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-500 text-[13px] font-bold text-navy-900">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-white">{user.name}</p>
                <p className="truncate text-[12px] text-white/60">{user.email}</p>
              </div>
            </div>
          )}

          {renderMobileLink({ to: "/", end: true, label: "Home" })}

          {/* Network */}
          {renderMobileGroup(groups[0])}
          {renderMobileLink({ to: directLinks.opportunities.to, label: directLinks.opportunities.label })}
          {/* Explore */}
          {renderMobileGroup(groups[1])}
          {renderMobileLink({ to: directLinks.membership.to, label: directLinks.membership.label, accent: true })}

          {user ? (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link to="/dashboard" className="col-span-2 inline-flex h-12 items-center justify-center rounded-lg bg-gold-500 text-sm font-semibold text-navy-900 hover:bg-gold-400">
                Dashboard
              </Link>
              <Link to="/businesses/manage" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/25 text-sm font-semibold text-white hover:bg-white/10">
                Businesses
              </Link>
              <Link to="/profile/edit" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/25 text-sm font-semibold text-white hover:bg-white/10">
                Profile
              </Link>
              {user.role === "Admin" && (
                <Link to="/admin" className="col-span-2 inline-flex h-12 items-center justify-center rounded-lg border border-gold-400/60 text-sm font-semibold text-gold-300 hover:bg-gold-400/10">
                  Admin panel
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="col-span-2 inline-flex h-12 items-center justify-center rounded-lg text-sm font-semibold text-red-300 hover:bg-red-500/10"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link to="/login" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/30 text-sm font-semibold text-white hover:bg-white/10">
                Log in
              </Link>
              <Link to="/signup" className="btn-gold h-12 whitespace-nowrap text-sm">
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );

  /* ---------------- Local sub-components (closures over state) ---------------- */

  function renderGroupMenu(g: NavGroup) {
    const isOpen = groupOpen === g.id;
    const active = groupActive(g);
    const panelId = `menu-${g.id}`;
    return (
      <div
        key={g.id}
        className="relative"
        onMouseEnter={() => hoverOpen(g.id)}
        onMouseLeave={hoverClose}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setGroupOpen(null);
        }}
      >
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => {
            setNotifOpen(false);
            setUserOpen(false);
            setGroupOpen(isOpen ? null : g.id);
          }}
          className={cn("group gap-1", barLink, focusRing, active || isOpen ? "text-white" : "text-white/75 hover:text-white")}
        >
          {g.label}
          <ChevronGlyph className={cn("h-3.5 w-3.5 text-white/60 transition-transform duration-200 motion-reduce:transition-none", isOpen && "rotate-180")}/>
          {topUnderline(active || isOpen)}
        </button>

        {isOpen && (
          <div id={panelId} className="page-in absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2.5">
            <div
              className={cn(
                "overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-16px_rgba(10,20,50,0.45)]",
                g.items.length > 2 ? "w-[520px]" : "w-[300px]"
              )}
            >
              <ul className={cn("grid gap-x-2 gap-y-0.5 p-3", g.items.length > 2 ? "grid-cols-2" : "grid-cols-1")}>
                {g.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={() => setGroupOpen(null)}
                        className={({ isActive }) =>
                          cn(
                            "group/item block border-l-2 border-transparent py-3 pl-4 pr-3 transition-colors hover:border-gold-500 hover:bg-navy-50/60",
                            isActive && "border-gold-500 bg-navy-50/60",
                            focusRingLight
                          )
                        }
                      >
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-navy-900">{item.label}</span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-slate-600">{item.desc}</span>
                        </span>
                      </NavLink>
                    </li>
                ))}
              </ul>
              {!user && g.id === "network" && (
                <div className="flex items-center justify-between border-t border-line bg-slate-50/70 px-5 py-3">
                  <p className="text-[12px] text-slate-600">Connect with verified businesses and investors.</p>
                  <Link to="/signup" onClick={() => setGroupOpen(null)} className={cn("rounded-md px-2 py-1 text-[12.5px] font-semibold text-navy-700 hover:underline", focusRingLight)}>
                    Join free
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderMobileLink({ to, label, end, accent }: { to: string; label: string; end?: boolean; accent?: boolean }) {
    return (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            "flex min-h-[52px] items-center gap-2 border-b border-white/10 text-[15px] font-medium transition-colors hover:text-gold-300",
            accent ? "text-gold-400" : isActive ? "text-gold-400" : "text-white/90"
          )
        }
      >
        {label}
      </NavLink>
    );
  }

  function renderMobileGroup(g: NavGroup) {
    const expanded = mobileGroup === g.id;
    return (
      <div key={g.id} className="border-b border-white/10">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setMobileGroup(expanded ? null : g.id)}
          className="flex min-h-[52px] w-full items-center justify-between text-[15px] font-medium text-white/90"
        >
          {g.label}
          <ChevronGlyph className={cn("h-4 w-4 text-white/60 transition-transform duration-200 motion-reduce:transition-none", expanded && "rotate-180")}/>
        </button>
        <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <ul className="overflow-hidden">
            {g.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    tabIndex={expanded ? 0 : -1}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-[52px] items-center border-l border-white/15 pl-4 text-[14px] transition-colors hover:text-gold-300",
                        isActive ? "text-gold-400" : "text-white/80"
                      )
                    }
                  >
                    <span>
                      <span className="block font-medium">{item.label}</span>
                      <span className="block text-[12px] text-white/50">{item.desc}</span>
                    </span>
                  </NavLink>
                </li>
                ))}
          </ul>
        </div>
      </div>
    );
  }
}