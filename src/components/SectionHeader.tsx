import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "../utils/cn";

interface SectionHeaderProps {
  title: string;
  to?: string;
  actionLabel?: string;
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export function SectionHeader({ title, to = "/businesses", actionLabel = "View All" }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-3">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
        <h2 className="text-[21px] font-bold leading-tight tracking-tight text-navy-900">{title}</h2>
      </div>
      <Link
        to={to}
        className={cn(
          "group inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-md px-2 text-[14px] font-semibold text-navy-700",
          "transition-colors duration-200 hover:text-navy-900 motion-reduce:transition-none",
          FOCUS
        )}
      >
        <span className="underline-offset-4 group-hover:underline">{actionLabel}</span>
        <ArrowRight
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}