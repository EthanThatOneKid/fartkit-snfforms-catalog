#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --unstable-kv

/**
 * Database seeder for KV store
 *
 * This script seeds the Deno KV database with catalog items and files
 * from the catalog.json file and associated static files.
 *
 * Usage:
 *   DENO_KV_PATH=./kv.db deno run --allow-read --allow-write --allow-env --unstable-kv cli/seed/main.ts [options]
 *
 * Options:
 *   --catalog <path>     Path to catalog JSON file (default: ./public/catalog.json)
 *   --base-dir <path>    Base directory for files (default: ./public)
 *   --images-dir <path>  Directory for image files (default: <base-dir>/images)
 *   --pdfs-dir <path>    Directory for PDF files (default: <base-dir>/uploaded)
 *   --dry-run            Show what would be done without actually doing it
 *   --help               Show this help message
 */

import { parseArgs as parseCliArgs } from "@std/cli/parse-args";
import { KvCatalogService } from "#/lib/kv.ts";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { CatalogFileType } from "#/lib/catalog.ts";
import { getFileTypeInfo } from "#/lib/file-utils.ts";

interface SeederOptions {
  catalogPath: string;
  imagesDir: string;
  pdfsDir: string;
  kvPath: string | undefined;
  dryRun: boolean;
}

function showHelp(): never {
  console.log(`
Database seeder for KV store

Usage:
  DENO_KV_PATH=./kv.db deno run --allow-read --allow-write --allow-env --unstable-kv cli/seed/main.ts [options]

Options:
  --catalog <path>     Path to catalog JSON file (default: ./public/catalog.json)
  --images-dir <path>  Directory for image files (required)
  --pdfs-dir <path>    Directory for PDF files (required)
  --dry-run            Show what would be done without actually doing it
  --help, -h           Show this help message

Environment Variables:
  DENO_KV_PATH         Path to Deno KV database file (required)
`);
  Deno.exit(0);
}

function parseArgs(): SeederOptions {
  const parsed = parseCliArgs(Deno.args, {
    string: ["catalog", "images-dir", "pdfs-dir"],
    boolean: ["dry-run", "help", "h"],
    alias: {
      "h": "help",
    },
  });

  // Handle help flag
  if (parsed.help || parsed.h) {
    showHelp();
  }

  // Get KV path from environment
  const kvPath = Deno.env.get("DENO_KV_PATH");
  if (!kvPath && !parsed["dry-run"]) {
    console.error(
      "Error: DENO_KV_PATH environment variable is required",
    );
    console.error(
      "Please set it before running the script: DENO_KV_PATH=./kv.db deno run ...",
    );
    Deno.exit(1);
  }

  // Build options
  const imagesDir = parsed["images-dir"] as string | undefined;
  const pdfsDir = parsed["pdfs-dir"] as string | undefined;

  // Validate required options
  if (!imagesDir) {
    console.error("Error: --images-dir is required");
    showHelp();
  }
  if (!pdfsDir) {
    console.error("Error: --pdfs-dir is required");
    showHelp();
  }

  const options: SeederOptions = {
    catalogPath: (parsed.catalog as string | undefined) ||
      "./public/catalog.json",
    imagesDir: imagesDir!,
    pdfsDir: pdfsDir!,
    kvPath,
    dryRun: (parsed["dry-run"] as boolean | undefined) || false,
  };

  return options;
}

async function readCatalogFile(path: string): Promise<CatalogItem[]> {
  try {
    const content = await Deno.readTextFile(path);
    const items = JSON.parse(content) as CatalogItem[];
    console.log(`✓ Read ${items.length} catalog items from ${path}`);
    return items;
  } catch (error) {
    console.error(`✗ Failed to read catalog file: ${path}`, error);
    Deno.exit(1);
  }
}

