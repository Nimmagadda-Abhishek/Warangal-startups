import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  to?: string;
  actionLabel?: string;
}

export function SectionHeader({ title, to = "/businesses", actionLabel = "View All" }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-[19px] font-bold tracking-tight text-navy-800">{title}</h2>
      <Link to={to} className="view-all">
        {actionLabel} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
      </Link>
    </div>
  );
}
