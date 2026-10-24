import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { t, type Language } from "../src/lib/i18n.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

test("TC-ROSTER-01 (AC-01.1): Hook useClubMembers reads members array dynamically up to max count", () => {
  const hookSrc = readSource("src/hooks/useSavingsClub.ts");

  assert.ok(
    hookSrc.includes("export function useClubMembers"),
    "useClubMembers must be exported from useSavingsClub.ts"
  );
  assert.ok(
    hookSrc.includes('functionName: "members"'),
    "useClubMembers must read members array from contract"
  );
  assert.ok(
    hookSrc.includes("export interface ClubMemberInfo"),
    "ClubMemberInfo interface must be exported"
  );
});

test("TC-ROSTER-02 (AC-01.2, AC-01.3, AC-01.4): useClubMembers queries live contributions, bids, and identifies highest bidder", () => {
  const hookSrc = readSource("src/hooks/useSavingsClub.ts");

  // Read member details on-chain
  assert.ok(
    hookSrc.includes('functionName: "getRoundContribution"'),
    "Hook must query getRoundContribution for each member"
  );
  assert.ok(
    hookSrc.includes('functionName: "getRoundBid"'),
    "Hook must query getRoundBid for each member"
  );
  assert.ok(
    hookSrc.includes('functionName: "hasWon"'),
    "Hook must query hasWon for each member"
  );
  assert.ok(
    hookSrc.includes('functionName: "isKicked"'),
    "Hook must query isKicked for each member"
  );

  // Highest bidder tracking
  assert.ok(
    hookSrc.includes("highestBidder"),
    "Hook must compute and expose highestBidder"
  );
  assert.ok(
    hookSrc.includes("highestBid"),
    "Hook must compute and expose highestBid"
  );
});

test("TC-ROSTER-03 (AC-02.1, AC-02.2): ClubMembersRoster component renders header, member count, and Pitch-Black styling", () => {
  const rosterSrc = readSource("src/components/savings/ClubMembersRoster.tsx");

  assert.ok(
    rosterSrc.includes("export function ClubMembersRoster"),
    "ClubMembersRoster must be exported as a functional component"
  );
  assert.ok(
    rosterSrc.includes("bg-[#0c0d14]"),
    "Component should feature pitch-black luxury background styling"
  );
  assert.ok(
    rosterSrc.includes("border-amber-500/20"),
    "Component should have amber theme border"
  );
  assert.ok(
    rosterSrc.includes("roster.title"),
    "Component should use i18n roster.title translation key"
  );
  assert.ok(
    rosterSrc.includes("roster.desc"),
    "Component should use i18n roster.desc translation key"
  );
});

test("TC-ROSTER-04 (AC-02.3, AC-02.4): User row highlight (isUser), youBadge, and contribution status display", () => {
  const rosterSrc = readSource("src/components/savings/ClubMembersRoster.tsx");

  // User highlight
  assert.ok(
    rosterSrc.includes("isUser"),
    "Roster must check if member address matches connected user address"
  );
  assert.ok(
    rosterSrc.includes("roster.youBadge"),
    "Roster must render youBadge for the active connected user"
  );
  assert.ok(
    rosterSrc.includes("bg-amber-950/25 border-amber-500/50"),
    "User row must receive distinct high-contrast golden accent"
  );

  // Contribution status
  assert.ok(
    rosterSrc.includes("hasContributed"),
    "Roster must evaluate hasContributed status for each member"
  );
  assert.ok(
    rosterSrc.includes("CheckCircle2"),
    "Roster must show CheckCircle2 icon for contributed members"
  );
  assert.ok(
    rosterSrc.includes("AlertCircle"),
    "Roster must show AlertCircle icon for pending members"
  );
});

