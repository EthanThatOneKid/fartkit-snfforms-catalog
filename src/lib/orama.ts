import { create, insert, search } from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
import * as use from "@tensorflow-models/universal-sentence-encoder";
import type { CatalogItem } from "#/lib/snfforms.ts";

export interface OramaWithEmbeddings {
  db: Awaited<ReturnType<typeof create>>;
  model: use.UniversalSentenceEncoder;
}

export type Orama = OramaWithEmbeddings;

/**
 * Creates a searchable text representation of a catalog item for embedding generation.
 */
function createSearchableText(item: CatalogItem): string {
  return [
    item.formId,
    item.category,
    item.description,
    item.size,
    item.paper,
    item.color,
    item.sides,
    item.unit,
  ].filter(Boolean).join(" ");
}

/**
 * Generates embeddings using TensorFlow.js Universal Sentence Encoder
 */
async function generateEmbedding(
  model: use.UniversalSentenceEncoder,
  text: string,
): Promise<number[]> {
  const embeddings = await model.embed([text]);
  const embeddingArray = await embeddings.array();
  embeddings.dispose(); // Clean up tensor memory
  return embeddingArray[0];
}

/**
 * Serializes the Orama database to JSON format.
 * Note: The TensorFlow model cannot be serialized and must be loaded separately.
 */
export async function serializeOramaIndex(
  db: Awaited<ReturnType<typeof create>>,
) {
  return await persist(db, "json");
}

/**
 * Deserializes an Orama database from JSON format.
 * The TensorFlow model must be loaded separately and attached.
 */
export async function deserializeOramaIndex(
  jsonIndex: string,
): Promise<Awaited<ReturnType<typeof create>>> {
  return await restore("json", jsonIndex);
}

/**
 * Loads the TensorFlow model (needed for embedding generation).
 * This is separate from the database since the model cannot be serialized.
 */
export async function loadEmbeddingModel(): Promise<
  use.UniversalSentenceEncoder
> {
  // Set TensorFlow.js backend to WASM for better server-side performance
  await tf.setBackend("wasm");
  await tf.ready();

  // Load the Universal Sentence Encoder model
  return await use.load();
}

export async function createOrama(
  catalogItems: CatalogItem[],
  onProgress?: (current: number, total: number) => void,
): Promise<OramaWithEmbeddings> {
  // Load the TensorFlow model for embedding generation
  const model = await loadEmbeddingModel();

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
      embedding: "vector[512]", // Universal Sentence Encoder generates 512-dimensional vectors
    },
  });

  const total = catalogItems.length;

  // Insert items with embeddings generated using TensorFlow
  for (let i = 0; i < catalogItems.length; i++) {
    const catalogItem = catalogItems[i];
    const searchableText = createSearchableText(catalogItem);
    const embedding = await generateEmbedding(model, searchableText);

    await insert(db, {
      ...catalogItem,
      embedding,
    });

    // Report progress if callback provided
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return { db, model };
}

// Common form ID prefixes used for generating search variations
const FORM_ID_PREFIXES = [
  "SNF",
  "BU",
  "CDPH",
  "CH",
  "CM",
  "DI",
  "EH",
  "Form",
  "HM",
  "HMI",
  "HR",
  "JWA",
  "KS",
  "MC",
  "NU",
  "RADf",
  "RDf",
  "RNF",
  "RNf",
  "RSDf",
  "RSLf",
  "RSOF",
  "UB",
] as const;

// Search configuration constants
const SEARCH_CONFIG = {
  // Standard semantic search configuration
  semantic: {
    threshold: 0.1, // Lower threshold to include more matches
    tolerance: 1, // Allow for typos and variations
    similarity: 0.5, // Vector similarity threshold - lowered to improve semantic matching
    limit: 500, // Dataset is small, pagination is negligible
    hybridWeights: {
      text: 0.5, // Equal weight to both text and vector search
      vector: 0.5,
    },
  },
  // Exact match configuration (for form IDs)
  exact: {
    threshold: 0.8, // Higher threshold for exact matches
    tolerance: 0, // No tolerance for exact matches
    similarity: 0.85, // Vector similarity threshold
    limit: 500,
    hybridWeights: {
      text: 0.6, // Slightly favor text for exact form ID matches
      vector: 0.4,
    },
  },
} as const;

