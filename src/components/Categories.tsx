import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";
import { filterListingCategories } from "../businesses";

export function Categories({ items }: { items?: { name: string; slug: string }[] }) {
  const available = filterListingCategories(items || []).map((item) => ({
    label: item.name,
    icon: Building2,
    to: `/businesses?category=${encodeURIComponent(item.slug)}`,
  }));
  if (!available.length) return null;
  return (
    <section className="relative z-10 -mt-14 lg:-mt-16" aria-label="Browse by category">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <Reveal className="rounded-xl border border-line bg-white shadow-[0_18px_40px_-20px_rgba(10,28,63,0.35)]">
          <ul className="hide-scrollbar grid grid-cols-4 gap-y-2 px-2 py-3 sm:grid-cols-7 lg:flex lg:items-stretch lg:justify-between lg:px-3 lg:py-3.5">
            {available.map(({ label, icon: Icon, to }) => (
              <li key={label} className="relative flex-1 lg:border-l lg:border-line lg:first:border-l-0">
                <Link
                  to={to}
                  className="group flex h-full flex-col items-center justify-start gap-1.5 rounded-lg px-1 py-2 text-center transition-colors hover:bg-navy-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center text-navy-700 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-navy-600">
                    <Icon className="h-[26px] w-[26px]" strokeWidth={1.6} />
                  </span>
                  <span className="max-w-[72px] text-[10px] font-medium leading-tight text-slate-700 group-hover:text-navy-800">
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
