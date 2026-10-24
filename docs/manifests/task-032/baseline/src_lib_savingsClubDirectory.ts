export function isValidAddress(address: unknown): address is `0x${string}` {
  return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export interface SavingsClubItem {
  address: `0x${string}`;
  name: string;
  isDefault?: boolean;
  createdAt?: number;
}

export const SAVINGS_CLUBS_STORAGE_KEY = "hui_known_groups";

export const DEFAULT_SAVINGS_CLUBS: SavingsClubItem[] = [
  {
    address: "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b",
    name: "BAVI Savings Club",
    isDefault: true,
  },
  {
    address: "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b",
    name: "Nhóm Hụi Arc Alpha",
    isDefault: true,
  },
];

export function getKnownGroups(): SavingsClubItem[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [...DEFAULT_SAVINGS_CLUBS];
  }

  try {
    const raw = window.localStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_SAVINGS_CLUBS];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_SAVINGS_CLUBS];
    }

    const seenAddresses = new Set<string>();
    const result: SavingsClubItem[] = [];

    // First process user-saved groups
    for (const item of parsed) {
      if (!item || typeof item.address !== "string") continue;
      const lower = item.address.toLowerCase();
      if (!isValidAddress(lower)) continue;
      if (seenAddresses.has(lower)) continue;

      seenAddresses.add(lower);
      const defaultMatch = DEFAULT_SAVINGS_CLUBS.find(
        (d) => d.address.toLowerCase() === lower
      );

      if (defaultMatch) {
        result.push({
          ...defaultMatch,
          address: defaultMatch.address.toLowerCase() as `0x${string}`,
          createdAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
        });
      } else {
        result.push({
          address: lower as `0x${string}`,
          name:
            typeof item.name === "string" && item.name.trim().length > 0
              ? item.name.trim()
              : `Nhóm Hụi ${formatAddress(lower)}`,
          isDefault: false,
          createdAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
        });
      }
    }

    // Append default groups if not already present
    for (const def of DEFAULT_SAVINGS_CLUBS) {
      const lower = def.address.toLowerCase();
      if (!seenAddresses.has(lower)) {
        seenAddresses.add(lower);
        result.push({ ...def });
      }
    }

    return result;
  } catch (_err) {
    return [...DEFAULT_SAVINGS_CLUBS];
  }
}

export function saveKnownGroup(item: { address: string; name: string }): void {
  if (!item || !isValidAddress(item.address)) return;
  if (typeof window === "undefined" || !window.localStorage) return;

  const normalized = item.address.toLowerCase() as `0x${string}`;
  const defaultMatch = DEFAULT_SAVINGS_CLUBS.find(
    (d) => d.address.toLowerCase() === normalized
  );

  let rawList: Array<{ address: string; name: string; createdAt?: number }> = [];
  try {
    const raw = window.localStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        rawList = parsed;
      }
    }
  } catch (_err) {
    rawList = [];
  }

  // Find if already exists in saved list
  const existing = rawList.find(
    (g) => g && typeof g.address === "string" && g.address.toLowerCase() === normalized
  );

  // Filter out existing entries with same address to re-insert at top
  const filtered = rawList.filter(
    (g) => g && typeof g.address === "string" && g.address.toLowerCase() !== normalized
  );

  let resolvedName = item.name ? item.name.trim() : "";
  if (!resolvedName) {
    resolvedName = existing?.name || (defaultMatch ? defaultMatch.name : `Nhóm Hụi ${formatAddress(normalized)}`);
  } else if (defaultMatch) {
    resolvedName = defaultMatch.name;
  } else if (existing?.name && resolvedName.startsWith("Nhóm Hụi 0x")) {
    resolvedName = existing.name;
  }

  const newItem = {
    address: normalized,
    name: resolvedName,
    createdAt: existing?.createdAt || Date.now(),
  };

  const updated = [newItem, ...filtered];

  try {
    window.localStorage.setItem(SAVINGS_CLUBS_STORAGE_KEY, JSON.stringify(updated));
  } catch (_err) {
    // Graceful catch for storage quota or privacy mode errors
  }
}

/**
 * Xóa sạch danh sách các nhóm tùy chỉnh được lưu trong localStorage,
 * đưa danh bạ về trạng thái mặc định chỉ gồm DEFAULT_SAVINGS_CLUBS.
 */
export function clearCustomKnownGroups(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(SAVINGS_CLUBS_STORAGE_KEY);
  } catch (_err) {
    // Graceful catch
  }
}

/**
 * Xóa một nhóm cụ thể khỏi danh bạ đã lưu.
 */
export function removeKnownGroup(address: string): void {
  if (!address || typeof window === "undefined" || !window.localStorage) return;
  const target = address.toLowerCase();
  try {
    const raw = window.localStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter(
        (g) => g && typeof g.address === "string" && g.address.toLowerCase() !== target
      );
      window.localStorage.setItem(SAVINGS_CLUBS_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (_err) {
    // Graceful catch
  }
}
