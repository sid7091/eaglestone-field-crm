/**
 * Typed fetch wrapper for Eagle CRM backend API calls.
 *
 * All requests are routed through the Next.js rewrite proxy at /api/v1/*,
 * so no CORS configuration is needed and the auth cookie is forwarded
 * automatically by the browser.
 *
 * Auth token resolution order:
 *   1. `auth-token` cookie (parsed from document.cookie in browser)
 *   2. `auth-token` key in localStorage (fallback for non-cookie environments)
 */

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export class NetworkError extends Error {
  /** Always `true` — lets callers narrow the type without an `instanceof` check. */
  readonly offline = true as const;

  constructor(cause?: unknown) {
    super(
      "You appear to be offline. Please check your internet connection and try again.",
    );
    this.name = "NetworkError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const API_PREFIX = "/api";

/** Extract the `auth-token` value from `document.cookie`, if available. */
function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("auth-token="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/** Read the auth token from cookie first, then localStorage. */
function resolveAuthToken(): string | null {
  const fromCookie = getTokenFromCookie();
  if (fromCookie) return fromCookie;

  if (typeof localStorage !== "undefined") {
    return localStorage.getItem("auth-token");
  }

  return null;
}

// ---------------------------------------------------------------------------
// Core client
// ---------------------------------------------------------------------------

export interface ApiClientOptions extends Omit<RequestInit, "body"> {
  /** Parsed JSON body — serialised automatically. */
  body?: Record<string, unknown> | unknown[] | null;
  /** When `true`, skip attaching the Authorization header even if a token exists. */
  skipAuth?: boolean;
}

/**
 * Core fetch wrapper.
 *
 * @template T  The expected shape of a successful JSON response.
 * @param endpoint  Path relative to `/api/v1` — e.g. `"/users"` or `"/users/123"`.
 * @param options   Fetch options extended with a typed `body` and `skipAuth`.
 * @returns Parsed JSON response cast to `T`.
 * @throws {NetworkError}  When the request fails due to a network/connectivity issue.
 * @throws {ApiError}      When the server responds with a non-2xx status code.
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { body, skipAuth = false, headers: extraHeaders, ...rest } = options;

  // Build headers
  const headers = new Headers(extraHeaders as HeadersInit | undefined);

  if (body !== undefined && body !== null) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = resolveAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Normalise the endpoint so we don't double-slash
  const normalisedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  const url = `${API_PREFIX}${normalisedEndpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
      body:
        body !== undefined && body !== null
          ? JSON.stringify(body)
          : undefined,
    });
  } catch (cause: unknown) {
    // fetch() rejects only on network-level failures (DNS, offline, etc.)
    throw new NetworkError(cause);
  }

  // Parse body — attempt JSON, fall back to plain text for error messages
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let details: unknown;

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const errorBody = (await response.json()) as Record<string, unknown>;
        if (typeof errorBody["message"] === "string") {
          errorMessage = errorBody["message"];
        }
        details = errorBody;
      } catch {
        // ignore JSON parse errors on the error body
      }
    } else {
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {
        // ignore
      }
    }

    throw new ApiError(errorMessage, response.status, details);
  }

  // 204 No Content or empty body — return undefined cast to T
  const responseContentType = response.headers.get("content-type") ?? "";
  if (
    response.status === 204 ||
    !responseContentType.includes("application/json")
  ) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export const api = {
  /**
   * HTTP GET — fetch a resource.
   *
   * @example
   *   const user = await api.get<User>("/users/42");
   */
  get<T>(
    endpoint: string,
    options?: Omit<ApiClientOptions, "body" | "method">,
  ): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: "GET" });
  },

  /**
   * HTTP POST — create a resource.
   *
   * @example
   *   const created = await api.post<User>("/users", { name: "Alice" });
   */
  post<T>(
    endpoint: string,
    body: Record<string, unknown> | unknown[],
    options?: Omit<ApiClientOptions, "body" | "method">,
  ): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: "POST", body });
  },

  /**
   * HTTP PUT — replace a resource.
   *
   * @example
   *   const updated = await api.put<User>("/users/42", { name: "Bob" });
   */
  put<T>(
    endpoint: string,
    body: Record<string, unknown> | unknown[],
    options?: Omit<ApiClientOptions, "body" | "method">,
  ): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: "PUT", body });
  },

  /**
   * HTTP DELETE — remove a resource.
   *
   * @example
   *   await api.delete("/users/42");
   */
  delete<T = void>(
    endpoint: string,
    options?: Omit<ApiClientOptions, "body" | "method">,
  ): Promise<T> {
    return apiClient<T>(endpoint, { ...options, method: "DELETE" });
  },
} as const;
