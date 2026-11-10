import { LEGACY_TEST_CLUB_ADDRESS, ARC_TESTNET_DEFAULT_BONDED_CLUB } from "../config/bonded-tontine.ts";

export function isValidAddress(address: unknown): address is `0x${string}` {
  return typeof address === "string" && /^0x[a-f0-9]{40}$/i.test(address);
}

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export type ClubVersion = "v1-rotating" | "v2-bonded";

export interface SavingsClubItem {
  address: `0x${string}`;
  name: string;
  isDefault?: boolean;
  createdAt?: number;
  initialCollateral?: string; // Deployment snapshot only; never current financial authority.
  creator?: string;
  version?: ClubVersion;
}

export function getClubVersion(item?: { version?: ClubVersion } | null): ClubVersion {
  return item?.version === "v2-bonded" ? "v2-bonded" : "v1-rotating";
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

export function getRemovedGroups(account?: string): Set<string> {
  if (typeof window === "undefined" || !window.localStorage) {
    return new Set<string>();
  }
  try {
    const acc = resolveAccount(account);
    const key = getAccountRemovedStorageKey(acc ?? undefined);
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const list = parsed
        .map((a) => (typeof a === "string" ? a.toLowerCase() : ""))
        .filter(Boolean);
      return new Set(list);
    }
    return new Set<string>();
  } catch (_err) {
    return new Set<string>();
  }
}

/** Explicit context only: omitted account is the separate guest namespace. */
export function resolveAccount(account?: string): string | null {
  return account && isValidAddress(account) ? account.toLowerCase() : null;
}
export function getAccountRemovedStorageKey(account?: string): string {
  return `${REMOVED_CLUBS_STORAGE_KEY}_${resolveAccount(account) ?? "guest"}`;
}
export function getAccountKnownStorageKey(account?: string): string {
  return `${SAVINGS_CLUBS_STORAGE_KEY}_${resolveAccount(account) ?? "guest"}`;
}

export const DEFAULT_SAVINGS_CLUBS: SavingsClubItem[] = [
  {
    address: "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b",
    name: "BAVI Savings Club",
    isDefault: true,
  },
  {
    address: LEGACY_TEST_CLUB_ADDRESS,
    name: "Nhóm Hụi Arc Alpha",
    isDefault: true,
  },
];

export function getKnownGroups(account?: string): SavingsClubItem[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [...DEFAULT_SAVINGS_CLUBS];
  }

  try {
    const acc = resolveAccount(account);
    const removedAddresses = getRemovedGroups(acc ?? undefined);
    const raw = window.localStorage.getItem(getAccountKnownStorageKey(account));
    if (!raw) {
      if (!acc) {
        return DEFAULT_SAVINGS_CLUBS.filter(
          (def) => !removedAddresses.has(def.address.toLowerCase())
        );
      }
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      if (!acc) {
        return DEFAULT_SAVINGS_CLUBS.filter(
          (def) => !removedAddresses.has(def.address.toLowerCase())
        );
      }
      return [];
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
          ...(item.version === "v1-rotating" || item.version === "v2-bonded"
            ? { version: item.version as ClubVersion }
            : {}),
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
          ...(item.version === "v1-rotating" || item.version === "v2-bonded"
            ? { version: item.version as ClubVersion }
            : {}),
        });
      }
    }

    // Append default groups if not already present, not removed, and guest (no account specified)
    if (!acc) {
      for (const def of DEFAULT_SAVINGS_CLUBS) {
        const lower = def.address.toLowerCase();
        if (removedAddresses.has(lower)) continue;
        if (!seenAddresses.has(lower)) {
          seenAddresses.add(lower);
          result.push({ ...def });
        }
      }
    }

    return result;
  } catch (_err) {
    return [...DEFAULT_SAVINGS_CLUBS];
  }
}

