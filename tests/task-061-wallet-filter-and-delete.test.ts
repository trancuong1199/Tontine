import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getRemovedGroups,
  removeKnownGroup,
  getKnownGroups,
  saveKnownGroup,
  syncFactoryBondedClubs,
} from "../src/lib/savingsClubDirectory.ts";
import { ARC_TESTNET_DEFAULT_BONDED_CLUB } from "../src/config/bonded-tontine.ts";

// Mock localStorage for node environment
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

test.beforeEach(() => {
  (globalThis as any).window = {
    localStorage: new MockLocalStorage(),
  };
});

test("TC-061-01: Canonical default club can be permanently removed without auto-resurrection", () => {
  const account = "0x3f2416F9782c069cD8cA40a3648B141578CFe460";
  const canonicalAddr = ARC_TESTNET_DEFAULT_BONDED_CLUB;

  // Initially not removed
  let removed = getRemovedGroups(account);
  assert.equal(removed.has(canonicalAddr.toLowerCase()), false);

  // Remove it
  removeKnownGroup(canonicalAddr, account);

  // Read back: should be in removed set
  removed = getRemovedGroups(account);
  assert.equal(removed.has(canonicalAddr.toLowerCase()), true);

  // Read again (simulating multiple reads/reloads): must STILL be in removed set!
  removed = getRemovedGroups(account);
  assert.equal(removed.has(canonicalAddr.toLowerCase()), true);
});

test("TC-061-02: getKnownGroups isolates per account and does not auto-dump default clubs into connected account", () => {
  const accountA = "0x1111111111111111111111111111111111111111";
  const guestResult = getKnownGroups(undefined);
  assert.ok(guestResult.length > 0, "Guest should receive default template clubs");

  // Fresh account A with no saved groups receives empty list (not contaminated by default clubs)
  const accountAResult = getKnownGroups(accountA);
  assert.equal(accountAResult.length, 0, "Connected account A with no saved clubs should have 0 clubs");

  // Save a club for account A
  const testClub = "0x2222222222222222222222222222222222222222";
  saveKnownGroup({ address: testClub, name: "Club A", creator: accountA }, accountA);

  assert.equal(getKnownGroups(accountA).length, 1);
  assert.equal(getKnownGroups(accountA)[0].address.toLowerCase(), testClub.toLowerCase());

  // Account B remains clean
  const accountB = "0x3333333333333333333333333333333333333333";
  assert.equal(getKnownGroups(accountB).length, 0, "Account B should remain empty");
});

test("TC-061-03: syncFactoryBondedClubs only syncs clubs where account is owner or member", async () => {
  const myAccount = "0x3f2416f9782c069cd8ca40a3648b141578cfe460";
  const otherAccount = "0x9999999999999999999999999999999999999999";
  const factoryAddr = "0x8ce12d62b0bd565c92164ac7c847620bfe710eb0";

  const club1 = "0x1111111111111111111111111111111111111111"; // owned by myAccount
  const club2 = "0x2222222222222222222222222222222222222222"; // member is myAccount
  const club3 = "0x3333333333333333333333333333333333333333"; // completely unrelated club

  const mockReader = {
    async readContract({ address, functionName, args }: any) {
      if (address.toLowerCase() === factoryAddr.toLowerCase()) {
        if (functionName === "clubsLength") return 3n;
        if (functionName === "clubAt") {
          const idx = Number(args[0]);
          return [club1, club2, club3][idx];
        }
      }
      if (functionName === "groupName") {
        return `Club ${address.slice(0, 6)}`;
      }
      if (functionName === "owner") {
        if (address.toLowerCase() === club1.toLowerCase()) return myAccount;
        if (address.toLowerCase() === club2.toLowerCase()) return otherAccount;
        if (address.toLowerCase() === club3.toLowerCase()) return otherAccount;
      }
      if (functionName === "isMember") {
        const queryUser = args?.[0]?.toLowerCase();
        if (address.toLowerCase() === club2.toLowerCase() && queryUser === myAccount.toLowerCase()) {
          return true;
        }
        return false;
      }
      return undefined;
    },
  };

  const synced = await syncFactoryBondedClubs(
    mockReader as any,
    factoryAddr as `0x${string}`,
    [],
    [],
    myAccount
  );

  // Should only sync club1 (owned) and club2 (member), but NOT club3
  const syncedAddrs = synced.map((s) => s.address.toLowerCase());
  assert.equal(syncedAddrs.includes(club1.toLowerCase()), true, "Owned club must be synced");
  assert.equal(syncedAddrs.includes(club2.toLowerCase()), true, "Member club must be synced");
  assert.equal(syncedAddrs.includes(club3.toLowerCase()), false, "Unrelated club must NOT be synced");

  // In local storage for myAccount: only 2 clubs saved
  const mySaved = getKnownGroups(myAccount);
  assert.equal(mySaved.length, 2);
});

test("TC-061-04: ClubDirectoryModal source code includes STRIDE = 7 and wallet membership filtering", () => {
  const modalPath = path.resolve(process.cwd(), "src/components/savings/ClubDirectoryModal.tsx");
  const content = fs.readFileSync(modalPath, "utf-8");

  assert.ok(content.includes("STRIDE = 7"), "STRIDE must be 7 to query isMember");
  assert.ok(content.includes('functionName: "isMember"'), "stateContracts must query isMember on-chain");
  assert.ok(content.includes("isOwner || isMember || isCreator"), "visibleGroups must filter by owner, member, or creator");
});

test("TC-061-05: Manifest verification for task-061 integrity", () => {
  const manifestPath = path.resolve(process.cwd(), "docs/manifests/task-061/manifest.json");
  assert.ok(fs.existsSync(manifestPath), "Manifest must exist for task-061");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  assert.equal(manifest.taskId, "task-061");
  assert.ok(manifest.files["src/lib/savingsClubDirectory.ts"]);
  assert.ok(manifest.files["src/components/savings/ClubDirectoryModal.tsx"]);
});
