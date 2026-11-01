# Task-049 — independent QA plan

Spec-v1 Gate1 approved; implementation in progress, no acceptance execution before freeze. Local-only: no commit/push/deployment/live wallet transaction. Three historical review docs are absent at the beginning of task049; recorded null baseline, not an unchanged-hash claim.

| REQ | Prepared/planned independent evidence |
| --- | --- |
| 01 creation/config | Actual create modal none/custom/no-default input, strict8decimal+uint256,encoded7thconstructor requirement and submitted-snapshot receipt metadata; owner confirmed/rejected path source/runtime. Constructor/setter Solidity guards. |
| 02 exact model | Parser/shortfall raw bigint vectors including1satoshi,deficit1,zero,fullylocked,huge; actual quote reader perclub token/account and rewards separate; actual preview both modes. |
| 03 EOA explicit action | Actual panel callbacks capture exactDapproval/target,receipt/refetch noautomaticjoin/deposit,separate click,newpolicyboundedjoinR and legacy noarg; fresh quote/context/funds/unknown/pending/error guards. |
| 04 passkey | Actual batch callback decode approve exactD iffneeded then one join/deposit, zero/funded noapproval; both languages,smart account context,receipt/rejection. |
| 05 enforcement | New CollateralPolicy.t.sol: constructor/marker,bothjoins exactdebit/rollback,boundedquotechange,transferfailure,reentrancy,none0nopull,prelockedshortfall,startdefense,deposit0/over/notmember/kicked/stateguards,contribute/bidunderfunded,nodebitonrevert. |
| 06 lifecycle/legacy | New Solidity slashed/withdrawnrestart noautodebit,partialACTIVEtopup stillblocked thenfullyfunded participation,rewards!=locked; existing cancellation/slash/claim/history regressions. Actual policy hook statuses/account-group stale result/reviewchanges; task048cyclecapability staysindependent. |
| 07 integrity | Constructor test fixtures migrated7th0; preserve firstfail logs before obsolete-policy oracle corrections. Full npm/typecheck/build/Forge+invariants, independently compiledABI/creation/runtimeartifact match,pre/postsourcehash and separatetesthash. |

Defensive Solidity tests deliberately use PolicyHarness.seedLocked/seedReward for states normal mandatory join prevents; lifecycle tests use real slash/claim/restart flows. UI/hook tests execute production modules with boundary mocks and report limits separately from source review. Existing old-policy overdeposit/optionaljoin expectations will be corrected only with explicit spec evidence; no implementation changes by Tester.
