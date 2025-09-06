import type { CatalogItem } from "#/lib/snfforms.ts";

const catalogItemsText = await Deno.readTextFile("./public/catalog.json");
export const catalogItems = JSON.parse(catalogItemsText) as CatalogItem[];

/**
 * findCatalogItem gets a catalog item by formId.
 */
export function findCatalogItem(formId: string) {
  return catalogItems.find((item) => item.formId === formId);
}
