import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "../../utils/cn";

export function ShareLinkButton({ slug, name, className = "" }: { slug: string; name: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/#/startups/${encodeURIComponent(slug)}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} | WS Hub`, text: `Explore ${name} on WS Hub`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2200);
        } catch {
          window.prompt("Copy this startup link", url);
        }
      }
    }
  };

  return <button type="button" onClick={share} aria-label={`Share ${name}`} className={cn("inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[11.5px] font-semibold text-navy-800 transition-colors hover:border-navy-700 hover:bg-navy-50", className)}>{copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}{copied ? "Link copied" : "Share"}</button>;
}

