/**
 * URL origin validation to prevent SSRF attacks (S2).
 */

/** Default hosts that are allowed for passage fetching. */
export const ALLOWED_HOSTS = ["www.biblegateway.com", "biblegateway.com"];

/**
 * Validate that a URL's origin matches an allowlist of hosts.
 * Rejects internal-network endpoints, non-HTTPS, and unknown hosts.
 *
 * @throws Error if the URL is invalid or its host is not in the allowlist.
 */
export function validateUrl(url: string, allowedHosts: readonly string[] = ALLOWED_HOSTS): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: "${url}"`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`URL must use HTTPS. Got "${parsed.protocol}" in "${url}".`);
  }

  if (!allowedHosts.includes(parsed.hostname)) {
    throw new Error(`URL host "${parsed.hostname}" is not in the allowed list: ${allowedHosts.join(", ")}.`);
  }
}

/**
 * Validate that a base URL is a well-formed HTTPS URL pointing to an allowed host.
 *
 * @throws Error if the base URL is invalid.
 */
export function validateBaseUrl(baseUrl: string, allowedHosts: readonly string[] = ALLOWED_HOSTS): void {
  // A base URL like "https://www.biblegateway.com/passage/?" won't parse as
  // a standalone URL with a meaningful pathname, but the origin check still works.
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid base URL: "${baseUrl}"`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`Base URL must use HTTPS. Got "${parsed.protocol}" in "${baseUrl}".`);
  }

  if (!allowedHosts.includes(parsed.hostname)) {
    throw new Error(`Base URL host "${parsed.hostname}" is not in the allowed list: ${allowedHosts.join(", ")}.`);
  }
}
