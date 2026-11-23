import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REMOVED_CLUBS_STORAGE_KEY,
  getAccountRemovedStorageKey,
  getRemovedGroups,
  getKnownGroups,
  saveKnownGroup,
} from "../src/lib/savingsClubDirectory.ts";

const WALLET = "0x3f2416f9782c069cd8ca40a3648b141578cfe460";
const OTHER = "0xb59b2c4efdae4a9d9eb497e435cf25b65001d224";
const LEGACY_CLUB = "0x8ffa55692dd46ad5f2ca61d8781b55a05a38fd47";

function withStorage(seed: Record<string, string>, fn: (store: Map<string, string>) => void) {
  const store = new Map(Object.entries(seed));
  const original = globalThis.window;
  // @ts-expect-error minimal window mock
  globalThis.window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
  try {
    fn(store);
  } finally {
    globalThis.window = original;
  }
}

test("clubs removed before per-account storage (bare hui_removed_groups key) stay removed for every account and guest", () => {
  withStorage({ [REMOVED_CLUBS_STORAGE_KEY]: JSON.stringify([LEGACY_CLUB.toUpperCase().replace("0X", "0x")]) }, () => {
    assert.ok(getRemovedGroups(WALLET).has(LEGACY_CLUB));
    assert.ok(getRemovedGroups(OTHER).has(LEGACY_CLUB));
    assert.ok(getRemovedGroups().has(LEGACY_CLUB));
  });
});

test("background sync (revive:false) does not bring back a legacy-removed club", () => {
  withStorage({ [REMOVED_CLUBS_STORAGE_KEY]: JSON.stringify([LEGACY_CLUB]) }, () => {
    saveKnownGroup({ address: LEGACY_CLUB, name: "Synced", version: "v2-bonded" }, WALLET, { revive: false });
    assert.equal(getKnownGroups(WALLET).some((g) => g.address.toLowerCase() === LEGACY_CLUB), false);
  });
});

test("explicitly re-adding a legacy-removed club clears it from both legacy and account removed lists", () => {
  withStorage(
    {
      [REMOVED_CLUBS_STORAGE_KEY]: JSON.stringify([LEGACY_CLUB]),
      [getAccountRemovedStorageKey(WALLET)]: JSON.stringify([LEGACY_CLUB]),
    },
    (store) => {
      saveKnownGroup({ address: LEGACY_CLUB, name: "Re-added" }, WALLET);
      assert.equal(getRemovedGroups(WALLET).has(LEGACY_CLUB), false);
      assert.deepEqual(JSON.parse(store.get(REMOVED_CLUBS_STORAGE_KEY)!), []);
      assert.ok(getKnownGroups(WALLET).some((g) => g.address.toLowerCase() === LEGACY_CLUB));
    }
  );
});