function extractFilenameFromPath(path: string): string {
  // Extract just the filename from paths like "images/forms/reg/BU-0375_1.jpg"
  // or "uploaded/CDPH-327.pdf" or "/files/FILENAME.jpg"
  const normalized = path.replace(/^\/files\//, ""); // Remove /files/ prefix if present
  const parts = normalized.split("/");
  const filename = parts[parts.length - 1];
  // Normalize filename by trimming whitespace
  return filename.trim();
}

function resolveFilePath(
  previewPath: string,
  imagesDir: string,
  pdfsDir: string,
): string {
  // Handle different path formats:
  // - "images/forms/reg/FILENAME.jpg" -> <imagesDir>/forms/reg/FILENAME.jpg
  // - "uploaded/FILENAME.pdf" -> <pdfsDir>/FILENAME.pdf
  // - "/files/FILENAME.jpg" -> try to find in imagesDir or pdfsDir

  if (previewPath.startsWith("images/")) {
    // Remove "images/" prefix and use imagesDir
    const relativePath = previewPath.replace(/^images\//, "");
    return `${imagesDir}/${relativePath}`;
  } else if (previewPath.startsWith("uploaded/")) {
    // Remove "uploaded/" prefix and use pdfsDir
    const filename = extractFilenameFromPath(previewPath);
    return `${pdfsDir}/${filename}`;
  } else if (previewPath.startsWith("/files/")) {
    // Remove "/files/" prefix and try to find in appropriate directory
    const filename = extractFilenameFromPath(previewPath);
    const fileTypeInfo = getFileTypeInfo(filename);
    if (fileTypeInfo?.fileType === CatalogFileType.PDF) {
      return `${pdfsDir}/${filename}`;
    } else {
      // Try images directory
      return `${imagesDir}/${filename}`;
    }
  } else {
    throw new Error(
      `Unexpected path format: "${previewPath}". Expected paths starting with "images/", "uploaded/", or "/files/"`,
    );
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(
  service: KvCatalogService,
  filePath: string,
  filename: string,
  dryRun: boolean,
): Promise<boolean> {
  const fileTypeInfo = getFileTypeInfo(filename);
  if (!fileTypeInfo) {
    console.warn(`  ⚠ Skipping unsupported file type: ${filename}`);
    return false;
  }

  if (!(await fileExists(filePath))) {
    console.warn(`  ⚠ File not found: ${filePath}`);
    return false;
  }

  if (dryRun) {
    console.log(
      `  [DRY RUN] Would upload: ${filename} (${fileTypeInfo.fileType})`,
    );
    return true;
  }

  try {
    const fileData = await Deno.readFile(filePath);
    await service.setFile(fileTypeInfo.fileType, filename, fileData);
    console.log(
      `  ✓ Uploaded: ${filename} (${fileTypeInfo.fileType}, ${fileData.length} bytes)`,
    );
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to upload ${filename}:`, error);
    return false;
  }
}

async function processCatalogItem(
  service: KvCatalogService,
  item: CatalogItem,
  imagesDir: string,
  pdfsDir: string,
  dryRun: boolean,
  uploadedFiles: Set<string>,
): Promise<{ uploaded: number; skipped: number }> {
  console.log(`\nProcessing item: ${item.formId}`);
  let uploaded = 0;
  let skipped = 0;

  // Process preview images
  for (const preview of item.previews) {
    if (preview.src) {
      try {
        const filePath = resolveFilePath(
          preview.src,
          imagesDir,
          pdfsDir,
        );
        const filename = extractFilenameFromPath(preview.src);
        // Skip if already uploaded
        if (uploadedFiles.has(filename)) {
          continue;
        }
        const success = await uploadFile(service, filePath, filename, dryRun);
        if (success) {
          uploadedFiles.add(filename);
          uploaded++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`  ✗ Error processing ${preview.src}:`, error);
        skipped++;
      }
    }

    // Process PDF files linked to previews
    if (preview.pdf) {
      try {
        const filePath = resolveFilePath(
          preview.pdf,
          imagesDir,
          pdfsDir,
        );
        const filename = extractFilenameFromPath(preview.pdf);
        // Skip if already uploaded
        if (uploadedFiles.has(filename)) {
          continue;
        }
        const success = await uploadFile(service, filePath, filename, dryRun);
        if (success) {
          uploadedFiles.add(filename);
          uploaded++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`  ✗ Error processing ${preview.pdf}:`, error);
        skipped++;
      }
    }
  }

  return { uploaded, skipped };
}

async function main() {
  const options = parseArgs();

  console.log("=== KV Database Seeder ===\n");
  console.log("Configuration:");
  console.log(`  Catalog file: ${options.catalogPath}`);
  console.log(`  Images directory: ${options.imagesDir}`);
  console.log(`  PDFs directory: ${options.pdfsDir}`);
  console.log(
    `  KV database: ${options.kvPath || "not set (dry run mode)"}`,
  );
  console.log(`  Dry run: ${options.dryRun ? "Yes" : "No"}\n`);

  // Open KV database
  let kv: Deno.Kv | null = null;
  if (!options.dryRun && options.kvPath) {
    kv = await Deno.openKv(options.kvPath);
    console.log(`✓ Opened KV database at ${options.kvPath}\n`);
  } else if (options.dryRun) {
    console.log("⚠ Running in dry-run mode (no changes will be made)\n");
  }

  // Read catalog items
  const catalogItems = await readCatalogFile(options.catalogPath);

  if (catalogItems.length === 0) {
    console.warn("⚠ No catalog items found. Exiting.");
    if (kv) kv.close();
    Deno.exit(0);
  }

  // Initialize service (only if not dry run)
  const service = kv ? new KvCatalogService(kv) : null;

  // Track uploaded files to avoid duplicates
  const uploadedFiles = new Set<string>();

  // Process each catalog item and upload files
  let filesUploaded = 0;
  let filesSkipped = 0;

  for (const item of catalogItems) {
    if (service) {
      const result = await processCatalogItem(
        service,
        item,
        options.imagesDir,
        options.pdfsDir,
        options.dryRun,
        uploadedFiles,
      );
      filesUploaded += result.uploaded;
      filesSkipped += result.skipped;
    } else {
      // Dry run mode - just simulate
      console.log(`\n[DRY RUN] Would process item: ${item.formId}`);
      for (const preview of item.previews) {
        if (preview.src) {
          const filename = extractFilenameFromPath(preview.src);
          // Skip if already processed
          if (uploadedFiles.has(filename)) {
            continue;
          }
          try {
            const filePath = resolveFilePath(
              preview.src,
              options.imagesDir,
              options.pdfsDir,
            );
            if (await fileExists(filePath)) {
              console.log(`  [DRY RUN] Would upload: ${filename}`);
              uploadedFiles.add(filename);
              filesUploaded++;
            } else {
              console.log(`  [DRY RUN] Would skip (not found): ${filename}`);
              filesSkipped++;
            }
          } catch (error) {
            console.error(`  ✗ Error processing ${preview.src}:`, error);
            filesSkipped++;
          }
        }
        if (preview.pdf) {
          const filename = extractFilenameFromPath(preview.pdf);
          // Skip if already processed
          if (uploadedFiles.has(filename)) {
            continue;
          }
          try {
            const filePath = resolveFilePath(
              preview.pdf,
              options.imagesDir,
              options.pdfsDir,
            );
            if (await fileExists(filePath)) {
              console.log(`  [DRY RUN] Would upload: ${filename}`);
              uploadedFiles.add(filename);
              filesUploaded++;
            } else {
              console.log(`  [DRY RUN] Would skip (not found): ${filename}`);
              filesSkipped++;
            }
          } catch (error) {
            console.error(`  ✗ Error processing ${preview.pdf}:`, error);
            filesSkipped++;
          }
        }
      }
    }
  }

  console.log(`\nFile upload summary:`);
  console.log(`  Uploaded: ${filesUploaded}`);
  if (filesSkipped > 0) {
    console.log(`  Skipped: ${filesSkipped}`);
  }

  // Upload catalog items to KV (stored individually)
  if (options.dryRun) {
    console.log(
      `\n[DRY RUN] Would upload ${catalogItems.length} catalog items to KV (as individual entries)`,
    );
  } else if (service) {
    try {
      await service.setItems(catalogItems);
      console.log(
        `\n✓ Uploaded ${catalogItems.length} catalog items to KV (as individual entries)`,
      );
    } catch (error) {
      console.error("\n✗ Failed to upload catalog items:", error);
      if (kv) kv.close();
      Deno.exit(1);
    }
  }

  console.log("\n=== Seeding Complete ===");

  // Close KV connection
  if (kv) kv.close();
}

if (import.meta.main) {
  await main();
}
