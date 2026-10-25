import { writeFileSync } from "node:fs";
import { openApiDocument } from "@/openapi/document";

writeFileSync("openapi.json", JSON.stringify(openApiDocument(), null, 2) + "\n");
console.log("✓ wrote openapi.json");
