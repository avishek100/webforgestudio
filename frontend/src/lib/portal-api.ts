const apiBaseUrl = (import.meta.env["VITE_API_BASE_URL"] || "http://localhost:4000").replace(
  /\/+$/,
  "",
);

export function portalApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

export class PortalApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PortalApiError";
    this.status = status;
  }
}

export async function portalApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(portalApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 204) return undefined as T;

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new PortalApiError("The service returned an invalid response.", response.status);
  }

  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "The request could not be completed.";
    throw new PortalApiError(message, response.status);
  }

  return result as T;
}

export function whatsappUrl(message: string): string | null {
  const number = (import.meta.env["VITE_WHATSAPP_NUMBER"] || "").replace(/\D/g, "");
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
