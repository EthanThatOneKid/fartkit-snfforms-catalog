import { kv, KvCatalogService } from "#/lib/kv.ts";
import { getFileTypeInfo } from "#/lib/file-utils.ts";

const catalogService = new KvCatalogService(kv);

export async function tryServeFileFromKv(
  pathname: string,
): Promise<Response | null> {
  let filename: string | undefined;

  // Handle /images/ paths (for images and thumbnails)
  if (pathname.startsWith("/images/")) {
    const pathAfterImages = pathname.replace(/^\/images\//, "");
    if (!pathAfterImages) {
      return null;
    }
    // Extract just the filename from the path
    filename = pathAfterImages.split("/").pop();
  } // Handle /uploaded/ paths (for PDFs)
  else if (pathname.startsWith("/uploaded/")) {
    filename = pathname.replace(/^\/uploaded\//, "");
  } // Not a path we handle
  else {
    return null;
  }

  if (!filename) {
    return null;
  }

  const normalizedFilename = filename.trim();
  const fileTypeInfo = getFileTypeInfo(normalizedFilename);
  if (!fileTypeInfo) {
    return null;
  }

  let { fileType, contentType } = fileTypeInfo;
  let fileData = await catalogService.getFile(fileType, normalizedFilename);

  // If .webp file not found, try the .jpg version (for thumbnails)
  if (!fileData && normalizedFilename.endsWith(".webp")) {
    const jpgFilename = normalizedFilename.replace(/\.webp$/i, ".jpg");
    const jpgFileTypeInfo = getFileTypeInfo(jpgFilename);
    if (jpgFileTypeInfo) {
      fileData = await catalogService.getFile(
        jpgFileTypeInfo.fileType,
        jpgFilename,
      );
      if (fileData) {
        // Use the JPG file type and content type
        fileType = jpgFileTypeInfo.fileType;
        contentType = jpgFileTypeInfo.contentType;
      }
    }
  }

  if (!fileData) {
    return null; // File not in KV, let static route handle it
  }

  return new Response(new Uint8Array(fileData), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
