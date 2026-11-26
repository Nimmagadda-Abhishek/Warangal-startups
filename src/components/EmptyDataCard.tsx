import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../utils/cn";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export function EmptyDataCard({
  title,
  text,
  action = "Add data",
  to = "/dashboard",
}: {
  title: string;
  text: string;
  action?: string;
  to?: string;
}) {
  return (
    <div
      role="status"
      className="mt-6 rounded-xl border border-dashed border-slate-300 border-t-2 border-t-gold-500 bg-white px-6 py-12 text-center shadow-[var(--shadow-card)] sm:px-10"
    >
      <span
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-700 ring-4 ring-navy-50/60"
        aria-hidden="true"
      >
        <Search className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-[18px] font-bold tracking-tight text-navy-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-slate-600">{text}</p>
      <Link
        to={to}
        className={cn(
          "btn-navy mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 px-6 text-[13px] font-semibold",
          "transition-all duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          FOCUS
        )}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {action}
      </Link>
    </div>
  );
}