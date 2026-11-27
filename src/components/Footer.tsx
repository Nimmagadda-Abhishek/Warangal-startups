import { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Reveal } from "./Reveal";

/* Routes are explicit so each one can be checked and edited on its own.
   Several of these (Map, Collaboration, Achievements, Reviews, Plans, Compare,
   For Businesses, For Startups and the policy pages) were generated from the
   label before: confirm each page exists. */
const columns: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "Businesses", to: "/businesses" },
      { label: "Startups", to: "/startups" },
      { label: "Founders", to: "/founders" },
      { label: "Investors", to: "/investors" },
      { label: "Events", to: "/events" },
      { label: "Map", to: "/map" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Requirements", to: "/requirements" },
      { label: "Collaboration", to: "/collaboration" },
      { label: "Jobs", to: "/jobs" },
      { label: "Stories", to: "/stories" },
      { label: "Achievements", to: "/achievements" },
      { label: "Reviews", to: "/reviews" },
    ],
  },
  {
    title: "Membership",
    links: [
      { label: "Plans", to: "/plans" },
      { label: "Compare", to: "/compare" },
      { label: "For businesses", to: "/for-businesses" },
      { label: "For startups", to: "/for-startups" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact us", to: "/contact-us" },
      { label: "About us", to: "/about-us" },
      { label: "Privacy policy", to: "/privacy-policy" },
      { label: "Terms of service", to: "/terms-of-service" },
      { label: "Refund policy", to: "/refund-policy" },
      { label: "Shipping policy", to: "/shipping-policy" },
    ],
  },
];

/* TODO: replace with the real WS Hub profile URLs (these point at the platform home pages) */
const socials = [
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "Instagram", href: "https://instagram.com" },
  { label: "YouTube", href: "https://youtube.com" },
  { label: "X", href: "https://x.com" },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2";

type Props = {
  /** Send the address to your backend. Throw to show an error. If omitted, the form only shows the success message (nothing is stored). */
  onSubscribe?: (email: string) => Promise<void> | void;
  /** Opens your chat widget. The floating button is only shown when this is provided. */
  onChatOpen?: () => void;
};

export function Footer({ onSubscribe, onChatOpen }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "sending") return;
    setStatus("sending");
    try {
      await onSubscribe?.(email.trim());
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <footer className="relative border-t border-line bg-white">
      <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pb-8 lg:pt-16">
        <Reveal className="grid gap-12 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] lg:gap-8">
          {/* Brand */}
          <div className="max-w-[340px]">
            <Logo dark size="lg" />
            <p className="mt-5 text-[14px] leading-relaxed text-slate-600">
              Warangal’s directory of businesses, startups, founders and investors.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-[36px] items-center rounded-sm text-[14px] font-medium text-navy-800 underline decoration-navy-800/25 underline-offset-[6px] transition-colors hover:decoration-gold-500 motion-reduce:transition-none ${focusRing}`}
                  >
                    {s.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-serif text-[17px] font-medium text-navy-900">{col.title}</h3>
              <ul className="mt-3 space-y-0.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className={`group relative inline-flex min-h-[36px] items-center rounded-sm text-[14px] text-slate-600 transition-colors hover:text-navy-900 motion-reduce:transition-none ${focusRing}`}
                    >
                      {l.label}
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-gold-500 transition-transform duration-300 group-hover:scale-x-100 motion-reduce:transition-none"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </Reveal>

        {/* Newsletter */}
        <div className="mt-14 grid items-center gap-6 border-t border-line pt-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <h3 className="font-serif text-[22px] font-medium text-navy-900">Stay updated</h3>
            <p className="mt-1.5 max-w-[440px] text-[14px] leading-relaxed text-slate-600">
              New listings, events and founder stories from WS Hub, in your inbox.
            </p>
          </div>

          <div>
            <form className="flex max-w-[480px] flex-col gap-2 sm:flex-row" onSubmit={submit} noValidate={false}>
              <label htmlFor="newsletter" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== "sending") setStatus("idle");
                }}
                placeholder="Your email address"
                aria-describedby="newsletter-status"
                className="h-12 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-4 text-[14px] text-ink placeholder:text-slate-500 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className={`h-12 shrink-0 rounded-md bg-gold-500 px-6 text-[14px] font-semibold text-navy-900 transition-colors hover:bg-gold-400 disabled:opacity-60 motion-reduce:transition-none ${focusRing}`}
              >
                {status === "sending" ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
            <p
              id="newsletter-status"
              role={status === "error" ? "alert" : "status"}
              className={`mt-2 min-h-[20px] text-[13px] ${status === "error" ? "text-red-600" : "text-verified"}`}
            >
              {status === "done" && "Thanks, you’re on the list."}
              {status === "error" && "We couldn’t subscribe you just now. Please try again."}
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-line pt-6 text-[13px] text-slate-600 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} WS Hub. All rights reserved.</p>
          <p>
            Developed by{" "}
            <a
              href="https://sozo-innovations.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-sm font-semibold text-navy-700 underline underline-offset-4 hover:text-navy-900 ${focusRing}`}
            >
              Sozo Innovations
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
          <p>Proudly for Warangal</p>
        </div>
      </div>

      {/* Floating chat: only rendered when there is a handler to open */}
      {onChatOpen && (
        <button
          type="button"
          onClick={onChatOpen}
          aria-label="Open chat"
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-white shadow-[0_10px_30px_-8px_rgba(6,19,48,0.6)] transition-colors hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 motion-reduce:transition-none lg:bottom-6 lg:right-6"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true" focusable="false">
            <path d="M4 5.6c0-.9.7-1.6 1.6-1.6h8.8c.9 0 1.6.7 1.6 1.6v6.2c0 .9-.7 1.6-1.6 1.6H9.2L5.9 16v-2.6h0c-1 0-1.9-.7-1.9-1.6Z" />
          </svg>
        </button>
      )}
    </footer>
  );
}
