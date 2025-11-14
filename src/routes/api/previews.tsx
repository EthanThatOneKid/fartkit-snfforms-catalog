import { Delete, Post, Router } from "@fartlabs/rtx";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import { CatalogFileType } from "#/lib/catalog.ts";
import {
  createAuthErrorResponse,
  extractPasswordFromFormData,
  verifyAdminPassword,
} from "#/lib/auth.ts";
import { errorResponse, successResponse } from "#/lib/responses.ts";
import {
  extractExtension,
  getBasename,
  getFileTypeInfo,
  isSupportedImageType,
  isSupportedPdfType,
} from "#/lib/file-utils.ts";

const catalogService = new KvCatalogService(kv);

// File size limit (10MB per file)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function PreviewsApiRoute() {
  return (
    <Router>
      <Post
        pattern="/edit/:formId/previews"
        handler={async (ctx) => {
          const formId = ctx.params?.pathname.groups.formId;
          if (!formId) {
            return errorResponse("Form ID is required", 400);
          }

          const formData = await ctx.request.formData();
          const password = extractPasswordFromFormData(formData);
          if (!verifyAdminPassword(password)) {
            return createAuthErrorResponse();
          }

          const imageFiles = formData.getAll("image-files") as File[];
          const pdfFiles = formData.getAll("pdf-files") as File[];

          if (imageFiles.length === 0) {
            return errorResponse("No image files provided", 400);
          }

          // Validate file sizes
          const allFiles = [...imageFiles, ...pdfFiles];
          for (const file of allFiles) {
            if (file.size > MAX_FILE_SIZE) {
              return errorResponse(
                `File ${file.name} is too large. Maximum size is 10MB.`,
                400,
              );
            }
          }

          const catalogItems = (await catalogService.getItems()) ?? [];
          const item = catalogItems.find((item) => item.formId === formId);
          if (!item) {
            return errorResponse("Item not found", 404);
          }

          const newPreviews = [...item.previews];

          // Process image files first
          for (const file of imageFiles) {
            const filename = file.name.trim(); // Normalize filename by trimming whitespace
            const ext = extractExtension(filename);
            const data = new Uint8Array(await file.arrayBuffer());

            // Validate file extension for images
            if (!ext || !isSupportedImageType(ext)) {
              return errorResponse(
                `File ${filename} has an unsupported image file type. Only .jpg, .jpeg, and .webp are allowed.`,
                400,
              );
            }

            let fileType: CatalogFileType;
            if (ext === "jpg" || ext === "jpeg") {
              fileType = CatalogFileType.JPG;
            } else {
              fileType = CatalogFileType.WEBP;
            }

            await catalogService.setFile(fileType, filename, data);

            newPreviews.push({
              src: `images/forms/reg/${filename}`,
              alt: `${formId} preview`,
            });
          }

          // Process PDF files (fixed: moved outside image loop)
          for (const file of pdfFiles) {
            const filename = file.name.trim(); // Normalize filename by trimming whitespace
            const ext = extractExtension(filename);
            const data = new Uint8Array(await file.arrayBuffer());

            // Validate file extension for PDFs
            if (!ext || !isSupportedPdfType(ext)) {
              return errorResponse(
                `File ${filename} has an unsupported PDF file type. Only .pdf files are allowed.`,
                400,
              );
            }

            const fileType = CatalogFileType.PDF;
            await catalogService.setFile(fileType, filename, data);

            // Try to link PDF to an image with same basename
            const basename = getBasename(filename);
            let linkedToImage = false;

            for (let i = newPreviews.length - 1; i >= 0; i--) {
              const preview = newPreviews[i];
              if (preview.src && !preview.pdf) {
                const previewBasename = getBasename(
                  preview.src.split("/").pop() || "",
                );
                if (previewBasename === basename) {
                  newPreviews[i] = { ...preview, pdf: `uploaded/${filename}` };
                  linkedToImage = true;
                  break;
                }
              }
            }

            // If no matching image found, link to the most recent image
            if (!linkedToImage) {
              for (let i = newPreviews.length - 1; i >= 0; i--) {
                const preview = newPreviews[i];
                if (preview.src && !preview.pdf) {
                  newPreviews[i] = { ...preview, pdf: `uploaded/${filename}` };
                  break;
                }
              }
            }
          }

          const updatedItem = { ...item, previews: newPreviews };
          const success = await catalogService.updateItem(formId, updatedItem);

          if (!success) {
            return errorResponse("Failed to update item", 500);
          }

          return successResponse();
        }}
      />

      <Delete
        pattern="/edit/:formId/previews/:filename"
        handler={async (ctx) => {
          const formId = ctx.params?.pathname.groups.formId;
          const filename = ctx.params?.pathname.groups.filename;

          if (!formId || !filename) {
            return errorResponse(
              "Form ID and filename are required",
              400,
            );
          }

          const formData = await ctx.request.formData();
          const password = extractPasswordFromFormData(formData);
          if (!verifyAdminPassword(password)) {
            return createAuthErrorResponse();
          }

          const catalogItems = (await catalogService.getItems()) ?? [];
          const item = catalogItems.find((item) => item.formId === formId);
          if (!item) {
            return errorResponse("Item not found", 404);
          }

          // Normalize filename by trimming whitespace to match seed script behavior
          const normalizedFilename = filename.trim();

          const fileTypeInfo = getFileTypeInfo(normalizedFilename);
          if (!fileTypeInfo) {
            return errorResponse("Unsupported file type", 400);
          }

          const { fileType } = fileTypeInfo;
          const ext = extractExtension(normalizedFilename);

          // Remove file from KV store
          await catalogService.removeFile(fileType, normalizedFilename);

          // Update previews array - remove the file from all preview entries
          // Use standardized path format: images/forms/reg/ for images, uploaded/ for PDFs
          const newPreviews = item.previews.filter((preview) => {
            if (ext === "pdf") {
              return preview.pdf !== `uploaded/${normalizedFilename}`;
            } else {
              return preview.src !== `images/forms/reg/${normalizedFilename}`;
            }
          });

          // If removing an image, also remove any PDFs linked to it
          if (ext === "jpg" || ext === "jpeg" || ext === "webp") {
            const imageUrl = `images/forms/reg/${normalizedFilename}`;
            const originalPreview = item.previews.find((p) =>
              p.src === imageUrl
            );

            // If the image had a linked PDF, delete it from KV store
            // Extract filename from standardized path format: uploaded/
            if (originalPreview && originalPreview.pdf) {
              const pdfPath = originalPreview.pdf;
              // Remove path prefix and extract just the filename
              const pdfFilename = pdfPath
                .replace(/^uploaded\//, "")
                .split("/")
                .pop()
                ?.trim();
              if (pdfFilename) {
                await catalogService.removeFile(
                  CatalogFileType.PDF,
                  pdfFilename,
                );
              }
            }

            // Remove the PDF link from the preview entry
            for (let i = 0; i < newPreviews.length; i++) {
              if (newPreviews[i].src === imageUrl) {
                newPreviews[i] = {
                  src: newPreviews[i].src,
                  alt: newPreviews[i].alt,
                };
                break;
              }
            }
          }

          const updatedItem = { ...item, previews: newPreviews };
          const success = await catalogService.updateItem(formId, updatedItem);

          if (!success) {
            return errorResponse("Failed to update item", 500);
          }

          return successResponse();
        }}
      />
    </Router>
  );
}
