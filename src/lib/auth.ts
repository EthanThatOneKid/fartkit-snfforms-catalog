/**
 * Authentication utilities for admin password verification.
 */

/**
 * Verifies if the provided password matches the expected admin password.
 * @param providedPassword - The password provided by the user
 * @returns true if the password is valid, false otherwise
 */
export function verifyAdminPassword(
  providedPassword: string | null,
): boolean {
  const expectedPassword = Deno.env.get("SECRET_PASSWORD");
  if (!expectedPassword || !providedPassword) {
    return false;
  }
  return providedPassword === expectedPassword;
}

/**
 * Extracts the password from FormData.
 * @param formData - The FormData object
 * @returns The password string or null if not found
 */
export function extractPasswordFromFormData(
  formData: FormData,
): string | null {
  return (formData.get("password") as string) || null;
}

/**
 * Creates a standardized JSON error response for authentication failures.
 * @returns A Response object with 401 status and error message
 */
export function createAuthErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Invalid admin password",
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 401,
    },
  );
}

/**
 * Middleware wrapper that requires authentication for a handler.
 * If authentication fails, returns an error response.
 * @param handler - The handler function to wrap
 * @returns A new handler that checks authentication first
 */
export function requireAuth<T extends { request: Request }>(
  handler: (ctx: T) => Promise<Response>,
): (ctx: T) => Promise<Response> {
  return async (ctx: T) => {
    const formData = await ctx.request.formData();
    const password = extractPasswordFromFormData(formData);

    if (!verifyAdminPassword(password)) {
      return createAuthErrorResponse();
    }

    return handler(ctx);
  };
}
