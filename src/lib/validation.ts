import { z } from "zod";

/**
 * Validation schemas for catalog items and form data.
 */

// Form ID validation: 3-10 characters, alphanumeric and hyphens only
const formIdSchema = z
  .string()
  .min(3, "Form ID must be at least 3 characters")
  .max(10, "Form ID must be no more than 10 characters")
  .regex(
    /^[a-zA-Z0-9-]+$/,
    "Form ID must contain only letters, numbers, and hyphens",
  );

// Common field validation: trimmed string with length limits
const createFieldSchema = (maxLength: number = 100) =>
  z
    .string()
    .min(1, "This field is required")
    .max(maxLength, `This field must be ${maxLength} characters or less`)
    .trim();

// Catalog item preview validation
const catalogItemPreviewSchema = z.object({
  src: z.string().min(1, "Preview source is required"),
  alt: z.string().min(1, "Preview alt text is required"),
  pdf: z.string().optional(),
});

// Complete catalog item validation schema
export const catalogItemSchema = z.object({
  formId: formIdSchema,
  category: createFieldSchema(50),
  description: createFieldSchema(200),
  size: createFieldSchema(50),
  paper: createFieldSchema(50),
  color: createFieldSchema(50),
  sides: createFieldSchema(50),
  unit: createFieldSchema(50),
  previews: z.array(catalogItemPreviewSchema).default([]),
});

// Form data validation schema for POST requests
export const catalogItemFormSchema = z.object({
  formId: formIdSchema,
  category: createFieldSchema(50),
  description: createFieldSchema(200),
  size: createFieldSchema(50),
  paper: createFieldSchema(50),
  color: createFieldSchema(50),
  sides: createFieldSchema(50),
  unit: createFieldSchema(50),
});

// Search query validation
export const searchQuerySchema = z
  .string()
  .min(1, "Search query cannot be empty")
  .max(100, "Search query must be 100 characters or less")
  .trim()
  .optional();

// URL parameter validation
export const formIdParamSchema = z.object({
  formId: formIdSchema,
});

// Type exports for TypeScript
export type CatalogItemFormData = z.infer<typeof catalogItemFormSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type FormIdParam = z.infer<typeof formIdParamSchema>;

/**
 * Validates form data and returns a standardized error response if validation fails.
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | {
  success: false;
  error: string;
  status: number;
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        success: false,
        error: `Validation failed: ${errorMessage}`,
        status: 400,
      };
    }
    return {
      success: false,
      error: "Invalid data format",
      status: 400,
    };
  }
}

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
