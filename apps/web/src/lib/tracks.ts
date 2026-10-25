import type { Schemas } from "../api/client";
import type { Track } from "../audio/AudioProvider";

export const deckTrack = (d: Schemas["Deck"]): Track => ({
  id: `deck:${d.slug}`,
  title: d.title,
  subtitle: d.category,
  guide: d.guide,
  description: d.description,
  palette: d.palette,
  deckSlug: d.slug,
  lines: d.affirmations.map((a) => a.text),
  lineIds: d.affirmations.map((a) => a.id),
});

export const dailyTrack = (daily: Schemas["Daily"]): Track => ({
  id: `daily:${daily.date}`,
  title: "Daily Focal Mantra",
  subtitle: `${daily.deck.theme} • Daily Sanctuary`,
  guide: daily.deck.guide,
  description: `Today’s affirmation from “${daily.deck.title}”, spoken three times with a breath between each.`,
  deckSlug: daily.deck.slug,
  lines: [daily.affirmation.text, daily.affirmation.text, daily.affirmation.text],
  lineIds: [daily.affirmation.id, daily.affirmation.id, daily.affirmation.id],
});
