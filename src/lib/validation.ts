import { z } from "zod";

/**
 * Validation schemas for catalog items and form data.
 */

// Form ID validation requires a non-empty string.
const formIdSchema = z.string().min(1, "Form ID is required").trim();

// Common field validation requires a non-empty string.
const createFieldSchema = () =>
  z.string().min(1, "This field is required").trim();

// Catalog item preview validation schema.
const catalogItemPreviewSchema = z.object({
  src: z.string().min(1, "Preview source is required"),
  alt: z.string().min(1, "Preview alt text is required"),
  pdf: z.string().optional(),
});

// Complete catalog item validation schema.
export const catalogItemSchema = z.object({
  formId: formIdSchema,
  category: createFieldSchema(),
  description: createFieldSchema(),
  size: createFieldSchema(),
  paper: createFieldSchema(),
  color: createFieldSchema(),
  sides: createFieldSchema(),
  unit: createFieldSchema(),
  previews: z.array(catalogItemPreviewSchema).default([]),
});

// Form data validation schema for POST requests.
export const catalogItemFormSchema = z.object({
  formId: formIdSchema,
  category: createFieldSchema(),
  description: createFieldSchema(),
  size: createFieldSchema(),
  paper: createFieldSchema(),
  color: createFieldSchema(),
  sides: createFieldSchema(),
  unit: createFieldSchema(),
});

// Search query validation schema.
export const searchQuerySchema = z.string().trim().optional();

// URL parameter validation schema.
export const formIdParamSchema = z.object({
  formId: formIdSchema,
});

// Type exports for TypeScript.
export type CatalogItemFormData = z.infer<typeof catalogItemFormSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type FormIdParam = z.infer<typeof formIdParamSchema>;

/**
 * Safely parses form data from FormData object.
 */
export function parseFormData(formData: FormData): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value.toString().trim();
  }

  return data;
}
