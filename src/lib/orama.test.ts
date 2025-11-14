import { assertEquals, assertExists } from "@std/assert";
import { createOrama, searchCatalog } from "./orama.ts";
import catalogData from "./catalog.sample.json" with {
  type: "json",
};

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
        src: "images/forms/reg/SNF-1062_1.jpg",
        alt: "Resident's Clothing & Possessions: SNF-1062 (1)",
        pdf: "uploaded/SNF-1062.pdf",
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
        src: "images/forms/reg/BU-0375_1.jpg",
        alt: "Medicare Denial of Benefits Notice: BU-0375 (1)",
        pdf: "uploaded/BU-0375.pdf",
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
];

Deno.test("Orama Search - Basic Functionality", async () => {
  const db = await createOrama(testCatalogItems);

  // Test basic search
  const results = await searchCatalog(db, "Resident");
  assertEquals(results.count, 1);
  assertEquals(results.hits[0].document.formId, "SNF-1062");
});

Deno.test("Orama Search - Form ID Variations", async () => {
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
      results.hits[0].document.formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - BU Form Variations", async () => {
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
      results.hits[0].document.formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - CDPH Form Variations", async () => {
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
      results.hits[0].document.formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - Description Search", async () => {
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
      results.hits[0].document.formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - Category Search", async () => {
  const db = await createOrama(testCatalogItems);

  // Test category-based searches
  const testCases = [
    { term: "Nursing", expectedCount: 1, expectedFormId: "SNF-1062" },
    { term: "Billing", expectedCount: 1, expectedFormId: "BU-0375" },
    { term: "Compliance", expectedCount: 1, expectedFormId: "CDPH-327" },
  ];

  for (const testCase of testCases) {
    const results = await searchCatalog(db, testCase.term);
    assertEquals(
      results.count,
      testCase.expectedCount,
      `Search for "${testCase.term}" should return ${testCase.expectedCount} result(s)`,
    );
    assertEquals(
      results.hits[0].document.formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - Case Insensitive", async () => {
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
      results.hits[0].document.formId,
      testCase.expectedFormId,
      `Search for "${testCase.term}" should find ${testCase.expectedFormId}`,
    );
  }
});

Deno.test("Orama Search - No Results", async () => {
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
    results.hits[0].document.formId,
    "SNF-1062",
    "Search for '1062' should find SNF-1062",
  );

  // Verify the found item has the expected properties
  const foundItem = results.hits[0].document;
  assertEquals(foundItem.description, "Resident's Clothing & Possessions");
  assertEquals(foundItem.category, "Nursing");
});

Deno.test("Orama Search - Performance Test", async () => {
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
  const db = await createOrama(testCatalogItems);

  // Test edge cases
  const testCases = [
    { term: "", expectedCount: 0 }, // Empty string
    { term: " ", expectedCount: 0 }, // Whitespace only
    { term: "106", expectedCount: 1 }, // Partial number (matches SNF-1062 in test dataset)
    { term: "SNF", expectedCount: 1 }, // Prefix only
    { term: "BU", expectedCount: 1 }, // Prefix only
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