/**
 * Creates a hybrid search options object for Orama search
 */
function createHybridSearchOptions(
  term: string,
  embedding: number[],
  config: typeof SEARCH_CONFIG.semantic | typeof SEARCH_CONFIG.exact,
): Parameters<typeof search>[1] {
  return {
    mode: "hybrid" as const,
    term,
    vector: {
      value: embedding,
      property: "embedding" as const,
    },
    threshold: config.threshold,
    tolerance: config.tolerance,
    similarity: config.similarity,
    limit: config.limit,
    hybridWeights: config.hybridWeights,
  } as Parameters<typeof search>[1];
}

/**
 * Generates form ID variations with common prefixes
 */
function generateFormIdVariations(term: string): string[] {
  return FORM_ID_PREFIXES.map((prefix) => `${prefix}-${term}`);
}

/**
 * searchCatalog searches the catalog for a term using hybrid search.
 * Combines full-text search with vector similarity search for better results.
 *
 * @see https://docs.orama.com/docs/orama-js/search/hybrid-search
 */
export async function searchCatalog(orama: Orama, term: string) {
  const { db, model } = orama;

  // Handle empty or whitespace-only searches
  if (!term || term.trim() === "") {
    return { count: 0, hits: [], elapsed: { raw: 0n, formatted: "0μs" } };
  }

  // Generate embedding for the search term using TensorFlow
  const queryEmbedding = await generateEmbedding(model, term);

  // For numeric terms, try exact form ID matching first to avoid substring matches
  if (/^\d+$/.test(term)) {
    const exactVariations = generateFormIdVariations(term);

    for (const variation of exactVariations) {
      const variationEmbedding = await generateEmbedding(model, variation);
      const exactResults = await search(
        db,
        createHybridSearchOptions(
          variation,
          variationEmbedding,
          SEARCH_CONFIG.exact,
        ),
      );

      if (exactResults.count > 0) {
        return exactResults;
      }
    }
  }

  // Use hybrid search for the main search
  const hybridResults = await search(
    db,
    createHybridSearchOptions(term, queryEmbedding, SEARCH_CONFIG.semantic),
  );

  // If we found results, return them
  if (hybridResults.count > 0) {
    return hybridResults;
  }

  // Try case variations with hybrid search
  const caseVariations = [term.toLowerCase(), term.toUpperCase()];
  for (const variation of caseVariations) {
    if (variation !== term) {
      const variationEmbedding = await generateEmbedding(model, variation);
      const caseResults = await search(
        db,
        createHybridSearchOptions(
          variation,
          variationEmbedding,
          SEARCH_CONFIG.semantic,
        ),
      );

      if (caseResults.count > 0) {
        return caseResults;
      }
    }
  }

  // Try variations without hyphens (for hyphenated terms)
  if (term.includes("-")) {
    const noHyphenTerm = term.replace(/-/g, "");
    const noHyphenEmbedding = await generateEmbedding(model, noHyphenTerm);
    const noHyphenResults = await search(
      db,
      createHybridSearchOptions(
        noHyphenTerm,
        noHyphenEmbedding,
        SEARCH_CONFIG.semantic,
      ),
    );

    if (noHyphenResults.count > 0) {
      return noHyphenResults;
    }
  }

  // If no results and the term contains only numbers/letters (no hyphens),
  // try searching for variations with common prefixes
  if (/^[A-Za-z0-9]+$/.test(term)) {
    const variations = generateFormIdVariations(term);

    for (const variation of variations) {
      const variationEmbedding = await generateEmbedding(model, variation);
      const variationResults = await search(
        db,
        createHybridSearchOptions(
          variation,
          variationEmbedding,
          SEARCH_CONFIG.semantic,
        ),
      );

      if (variationResults.count > 0) {
        return variationResults;
      }
    }
  }

  // Return hybrid results (may be empty)
  return hybridResults;
}
