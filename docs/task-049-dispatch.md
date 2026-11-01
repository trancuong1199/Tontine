# Task-049 — Local collateral policy implementation

Leader: `/root`; BA: `/root/ba`; Developer: `/root/developer`; independent Tester: `/root/tester`.

Max authorized the five recommended collateral improvements. No commit, push, deployment, live transaction, or wallet confirmation is authorized for this task. Preserve the three original review documents and historical deployed addresses.

Gate 1 approved against `docs/ba/task-049/spec-v1.md`. Constructor policy is atomic; new UI joins bind the reviewed requirement with `joinGroupWithCollateral(uint256)`. Restart retains its existing behavior and does not debit collateral. Newly deployed contracts require sufficient locked collateral before contribution or bidding; withdrawn/slashed members can top up while ACTIVE. Existing kicked/final-claim rules remain unchanged.

Developer owns the implementation paths listed in the spec, plus optional `src/components/savings/CollateralPreview.tsx` and `src/hooks/useCollateralPolicy.ts`, and the six explicitly listed deployment scripts for constructor migration only. Developer must snapshot before editing and freeze source before final independent testing. No implementation edits after handoff without a new test cycle.

Additional authorized source: `src/hooks/useArcWriteContract.ts` if needed to bind collateral transactions to the reviewed wallet account across asynchronous chain/preflight checks. Capture its baseline before edits and preserve the existing restart guarantees and unrelated USDC behavior.

Tester owns `tests/**`, `contracts/test/**`, and `docs/qa/task-049/**`. Preparation may run during implementation, but final results require matching frozen source hashes before and after execution. Changes to obsolete test expectations must be tied to the accepted new requirements.

BA owns `docs/ba/task-049/**` and performs final REQ/AC/evidence coverage review after independent Tester signoff. Leader owns this dispatch and final acceptance record.

Completed: V2 passed independent QA and BA coverage; Leader accepted in `docs/task-049-acceptance.md`. A narrow handback corrected both vault cards and the partial-collateral notice; V1 evidence was preserved and final validation used V2 hashes. All work remains local.
