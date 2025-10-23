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
export async function searchCatalog(db: Orama, term: string) {
  // Handle empty or whitespace-only searches
  if (!term || term.trim() === "") {
    return { count: 0, hits: [], elapsed: { raw: 0n, formatted: "0μs" } };
  }

  // For numeric terms, try exact form ID matching first to avoid substring matches
  if (/^\d+$/.test(term)) {
    const exactVariations = [
      `SNF-${term}`,
      `BU-${term}`,
      `CDPH-${term}`,
      `CH-${term}`,
      `CM-${term}`,
      `DI-${term}`,
      `EH-${term}`,
      `Form-${term}`,
      `HM-${term}`,
      `HMI-${term}`,
      `HR-${term}`,
      `JWA-${term}`,
      `KS-${term}`,
      `MC-${term}`,
      `NU-${term}`,
      `RADf-${term}`,
      `RDf-${term}`,
      `RNF-${term}`,
      `RNf-${term}`,
      `RSDf-${term}`,
      `RSLf-${term}`,
      `RSOF-${term}`,
      `UB-${term}`,
    ];

    for (const variation of exactVariations) {
      const exactResults = await search(db, {
        term: variation,
        threshold: 0.8, // Higher threshold for exact matches
        tolerance: 0, // No tolerance for exact matches
        limit: 500,
      });

      if (exactResults.count > 0) {
        return exactResults;
      }
    }
  }

  // First try the original search with stricter matching for exact form IDs
  const originalResults = await search(db, {
    term,
    threshold: 0.1, // Lower threshold to include more matches.
    tolerance: 1, // Allow for typos and variations.
    limit: 500, // Dataset is small, pagination is negligible.
  });

  // If we found results, return them
  if (originalResults.count > 0) {
    return originalResults;
  }

  // Try case variations
  const caseVariations = [term.toLowerCase(), term.toUpperCase()];
  for (const variation of caseVariations) {
    if (variation !== term) {
      const caseResults = await search(db, {
        term: variation,
        threshold: 0.1,
        tolerance: 1,
        limit: 500,
      });

      if (caseResults.count > 0) {
        return caseResults;
      }
    }
  }

  // Try variations without hyphens (for hyphenated terms)
  if (term.includes("-")) {
    const noHyphenTerm = term.replace(/-/g, "");
    const noHyphenResults = await search(db, {
      term: noHyphenTerm,
      threshold: 0.1,
      tolerance: 1,
      limit: 500,
    });

    if (noHyphenResults.count > 0) {
      return noHyphenResults;
    }
  }

  // If no results and the term contains only numbers/letters (no hyphens),
  // try searching for variations with common prefixes
  if (/^[A-Za-z0-9]+$/.test(term)) {
    const variations = [
      `SNF-${term}`,
      `BU-${term}`,
      `CDPH-${term}`,
      `CH-${term}`,
      `CM-${term}`,
      `DI-${term}`,
      `EH-${term}`,
      `Form-${term}`,
      `HM-${term}`,
      `HMI-${term}`,
      `HR-${term}`,
      `JWA-${term}`,
      `KS-${term}`,
      `MC-${term}`,
      `NU-${term}`,
      `RADf-${term}`,
      `RDf-${term}`,
      `RNF-${term}`,
      `RNf-${term}`,
      `RSDf-${term}`,
      `RSLf-${term}`,
      `RSOF-${term}`,
      `UB-${term}`,
    ];

    for (const variation of variations) {
      const variationResults = await search(db, {
        term: variation,
        threshold: 0.1,
        tolerance: 1,
        limit: 500,
      });

      if (variationResults.count > 0) {
        return variationResults;
      }
    }
  }

  // Return original results (empty)
  return originalResults;
}
