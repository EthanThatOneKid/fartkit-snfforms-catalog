#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --unstable-kv

/**
 * Database seeder for KV store
 *
 * This script seeds the Deno KV database with catalog items and files
 * from local JSON files and file directories.
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-env --unstable-kv cli/seed-kv/main.ts [options]
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

interface SeederOptions {
  catalogPath: string;
  baseDir: string;
  imagesDir: string;
  pdfsDir: string;
  kvPath: string | undefined;
  dryRun: boolean;
}

function showHelp(): never {
  console.log(`
Database seeder for KV store

Usage:
  deno run --allow-read --allow-write --allow-env --unstable-kv cli/seed-kv/main.ts [options]

Options:
  --catalog <path>     Path to catalog JSON file (default: ./public/catalog.json)
  --base-dir <path>    Base directory for files (default: ./public)
  --images-dir <path>  Directory for image files (default: <base-dir>/images)
  --pdfs-dir <path>    Directory for PDF files (default: <base-dir>/uploaded)
  --kv-path <path>     Path to Deno KV database file (default: uses default KV location)
  --dry-run            Show what would be done without actually doing it
  --help, -h           Show this help message
`);
  Deno.exit(0);
}

function parseArgs(): SeederOptions {
  const parsed = parseCliArgs(Deno.args, {
    string: ["catalog", "base-dir", "images-dir", "pdfs-dir", "kv-path"],
    boolean: ["dry-run", "help", "h"],
    alias: {
      "h": "help",
    },
  });

  // Handle help flag
  if (parsed.help || parsed.h) {
    showHelp();
  }

  // Build options with defaults
  const options: SeederOptions = {
    catalogPath: (parsed.catalog as string | undefined) ||
      "./public/catalog.json",
    baseDir: (parsed["base-dir"] as string | undefined) || "./public",
    imagesDir: (parsed["images-dir"] as string | undefined) || "",
    pdfsDir: (parsed["pdfs-dir"] as string | undefined) || "",
    kvPath: (parsed["kv-path"] as string | undefined),
    dryRun: (parsed["dry-run"] as boolean | undefined) || false,
  };

  // Set defaults for directories if not specified
  if (!options.imagesDir) {
    options.imagesDir = `${options.baseDir}/images`;
  }
  if (!options.pdfsDir) {
    options.pdfsDir = `${options.baseDir}/uploaded`;
  }

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
  // or "uploaded/CDPH-327.pdf"
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function resolveFilePath(
  previewPath: string,
  baseDir: string,
  imagesDir: string,
  pdfsDir: string,
): string | null {
  // Handle different path formats:
  // - "images/forms/reg/FILENAME.jpg" -> <imagesDir>/forms/reg/FILENAME.jpg
  // - "uploaded/FILENAME.pdf" -> <pdfsDir>/FILENAME.pdf
  // - Absolute paths or paths relative to baseDir

  if (previewPath.startsWith("images/")) {
    // Remove "images/" prefix and use imagesDir
    const relativePath = previewPath.replace(/^images\//, "");
    return `${imagesDir}/${relativePath}`;
  } else if (previewPath.startsWith("uploaded/")) {
    // Remove "uploaded/" prefix and use pdfsDir
    const filename = extractFilenameFromPath(previewPath);
    return `${pdfsDir}/${filename}`;
  } else if (previewPath.startsWith("/")) {
    // Absolute path
    return previewPath;
  } else {
    // Try relative to baseDir
    return `${baseDir}/${previewPath}`;
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

function getFileType(filename: string): CatalogFileType | null {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return CatalogFileType.JPG;
    case "webp":
      return CatalogFileType.WEBP;
    case "pdf":
      return CatalogFileType.PDF;
    default:
      return null;
  }
}

async function uploadFile(
  service: KvCatalogService,
  filePath: string,
  filename: string,
  dryRun: boolean,
): Promise<boolean> {
  const fileType = getFileType(filename);
  if (!fileType) {
    console.warn(`  ⚠ Skipping unsupported file type: ${filename}`);
    return false;
  }

  if (!(await fileExists(filePath))) {
    console.warn(`  ⚠ File not found: ${filePath}`);
    return false;
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would upload: ${filename} (${fileType})`);
    return true;
  }

  try {
    const fileData = await Deno.readFile(filePath);
    await service.setFile(fileType, filename, fileData);
    console.log(
      `  ✓ Uploaded: ${filename} (${fileType}, ${fileData.length} bytes)`,
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
  baseDir: string,
  imagesDir: string,
  pdfsDir: string,
  dryRun: boolean,
): Promise<{ uploaded: number; skipped: number }> {
  console.log(`\nProcessing item: ${item.formId}`);
  let uploaded = 0;
  let skipped = 0;

  // Process preview images
  for (const preview of item.previews) {
    if (preview.src) {
      const filePath = resolveFilePath(
        preview.src,
        baseDir,
        imagesDir,
        pdfsDir,
      );
      if (filePath) {
        const filename = extractFilenameFromPath(preview.src);
        const success = await uploadFile(service, filePath, filename, dryRun);
        if (success) {
          uploaded++;
        } else {
          skipped++;
        }
      }
    }

    // Process PDF files linked to previews
    if (preview.pdf) {
      const filePath = resolveFilePath(
        preview.pdf,
        baseDir,
        imagesDir,
        pdfsDir,
      );
      if (filePath) {
        const filename = extractFilenameFromPath(preview.pdf);
        const success = await uploadFile(service, filePath, filename, dryRun);
        if (success) {
          uploaded++;
        } else {
          skipped++;
        }
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
  console.log(`  Base directory: ${options.baseDir}`);
  console.log(`  Images directory: ${options.imagesDir}`);
  console.log(`  PDFs directory: ${options.pdfsDir}`);
  console.log(
    `  KV database: ${options.kvPath || "default location"}`,
  );
  console.log(`  Dry run: ${options.dryRun ? "Yes" : "No"}\n`);

  // Open KV database
  const kv = await Deno.openKv(options.kvPath);
  console.log(
    `✓ Opened KV database${options.kvPath ? ` at ${options.kvPath}` : ""}\n`,
  );

  // Read catalog items
  const catalogItems = await readCatalogFile(options.catalogPath);

  if (catalogItems.length === 0) {
    console.warn("⚠ No catalog items found. Exiting.");
    kv.close();
    Deno.exit(0);
  }

  // Initialize service
  const service = new KvCatalogService(kv);

  // Process each catalog item and upload files
  let filesUploaded = 0;
  let filesSkipped = 0;

  for (const item of catalogItems) {
    const result = await processCatalogItem(
      service,
      item,
      options.baseDir,
      options.imagesDir,
      options.pdfsDir,
      options.dryRun,
    );
    filesUploaded += result.uploaded;
    filesSkipped += result.skipped;
  }

  console.log(`\nFile upload summary:`);
  console.log(`  Uploaded: ${filesUploaded}`);
  if (filesSkipped > 0) {
    console.log(`  Skipped: ${filesSkipped}`);
  }

  // Upload catalog items to KV
  if (options.dryRun) {
    console.log(
      `\n[DRY RUN] Would upload ${catalogItems.length} catalog items to KV`,
    );
  } else {
    try {
      await service.setItems(catalogItems);
      console.log(`\n✓ Uploaded ${catalogItems.length} catalog items to KV`);
    } catch (error) {
      console.error("\n✗ Failed to upload catalog items:", error);
      Deno.exit(1);
    }
  }

  console.log("\n=== Seeding Complete ===");

  // Close KV connection
  kv.close();
}

if (import.meta.main) {
  await main();
}
