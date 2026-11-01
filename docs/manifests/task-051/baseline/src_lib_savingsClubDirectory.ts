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
  initialCollateral?: string; // Deployment snapshot only; never current financial authority.
  creator?: string;
}

export const SAVINGS_CLUBS_STORAGE_KEY = "hui_known_groups";
export const REMOVED_CLUBS_STORAGE_KEY = "hui_removed_groups";
export const CLUB_COLLATERAL_STORAGE_KEY = "hui_club_collateral";

export function saveGroupCollateral(address: string, collateralSatoshis: bigint): void {
  if (!address || typeof window === "undefined" || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(CLUB_COLLATERAL_STORAGE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[address.toLowerCase()] = collateralSatoshis.toString();
    window.localStorage.setItem(CLUB_COLLATERAL_STORAGE_KEY, JSON.stringify(map));
  } catch (_err) {
    // Graceful catch
  }
}

/** @deprecated Historical local preference only. Never use for amounts or authorization. */
export function getGroupCollateralAmount(address: string): bigint | undefined {
  if (!address || typeof window === "undefined" || !window.localStorage) return undefined;
  try {
    const raw = window.localStorage.getItem(CLUB_COLLATERAL_STORAGE_KEY);
    if (!raw) return undefined;
    const map: Record<string, string> = JSON.parse(raw);
    const val = map[address.toLowerCase()];
    return val !== undefined ? BigInt(val) : undefined;
  } catch (_err) {
    return undefined;
  }
}

export function getRemovedGroups(): Set<string> {
  if (typeof window === "undefined" || !window.localStorage) {
    return new Set<string>();
  }
  try {
    const raw = window.localStorage.getItem(REMOVED_CLUBS_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(
        parsed
          .map((a) => (typeof a === "string" ? a.toLowerCase() : ""))
          .filter(Boolean)
      );
    }
    return new Set<string>();
  } catch (_err) {
    return new Set<string>();
  }
}

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
    const removedAddresses = getRemovedGroups();
    const raw = window.localStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SAVINGS_CLUBS.filter(
        (def) => !removedAddresses.has(def.address.toLowerCase())
      );
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_SAVINGS_CLUBS.filter(
        (def) => !removedAddresses.has(def.address.toLowerCase())
      );
    }

    const seenAddresses = new Set<string>();
    const result: SavingsClubItem[] = [];

    // First process user-saved groups
    for (const item of parsed) {
      if (!item || typeof item.address !== "string") continue;
      const lower = item.address.toLowerCase();
      if (!isValidAddress(lower)) continue;
      if (removedAddresses.has(lower)) continue;
      if (seenAddresses.has(lower)) continue;

      seenAddresses.add(lower);
      const defaultMatch = DEFAULT_SAVINGS_CLUBS.find(
        (d) => d.address.toLowerCase() === lower
      );

      if (defaultMatch) {
        result.push({
          ...defaultMatch,
          name:
            typeof item.name === "string" &&
            item.name.trim().length > 0 &&
            !item.name.startsWith("Nhóm Hụi 0x") &&
            !item.name.startsWith("Savings Club 0x")
              ? item.name.trim()
              : defaultMatch.name,
          address: defaultMatch.address.toLowerCase() as `0x${string}`,
          createdAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
          creator: typeof item.creator === "string" ? item.creator : undefined,
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
          creator: typeof item.creator === "string" ? item.creator : undefined,
        });
      }
    }

    // Append default groups if not already present and not removed
    for (const def of DEFAULT_SAVINGS_CLUBS) {
      const lower = def.address.toLowerCase();
      if (removedAddresses.has(lower)) continue;
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

export function saveKnownGroup(item: { address: string; name: string; initialCollateral?: string; creator?: string }): void {
  if (!item || !isValidAddress(item.address)) return;
  if (typeof window === "undefined" || !window.localStorage) return;

  const normalized = item.address.toLowerCase() as `0x${string}`;
  const defaultMatch = DEFAULT_SAVINGS_CLUBS.find(
    (d) => d.address.toLowerCase() === normalized
  );

  let rawList: Array<{ address: string; name: string; createdAt?: number; initialCollateral?: string; creator?: string }> = [];
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

  const existingName = existing?.name ? existing.name.trim() : "";
  const isExistingCustom =
    existingName.length > 0 &&
    !existingName.startsWith("Nhóm Hụi 0x") &&
    !existingName.startsWith("Savings Club 0x");

  const incomingName = item.name ? item.name.trim() : "";
  const isIncomingCustom =
    incomingName.length > 0 &&
    !incomingName.startsWith("Nhóm Hụi 0x") &&
    !incomingName.startsWith("Savings Club 0x");

  let resolvedName = "";
  if (isExistingCustom) {
    // Preserve user's existing customized name from being overwritten by on-chain sync
    resolvedName = existingName;
  } else if (isIncomingCustom) {
    resolvedName = incomingName;
  } else if (defaultMatch) {
    resolvedName = defaultMatch.name;
  } else if (incomingName.length > 0) {
    resolvedName = incomingName;
  } else if (existingName.length > 0) {
    resolvedName = existingName;
  } else {
    resolvedName = `Nhóm Hụi ${formatAddress(normalized)}`;
  }

  const newItem = {
    address: normalized,
    name: resolvedName,
    createdAt: existing?.createdAt || Date.now(),
    initialCollateral: item.initialCollateral ?? existing?.initialCollateral,
    creator: item.creator ?? existing?.creator,
  };

  const updated = [newItem, ...filtered];

  try {
    window.localStorage.setItem(SAVINGS_CLUBS_STORAGE_KEY, JSON.stringify(updated));

    // If this group was previously marked as removed, un-hide it
    const removed = getRemovedGroups();
    if (removed.has(normalized)) {
      removed.delete(normalized);
      window.localStorage.setItem(
        REMOVED_CLUBS_STORAGE_KEY,
        JSON.stringify(Array.from(removed))
      );
    }
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
    window.localStorage.removeItem(REMOVED_CLUBS_STORAGE_KEY);
  } catch (_err) {
    // Graceful catch
  }
}

/**
 * Xóa một nhóm cụ thể khỏi danh bạ đã lưu (bao gồm nhóm đã hủy, hết hạn, hoặc không chơi nữa).
 */
export function removeKnownGroup(address: string): void {
  if (!address || typeof window === "undefined" || !window.localStorage) return;
  const target = address.toLowerCase();
  try {
    // 1. Loại bỏ khỏi danh sách nhóm đã lưu hui_known_groups
    const raw = window.localStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (g) => g && typeof g.address === "string" && g.address.toLowerCase() !== target
        );
        window.localStorage.setItem(SAVINGS_CLUBS_STORAGE_KEY, JSON.stringify(filtered));
      }
    }

    // 2. Ghi nhận vào danh sách nhóm đã xóa hui_removed_groups để không bị tự động nạp lại
    const removed = getRemovedGroups();
    removed.add(target);
    window.localStorage.setItem(
      REMOVED_CLUBS_STORAGE_KEY,
      JSON.stringify(Array.from(removed))
    );
  } catch (_err) {
    // Graceful catch
  }
}

/**
 * Cập nhật tên nhóm đã lưu trong danh bạ localStorage.
 */
export function updateKnownGroupName(address: string, newName: string): void {
  if (!address || !isValidAddress(address)) return;
  const trimmed = typeof newName === "string" ? newName.trim() : "";
  if (!trimmed) return;
  if (typeof window === "undefined" || !window.localStorage) return;

  const normalized = address.toLowerCase() as `0x${string}`;

  let rawList: Array<{ address: string; name: string; createdAt?: number; initialCollateral?: string }> = [];
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

  const existingIndex = rawList.findIndex(
    (g) => g && typeof g.address === "string" && g.address.toLowerCase() === normalized
  );

  if (existingIndex >= 0) {
    rawList[existingIndex] = {
      ...rawList[existingIndex],
      name: trimmed,
    };
  } else {
    rawList.unshift({
      address: normalized,
      name: trimmed,
      createdAt: Date.now(),
    });
  }

  try {
    window.localStorage.setItem(SAVINGS_CLUBS_STORAGE_KEY, JSON.stringify(rawList));
  } catch (_err) {
    // Graceful catch
  }
}

