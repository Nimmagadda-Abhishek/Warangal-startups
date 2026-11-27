import type { WsEvent } from "./events";

export interface ApiEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  banner_url?: string | null;
  start_at: string;
  location: string;
  is_free: boolean;
  registration_fee_minor: number;
  ticket_capacity: number;
  tickets_sold: number;
  tickets_remaining: number;
  status?: string;
  format?: "In-Person" | "Online" | "Hybrid";
  languages?: string[];
  learning_outcomes?: string[];
  audience?: string[];
  requirements?: string[];
  agenda?: { time: string; title: string; desc?: string }[];
  speakers?: { name: string; role?: string; company?: string; bio?: string; linkedin?: string; session?: string }[];
  sponsors?: { name: string; tier?: string }[];
  venue_details?: { venueName?: string; address?: string; parking?: string; transit?: string; hotels?: string[] };
  gallery?: string[];
  host?: { full_name?: string };
}

export function toWsEvent(value: ApiEvent): WsEvent {
  const start = value.start_at;
  const end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
  const location = value.location || "Location to be announced";
  const organizer = value.host?.full_name || "WS Hub Member";
  const price = value.is_free ? 0 : Number(value.registration_fee_minor || 0) / 100;
  return {
    slug: value.slug, title: value.title, type: "Meetup", start, end,
    organizer: { name: organizer, verified: false }, location, venue: value.venue_details?.venueName || location, address: value.venue_details?.address || location,
    mode: value.format || "In-Person", price, seats: Number(value.ticket_capacity || 0),
    seatsLeft: Number(value.tickets_remaining || 0), interested: Number(value.tickets_sold || 0),
    industry: "Sector Agnostic", languages: value.languages?.length ? value.languages : ["English"], cover: value.banner_url || "/images/cta-bg.jpg",
    tagline: value.description?.slice(0, 180) || "Join this community event.", description: value.description || "",
    outcomes: value.learning_outcomes || [], audience: value.audience || [], requirements: value.requirements || [],
    agenda: (value.agenda || []).map((item) => ({ time: item.time, title: item.title, desc: item.desc || "" })),
    speakers: (value.speakers || []).map((speaker, index) => ({
      name: speaker.name, initials: speaker.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase(),
      color: ["#365f91", "#b8892b", "#367d70", "#76528f"][index % 4], company: [speaker.role, speaker.company].filter(Boolean).join(" · "),
      bio: speaker.bio || "", linkedin: speaker.linkedin || "", session: speaker.session || "",
    })),
    sponsors: (value.sponsors || []).map((sponsor) => ({ name: sponsor.name, tier: (sponsor.tier === "Title" || sponsor.tier === "Gold" ? sponsor.tier : "Community") as "Title" | "Gold" | "Community" })),
    venueInfo: { parking: value.venue_details?.parking || "Contact the organizer for parking information.", hotels: (value.venue_details?.hotels || []).map((name) => ({ name })), transit: value.venue_details?.transit || "Contact the organizer for travel details." },
    gallery: value.gallery || [], faq: [], discussion: [],
  };
}