export function saveKnownGroup(item: {
  address: string;
  name: string;
  initialCollateral?: string;
  creator?: string;
  version?: ClubVersion;
}, account?: string): void {
  if (!item || !isValidAddress(item.address)) return;
  if (typeof window === "undefined" || !window.localStorage) return;

  const normalized = item.address.toLowerCase() as `0x${string}`;
  const defaultMatch = DEFAULT_SAVINGS_CLUBS.find(
    (d) => d.address.toLowerCase() === normalized
  );

  let rawList: Array<{
    address: string;
    name: string;
    createdAt?: number;
    initialCollateral?: string;
    creator?: string;
    version?: ClubVersion;
  }> = [];
  try {
    const raw = window.localStorage.getItem(getAccountKnownStorageKey(account));
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

  const resolvedVersion = item.version ?? existing?.version;
  const newItem = {
    address: normalized,
    name: resolvedName,
    createdAt: existing?.createdAt || Date.now(),
    initialCollateral: item.initialCollateral ?? existing?.initialCollateral,
    creator: item.creator ?? existing?.creator,
    ...(resolvedVersion === "v1-rotating" || resolvedVersion === "v2-bonded"
      ? { version: resolvedVersion }
      : {}),
  };

  const updated = [newItem, ...filtered];

  try {
    window.localStorage.setItem(getAccountKnownStorageKey(account), JSON.stringify(updated));

    // If this group was previously marked as removed, un-hide it
    const removed = getRemovedGroups(account);
    if (removed.has(normalized)) {
      removed.delete(normalized);
      window.localStorage.setItem(
        getAccountRemovedStorageKey(account),
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
export function clearCustomKnownGroups(account?: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(getAccountKnownStorageKey(account));
    window.localStorage.removeItem(getAccountRemovedStorageKey(account));
  } catch (_err) {
    // Graceful catch
  }
}

/**
 * Xóa một nhóm cụ thể khỏi danh bạ đã lưu (bao gồm nhóm đã hủy, hết hạn, hoặc không chơi nữa).
 */
export function removeKnownGroup(address: string, account?: string): void {
  if (!isValidAddress(address) || typeof window === "undefined") return;
  try {
    const key = getAccountKnownStorageKey(account);
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    const list = Array.isArray(parsed) ? parsed : [];
    window.localStorage.setItem(key, JSON.stringify(list.filter(g => g?.address?.toLowerCase() !== address.toLowerCase())));
    const removed = getRemovedGroups(account);
    removed.add(address.toLowerCase());
    window.localStorage.setItem(getAccountRemovedStorageKey(account), JSON.stringify([...removed]));
  } catch { /* Storage unavailable. */ }
}

/**
 * Cập nhật tên nhóm đã lưu trong danh bạ localStorage.
 */
export function updateKnownGroupName(address: string, newName: string, account?: string): void {
  if (!address || !isValidAddress(address)) return;
  const trimmed = typeof newName === "string" ? newName.trim() : "";
  if (!trimmed) return;
  if (typeof window === "undefined" || !window.localStorage) return;

  const normalized = address.toLowerCase() as `0x${string}`;

  let rawList: Array<{ address: string; name: string; createdAt?: number; initialCollateral?: string }> = [];
  try {
    const raw = window.localStorage.getItem(getAccountKnownStorageKey(account));
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
    window.localStorage.setItem(getAccountKnownStorageKey(account), JSON.stringify(rawList));
  } catch (_err) {
    // Graceful catch
  }
}

/**
 * Share-safe URL builder for inviting members to a specific club
 */
export function buildShareGroupUrl(address: string, baseUrl?: string): string {
  if (!isValidAddress(address)) return "";
  let base = baseUrl;
  if (!base && typeof window !== "undefined" && window.location) {
    base = window.location.origin + window.location.pathname;
  }
  if (!base) {
    base = "/";
  }
  try {
    if (base.startsWith("/")) {
      const cleanBase = base.split("?")[0].replace(/\/+$/, "");
      return `${cleanBase}/?group=${address.toLowerCase()}`;
    }
    const url = new URL(base);
    url.searchParams.delete("view");
    url.searchParams.delete("tab");
    url.searchParams.set("group", address.toLowerCase());
    return url.toString();
  } catch {
    const cleanBase = base.split("?")[0].replace(/\/+$/, "");
    return `${cleanBase}/?group=${address.toLowerCase()}`;
  }
}

/**
 * Syncs verified BondedTontine clubs from BondedTontineFactory.clubAt(i) into known groups with version: "v2-bonded" (T6.10).
 */
export async function syncFactoryBondedClubs(
  reader: {
    readContract: (args: {
      address: `0x${string}`;
      abi: readonly unknown[];
      functionName: string;
      args?: readonly unknown[];
    }) => Promise<unknown>;
  },
  factoryAddress: `0x${string}`,
  factoryAbi: readonly unknown[],
  tontineAbi: readonly unknown[],
  account?: string
): Promise<SavingsClubItem[]> {
  if (!reader || !isValidAddress(factoryAddress)) return [];
  const synced: SavingsClubItem[] = [];
  try {
    const lengthRaw = (await reader.readContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: "clubsLength",
      args: [],
    })) as bigint;
    const count = Number(lengthRaw);
    const removedAddresses = getRemovedGroups(account);

    // Query all club addresses in parallel for blazing-fast sync
    const clubAddresses = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        reader
          .readContract({
            address: factoryAddress,
            abi: factoryAbi,
            functionName: "clubAt",
            args: [BigInt(i)],
          })
          .catch(() => undefined) as Promise<`0x${string}` | undefined>
      )
    );

    const validEntries = clubAddresses
      .map((addr, i) => ({ addr, i }))
      .filter((entry): entry is { addr: `0x${string}`; i: number } => Boolean(entry.addr && isValidAddress(entry.addr)));

    // Query all group names in parallel
    const names = await Promise.all(
      validEntries.map((entry) =>
        reader
          .readContract({
            address: entry.addr,
            abi: tontineAbi,
            functionName: "groupName",
            args: [],
          })
          .catch(() => undefined) as Promise<string | undefined>
      )
    );

    const userLower = account && isValidAddress(account) ? account.toLowerCase() : null;

    if (userLower) {
      const [owners, members] = await Promise.all([
        Promise.all(
          validEntries.map((entry) =>
            reader
              .readContract({
                address: entry.addr,
                abi: tontineAbi,
                functionName: "owner",
                args: [],
              })
              .catch(() => undefined) as Promise<string | undefined>
          )
        ),
        Promise.all(
          validEntries.map((entry) =>
            reader
              .readContract({
                address: entry.addr,
                abi: tontineAbi,
                functionName: "isMember",
                args: [userLower as `0x${string}`],
              })
              .catch(() => false) as Promise<boolean>
          )
        ),
      ]);

      for (let j = 0; j < validEntries.length; j++) {
        const clubAddr = validEntries[j].addr;
        const lower = clubAddr.toLowerCase();
        if (removedAddresses.has(lower) || getRemovedGroups(account).has(lower)) {
          continue;
        }
        const clubOwner = owners[j];
        const isMem = Boolean(members[j]);
        const isOwn = Boolean(clubOwner && typeof clubOwner === "string" && clubOwner.toLowerCase() === userLower);

        // Chỉ lưu vào danh bạ của ví nếu ví là chủ nhóm hoặc thành viên
        if (isOwn || isMem) {
          let groupName = names[j]?.trim() || `Bonded Club #${validEntries[j].i + 1}`;
          saveKnownGroup({
            address: clubAddr,
            name: groupName,
            version: "v2-bonded",
          }, account);
          synced.push({
            address: lower as `0x${string}`,
            name: groupName,
            version: "v2-bonded",
          });
        }
      }
    } else {
      for (let j = 0; j < validEntries.length; j++) {
        const clubAddr = validEntries[j].addr;
        const lower = clubAddr.toLowerCase();
        // If user previously removed this club, do not revive it on sync
        if (removedAddresses.has(lower) || getRemovedGroups(account).has(lower)) {
          continue;
        }
        let groupName = names[j]?.trim() || `Bonded Club #${validEntries[j].i + 1}`;
        saveKnownGroup({
          address: clubAddr,
          name: groupName,
          version: "v2-bonded",
        }, account);
        synced.push({
          address: lower as `0x${string}`,
          name: groupName,
          version: "v2-bonded",
        });
      }
    }
  } catch {
    // Graceful catch on network error
  }
  return synced;
}

