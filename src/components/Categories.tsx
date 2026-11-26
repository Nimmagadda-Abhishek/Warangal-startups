import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";
import { filterListingCategories } from "../businesses";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-700";

export function Categories({ items }: { items?: { name: string; slug: string }[] }) {
  const available = filterListingCategories(items || []).map((item) => ({
    label: item.name,
    to: `/businesses?category=${encodeURIComponent(item.slug)}`,
  }));
  if (!available.length) return null;

  return (
    <section className="relative z-10 -mt-14 lg:-mt-16" aria-labelledby="categories-title">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* Compact icon grid for mobile and tablet widths */}
        <Reveal className="rounded-xl border border-line bg-white shadow-[0_18px_40px_-20px_rgba(10,28,63,0.35)] lg:hidden">
          <ul className="hide-scrollbar grid grid-cols-4 gap-y-2 px-2 py-3 sm:grid-cols-7">
            {available.map(({ label, to }) => (
              <li key={label}>
                <Link to={to} className={`group flex h-full min-h-[68px] flex-col items-center justify-start gap-1.5 rounded-lg px-1 py-2 text-center transition-colors hover:bg-navy-50 ${focusRing}`}>
                  <span className="flex h-8 w-8 items-center justify-center text-navy-700 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-navy-600 motion-reduce:transition-none">
                    <Building2 className="h-[26px] w-[26px]" strokeWidth={1.6} />
                  </span>
                  <span className="max-w-[72px] text-[10px] font-medium leading-tight text-slate-700 group-hover:text-navy-800 sm:max-w-[96px] sm:text-[11px]">
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Keep the existing category bar unchanged on desktop */}
        <Reveal className="hidden overflow-hidden rounded-xl border border-line bg-white shadow-[0_18px_40px_-20px_rgba(10,28,63,0.35)] lg:block">
          <div className="flex flex-col lg:flex-row lg:items-stretch">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 lg:w-[240px] lg:shrink-0 lg:flex-col lg:items-start lg:justify-center lg:gap-1.5 lg:border-b-0 lg:border-r lg:px-6">
              <h2 id="categories-title" className="font-serif text-[18px] font-medium leading-tight text-navy-900">Browse by category</h2>
              <Link to="/businesses" className={`rounded-sm text-[13px] font-semibold text-navy-700 underline decoration-navy-700/30 underline-offset-4 transition-colors hover:decoration-gold-500 motion-reduce:transition-none ${focusRing}`}>
                View all businesses
              </Link>
            </div>
            <ul className="flex flex-1 flex-wrap content-center gap-x-1 gap-y-1 px-3 py-3 lg:px-4 lg:py-4">
              {available.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className={`group relative inline-flex min-h-[44px] items-center rounded-md px-3.5 text-[14px] font-medium text-slate-700 transition-colors hover:bg-navy-50 hover:text-navy-900 motion-reduce:transition-none ${focusRing}`}>
                    {label}
                    <span aria-hidden="true" className="pointer-events-none absolute inset-x-3.5 bottom-1.5 h-[2px] origin-left scale-x-0 rounded-full bg-gold-500 transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
