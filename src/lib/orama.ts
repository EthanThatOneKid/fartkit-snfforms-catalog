import { create, insert, search } from "@orama/orama";
import { catalogItems } from "./catalog.ts";

export function searchCatalog(term: string) {
  return search(db, { term });
}

const db = await create({
  schema: {
    formId: "string",
    category: "string",
    description: "string",
    size: "string",
    paper: "string",
    color: "string",
    sides: "string",
    unit: "string",
  },
});

for (const catalogItem of catalogItems) {
  await insert(db, catalogItem);
}
