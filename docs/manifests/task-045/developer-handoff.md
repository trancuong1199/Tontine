# Task-045 Developer handoff

Spec: `docs/ba/task-045/spec-v1.md`; source frozen in `manifest.json` (8 files). Baseline captured before all edits; `implementation.diff` compares source to baseline, excluding generated JSON.

Changes:

- Shared `onchain-money.formatUsdc` is the sole grouped, two-decimal, half-up UI formatter; `contract.ts` directly re-exports it. `formatUsdcExact` preserves exact ungrouped conversion and strict/compatibility parsers remain unchanged.
- Both raise-bid preset controls call `getRaisedBidInput(userBid, delta)` using bigint arithmetic and exact decimal input; existing preset choices remain unchanged.
- Both panels explain cycle termination, reset membership flags, and the fact that slashed/withdrawn collateral is not restored or deposited automatically. Eligible ACTIVE members see a notice only when their read locked collateral is explicitly zero. The injected vault now retains that explicit zero instead of displaying configured collateral as an actual locked balance.
- Solidity comments explain why no-winner settlement preserves historical contribution/bid mappings while claimable tracks outstanding refunds, and why ACTIVE cancellation clears only unsettled mappings. Contract executable logic is unchanged. Artifact rebuilt with solc 0.8.28 default Foundry settings and two-space JSON formatting.

Developer validation (independent QA still required):

| Command | Exit | Evidence |
| --- | --- | --- |
| `npm run typecheck` | 0 | `developer-typecheck.log` |
| Forge build with `--use /tmp/tontine-task-044-toolchain/solc-0.8.28 --out /tmp/task045-build --cache-path /tmp/task045-cache --skip test --skip script` | 0 | `developer-contract-build.log`, 16 compiled files |
| `npm run build` | 0 | `developer-build.log`; final repeat also exit 0 after explicit-zero display correction, `developer-build-final.log` (24.23s) |
| `git diff --check` | 0 | Tool output |
| `node scripts/manifest-tool.mjs verify task-045` | 0 | `developer-verify.log` |

Manual runtime probe imported the real shared formatter, contract export and preset helper. Observed formatter identity `true`, display `9,007,199,254,740,993.12`, exact `9007199254740993.123456`, and preset results `1000.5`, `1.334567`, `9007199254740993.623456` for the spec inputs. Tester must independently execute assertions on the frozen files.

No public deployment/transaction, automatic collateral debit, new passkey deposit/start-cycle feature, or edit to the two untracked review documents was made. Frontend build retains existing dependency annotation/large-bundle warnings; Solidity build retains timestamp lint warnings. Source edits stopped at freeze; final frontend build also completed with exit 0.
