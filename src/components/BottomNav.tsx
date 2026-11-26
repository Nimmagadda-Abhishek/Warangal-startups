import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../utils/cn";

/* Hand-drawn glyphs, same family as the Navbar: round joins, open shapes.
   Active state is a heavier stroke, so it never relies on colour alone. */
function Glyph({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 1.9 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const items: { to: string; label: string; end?: boolean; glyph: (active: boolean) => ReactNode }[] = [
  {
    to: "/",
    label: "Home",
    end: true,
    glyph: (a) => (
      <Glyph active={a}>
        <path d="M3.5 9.2 10 3.8l6.5 5.4v6.3a.9.9 0 0 1-.9.9H4.4a.9.9 0 0 1-.9-.9V9.2Z" />
        <path d="M8 16.4v-4.2h4v4.2" />
      </Glyph>
    ),
  },
  {
    to: "/businesses",
    label: "Explore",
    glyph: (a) => (
      <Glyph active={a}>
        <circle cx="10" cy="10" r="6.8" />
        <path d="m12.7 7.3-1.4 4-4 1.4 1.4-4 4-1.4Z" />
      </Glyph>
    ),
  },
  {
    to: "/startups",
    label: "Startups",
    glyph: (a) => (
      <Glyph active={a}>
        <path d="m3.4 14.6 4.2-4.3 3 2.8 5.9-6.4" />
        <path d="M12 6.7h4.5v4.5" />
      </Glyph>
    ),
  },
  {
    to: "/events",
    label: "Events",
    glyph: (a) => (
      <Glyph active={a}>
        <rect x="3.4" y="4.8" width="13.2" height="11.8" rx="2" />
        <path d="M3.4 8.6h13.2" />
        <path d="M7 3.2v3" />
        <path d="M13 3.2v3" />
      </Glyph>
    ),
  },
  {
    to: "/dashboard",
    label: "Profile",
    glyph: (a) => (
      <Glyph active={a}>
        <circle cx="10" cy="7" r="3" />
        <path d="M4.2 16.6c.6-3 3-4.6 5.8-4.6s5.2 1.6 5.8 4.6" />
      </Glyph>
    ),
  },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, end, glyph }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-[12px] transition-colors motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-700",
                  isActive ? "font-semibold text-navy-900" : "font-medium text-slate-600 hover:text-navy-800",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Gold marker on the top edge of the active tab */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-5 top-0 h-[3px] origin-center rounded-b-full bg-gold-500 transition-transform duration-300 motion-reduce:transition-none",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                  {glyph(isActive)}
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}