test("TC-ROSTER-05 (AC-02.5, AC-02.6): Live bid display, top bidder crown badge, and win/kicked state icons", () => {
  const rosterSrc = readSource("src/components/savings/ClubMembersRoster.tsx");

  // Bid display and crown
  assert.ok(
    rosterSrc.includes("isHighest"),
    "Roster must check if member is highest bidder"
  );
  assert.ok(
    rosterSrc.includes("Crown"),
    "Roster must render Crown icon for the highest bidder"
  );

  // Win and Kicked status
  assert.ok(
    rosterSrc.includes("member.hasWon"),
    "Roster must display trophy badge for previous pot winners"
  );
  assert.ok(
    rosterSrc.includes("member.isKicked"),
    "Roster must display kicked badge for defaulted members"
  );
});

test("TC-ROSTER-06 (AC-03.1): App.tsx imports and integrates ClubMembersRoster in Left Column", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify import
  assert.ok(
    appSrc.includes('import { ClubMembersRoster } from "./components/savings/ClubMembersRoster"'),
    "App.tsx must import ClubMembersRoster"
  );
  assert.ok(
    appSrc.includes("useClubMembers"),
    "App.tsx must invoke useClubMembers hook"
  );

  // Verify positioning in Left Column
  const clubCardIndex = appSrc.indexOf("<ClubCard");
  const rosterIndex = appSrc.indexOf("<ClubMembersRoster");
  const roundHistoryIndex = appSrc.indexOf("<RoundHistory");

  assert.ok(clubCardIndex > 0, "ClubCard should be rendered in App.tsx");
  assert.ok(rosterIndex > 0, "ClubMembersRoster should be rendered in App.tsx");
  assert.ok(roundHistoryIndex > 0, "RoundHistory should be rendered in App.tsx");

  assert.ok(
    clubCardIndex < rosterIndex,
    "ClubMembersRoster must be rendered after ClubCard"
  );
  assert.ok(
    rosterIndex < roundHistoryIndex,
    "ClubMembersRoster must be rendered before RoundHistory"
  );
});

test("TC-ROSTER-07 (AC-03.2): Dictionary coverage in src/lib/i18n.ts for roster translations", () => {
  const languages: Language[] = ["vi", "en"];

  for (const lang of languages) {
    const title = t("roster.title", lang);
    const desc = t("roster.desc", lang);
    const colMember = t("roster.colMember", lang);
    const colContrib = t("roster.colContrib", lang);
    const colBid = t("roster.colBid", lang);
    const colStatus = t("roster.colStatus", lang);
    const youBadge = t("roster.youBadge", lang);
    const ownerBadge = t("roster.ownerBadge", lang);
    const contributedBadge = t("roster.contributedBadge", lang);
    const waitingContribBadge = t("roster.waitingContribBadge", lang);
    const highestBidderBadge = t("roster.highestBidderBadge", lang);

    assert.ok(title.length > 0);
    assert.ok(desc.length > 0);
    assert.ok(colMember.length > 0);
    assert.ok(colContrib.length > 0);
    assert.ok(colBid.length > 0);
    assert.ok(colStatus.length > 0);
    assert.ok(youBadge.length > 0);
    assert.ok(ownerBadge.length > 0);
    assert.ok(contributedBadge.length > 0);
    assert.ok(waitingContribBadge.length > 0);
    assert.ok(highestBidderBadge.length > 0);
  }

  assert.equal(t("roster.title", "vi"), "Danh Sách Thành Viên & Tiến Độ");
  assert.equal(t("roster.title", "en"), "Club Members & Live Tracker");
  assert.equal(t("roster.youBadge", "vi"), "Bạn");
  assert.equal(t("roster.youBadge", "en"), "You");
});

test("TC-ROSTER-08 (AC-03.3): Verification of no forbidden sub-12px text size classes in ClubMembersRoster", () => {
  const rosterSrc = readSource("src/components/savings/ClubMembersRoster.tsx");

  assert.ok(!rosterSrc.includes("text-[10px]"), "ClubMembersRoster must not contain text-[10px]");
  assert.ok(!rosterSrc.includes("text-[11px]"), "ClubMembersRoster must not contain text-[11px]");
});
