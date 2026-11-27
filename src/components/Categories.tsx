import { ArrowRight, Factory, Hotel, Landmark, Leaf, Megaphone, Package, Scale, Sprout, Truck, Building2, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";
import { filterListingCategories } from "../businesses";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-700";
const categoryIcons: Record<string, LucideIcon> = {
  "real-estate-construction": Building2,
  "finance-insurance": Landmark,
  manufacturing: Factory,
  "agriculture-farming": Sprout,
  "logistics-transport": Truck,
  "travel-hospitality": Hotel,
  "marketing-media": Megaphone,
  "legal-accounting": Scale,
  "wholesale-distribution": Package,
  "energy-sustainability": Leaf,
};

const homeCategories = [
  { slug: "real-estate-construction", label: "Real Estate & Construction" },
  { slug: "finance-insurance", label: "Finance & Insurance" },
  { slug: "manufacturing", label: "Manufacturing" },
  { slug: "agriculture-farming", label: "Agriculture & Farming" },
  { slug: "logistics-transport", label: "Logistics & Transport" },
  { slug: "travel-hospitality", label: "Travel & Hospitality" },
  { slug: "marketing-media", label: "Marketing & Media" },
  { slug: "legal-accounting", label: "Legal & Accounting" },
  { slug: "wholesale-distribution", label: "Wholesale & Distribution" },
  { slug: "energy-sustainability", label: "Energy & Sustainability" },
];

export function Categories({ items }: { items?: { name: string; slug: string }[] }) {
  const filteredApiCategories = filterListingCategories(items || []);
  const apiSlugs = new Set(filteredApiCategories.map((item) => item.slug));
  const visibleCategories = filteredApiCategories.length
    ? homeCategories.filter((category) => apiSlugs.has(category.slug))
    : homeCategories;
  const available = visibleCategories.map((category) => ({
    ...category,
    icon: categoryIcons[category.slug] || Building2,
    to: `/businesses?category=${encodeURIComponent(category.slug)}`,
  }));
  const desktopCategories = [...available, { slug: "more", label: "More", icon: ArrowRight, to: "/businesses" }];
  if (!available.length) return null;

  return (
    <section className="relative z-10 -mt-14 lg:-mt-16" aria-labelledby="categories-title">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* Compact icon grid for mobile and tablet widths */}
        <Reveal className="rounded-xl border border-line bg-white shadow-[0_18px_40px_-20px_rgba(10,28,63,0.35)] lg:hidden">
          <ul className="grid grid-cols-5 grid-rows-2 gap-y-1 px-1.5 py-2 sm:grid-cols-7 sm:px-2 sm:py-3">
            {available.map(({ label, icon: Icon, to }) => (
              <li key={label}>
                <Link to={to} className={`group flex h-[76px] flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-center transition-colors hover:bg-navy-50 sm:h-[82px] ${focusRing}`}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-50 text-navy-700 transition-colors group-hover:bg-gold-100 group-hover:text-navy-800">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="line-clamp-2 max-w-[64px] text-[9px] font-medium leading-tight text-slate-700 group-hover:text-navy-800 sm:max-w-[90px] sm:text-[10px]">
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex justify-end px-3 pb-2">
            <Link to="/businesses" className={`inline-flex items-center gap-1 rounded-sm text-[11px] font-semibold text-navy-700 underline decoration-navy-700/30 underline-offset-4 hover:decoration-gold-500 ${focusRing}`}>
              More <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
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
              {desktopCategories.map(({ label, to }) => (
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
