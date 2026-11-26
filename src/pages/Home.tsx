import { useEffect, useState } from "react";
import { Hero } from "../components/Hero";
import { Categories } from "../components/Categories";
import { Stats } from "../components/Stats";
import { FeaturedBusinesses, FeaturedStartups } from "../components/Featured";
import { LatestStories, UpcomingEvents } from "../components/EventsStories";
import { Opportunities, TrendingBusinesses } from "../components/OpportunitiesTrending";
import { CTA } from "../components/CTA";
import { homeApi } from "../api";
import { Shimmer } from "../components/ui/Shimmer";

/* Loading state mirrors the real layout, so nothing jumps when data arrives */
function HomeSkeleton() {
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">
        Loading
      </span>

      {/* Categories strip (overlaps the hero, like the real one) */}
      <div className="relative z-10 -mt-14 lg:-mt-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <Shimmer className="h-[132px] rounded-xl lg:h-[84px]" />
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-auto mt-3 max-w-[1280px] px-4 sm:px-6 lg:mt-4 lg:px-8">
        <Shimmer className="h-[330px] rounded-xl lg:h-[96px]" />
      </div>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {[0, 1, 2].map((section) => (
          <div key={section} className="mt-14 grid gap-10 lg:mt-16 lg:grid-cols-2 lg:gap-8 xl:gap-10">
            {[0, 1].map((col) => (
              <div key={col}>
                <Shimmer className="mb-5 h-7 w-52 rounded-md" />
                <div className={section === 0 ? "grid gap-4 sm:grid-cols-2" : "flex flex-col gap-3"}>
                  {Array.from({ length: section === 0 ? 2 : 3 }, (_, i) => (
                    <Shimmer key={i} className={section === 0 ? "h-72 rounded-xl" : "h-24 rounded-xl"} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [home, setHome] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.title = "WS Hub — Warangal’s Business & Startup Ecosystem";
    let active = true;
    homeApi
      .get()
      .then((data) => {
        if (active) setHome(data);
      })
      .catch(() => {
        if (active) {
          setHome(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-in pb-16 lg:pb-0">
      <Hero />

      {loading ? (
        <HomeSkeleton />
      ) : (
        <>
          <Categories items={home?.categories} />
          <Stats apiStats={home?.stats} />

          {failed && (
            <div className="mx-auto mt-6 max-w-[1280px] px-4 sm:px-6 lg:px-8">
              <p role="alert" className="rounded-lg border border-line bg-white px-4 py-3 text-[14px] text-slate-700">
                We couldn’t load the latest listings. Refresh the page to try again.
              </p>
            </div>
          )}

          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
            <section className="mt-14 grid gap-10 lg:mt-16 lg:grid-cols-2 lg:gap-8 xl:gap-10" aria-label="Featured">
              <FeaturedBusinesses items={home?.featured} />
              <FeaturedStartups items={home?.featuredStartups} />
            </section>

            <section className="mt-14 grid gap-10 lg:mt-16 lg:grid-cols-2 lg:gap-8 xl:gap-10" aria-label="Events and stories">
              <UpcomingEvents items={home?.events ?? home?.upcomingEvents} />
              <LatestStories items={home?.stories ?? home?.latestStories} />
            </section>

            <section className="mt-14 grid gap-10 lg:mt-16 lg:grid-cols-2 lg:gap-8 xl:gap-10" aria-label="Opportunities and trending">
              <Opportunities items={home?.opportunities ?? home?.requirements} />
              <TrendingBusinesses items={home?.topRated?.length ? home.topRated : home?.latest} />
            </section>
          </div>

          <CTA />
        </>
      )}
    </div>
  );
}