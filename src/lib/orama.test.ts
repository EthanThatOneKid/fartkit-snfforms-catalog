import { assertEquals, assertExists } from "@std/assert";
import { createOrama, searchCatalog } from "./orama.ts";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
import catalogData from "./catalog.sample.json" with {
  type: "json",
};

// Ensure WASM backend is set up before running tests
// This ensures tests use the local WASM backend instead of trying to use WebGL/CPU
let backendInitialized = false;

async function ensureWasmBackend() {
  if (!backendInitialized) {
    // Set TensorFlow.js backend to WASM for server-side testing
    await tf.setBackend("wasm");
    await tf.ready();
    backendInitialized = true;
  }
}

// Test data - we'll use a subset of the catalog for focused testing
const testCatalogItems = [
  {
    formId: "SNF-1062",
    description: "Resident's Clothing & Possessions",
    size: "8-1/2 x 11",
    paper: "2 part NCR",
    color: "White/Yellow",
    sides: "1",
    unit: "S/100",
    previews: [
      {
        src: "/api/files/SNF-1062_1.jpg",
        alt: "Resident's Clothing & Possessions: SNF-1062 (1)",
        pdf: "/api/files/SNF-1062.pdf",
      },
    ],
    category: "Nursing",
  },
  {
    formId: "BU-0375",
    description: "Medicare Denial of Benefits Notice",
    size: "8-1/2 x 11",
    paper: "White",
    color: "White",
    sides: "1",
    unit: "S/100",
    previews: [
      {
        src: "/api/files/BU-0375_1.jpg",
        alt: "Medicare Denial of Benefits Notice: BU-0375 (1)",
        pdf: "/api/files/BU-0375.pdf",
      },
    ],
    category: "Billing",
  },
  {
    formId: "CDPH-327",
    description: "California Department of Public Health Form",
    size: "8-1/2 x 11",
    paper: "White",
    color: "White",
    sides: "1",
    unit: "S/100",
    previews: [],
    category: "Compliance",
  },
  {
    formId: "SNF-2001",
    description: "Patient Admission Assessment",
    size: "8-1/2 x 11",
    paper: "White",
    color: "White",
    sides: "2",
    unit: "S/100",
    previews: [],
    category: "Nursing",
  },
  {
    formId: "BU-1000",
    description: "Insurance Coverage Verification",
    size: "8-1/2 x 11",
    paper: "White",
    color: "White",
    sides: "1",
    unit: "S/100",
    previews: [],
    category: "Billing",
  },
];

Deno.test("Orama Search - Basic Functionality", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test basic search
  const results = await searchCatalog(db, "Resident");
  assertEquals(results.count, 1);
  assertEquals(
    (results.hits[0].document as { formId: string }).formId,
    "SNF-1062",
  );
});

