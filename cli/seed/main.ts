#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net --unstable --unstable-kvcls

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
 *   --images-dir <path>  Directory for image files (required)
 *   --pdfs-dir <path>    Directory for PDF files (required)
 *   --dry-run            Show what would be done without actually doing it
 *   --help               Show this help message
 */

import { parseArgs as parseCliArgs } from "@std/cli/parse-args";
import { ProgressBar } from "@std/cli/unstable-progress-bar";
import { KvCatalogService } from "#/lib/kv.ts";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { getFileTypeInfo } from "#/lib/file-utils.ts";
import { CatalogFileType } from "#/lib/catalog.ts";
import { createOrama } from "#/lib/orama.ts";

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
  DENO_KV_PATH         Path to Deno KV database file (optional, uses default if not set)
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

  // Get KV path from environment (optional - uses default if not set)
  const kvPath = Deno.env.get("DENO_KV_PATH");

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
  // Extract just the filename from any path format
  // Handles: "/api/files/", "images/forms/reg/", "uploaded/", etc.
  const parts = path.split("/");
  const filename = parts[parts.length - 1];
  // Normalize filename by trimming whitespace
  return filename.trim();
}

function resolveFilePath(
  previewPath: string,
  imagesDir: string,
  pdfsDir: string,
): string {
  // Resolve file path from catalog.json (may have legacy formats)
  // Handles: "/api/files/", "images/forms/reg/", "uploaded/"
  const filename = extractFilenameFromPath(previewPath);
  const fileTypeInfo = getFileTypeInfo(filename);

  if (fileTypeInfo?.fileType === CatalogFileType.PDF) {
    return `${pdfsDir}/${filename}`;
  } else {
    // Assume images go in imagesDir/forms/reg/
    return `${imagesDir}/forms/reg/${filename}`;
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

async function scanThumbsDirectory(thumbsDir: string): Promise<string[]> {
  const webpFiles: string[] = [];

  try {
    // Check if directory exists
    const dirInfo = await Deno.stat(thumbsDir);
    if (!dirInfo.isDirectory) {
      return webpFiles;
    }

    // Read directory and filter for .webp files
    for await (const entry of Deno.readDir(thumbsDir)) {
      if (entry.isFile && entry.name.toLowerCase().endsWith(".webp")) {
        webpFiles.push(entry.name);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read - return empty array
    if (error instanceof Deno.errors.NotFound) {
      return webpFiles;
    }
    throw error;
  }

  return webpFiles;
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
): Promise<{ uploaded: number; skipped: number; item: CatalogItem }> {
  console.log(`\nProcessing item: ${item.formId}`);
  let uploaded = 0;
  let skipped = 0;

  // Create a copy of the item to update paths
  const updatedItem: CatalogItem = {
    ...item,
    previews: item.previews.map((preview) => ({ ...preview })),
  };

  // Process preview images
  for (let i = 0; i < item.previews.length; i++) {
    const preview = item.previews[i];
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
          // Update path to new format even if file was already uploaded
          updatedItem.previews[i].src = `/api/files/${filename}`;
          continue;
        }
        const success = await uploadFile(service, filePath, filename, dryRun);
        if (success) {
          uploadedFiles.add(filename);
          uploaded++;
          // Update path to new format
          updatedItem.previews[i].src = `/api/files/${filename}`;
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
          // Update path to new format even if file was already uploaded
          updatedItem.previews[i].pdf = `/api/files/${filename}`;
          continue;
        }
        const success = await uploadFile(service, filePath, filename, dryRun);
        if (success) {
          uploadedFiles.add(filename);
          uploaded++;
          // Update path to new format
          updatedItem.previews[i].pdf = `/api/files/${filename}`;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`  ✗ Error processing ${preview.pdf}:`, error);
        skipped++;
      }
    }
  }

  return { uploaded, skipped, item: updatedItem };
}

async function main() {
  const options = parseArgs();

  console.log("=== KV Database Seeder ===\n");
  console.log("Configuration:");
  console.log(`  Catalog file: ${options.catalogPath}`);
  console.log(`  Images directory: ${options.imagesDir}`);
  console.log(`  PDFs directory: ${options.pdfsDir}`);
  console.log(
    `  KV database: ${options.kvPath || "default (current directory)"}`,
  );
  console.log(`  Dry run: ${options.dryRun ? "Yes" : "No"}\n`);

  // Open KV database
  let kv: Deno.Kv | null = null;
  if (!options.dryRun) {
    kv = await Deno.openKv(options.kvPath);
    console.log(
      `✓ Opened KV database${
        options.kvPath ? ` at ${options.kvPath}` : " (default location)"
      }\n`,
    );
  } else {
    console.log("⚠ Running in dry-run mode (no changes will be made)\n");
  }

  // Read catalog items
  const catalogItems = await readCatalogFile(options.catalogPath);

  if (catalogItems.length === 0) {
    console.warn("⚠ No catalog items found. Exiting.");
    if (kv) kv.close();
    Deno.exit(0);
  }

  // Clear the KV database before seeding
  if (kv && !options.dryRun) {
    console.log("Clearing existing KV database...");
    const allEntries = await Array.fromAsync(kv.list({ prefix: [] }));
    for (const entry of allEntries) {
      await kv.delete(entry.key);
    }
    console.log(`✓ Cleared ${allEntries.length} existing entries\n`);
  } else if (options.dryRun) {
    console.log("[DRY RUN] Would clear existing KV database\n");
  }

  // Initialize service (only if not dry run)
  const service = kv ? new KvCatalogService(kv) : null;

  // Track uploaded files to avoid duplicates
  const uploadedFiles = new Set<string>();

  // Process each catalog item and upload files
  let filesUploaded = 0;
  let filesSkipped = 0;
  const updatedCatalogItems: CatalogItem[] = [];

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
      updatedCatalogItems.push(result.item);
    } else {
      // Dry run mode - just simulate
      console.log(`\n[DRY RUN] Would process item: ${item.formId}`);
      const updatedItem: CatalogItem = {
        ...item,
        previews: item.previews.map((preview) => ({ ...preview })),
      };

      for (let i = 0; i < item.previews.length; i++) {
        const preview = item.previews[i];
        if (preview.src) {
          const filename = extractFilenameFromPath(preview.src);
          // Skip if already processed
          if (uploadedFiles.has(filename)) {
            updatedItem.previews[i].src = `/api/files/${filename}`;
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
              updatedItem.previews[i].src = `/api/files/${filename}`;
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
            updatedItem.previews[i].pdf = `/api/files/${filename}`;
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
              updatedItem.previews[i].pdf = `/api/files/${filename}`;
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
      updatedCatalogItems.push(updatedItem);
    }
  }

  // Upload webp thumbnail files from thumbs directory
  const thumbsDir = `${options.imagesDir}/forms/thumbs`;
  console.log(`\nProcessing webp thumbnails from: ${thumbsDir}`);

  try {
    const thumbsFiles = await scanThumbsDirectory(thumbsDir);
    console.log(`  Found ${thumbsFiles.length} webp files`);

    for (const filename of thumbsFiles) {
      if (uploadedFiles.has(filename)) {
        continue; // Skip if already uploaded
      }

      const filePath = `${thumbsDir}/${filename}`;

      if (service) {
        const success = await uploadFile(
          service,
          filePath,
          filename,
          options.dryRun,
        );
        if (success) {
          uploadedFiles.add(filename);
          filesUploaded++;
        } else {
          filesSkipped++;
        }
      } else {
        // Dry run mode
        if (await fileExists(filePath)) {
          console.log(`  [DRY RUN] Would upload thumbnail: ${filename}`);
          uploadedFiles.add(filename);
          filesUploaded++;
        } else {
          console.log(`  [DRY RUN] Would skip (not found): ${filename}`);
          filesSkipped++;
        }
      }
    }
  } catch (error) {
    console.warn(`  ⚠ Could not process thumbs directory: ${error}`);
  }

  console.log(`\nFile upload summary:`);
  console.log(`  Uploaded: ${filesUploaded}`);
  if (filesSkipped > 0) {
    console.log(`  Skipped: ${filesSkipped}`);
  }

  // Upload catalog items to KV (stored individually) with normalized paths
  const itemsToUpload = updatedCatalogItems.length > 0
    ? updatedCatalogItems
    : catalogItems;
  if (options.dryRun) {
    console.log(
      `\n[DRY RUN] Would upload ${itemsToUpload.length} catalog items to KV (as individual entries)`,
    );
    console.log(
      `[DRY RUN] Would pre-generate Orama search index with embeddings`,
    );
  } else if (service) {
    try {
      // First, upload the catalog items
      await service.setItems(itemsToUpload);
      console.log(
        `\n✓ Uploaded ${itemsToUpload.length} catalog items to KV (as individual entries)`,
      );

      // Pre-generate and save the Orama search index with embeddings
      // This ensures the index is ready to load from KV without needing network access
      // The TensorFlow model will be downloaded and cached during this process
      console.log("\nPre-generating Orama search index with embeddings...");
      console.log(
        "  (This may take a moment as the TensorFlow model is loaded and embeddings are generated)",
      );
      console.log(
        "  Note: The TensorFlow model will be downloaded from Google Cloud Storage and cached locally",
      );

      // Create progress bar for embedding generation
      const progressBar = new ProgressBar({
        max: itemsToUpload.length,
        formatter: (fmt) =>
          `Generating embeddings: ${fmt.value}/${fmt.max} items (${
            Math.round((fmt.value / fmt.max) * 100)
          }%)`,
      });

      const startTime = performance.now();
      const oramaIndex = await createOrama(
        itemsToUpload,
        (current, _total) => {
          progressBar.value = current;
        },
      );
      progressBar.stop();
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // Save the index to KV storage
      await service.saveOramaIndexToKv(oramaIndex);

      console.log(
        `✓ Pre-generated and saved Orama search index (took ${duration}s)`,
      );
      console.log(
        `  Index is now persisted in KV and ready to load from cache`,
      );
      console.log(
        `  The TensorFlow model has been cached and will load from cache on server startup`,
      );
    } catch (error) {
      console.error(
        "\n✗ Failed to upload catalog items or generate index:",
        error,
      );
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
