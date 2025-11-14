import { assertEquals, assertExists } from "@std/assert";
import { KvCatalogService } from "#/lib/kv.ts";
import { CatalogFileType } from "#/lib/catalog.ts";
import type { CatalogItem } from "#/lib/snfforms.ts";

/**
 * Test the CLI seeder with a local KV database file
 */
Deno.test("CLI Seeder - Local KV Database", async (t) => {
  // Create a temporary directory for the test KV database
  const testKvPath = await Deno.makeTempDir({ prefix: "test-kv-" });
  const kvPath = `${testKvPath}/kv.db`;

  // Create a temporary directory for test files
  const testFilesDir = await Deno.makeTempDir({ prefix: "test-files-" });
  const catalogPath = `${testFilesDir}/catalog.json`;
  const imagesDir = `${testFilesDir}/images/forms/reg`;
  const pdfsDir = `${testFilesDir}/uploaded`;

  // Create directory structure
  await Deno.mkdir(imagesDir, { recursive: true });
  await Deno.mkdir(pdfsDir, { recursive: true });

  // Create a minimal test catalog
  const testCatalog: CatalogItem[] = [
    {
      formId: "TEST-001",
      description: "Test Form 1",
      size: "8-1/2 x 11",
      paper: "Bond",
      color: "White",
      sides: "1",
      unit: "Each",
      category: "Test",
      previews: [
        {
          src: "images/forms/reg/TEST-001_1.jpg",
          alt: "Test Form 1: TEST-001 (1)",
        },
      ],
    },
    {
      formId: "TEST-002",
      description: "Test Form 2",
      size: "8-1/2 x 11",
      paper: "Bond",
      color: "White",
      sides: "1",
      unit: "Each",
      category: "Test",
      previews: [
        {
          src: "images/forms/reg/TEST-002_1.jpg",
          alt: "Test Form 2: TEST-002 (1)",
          pdf: "uploaded/TEST-002.pdf",
        },
      ],
    },
  ];

  // Write test catalog JSON
  await Deno.writeTextFile(catalogPath, JSON.stringify(testCatalog, null, 2));

  // Create test image files (minimal valid JPEG)
  // JPEG file header: FF D8 FF E0
  const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
  await Deno.writeFile(`${imagesDir}/TEST-001_1.jpg`, jpegHeader);
  await Deno.writeFile(`${imagesDir}/TEST-002_1.jpg`, jpegHeader);

  // Create test PDF file (minimal valid PDF)
  const pdfContent = new TextEncoder().encode(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
  );
  await Deno.writeFile(`${pdfsDir}/TEST-002.pdf`, pdfContent);

  await t.step(
    "should seed catalog items and files to local KV database",
    async () => {
      // Run the seeder script
      const command = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-read",
          "--allow-write",
          "--allow-env",
          "--unstable-kv",
          "cli/seed-kv/main.ts",
          "--catalog",
          catalogPath,
          "--base-dir",
          testFilesDir,
          "--images-dir",
          `${testFilesDir}/images`,
          "--pdfs-dir",
          pdfsDir,
          "--kv-path",
          kvPath,
        ],
        cwd: Deno.cwd(),
      });

      const { code, stdout, stderr } = await command.output();
      const output = new TextDecoder().decode(stdout);
      const errorOutput = new TextDecoder().decode(stderr);

      // Check that the command succeeded
      assertEquals(
        code,
        0,
        `Seeder failed with code ${code}. Error: ${errorOutput}`,
      );

      // Verify output contains expected messages
      assertEquals(
        output.includes("✓ Read 2 catalog items"),
        true,
        "Should read 2 catalog items",
      );
      assertEquals(
        output.includes("✓ Uploaded"),
        true,
        "Should upload files",
      );
      assertEquals(
        output.includes("✓ Uploaded 2 catalog items to KV"),
        true,
        "Should upload catalog items to KV",
      );

      // Verify data was written to KV
      const kv = await Deno.openKv(kvPath);
      const service = new KvCatalogService(kv);

      try {
        // Check catalog items
        const items = await service.getItems();
        assertExists(items, "Catalog items should exist");
        assertEquals(items.length, 2, "Should have 2 catalog items");
        assertEquals(
          items[0].formId,
          "TEST-001",
          "First item should be TEST-001",
        );
        assertEquals(
          items[1].formId,
          "TEST-002",
          "Second item should be TEST-002",
        );

        // Check that files were uploaded
        const test001Image = await service.getFile(
          CatalogFileType.JPG,
          "TEST-001_1.jpg",
        );
        assertExists(test001Image, "TEST-001_1.jpg should exist in KV");
        assertEquals(test001Image.length, 4, "Image should have correct size");

        const test002Image = await service.getFile(
          CatalogFileType.JPG,
          "TEST-002_1.jpg",
        );
        assertExists(test002Image, "TEST-002_1.jpg should exist in KV");

        const test002Pdf = await service.getFile(
          CatalogFileType.PDF,
          "TEST-002.pdf",
        );
        assertExists(test002Pdf, "TEST-002.pdf should exist in KV");
        assertEquals(
          test002Pdf.length > 0,
          true,
          "PDF should have content",
        );
      } finally {
        kv.close();
      }
    },
  );

  await t.step("should support dry-run mode", async () => {
    // Run the seeder script in dry-run mode
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        "--unstable-kv",
        "cli/seed-kv/main.ts",
        "--catalog",
        catalogPath,
        "--base-dir",
        testFilesDir,
        "--images-dir",
        `${testFilesDir}/images`,
        "--pdfs-dir",
        pdfsDir,
        "--kv-path",
        `${testKvPath}/kv-dryrun.db`,
        "--dry-run",
      ],
      cwd: Deno.cwd(),
    });

    const { code, stdout } = await command.output();
    const output = new TextDecoder().decode(stdout);

    // Check that the command succeeded
    assertEquals(code, 0, "Dry-run should succeed");

    // Verify output contains dry-run indicators
    assertEquals(
      output.includes("[DRY RUN]"),
      true,
      "Should contain dry-run indicators",
    );
    assertEquals(
      output.includes("Would upload"),
      true,
      "Should indicate what would be uploaded",
    );

    // Verify no data was written (dry-run)
    const kv = await Deno.openKv(`${testKvPath}/kv-dryrun.db`);
    const service = new KvCatalogService(kv);

    try {
      const items = await service.getItems();
      // Items should be undefined or empty (no data written in dry-run)
      assertEquals(
        items === undefined || items.length === 0,
        true,
        "Dry-run should not write data",
      );
    } finally {
      kv.close();
    }
  });

  // Cleanup
  await Deno.remove(testKvPath, { recursive: true });
  await Deno.remove(testFilesDir, { recursive: true });
});
