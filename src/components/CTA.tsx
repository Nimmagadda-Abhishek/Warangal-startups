import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950";

const base =
  "inline-flex h-12 items-center justify-center rounded-md px-6 text-[14px] font-semibold transition-colors duration-200 motion-reduce:transition-none";

export function CTA() {
  return (
    <section className="relative mt-12 overflow-hidden bg-navy-950 text-white lg:mt-14" aria-labelledby="cta-title">
      <img
        src="/images/cta-bg.jpg"
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-900/80 to-navy-950/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/40 via-transparent to-navy-950/60" />

      <div className="relative mx-auto max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
          <Reveal>
            <h2
              id="cta-title"
              className="max-w-[600px] font-serif text-[30px] font-medium leading-[1.15] tracking-[-0.01em] sm:text-[38px]"
            >
              Be part of Warangal’s growing business ecosystem.
            </h2>
            <p className="mt-4 max-w-[540px] text-[16px] leading-[1.65] text-white/85">
              Whether you are a founder, investor, professional or an established business, WS Hub helps you connect,
              collaborate and grow.
            </p>
            <p className="mt-6 max-w-[540px] border-l-2 border-gold-500 pl-4 font-serif text-[18px] italic leading-snug text-white/90">
              Stronger businesses, a brighter Warangal.
            </p>
          </Reveal>

          <Reveal delay={150} className="flex flex-col gap-3">
            <Link to="/membership" className={`${base} bg-gold-500 text-navy-900 hover:bg-gold-400 ${focusRing}`}>
              Join WS Hub
            </Link>
            <Link
              to="/businesses/manage"
              className={`${base} border border-white/60 text-white hover:border-white hover:bg-white/10 ${focusRing}`}
            >
              List your business
            </Link>
            <Link
              to="/dashboard?tab=startup"
              className={`${base} border border-white/60 text-white hover:border-white hover:bg-white/10 ${focusRing}`}
            >
              Register your startup
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}