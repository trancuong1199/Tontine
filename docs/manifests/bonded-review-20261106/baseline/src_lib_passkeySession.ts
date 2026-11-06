/** Only public WebAuthn metadata is cached; signing still needs the authenticator. */
export type StoredCredential = { id: string; publicKey: `0x${string}` };
export const CREDENTIAL_KEY = "huichain_passkey_credential";
let memory: StoredCredential | null = null;
function removeLegacy() {
  try { localStorage.removeItem(CREDENTIAL_KEY); } catch { /* Storage may be unavailable. */ }
}
function valid(value: unknown): value is StoredCredential {
  if (!value || typeof value !== "object") return false;
  const cred = value as Partial<StoredCredential>;
  return typeof cred.id === "string" && cred.id.length > 0 &&
    typeof cred.publicKey === "string" && /^0x[0-9a-fA-F]{128}$/.test(cred.publicKey);
}
export function loadStoredCredential(): StoredCredential | null {
  removeLegacy();
  try {
    const raw = sessionStorage.getItem(CREDENTIAL_KEY);
    if (!raw) return memory;
    const value: unknown = JSON.parse(raw);
    if (valid(value)) return { id: value.id, publicKey: value.publicKey };
    sessionStorage.removeItem(CREDENTIAL_KEY);
  } catch { /* A blocked or corrupt cache must never block login. */ }
  return memory;
}
export function saveCredential(credential: StoredCredential) {
  removeLegacy();
  memory = { id: credential.id, publicKey: credential.publicKey };
  try { sessionStorage.setItem(CREDENTIAL_KEY, JSON.stringify(memory)); } catch { /* Keep only in memory. */ }
}
export function clearCredential() {
  memory = null;
  removeLegacy();
  try { sessionStorage.removeItem(CREDENTIAL_KEY); } catch { /* Logout still clears account state. */ }
}
