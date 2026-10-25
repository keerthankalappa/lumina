import "./load-env";
import { seed } from "@/db/seed";

const { decks, actions } = await seed();
console.log(`✓ seeded ${decks} decks, ${actions} daily actions`);
