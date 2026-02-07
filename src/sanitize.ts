/**
 * Sanitization utilities for terminal output and HTML entity decoding.
 */

/**
 * Strip control characters from a string to prevent terminal escape injection.
 * Preserves tab (0x09), newline (0x0A), and carriage return (0x0D).
 */
export function stripControlChars(text: string): string {
  // Remove all C0 control characters except \t \n \r,
  // plus DEL (0x7F) and C1 control range (0x80-0x9F)
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x80-\x9F]/g, "");
}

/**
 * Sanitize a URL for safe embedding in OSC 8 terminal escape sequences.
 * Strips any bytes that could inject terminal escape sequences.
 */
export function sanitizeForTerminal(url: string): string {
  return stripControlChars(url);
}
