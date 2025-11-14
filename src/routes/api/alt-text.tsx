import { Post, Router } from "@fartlabs/rtx";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import {
  createAuthErrorResponse,
  extractPasswordFromFormData,
  verifyAdminPassword,
} from "#/lib/auth.ts";
import { errorResponse, successResponse } from "#/lib/responses.ts";

const catalogService = new KvCatalogService(kv);

export function AltTextApiRoute() {
  return (
    <Router>
      <Post
        pattern="/edit/:formId/alt-text"
        handler={async (ctx) => {
          const formId = ctx.params?.pathname.groups.formId;
          if (!formId) {
            return errorResponse("Form ID not found", 400);
          }

          const formData = await ctx.request.formData();

          // Check the admin password
          const password = extractPasswordFromFormData(formData);
          if (!verifyAdminPassword(password)) {
            return createAuthErrorResponse();
          }

          const src = formData.get("src") as string;
          const newAlt = formData.get("alt") as string;

          if (!src || !newAlt) {
            return errorResponse("Missing src or alt text", 400);
          }

          // Get the catalog item
          const catalogItems = (await catalogService.getItems()) ?? [];
          const item = catalogItems.find((item) => item.formId === formId);

          if (!item) {
            return errorResponse("Item not found", 404);
          }

          // Update the alt text for the matching preview
          const updatedPreviews = item.previews.map((preview) => {
            if (preview.src === src) {
              return { ...preview, alt: newAlt };
            }
            return preview;
          });

          const updatedItem = { ...item, previews: updatedPreviews };
          const success = await catalogService.updateItem(formId, updatedItem);

          if (!success) {
            return errorResponse("Failed to update alt text", 500);
          }

          return successResponse();
        }}
      />
    </Router>
  );
}