Deno.test("Orama Search - Form ID Variations", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test different variations of SNF-1062
  const testCases = [
    { term: "1062", expectedFormId: "SNF-1062" },
    { term: "SNF-1062", expectedFormId: "SNF-1062" },
    { term: "snf-1062", expectedFormId: "SNF-1062" },
    { term: "SNF1062", expectedFormId: "SNF-1062" },
    { term: "snf1062", expectedFormId: "SNF-1062" },
  ];

  for (const testCase of testCases) {
    const results = await searchCatalog(db, testCase.term);
    assertEquals(
      results.count,
      1,
      `Search for "${testCase.term}" should return 1 result`,
    );
    assertEquals(
      (results.hits[0].document as { formId: string }).formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - BU Form Variations", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test different variations of BU-0375
  const testCases = [
    { term: "0375", expectedFormId: "BU-0375" },
    { term: "BU-0375", expectedFormId: "BU-0375" },
    { term: "bu-0375", expectedFormId: "BU-0375" },
    { term: "BU0375", expectedFormId: "BU-0375" },
    { term: "bu0375", expectedFormId: "BU-0375" },
  ];

  for (const testCase of testCases) {
    const results = await searchCatalog(db, testCase.term);
    assertEquals(
      results.count,
      1,
      `Search for "${testCase.term}" should return 1 result`,
    );
    assertEquals(
      (results.hits[0].document as { formId: string }).formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - CDPH Form Variations", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test different variations of CDPH-327
  const testCases = [
    { term: "327", expectedFormId: "CDPH-327" },
    { term: "CDPH-327", expectedFormId: "CDPH-327" },
    { term: "cdph-327", expectedFormId: "CDPH-327" },
    { term: "CDPH327", expectedFormId: "CDPH-327" },
    { term: "cdph327", expectedFormId: "CDPH-327" },
  ];

  for (const testCase of testCases) {
    const results = await searchCatalog(db, testCase.term);
    assertEquals(
      results.count,
      1,
      `Search for "${testCase.term}" should return 1 result`,
    );
    assertEquals(
      (results.hits[0].document as { formId: string }).formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - Description Search", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test description-based searches
  const testCases = [
    { term: "Clothing", expectedFormId: "SNF-1062" },
    { term: "Possessions", expectedFormId: "SNF-1062" },
    { term: "Medicare", expectedFormId: "BU-0375" },
    { term: "Denial", expectedFormId: "BU-0375" },
    { term: "Benefits", expectedFormId: "BU-0375" },
    { term: "California", expectedFormId: "CDPH-327" },
    { term: "Public Health", expectedFormId: "CDPH-327" },
  ];

  for (const testCase of testCases) {
    const results = await searchCatalog(db, testCase.term);
    assertEquals(
      results.count,
      1,
      `Search for "${testCase.term}" should return 1 result`,
    );
    assertEquals(
      (results.hits[0].document as { formId: string }).formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - Category Search", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test category-based searches
  const testCases = [
    {
      term: "Nursing",
      expectedCount: 2,
      expectedFormIds: ["SNF-1062", "SNF-2001"],
    }, // Now 2 items in Nursing category
    {
      term: "Billing",
      expectedCount: 2,
      expectedFormIds: ["BU-0375", "BU-1000"],
    }, // Now 2 items in Billing category
    { term: "Compliance", expectedCount: 1, expectedFormIds: ["CDPH-327"] },
  ];

  for (const testCase of testCases) {
    const results = await searchCatalog(db, testCase.term);
    assertEquals(
      results.count,
      testCase.expectedCount,
      `Search for "${testCase.term}" should return ${testCase.expectedCount} result(s)`,
    );
    // Verify that the expected form IDs are in the results
    const foundFormIds = results.hits.map(
      (hit) => (hit.document as { formId: string }).formId,
    );
    for (const expectedFormId of testCase.expectedFormIds) {
      assertEquals(
        foundFormIds.includes(expectedFormId),
        true,
        `Search for "${testCase.term}" should find ${expectedFormId}. Found: ${
          foundFormIds.join(", ")
        }`,
      );
    }
  }
});

Deno.test("Orama Search - Case Insensitive", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test case insensitive searches
  const testCases = [
    { term: "resident", expectedFormId: "SNF-1062" },
    { term: "RESIDENT", expectedFormId: "SNF-1062" },
    { term: "Resident", expectedFormId: "SNF-1062" },
    { term: "medicare", expectedFormId: "BU-0375" },
    { term: "MEDICARE", expectedFormId: "BU-0375" },
    { term: "Medicare", expectedFormId: "BU-0375" },
  ];

  for (const testCase of testCases) {
    const results = await searchCatalog(db, testCase.term);
    assertEquals(
      results.count,
      1,
      `Search for "${testCase.term}" should return 1 result`,
    );
    assertEquals(
      (results.hits[0].document as { formId: string }).formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - No Results", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test searches that should return no results
  const testCases = [
    "nonexistent",
    "xyz123",
    "invalid-form",
    "999999",
  ];

  for (const term of testCases) {
    const results = await searchCatalog(db, term);
    assertEquals(
      results.count,
      0,
      `Search for "${term}" should return 0 results`,
    );
  }
});

Deno.test("Orama Search - Full Catalog Integration", async () => {
  await ensureWasmBackend();
  // Test with the full catalog to ensure our changes work with real data
  const db = await createOrama(catalogData);

  // Test the specific case mentioned in the issue
  const results = await searchCatalog(db, "1062");
  assertEquals(
    results.count,
    1,
    "Search for '1062' should find SNF-1062 in full catalog",
  );
  assertEquals(
    (results.hits[0].document as { formId: string }).formId,
    "SNF-1062",
    "Search for '1062' should find SNF-1062",
  );

  // Verify the found item has the expected properties
  const foundItem = results.hits[0].document as {
    formId: string;
    description: string;
    category: string;
  };
  assertEquals(foundItem.description, "Resident's Clothing & Possessions");
  assertEquals(foundItem.category, "Nursing");
});

Deno.test("Orama Search - Performance Test", async () => {
  await ensureWasmBackend();
  const db = await createOrama(catalogData);

  // Test multiple searches to ensure performance is reasonable
  const searchTerms = ["1062", "SNF-1062", "Resident", "Medicare", "Nursing"];

  const startTime = performance.now();

  for (const term of searchTerms) {
    const results = await searchCatalog(db, term);
    assertExists(results, `Search for "${term}" should return results`);
    assertEquals(
      typeof results.count,
      "number",
      `Search for "${term}" should return a count`,
    );
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  // Should complete all searches in under 1 second
  assertEquals(
    duration < 1000,
    true,
    `All searches should complete in under 1 second (took ${duration}ms)`,
  );
});

Deno.test("Orama Search - Edge Cases", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test edge cases
  const testCases = [
    { term: "", expectedCount: 0 }, // Empty string
    { term: " ", expectedCount: 0 }, // Whitespace only
    { term: "106", expectedCount: 1 }, // Partial number (matches SNF-1062 in test dataset)
    { term: "SNF", expectedCount: 2 }, // Prefix only - now matches SNF-1062 and SNF-2001
    { term: "BU", expectedCount: 2 }, // Prefix only - now matches BU-0375 and BU-1000
  ];

  for (const testCase of testCases) {
    const results = await searchCatalog(db, testCase.term);
    assertEquals(
      results.count,
      testCase.expectedCount,
      `Search for "${testCase.term}" should return ${testCase.expectedCount} result(s)`,
    );
  }
});

Deno.test("Orama Hybrid Search - Vector Search (Semantic Similarity)", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test semantic similarity: these queries should match based on meaning, not exact text
  // Vector search should find semantically similar content even without exact word matches
  const semanticTests = [
    {
      term: "patient",
      description:
        "Should find 'Patient Admission Assessment' via semantic similarity",
      expectedFormIds: ["SNF-2001"],
    },
    {
      term: "admission",
      description:
        "Should find 'Patient Admission Assessment' via semantic similarity",
      expectedFormIds: ["SNF-2001"],
    },
    {
      term: "insurance",
      description:
        "Should find 'Insurance Coverage Verification' via semantic similarity",
      expectedFormIds: ["BU-1000"],
    },
    {
      term: "coverage",
      description:
        "Should find 'Insurance Coverage Verification' via semantic similarity",
      expectedFormIds: ["BU-1000"],
    },
  ];

  for (const test of semanticTests) {
    const results = await searchCatalog(db, test.term);
    assertExists(
      results,
      `Search for "${test.term}" should return results (${test.description})`,
    );
    assertEquals(
      results.count > 0,
      true,
      `Search for "${test.term}" should return at least 1 result (${test.description})`,
    );

    // Verify that at least one of the expected form IDs is in the results
    const foundFormIds = results.hits.map(
      (hit) => (hit.document as { formId: string }).formId,
    );
    const hasExpectedForm = test.expectedFormIds.some((formId) =>
      foundFormIds.includes(formId)
    );
    assertEquals(
      hasExpectedForm,
      true,
      `Search for "${test.term}" should find one of: ${
        test.expectedFormIds.join(", ")
      }. Found: ${foundFormIds.join(", ")} (${test.description})`,
    );
  }
});

Deno.test("Orama Hybrid Search - Full-Text Search Component", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test that full-text search (BM25) is working - exact word matches should be found
  // These should work primarily through text search, not just vector similarity
  const textSearchTests = [
    {
      term: "Clothing",
      expectedFormId: "SNF-1062",
      description: "Exact word match should work via full-text search",
    },
    {
      term: "Medicare",
      expectedFormId: "BU-0375",
      description: "Exact word match should work via full-text search",
    },
    {
      term: "California",
      expectedFormId: "CDPH-327",
      description: "Exact word match should work via full-text search",
    },
    {
      term: "Verification",
      expectedFormId: "BU-1000",
      description: "Exact word match should work via full-text search",
    },
  ];

  for (const test of textSearchTests) {
    const results = await searchCatalog(db, test.term);
    assertEquals(
      results.count > 0,
      true,
      `Full-text search for "${test.term}" should return results (${test.description})`,
    );
    const foundFormIds = results.hits.map(
      (hit) => (hit.document as { formId: string }).formId,
    );
    assertEquals(
      foundFormIds.includes(test.expectedFormId),
      true,
      `Full-text search for "${test.term}" should find ${test.expectedFormId} (${test.description}). Found: ${
        foundFormIds.join(", ")
      }`,
    );
  }
});

Deno.test("Orama Hybrid Search - Combined Text and Vector Search", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test queries where both text and vector search should contribute
  // Hybrid search should provide better results than either alone
  const hybridTests = [
    {
      term: "resident clothing",
      description:
        "Should find SNF-1062 via both text match ('clothing') and semantic similarity",
      expectedFormId: "SNF-1062",
    },
    {
      term: "medicare benefits denial",
      description:
        "Should find BU-0375 via both text matches and semantic understanding",
      expectedFormId: "BU-0375",
    },
    {
      term: "patient assessment admission",
      description:
        "Should find SNF-2001 via both text match ('assessment', 'admission') and semantic similarity",
      expectedFormId: "SNF-2001",
    },
    {
      term: "insurance verification coverage",
      description:
        "Should find BU-1000 via both text matches and semantic understanding",
      expectedFormId: "BU-1000",
    },
  ];

  for (const test of hybridTests) {
    const results = await searchCatalog(db, test.term);
    assertEquals(
      results.count > 0,
      true,
      `Hybrid search for "${test.term}" should return results (${test.description})`,
    );
    const foundFormIds = results.hits.map(
      (hit) => (hit.document as { formId: string }).formId,
    );
    assertEquals(
      foundFormIds.includes(test.expectedFormId),
      true,
      `Hybrid search for "${test.term}" should find ${test.expectedFormId} (${test.description}). Found: ${
        foundFormIds.join(", ")
      }`,
    );
  }
});

Deno.test("Orama Hybrid Search - Semantic Understanding Beyond Keywords", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test that vector search can find semantically related content
  // even when the exact keywords don't appear in the document
  const semanticUnderstandingTests = [
    {
      term: "healthcare patient care",
      description:
        "Should find nursing-related forms via semantic understanding",
      expectedCategories: ["Nursing"],
    },
    {
      term: "financial payment billing",
      description:
        "Should find billing-related forms via semantic understanding",
      expectedCategories: ["Billing"],
    },
    {
      term: "regulatory compliance form",
      description:
        "Should find compliance-related forms via semantic understanding",
      expectedCategories: ["Compliance"],
    },
  ];

  for (const test of semanticUnderstandingTests) {
    const results = await searchCatalog(db, test.term);
    assertEquals(
      results.count > 0,
      true,
      `Semantic search for "${test.term}" should return results (${test.description})`,
    );

    // Verify that results include items from expected categories
    const foundCategories = results.hits.map(
      (hit) => (hit.document as { category: string }).category,
    );
    const hasExpectedCategory = test.expectedCategories.some((category) =>
      foundCategories.includes(category)
    );
    assertEquals(
      hasExpectedCategory,
      true,
      `Semantic search for "${test.term}" should find items in categories: ${
        test.expectedCategories.join(", ")
      }. Found categories: ${foundCategories.join(", ")} (${test.description})`,
    );
  }
});

Deno.test("Orama Hybrid Search - Ranking Quality", async () => {
  await ensureWasmBackend();
  const db = await createOrama(testCatalogItems);

  // Test that hybrid search provides better ranking than text-only would
  // Exact matches should rank higher than semantic-only matches
  const rankingTests = [
    {
      term: "Resident",
      description: "Exact text match should rank highest",
      expectedTopResult: "SNF-1062",
    },
    {
      term: "Medicare Denial",
      description: "Exact phrase match should rank highest",
      expectedTopResult: "BU-0375",
    },
    {
      term: "Patient Admission",
      description: "Exact phrase match should rank highest",
      expectedTopResult: "SNF-2001",
    },
  ];

  for (const test of rankingTests) {
    const results = await searchCatalog(db, test.term);
    assertEquals(
      results.count > 0,
      true,
      `Search for "${test.term}" should return results (${test.description})`,
    );

    // The top result should be the one with the best match
    const topResult = results.hits[0].document as { formId: string };
    assertEquals(
      topResult.formId,
      test.expectedTopResult,
      `Search for "${test.term}" should rank ${test.expectedTopResult} as top result (${test.description})`,
    );
  }
});
