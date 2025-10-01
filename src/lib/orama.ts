import { create, insert, search } from "@orama/orama";
import type { CatalogItem } from "#/lib/snfforms.ts";

export type Orama = Awaited<ReturnType<typeof createOrama>>;

export async function createOrama(catalogItems: CatalogItem[]) {
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

  return db;
}

/**
 * searchCatalog searches the catalog for a term.
 *
 * @see https://docs.orama.com/docs/orama-js/search
 */
export function searchCatalog(db: Orama, term: string) {
  return search(db, {
    term,
    threshold: 1,
    tolerance: 0.95,
    limit: 500, // Dataset is small, pagination is negligible.
  });
}
