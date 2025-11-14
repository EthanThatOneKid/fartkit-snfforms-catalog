import { Delete, Post, Router } from "@fartlabs/rtx";
import { RedirectPage } from "#/components/redirect.tsx";
import type { CatalogItem } from "#/lib/snfforms.ts";
import { kv, KvCatalogService } from "#/lib/kv.ts";
import { catalogItemFormSchema, parseFormData } from "#/lib/validation.ts";
import {
  createAuthErrorResponse,
  extractPasswordFromFormData,
  verifyAdminPassword,
} from "#/lib/auth.ts";
import { errorResponse, successResponse } from "#/lib/responses.ts";

const catalogService = new KvCatalogService(kv);

export function ItemsApiRoute() {
  return (
    <Router>
      <Post
        pattern="/edit"
        handler={async (ctx) => {
          const formData = await ctx.request.formData();

          // Check the admin password from the form data.
          const password = extractPasswordFromFormData(formData);
          if (!verifyAdminPassword(password)) {
            // For POST /edit, return HTML error page (maintaining existing behavior)
            const { PasswordErrorPage } = await import(
              "#/routes/pages/edit.tsx"
            );
            return new Response(
              <PasswordErrorPage />,
              {
                headers: { "Content-Type": "text/html" },
                status: 401,
              },
            );
          }

          // Parse and validate form data using Zod.
          const rawFormData = parseFormData(formData);

          // Remove password from form data before validation since it's not part of the catalog item schema.
          const { password: _, ...catalogData } = rawFormData;

          const validation = catalogItemFormSchema.safeParse(catalogData);

          if (!validation.success) {
            const errorMessage = validation.error.issues
              .map((err) => `${err.path.join(".")}: ${err.message}`)
              .join(", ");
            return errorResponse(`Validation failed: ${errorMessage}`, 400);
          }

          const {
            formId,
            category,
            description,
            size,
            paper,
            color,
            sides,
            unit,
          } = validation.data;

          const url = new URL(ctx.request.url);
          const originalFormId = url.searchParams.get("formId");
          const catalogItems = (await catalogService.getItems()) ?? [];

          // Use the original formId from the URL to find the existing item, not the potentially changed formId from the form.
          // If no originalFormId is provided, this is a new item creation request.
          const existingItem = originalFormId
            ? catalogItems.find((item) => item.formId === originalFormId)
            : null;

          // Create the item data with validated inputs.
          const itemData: CatalogItem = {
            formId,
            category,
            description,
            size,
            paper,
            color,
            sides,
            unit,
            previews: existingItem ? existingItem.previews : [], // Keep existing previews or empty for new items.
          };

          // Handle different scenarios with specific error messages.
          if (existingItem) {
            if (originalFormId && originalFormId !== formId) {
              // The formId has changed, use atomic operation to move the item
              // This prevents race conditions where the new formId is created
              // between our check and the actual update
              const updateSuccess = await catalogService.updateItemFormId(
                originalFormId,
                formId,
                itemData,
              );
              if (!updateSuccess) {
                // Check if the new formId already exists to provide a better error message
                const newItemExists = catalogItems.find((item) =>
                  item.formId === formId
                );
                if (newItemExists) {
                  return errorResponse(
                    `Form ID "${formId}" already exists. Please choose a different Form ID.`,
                    400,
                  );
                }
                return errorResponse(
                  "Failed to update the item. The item may have been modified by another request. Please try again.",
                  500,
                );
              }
            } else {
              // Update the existing item with the same formId.
              const updateSuccess = await catalogService.updateItem(
                formId,
                itemData,
              );
              if (!updateSuccess) {
                return errorResponse(
                  "Failed to update the item. Please try again.",
                  500,
                );
              }
            }
          } else {
            // Add a new item and check if formId already exists.
            const itemExists = catalogItems.find((item) =>
              item.formId === formId
            );
            if (itemExists) {
              return errorResponse(
                `Form ID "${formId}" already exists. Please choose a different Form ID.`,
                400,
              );
            }

            const addSuccess = await catalogService.addItem(itemData);
            if (!addSuccess) {
              return errorResponse(
                "Failed to create the new item. Please try again.",
                500,
              );
            }
          }

          // Return HTML redirect (maintaining existing behavior)
          return new Response(
            <RedirectPage redirectUrl={`/${formId}`} />,
            { headers: { "Content-Type": "text/html" } },
          );
        }}
      />

      <Delete
        pattern="/edit/:formId"
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

          const success = await catalogService.deleteItem(formId);

          if (!success) {
            return errorResponse("Item not found", 404);
          }

          return successResponse();
        }}
      />
    </Router>
  );
}
