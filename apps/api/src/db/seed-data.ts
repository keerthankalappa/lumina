export type SeedDeck = {
  slug: string;
  title: string;
  category: string;
  theme: string;
  description: string;
  epigraph: string;
  guide: string;
  palette: string;
  audioMinutes: number;
  featured?: boolean;
  affirmations: string[];
};

export const seedDecks: SeedDeck[] = [
  {
    slug: "changemakers-inner-sanctuary",
    title: "The Changemaker’s Inner Sanctuary",
    category: "Global Changemakers",
    theme: "Inner Sanctuary",
    description:
      "Restorative mantras and audio meditations for people doing the long, patient work of changing the world — written for burnout, doubt and fierce hope.",
    epigraph: "In the center of action, I carry stillness like a river.",
    guide: "Dr. Elena Vance",
    palette: "earth-dawn",
    audioMinutes: 14,
    featured: true,
    affirmations: [
      "In the center of action, I carry stillness like a river.",
      "My rest is not a retreat from the work; it is how the work endures.",
      "I can hold the weight of the world gently, one task at a time.",
      "Small faithful acts, repeated, are how mountains move.",
      "I release outcomes I cannot control and tend the ground I can.",
      "My hope is a discipline, and today I practise it.",
      "I am one of many hands, and that is enough.",
    ],
  },
  {
    slug: "radical-empathy",
    title: "Radical Empathy & Listening",
    category: "Radical Compassion",
    theme: "Compassion",
    description: "Practices for listening without defending, and meeting others in their whole humanity.",
    epigraph: "I do not listen to defeat another; I listen to discover the sacred wholeness in our shared struggle.",
    guide: "Maya Lin",
    palette: "sand-gold",
    audioMinutes: 4,
    affirmations: [
      "I do not listen to defeat another; I listen to discover the sacred wholeness in our shared struggle.",
      "I cultivate unwavering peace within my core, knowing that every act of patient compassion I offer today creates an untamable ripple across our interconnected world.",
      "I can disagree with an idea and still honour the person who holds it.",
      "Curiosity softens what certainty would harden.",
      "Every face I meet today carries a story I have not heard.",
      "My kindness is not weakness; it is courage made visible.",
    ],
  },
  {
    slug: "creative-fearlessness",
    title: "Creative Fearlessness",
    category: "Creative Resilience",
    theme: "Creativity",
    description: "Permission to make imperfect, honest things — and to share them.",
    epigraph: "Perfection is an illusion of control; my honest, imperfect offering is what the world truly thirsts for.",
    guide: "Dr. Elena Vance",
    palette: "sunburst",
    audioMinutes: 3,
    affirmations: [
      "Perfection is an illusion of control; my honest, imperfect offering is what the world truly thirsts for.",
      "I make room for the first clumsy draft; it is the doorway, not the destination.",
      "My voice is needed precisely because it is mine.",
      "I trade the fear of being seen for the joy of being useful.",
      "Play is a serious form of courage.",
      "I begin before I feel ready, and readiness follows.",
    ],
  },
  {
    slug: "ecosystem-care",
    title: "Ecosystem Care & Sacred Earth",
    category: "Eco-Stewardship & Earth",
    theme: "Earth Healing",
    description: "Affirmations of belonging to the living world, and tending it in return.",
    epigraph: "I belong to this living earth. In tending to soil, leaf, and neighbor, I restore my own wild soul.",
    guide: "Tariq Vance",
    palette: "forest",
    audioMinutes: 5,
    affirmations: [
      "I belong to this living earth. In tending to soil, leaf, and neighbor, I restore my own wild soul.",
      "The trees do not hurry, yet everything is accomplished.",
      "I take only what I need and return what I can.",
      "Every seed I plant is a letter to a future I will not see.",
      "I breathe with the forest: receiving, releasing, renewing.",
      "Caring for this place is caring for everyone who will ever love it.",
    ],
  },
  {
    slug: "stillness-in-the-storm",
    title: "Stillness in the Storm",
    category: "Overcoming Anxiety",
    theme: "Resilience",
    description: "Grounding words for anxious seasons — anchors for when the water is rough.",
    epigraph: "Between stimulus and response lies my quiet sanctuary of sovereign choice.",
    guide: "Kavita Chen",
    palette: "lake-dusk",
    audioMinutes: 6,
    affirmations: [
      "Between stimulus and response lies my quiet sanctuary of sovereign choice.",
      "This feeling is a wave, and I am the ocean that holds it.",
      "I can do hard things slowly.",
      "My breath is an anchor I carry everywhere.",
      "I am safe in this moment, and this moment is where I live.",
      "I let my thoughts pass like weather; I remain the sky.",
    ],
  },
  {
    slug: "generosity-of-spirit",
    title: "Generosity of Spirit",
    category: "Radical Compassion",
    theme: "Abundance",
    description: "On giving freely, receiving gracefully, and the quiet economics of grace.",
    epigraph: "There is no scarcity in grace. The more compassion I sow into uncultivated ground, the richer life grows.",
    guide: "Maya Lin",
    palette: "peach-bloom",
    audioMinutes: 4,
    affirmations: [
      "There is no scarcity in grace. The more compassion I sow into uncultivated ground, the richer life grows.",
      "What I give with an open hand returns in ways I cannot predict.",
      "I celebrate another’s light without dimming my own.",
      "Receiving is also a gift I offer to the giver.",
      "I have enough, I do enough, I am enough.",
      "Generosity begins with the attention I give.",
    ],
  },
  {
    slug: "courageous-boundaries",
    title: "Courageous Boundaries",
    category: "Mindful Leadership",
    theme: "Inner Peace",
    description: "Holding clear, tender limits that protect what matters most.",
    epigraph: "My clear, tender boundary is not a wall of division, but a garden gate keeping sacred things alive.",
    guide: "Tariq Vance",
    palette: "stone-mist",
    audioMinutes: 3,
    affirmations: [
      "My clear, tender boundary is not a wall of division, but a garden gate keeping sacred things alive.",
      "No is a complete sentence, and I can say it kindly.",
      "Protecting my energy is how I keep showing up for others.",
      "I lead best from a full cup, not an empty one.",
      "I honour the rhythm of my own unfolding; I do not need to rush what is meant to grow with deep roots.",
      "I am allowed to change my mind as I learn.",
    ],
  },
];

