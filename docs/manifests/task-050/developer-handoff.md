# Task-050 Developer handoff

Frozen exactly three assigned source files in manifest.json; baseline snapshots preserve the current Task049 work before this presentation change. implementation.diff compares those snapshots directly.

Both wallet panels now render a single shared CollateralPreview card. Default content is a concise title/status, exact8 shortfall or locked amount, and expected balance after deposit or current wallet balance. Deficit, unavailable/loading and legacy consent warnings remain visible. Native details is closed by default, with bilingual Details/Chi tiết, amounts/rewards, full addresses, policy/approval explanations and refresh. Existing ACTIVE shortfall notice is retained inside details. Narrow layout uses min-w-0 and break-all for amounts/addresses; actions wrap to card width.

Topup and eligible claim controls are children outside details, retaining handlers, exact approval/batch labels and disabled/eligibility conditions. Known locked/reward props and claim children remain available when the quote is unavailable. No financial calculation helper, contract, hook, App, account handling, transaction call or receipt flow was changed. No price/default amount was added.

Shared API: existing view?/language? plus status?, required?, locked?, balance?, rewards?, groupAddress?, tokenAddress?, accountAddress?, detailsNotice?:ReactNode, children?:ReactNode. Quote values take precedence over display fallback props.

Validation executed on final source:
- npm run typecheck > docs/manifests/task-050/developer-typecheck.log 2>&1: exit0.
- git diff --check: exit0.
- manifest-tool.mjs freeze task-050 <threefiles>: exit0.
- manifest-tool.mjs verify task-050 > docs/manifests/task-050/developer-verify.log 2>&1: exit0.

Independent Tester must run relevant existing runtime/component checks and final build as directed by Leader. No tests were edited by Developer, no commit/push/deploy or live wallet transaction occurred. Source editing stopped after freeze.

## Revision v2: typography handback

QA found existing minimum-font regressions. Replaced every text-[11px] occurrence in CollateralPreview.tsx with text-xs (12px), preserving spacing/layout and all behavior. Previous manifest/logs/source preserved under revision-v1; both panel hashes verified unchanged. Final typecheck, diffcheck and refrozen three-file manifest verification exit0. No other source changes; stopped editing for independent retest.
