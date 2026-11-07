# Independent QA — bonded-state-ux-20261107

**Signoff: PASS for spec-v1 code and fixture UI scope, 2026-11-07.** Tester changed tests/QA artifacts only. No wallet signing, live contract writes, production deployment, or oracle service activation was performed. The existing oracle service host/credential operational blocker remains outside this task.

## Frozen source and commands

Final Workspace SHA256: `43bacc30b76c3f1314c93b2043f2cb683abbd6475837d4c082e85403cc2f23c8`. Both manifests verified before and after final validation: `bonded-state-ux-20261107` has 8 files; `task-059` has 22. A separate executable comparison against `git show HEAD:docs/manifests/task-059/manifest.json` confirmed the original 22 paths, baselineSha256 and isNew metadata are preserved.

All logs below are local ignored files in this directory.

| Command/check | Result | Evidence |
| --- | --- | --- |
| `npm test` outside sandbox | exit 0; 529 pass, 0 fail, 0 skip; 21.37 seconds | full-final.log |
| `npm run build` final freeze | exit 0 | build-final.log |
| `npx tsc --noEmit` final freeze | exit 0 | typecheck-final.log |
| New state UX suite | 6 behavior tests pass, included in definitive full run | focused-final.log, full-final.log |
| Both manifest verifications before/after | all 8 / 22 match; exit 0 each | hash-final-before.log, hash-final-after.log, task059-final-before.log, task059-final-after.log |
| Original task059 path/baseline comparison | exit 0 | task059-integrity.log |

Initial sandbox suite reported the known ten-members spawnSync EPERM, plus obsolete expectations described below. The definitive unrestricted run passes. The integrity script also required approved unrestricted execution after sandbox spawnSync git EPERM. An initial mistyped `task059` manifest command was corrected to `task-059`; this was an invocation error, not a failed hash. Build reports dependency annotation and bundle-size warnings, without errors.

## Independent behavior coverage

Tests use esbuild to load actual components and hook implementation. Component harnesses replace React hook scheduling/provider boundaries and call actual rendered handlers; browser fixtures use real React rendering and compiled application CSS. They do not merely match implementation source strings.

| AC | Executable / browser evidence |
| --- | --- |
| AC1 state/outcome | S1: all three terminal states EN/VI, no ongoing risk/health/keeper grid, zero recovery, unavailable balances, already withdrawn, owner residual and passkey branches. S2: full OPEN hides join/risk while full ACTIVE retains contribution. Prior risk suite confirms terminal claim/withdraw handlers remain usable. Actual completed/defaulted/cancelled browser renders. |
| AC2 mobile actions | S2 invokes desktop and mobile handlers concurrently and observes only one approve and one contribute. Prior risk suite blocks unchecked consent and invalidates pending approval on account/club/quote/uncheck/loading/unmount. Actual 390px fixed bar, no horizontal overflow, keyboard Review scroll/focus and modal stacking inspected. |
| AC3 preview | S3 renders OPEN with/without capacity, ACTIVE, all terminal states and loading; join invitation only OPEN with capacity. Browser full OPEN EN and ACTIVE VI previews use actual components within App-equivalent padded max-width wrapper. |
| AC4 creation | S4 inspects initially visible essential terms, zero initial cirBTC, positive collateral plus two members start conditions, separate 200%-of-exposure rule and absence of fabricated BTC price. Programmatic submit without consent cannot write; checked consent enables it; two submissions during deferred write produce one createClub. Actual fixed footer and scrollable body at all three sizes, checkbox interaction and keyboard access inspected. |
| AC5 risk summary | S1/S2 plus existing risk/review suites retain meaningful fresh/stale/unknown coverage and one actionable acknowledgement only when funding eligible; terminal pages have none. Actual ACTIVE mobile screenshot shows framed collateral/coverage/oracle information and acknowledgement reached by Review. |
| AC6 formatting | S5 checks 10.00 USDC, smallest positive amount, 1 day and exact 0.0075%. Prior review asserts $0.012 collateral and readable historical age. Actual browser Timeline initially exposed raw86400s; Developer fixed it, rebuilt fixture and targeted ACTIVE VI retest confirmed no raw86400s and localized cycle. Source review confirms bounded health label and human action labels. |
| AC7 roster/owner | S5 displays contributed/not contributed/unknown independently and invalidates prior-round UI; owner prerequisites tested. S7 runs actual useBondedClub with per-address contributed calls: one failed address stays null while others succeed; next round replaces values. Existing hook context guards plus pending account/club regression tests retained. |
| AC8 integrity/UI | Final 8/22 pre/post matches, original task059 metadata comparison, full tests/build/typecheck, real bsk browser run and artifacts below. |

Legacy test updates are intentional: `joinGroup` visible text is now `Join Club`; unavailable data hides funding acknowledgement, so its test now retains a previously enabled actual handler, changes to unavailable data and proves it cannot write; terminal claim/withdraw callbacks moved into TerminalView; fixtures explicitly declare positionAvailable and round-indexed member data. The old raw oracle age assertion now expects `1.6 days / 1 hour`. Exact valuation, loss acknowledgement, pending approval invalidation, claims and withdrawals remain covered.

