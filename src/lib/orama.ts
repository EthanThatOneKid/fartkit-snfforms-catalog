import type { CatalogItem } from "#/lib/snfforms.ts";

// Implement an Orama database client.
// https://jsr.io/@orama/orama
//

export function searchCatalog(_search: string): Promise<CatalogItem[]> {
  return Promise.resolve([]);
}
