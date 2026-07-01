/**
 * Saves form state to sessionStorage so it survives a forced logout.
 * After re-login, call loadDraft(key) to restore it.
 */

const PREFIX = "form_draft:";

export function saveFormDraft(key: string, data: unknown): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    // sessionStorage may be full or unavailable — swallow
  }
}

export function loadFormDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearFormDraft(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function clearAllFormDrafts(): void {
  try {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith(PREFIX));
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function hasFormDrafts(): boolean {
  try {
    return Object.keys(sessionStorage).some((k) => k.startsWith(PREFIX));
  } catch {
    return false;
  }
}

export function listFormDraftKeys(): string[] {
  try {
    return Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .map((k) => k.slice(PREFIX.length));
  } catch {
    return [];
  }
}
