import { CatalogFileType } from "#/lib/catalog.ts";

/**
 * File utility functions for handling file types and content types.
 */

export interface FileTypeInfo {
  fileType: CatalogFileType;
  contentType: string;
}

/**
 * Extracts the file extension from a filename.
 * @param filename - The filename to extract extension from
 * @returns The lowercase extension without the dot, or empty string if not found
 */
export function extractExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex !== -1
    ? filename.substring(lastDotIndex + 1).toLowerCase()
    : "";
}

/**
 * Determines the file type and content type from a filename.
 * @param filename - The filename to analyze
 * @returns FileTypeInfo object with fileType and contentType, or null if unsupported
 */
export function getFileTypeInfo(filename: string): FileTypeInfo | null {
  const ext = extractExtension(filename);

  if (ext === "jpg" || ext === "jpeg") {
    return {
      fileType: CatalogFileType.JPG,
      contentType: "image/jpeg",
    };
  } else if (ext === "webp") {
    return {
      fileType: CatalogFileType.WEBP,
      contentType: "image/webp",
    };
  } else if (ext === "pdf") {
    return {
      fileType: CatalogFileType.PDF,
      contentType: "application/pdf",
    };
  }

  return null;
}

/**
 * Validates if a file extension is a supported image type.
 * @param ext - The file extension (without dot)
 * @returns true if the extension is a supported image type
 */
export function isSupportedImageType(ext: string): boolean {
  return ["jpg", "jpeg", "webp"].includes(ext.toLowerCase());
}

/**
 * Validates if a file extension is a supported PDF type.
 * @param ext - The file extension (without dot)
 * @returns true if the extension is PDF
 */
export function isSupportedPdfType(ext: string): boolean {
  return ext.toLowerCase() === "pdf";
}

/**
 * Gets the basename of a file (filename without extension).
 * @param filename - The filename
 * @returns The basename without extension
 */
export function getBasename(filename: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
}
