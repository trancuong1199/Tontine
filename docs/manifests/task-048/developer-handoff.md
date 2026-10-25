# Task-048 Developer handoff

Source frozen across the seven assigned files; manifest.json contains SHA256 for each. New source: src/lib/cycleCapabilities.ts. Baseline captured before implementation; implementation.diff is relative to those snapshots.

Capability is a separate Arc-pinned, selected-address cycleStartRound query. Bigint zero/positive is supported, definite EVM code 3/typed execution revert or empty return is unsupported, generic RPC/transport is error, and pending/refetch is checking. Previous-address placeholder data is explicitly disabled. Generic viem ContractFunctionRevertedError does not itself establish unsupported because viem also wraps internal RPC errors in this class.

App passes capability and retry into both panels. Completed injected members can restart only with supported capability, with the same check inside the callback. Both modes provide distinct bilingual notices and a create-club CTA; passkey adds no restart transaction. Existing claims, collateral withdrawals, active collateral notice and history remain available.

Only startNewCycle adds simulation after Arc chain switching, with the actual connected sender and requested target/ABI/args/value. Sender/chain checks before and after simulation reject stale context. Simulation/switch errors are returned by the hook and toasted through parseContractError; pending clears for retry. A restart lock prevents duplicate preflight/wallet calls and releases on wallet settlement. Other writes retain the existing guard and request forwarding.

Validation executed:
- `npm run typecheck > docs/manifests/task-048/developer-typecheck.log 2>&1` — exit 0 on final source.
- `git diff --check` — exit 0.
- `node scripts/manifest-tool.mjs freeze task-048 <seven assigned source files>` — exit 0.
- `node scripts/manifest-tool.mjs verify task-048 > docs/manifests/task-048/developer-verify.log 2>&1` — exit 0.

Independent Tester must run runtime classifier, actual hooks/panels, npm tests, typecheck and build against frozen hashes. No live wallet operation, deployment, gas override, contract/artifact change, test edits, commit or review-doc edits were performed by Developer. Simulation cannot guarantee the chain state remains unchanged before mining.