## Actual browser evidence

Read browser-skill and bsk-avada, including cooperation/debugging/interaction/screenshots references. Used own background AgentWindow session `rafi`, debug capture started before navigation; no user tabs borrowed. Served the generated fixture at localhost:4178. Real Workspace, Preview and CreateModal plus compiled Tailwind CSS were rendered; wagmi/provider/wallet boundaries were mocked and all recorded write arrays remained empty. Session, debug capture and HTTP server were stopped after testing.

`browser-fixture.mjs` reproduces the fixture. `browser-observations.json` retains compact measured geometry. PNGs and raw capture are local `/tmp` artifacts, intentionally not committed:

| View | Screenshot / observed result |
| --- | --- |
| Completed EN 1440×900 | `/tmp/state-ux-completed-desktop-en.png`: terminal balances, no prospective risk; desktop mobile bar hidden. |
| Defaulted VI / Cancelled EN 390×844 | `/tmp/state-ux-defaulted-mobile-vi.png`, `/tmp/state-ux-cancelled-mobile-en.png`: outcome/recovery or no eligible claim; width390, fixedbar bottom844. |
| Full OPEN / ACTIVE previews 390×844 | `/tmp/state-ux-full-preview-mobile-en.png`, `/tmp/state-ux-active-preview-mobile-vi.png`: padded cards, width390, state-aware CTA checked in DOM. |
| Create VI 390×844 | `/tmp/state-ux-modal-mobile-vi.png`, `/tmp/state-ux-modal-mobile-vi-consent.png`: after body scroll428, checkbox703–719, submit771–819, footer673–831; consent checked enables submit without writing. |
| Create EN 390×667 | `/tmp/state-ux-modal390x667en.png`: checkbox506.5–522.5, submit594–642, footer476.5–654; body height345 and scrollHeight1013. |
| Create EN/VI 1440×900 | `/tmp/state-ux-modal1440x900en.png`, `/tmp/state-ux-modal1440x900vi.png`: checkbox755–771 and submit823–871 remain visible, scroll body613; no horizontal overflow. |
| ACTIVE risk review 390×844 EN | `/tmp/state-ux-active-mobile-review-en.png`: keyboard Enter on observed Review button scrolls/focuses unchecked acknowledgement above fixed bar; no transaction. |
| Final duration retest / full OPEN workspace | `/tmp/state-ux-active-final-mobile-vi.png`, `/tmp/state-ux-full-open-mobile-en.png`: rebuilt duration fixture, no raw86400s or horizontal overflow; full OPEN has no join/risk. |

The mobile submit center hit-test found BrowserSkill's own overlay above the button; inspected underlying stack contained the real submit button, not an application overlay. A mouse Review action delivered but did not scroll; the subsequent observed keyboard activation worked and the settled screenshot documents the resulting position. This is not claimed as a successful mouse activation. Safe-area CSS exists and zero-inset desktop emulation shows correct padding; physical notched-device inset behavior was not exercised. One debug capture error is the fixture's missing favicon404. Raw capture: `/tmp/state-ux-debug-final.json`.

Browser geometry was collected before the final copy-only removal of `(DefaultPending)` from a conditional explanation; the duration change was rebuilt and browser-retested before that removal. Final full tests/build/typecheck and hashes use the latest SHA above; unchanged modal/terminal layout evidence was not redundantly rerun. This is controlled fixture UI verification, not live RPC/wallet end-to-end or physical-device testing.

### Narrow pointer retest — resolved

Leader requested proof of native pointer activation because keyboard success alone was insufficient. In a new own background session `vdmg`, recorded DOM click events without modifying application handlers or BrowserSkill settings. The default center click generated a trusted click whose target was **BROWSER-SKILL-OVERLAY**, leaving scrollY0: the application did not receive it. Hit-testing the button's left side showed BUTTON first. BrowserSkill click has no offset option; its supported native pointer drag with a 1px displacement and from-offset-x -150 delivered down/up at x37.5→38.5,y810 within that unobstructed part of the same observed button. The resulting actual DOM event was `type:click,isTrusted:true,target:BUTTON,text:Review and acknowledge risk`.

After smooth scroll settled, scrollY2097, focused element type checkbox, risk checkbox top663 versus fixed bar top775, writes[]. Thus direct pointer activation of the real button runs its handler and reveals the acknowledgement; the earlier failure was interception by the tool's own overlay. No synthetic DOM click, app handler invocation, overlay removal or permission-setting change was used. This verifies a native mouse-pointer click in the mobile viewport, not a physical touch device. Evidence: `pointer-observation.json`, `/tmp/state-ux-mobile-pointer-success.png`, `/tmp/state-ux-pointer-debug.json`. Session/debug and localhost server were stopped again; no source changes or full-suite repetition were needed.