export const seedActions = [
  {
    id: "unseen-pillar",
    title: "Extend the Light to an Unseen Pillar",
    description:
      "Send a handwritten or heartfelt note of genuine gratitude to someone whose quiet, steady work makes your daily life possible — a postal worker, colleague, maintenance staff, or quiet friend.",
    karma: 40,
  },
  {
    id: "silent-walk",
    title: "Walk Without a Screen",
    description: "Take a 20-minute silent walk without your phone. Notice three living things and write one kind note when you return.",
    karma: 30,
  },
  {
    id: "listen-fully",
    title: "Listen Without Fixing",
    description: "In one conversation today, listen fully without offering advice. Ask one more question than you normally would.",
    karma: 35,
  },
  {
    id: "earth-tending",
    title: "Tend a Small Patch of Earth",
    description: "Pick up litter on your street, water a neglected plant, or plant a seed. Leave one place better than you found it.",
    karma: 45,
  },
  {
    id: "mentor-moment",
    title: "Share What You Know",
    description: "Spend fifteen minutes helping someone learn something you know well — a skill, a shortcut, or a lesson learned the hard way.",
    karma: 50,
  },
  {
    id: "repair-bridge",
    title: "Mend a Small Bridge",
    description: "Reach out to someone you have drifted from or had friction with. A short, sincere message is enough.",
    karma: 45,
  },
  {
    id: "anonymous-gift",
    title: "Give Anonymously",
    description: "Do one kind thing today that no one will ever trace back to you.",
    karma: 40,
  },
];

/** Sample community stories so a fresh install isn't empty. Authored by a clearly-labelled system account. */
export const seedRipples = [
  {
    category: "kindness" as const,
    body: "Organized our apartment building’s first shared winter coat and pantry swap. We gathered 64 warm coats for the community shelter and shared hot spiced cider in the courtyard.",
    mantraTag: "Radical Empathy",
    location: "Copenhagen, Denmark",
  },
  {
    category: "mentorship" as const,
    body: "Started a free weekly breathwork and mindfulness circle for emergency room nursing staff at our regional hospital. Ten caregivers took their first mindful breath pause of the week.",
    mantraTag: "Courageous Beginnings",
    location: "Cape Town, South Africa",
  },
  {
    category: "environment" as const,
    body: "Planted 25 native flowering shrubs along our neighborhood riverbank with local school children to support native honeybees and stabilize seasonal embankment soils.",
    mantraTag: "Sacred Earth Stewardship",
    location: "Kyoto, Japan",
  },
];