export const CLUB_CANCEL_VOTES_STORAGE_PREFIX = "hui_club_cancel_votes_";

export function getRequiredCancelVotes(memberCount: number | bigint): number {
  const count = Number(memberCount);
  if (count <= 0) return 0;
  return Math.floor(count / 2) + 1;
}

export function getClubCancelVotes(clubAddress?: string): string[] {
  if (!clubAddress || !isValidAddress(clubAddress)) return [];
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(
      `${CLUB_CANCEL_VOTES_STORAGE_PREFIX}${clubAddress.toLowerCase()}`
    );
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .map((addr) => (typeof addr === "string" ? addr.toLowerCase() : ""))
          .filter((addr) => isValidAddress(addr))
      )
    );
  } catch {
    return [];
  }
}

export function toggleClubCancelVote(
  clubAddress?: string,
  voterAddress?: string
): { voted: boolean; votes: string[] } {
  if (!clubAddress || !isValidAddress(clubAddress) || !voterAddress || !isValidAddress(voterAddress)) {
    return { voted: false, votes: getClubCancelVotes(clubAddress) };
  }
  const current = getClubCancelVotes(clubAddress);
  const voterLower = voterAddress.toLowerCase();
  const hasVoted = current.includes(voterLower);
  const next = hasVoted ? current : [...current, voterLower];

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(
        `${CLUB_CANCEL_VOTES_STORAGE_PREFIX}${clubAddress.toLowerCase()}`,
        JSON.stringify(next)
      );
    } catch {
      // Ignore storage errors
    }
  }
  return { voted: true, votes: next };
}

export function hasMajorityCancelVotes(
  clubAddress?: string,
  memberCount: number | bigint = 0
): boolean {
  const count = Number(memberCount);
  if (count < 2) return true;
  const required = getRequiredCancelVotes(count);
  return getClubCancelVotes(clubAddress).length >= required;
}



