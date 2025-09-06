import { create, insert, search } from "@orama/orama";
import { catalogItems } from "./catalog.ts";

/**
 * searchCatalog searches the catalog for a term.
 *
 * @see https://docs.orama.com/docs/orama-js/search
 */
export function searchCatalog(term: string) {
  return search(db, {
    term,
    tolerance: 0.5,
    limit: 500, // Dataset is small, pagination is negligible.
  });
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
