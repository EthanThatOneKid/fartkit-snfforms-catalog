/**
 * Standardized JSON response utilities for API routes.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

/**
 * Creates a successful JSON response.
 */
export function successResponse<T>(
  data?: T,
  count?: number,
  status: number = 200,
): Response {
  const body: ApiResponse<T> = {
    success: true,
  };

  if (data !== undefined) {
    body.data = data;
  }

  if (count !== undefined) {
    body.count = count;
  }

  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

/**
 * Creates an error JSON response.
 */
export function errorResponse(
  error: string,
  status: number = 400,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      headers: { "Content-Type": "application/json" },
      status,
    },
  );
}

/**
 * Creates a CORS-enabled successful JSON response.
 */
export function corsSuccessResponse<T>(
  data?: T,
  count?: number,
  status: number = 200,
): Response {
  const body: ApiResponse<T> = {
    success: true,
  };

  if (data !== undefined) {
    body.data = data;
  }

  if (count !== undefined) {
    body.count = count;
  }

  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    status,
  });
}

/**
 * Creates a CORS-enabled error JSON response.
 */
export function corsErrorResponse(
  error: string,
  status: number = 400,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
      data: [],
      count: 0,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      status,
    },
  );
}
