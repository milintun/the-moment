// What src/seed.ts puts in the database, and what scripts/fetch-seed-images.ts
// searches for. Edit freely: names, dates, kinds, how many posts, and what to search.
//
// start: the Monday the first season opens (12am EST). days: 7 for a gallery, 30 for a wing.
// posts: how many to post across all its seasons. search: what to look for, and where:
//   "art" = Art Institute of Chicago (public domain), optionally only one artwork type
//   ("Painting", "Drawing and Watercolor", "Print", "Photograph"); "photo" = Openverse (CC0 / public domain).
// Images land in seed-images/<slug>/; delete any you don't want, then rerun the fetch script
// (no arguments) to rewrite src/seed.images.json, the list the seed actually uses.

export type Source = "art" | "photo";
/** A gallery's folder under seed-images/. */
export const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
export interface Gallery {
  name: string;
  start: string;
  days: 7 | 30;
  seasons: number;
  posts: number;
  search: Array<[Source, string] | ["art", string, string]>;
}

/** Candidates whose titles match this are skipped. */
export const EXCLUDE = /\b(nude|naked|bather|bathers|hitler|nazi)\b/i;

export const GALLERIES: Gallery[] = [
  // Archive: every season over by today.
  { name: "Figure Drawing", start: "2026-08-03", days: 7, seasons: 3, posts: 14, search: [["art", "figure", "Drawing and Watercolor"], ["art", "study of a man", "Drawing and Watercolor"]] },
  { name: "Doodles", start: "2026-08-10", days: 7, seasons: 2, posts: 10, search: [["art", "sketch", "Drawing and Watercolor"], ["photo", "doodle"]] },
  { name: "Technical Excellence", start: "2026-08-03", days: 30, seasons: 2, posts: 14, search: [["art", "engraving", "Print"], ["art", "botanical", "Drawing and Watercolor"]] },
  { name: "Night Walks", start: "2026-08-31", days: 7, seasons: 3, posts: 14, search: [["photo", "street at night"], ["art", "nocturne", "Print"]] },
  { name: "Self Portraits", start: "2026-09-07", days: 7, seasons: 3, posts: 14, search: [["art", "self-portrait", "Painting"], ["art", "self-portrait", "Drawing and Watercolor"]] },
  { name: "Worst Art", start: "2026-09-14", days: 7, seasons: 1, posts: 8, search: [["photo", "bad drawing"], ["photo", "ugly painting"]] },
  { name: "Still Life", start: "2026-09-07", days: 30, seasons: 1, posts: 12, search: [["art", "still life", "Painting"]] },
  { name: "Strangers on Trains", start: "2026-09-28", days: 7, seasons: 2, posts: 10, search: [["photo", "subway passengers"], ["art", "railway", "Photograph"]] },
  { name: "Houseplants", start: "2026-10-05", days: 7, seasons: 1, posts: 8, search: [["photo", "houseplant"]] },
  { name: "Maps from Memory", start: "2026-10-05", days: 7, seasons: 2, posts: 10, search: [["art", "map", "Drawing and Watercolor"], ["photo", "hand drawn map"]] },
  { name: "Shoes", start: "2026-10-12", days: 7, seasons: 1, posts: 8, search: [["photo", "old shoes"], ["art", "shoes", "Photograph"]] },
  { name: "Rainy Days", start: "2026-10-19", days: 7, seasons: 1, posts: 8, search: [["photo", "rain window"], ["art", "rain", "Print"]] },
  { name: "Relatability", start: "2026-09-21", days: 30, seasons: 1, posts: 12, search: [["photo", "everyday life"], ["art", "interior", "Painting"]] },
  // Current: a season running today (Thu 10/29).
  { name: "Hands", start: "2026-10-12", days: 7, seasons: 3, posts: 15, search: [["art", "hand", "Drawing and Watercolor"], ["photo", "hands"]] },
  { name: "Kitchen Still Lifes", start: "2026-10-26", days: 7, seasons: 4, posts: 10, search: [["art", "kitchen", "Painting"], ["photo", "kitchen still life"]] },
  { name: "Mirrors", start: "2026-10-26", days: 7, seasons: 2, posts: 9, search: [["art", "mirror", "Painting"], ["photo", "mirror reflection"]] },
  { name: "Things in Pockets", start: "2026-10-26", days: 7, seasons: 1, posts: 8, search: [["photo", "keys coins"], ["photo", "pocket contents"]] },
  { name: "Bus Stops", start: "2026-10-19", days: 7, seasons: 3, posts: 12, search: [["photo", "bus stop"]] },
  { name: "Vulnerability", start: "2026-09-28", days: 30, seasons: 3, posts: 16, search: [["art", "melancholy", "Painting"], ["art", "solitude", "Print"], ["photo", "alone"]] },
  { name: "Windows", start: "2026-10-19", days: 30, seasons: 2, posts: 12, search: [["photo", "window light"], ["art", "window", "Painting"]] },
];

// Not started yet: no posts. Each line is one schedule, chosen from the round before it starts.
export const UPCOMING = [
  { names: ["Hand-me-downs", "Bedrooms"], start: "2026-11-02", days: 7, seasons: 2 },
  { names: ["Winter Light"], start: "2026-11-30", days: 30, seasons: 3 },
];

// Every gallery above (and upcoming) won the weekly Future galleries round that ended the
// Monday it opened; galleries opening the same Monday with the same schedule share one cycle.
// Ideas for this week's round, still open (one per user, since it's once a day).
export const CURRENT_IDEAS = [
  "shoelaces", "laundromats", "grandparents", "first apartments", "breakfast", "parking lots", "fog",
  "vending machines", "porches", "tattoos", "receipts", "dogs asleep", "hospital windows", "blue", "hair",
];

// Ideas that lost earlier rounds, sprinkled into past weeks alongside the winners.
export const PAST_IDEAS = [
  "bridges", "orange", "lunch boxes", "power lines", "bathtubs", "graffiti", "teeth", "swimming pools",
  "fences", "the moon", "doors", "cats", "car interiors", "staircases", "socks", "clouds", "libraries",
  "noise", "sundays", "puddles", "chairs", "garages", "eyes", "gas stations",
];

export const USERS = [
  "marisol", "kenji", "ada.l", "bex", "oduya", "pim", "theo_draws", "rania", "jun", "fern", "ivo", "noor",
  "sash", "gus", "hana", "lou", "wren", "cal", "mika", "dee", "tomasz", "yuki", "ezra", "bodhi",
  "quill", "ines", "kit", "sol", "anouk", "rafa", "lena", "obi", "maya.k", "eli", "zaid", "pip",
  "juno", "ottilie", "sam_r", "vera",
];

// Short, human captions; many posts get none.
export const CAPTIONS = [
  "", "", "", "", "first try", "from the train this morning", "sunday", "for my grandmother", "quick one",
  "couldn't sleep", "phone photo, sorry", "30 minutes", "the light was doing something", "again",
  "no reference", "ink on whatever paper was around", "kept walking past this", "it's not finished",
  "made this instead of studying", "my favorite one so far",
];
