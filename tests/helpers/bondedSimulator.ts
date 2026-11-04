import {
  BONDED_STATE,
  DEFAULT_REASON,
  isMockOracleDescription,
  validateBondedClubParams,
  type BondedClubConfigParams,
  type BondedStateCode,
  type DefaultReasonCode,
  type OracleRoundData,
} from "../../src/lib/bondedTontine.ts";

export class MockOracleSimulator {
  public readonly decimals: number;
  public readonly description: string;
  public readonly version = 1n;
  public readonly admin: string;

  private _roundId = 1n;
  private _answer: bigint;
  private _updatedAt: bigint;
  private _answeredInRound = 1n;

  constructor(
    admin: string,
    decimals: number,
    initialAnswer: bigint,
    description: string,
    nowSeconds = 1_700_000_000n
  ) {
    if (!isMockOracleDescription(description)) {
      throw new Error("InvalidDescription");
    }
    this.admin = admin.toLowerCase();
    this.decimals = decimals;
    this.description = description;
    this._answer = initialAnswer;
    this._updatedAt = nowSeconds;
  }

  public setPrice(caller: string, answer: bigint, nowSeconds: bigint): void {
    if (caller.toLowerCase() !== this.admin) throw new Error("OnlyAdmin");
    this._roundId += 1n;
    this._answer = answer;
    this._updatedAt = nowSeconds;
    this._answeredInRound = this._roundId;
  }

  public setUpdatedAt(caller: string, ts: bigint): void {
    if (caller.toLowerCase() !== this.admin) throw new Error("OnlyAdmin");
    this._updatedAt = ts;
  }

  public setBad(caller: string, answer: bigint): void {
    if (caller.toLowerCase() !== this.admin) throw new Error("OnlyAdmin");
    this._answer = answer;
  }

  public setAnsweredInRound(caller: string, answeredInRound: bigint): void {
    if (caller.toLowerCase() !== this.admin) throw new Error("OnlyAdmin");
    this._answeredInRound = answeredInRound;
  }

  public latestRoundData(): OracleRoundData {
    return {
      roundId: this._roundId,
      answer: this._answer,
      startedAt: this._updatedAt,
      updatedAt: this._updatedAt,
      answeredInRound: this._answeredInRound,
    };
  }
}

export class MockTokenLedger {
  public readonly decimals: number;
  public balances = new Map<string, bigint>();
  public blocked = new Set<string>();
  public feeBps = 0n;

  constructor(decimals = 6) {
    this.decimals = decimals;
  }

  public mint(to: string, amount: bigint): void {
    const key = to.toLowerCase();
    this.balances.set(key, (this.balances.get(key) ?? 0n) + amount);
  }

  public balanceOf(addr: string): bigint {
    return this.balances.get(addr.toLowerCase()) ?? 0n;
  }

  public setBlocked(addr: string, isBlocked: boolean): void {
    const key = addr.toLowerCase();
    if (isBlocked) this.blocked.add(key);
    else this.blocked.delete(key);
  }

  public transfer(from: string, to: string, amount: bigint): bigint {
    const f = from.toLowerCase();
    const t = to.toLowerCase();
    if (this.blocked.has(f) || this.blocked.has(t)) {
      throw new Error("AddressBlocked");
    }
    const bal = this.balanceOf(f);
    if (bal < amount) {
      throw new Error("ERC20InsufficientBalance");
    }
    const fee = (amount * this.feeBps) / 10_000n;
    const received = amount - fee;
    this.balances.set(f, bal - amount);
    this.balances.set(t, this.balanceOf(t) + received);
    return received;
  }
}

export class BondedTontineSimulator {
  public readonly address: string;
  public owner: string;
  public pendingOwner: string | null = null;
  public readonly usdcAddress: string;
  public readonly cirBtcAddress: string;
  public readonly priceFeedAddress: string;
  public readonly feedDecimals: number;
  public readonly maxPriceAge: bigint;
  public readonly groupName: string;
  public readonly contributionAmount: bigint;
  public readonly maxMembers: bigint;
  public readonly totalRounds: bigint;
  public readonly roundDuration: bigint;
  public readonly rateBpsPerRound: bigint;
  public readonly safetyBps: bigint;
  public readonly liquidationBps: bigint;
  public readonly interestGrace: bigint;
  public readonly settlementGrace: bigint;

  public state: BondedStateCode = BONDED_STATE.OPEN;
  public startTime = 0n;
  public isMember = new Map<string, boolean>();
  public memberCount = 0n;
  public deposit = new Map<string, bigint>();
  public totalDeposits = 0n;
  public contributed = new Map<string, boolean>();
  public accInterestPerShare = 0n;
  public rewardDebt = new Map<string, bigint>();
  public interestClaimable = new Map<string, bigint>();
  public collateral = 0n;
  public totalDebt = 0n;
  public peakDebt = new Map<bigint, bigint>();
  public interestDue = new Map<bigint, bigint>();
  public lastRolledRound = 0n;
  public interestDueTotal = 0n;
  public interestPaidTotal = 0n;
  public interestClaimedTotal = 0n;
  public settledTotalDeposits = 0n;
  public settledRecoveredUsdc = 0n;
  public settledCollateral = 0n;
  public principalWithdrawn = new Map<string, boolean>();
  public lastDefaultReason: DefaultReasonCode | null = null;

  private usdcLedger: MockTokenLedger;
  private cirBtcLedger: MockTokenLedger;
  private oracle: MockOracleSimulator;
  private getNow: () => bigint;

  constructor(opts: {
    address: string;
    owner: string;
    usdcAddress: string;
    cirBtcAddress: string;
    priceFeedAddress: string;
    maxPriceAge: bigint;
    params: BondedClubConfigParams;
    usdcLedger: MockTokenLedger;
    cirBtcLedger: MockTokenLedger;
    oracle: MockOracleSimulator;
    getNow: () => bigint;
  }) {
    const zero = "0x0000000000000000000000000000000000000000";
    if (
      !opts.owner ||
      opts.owner === zero ||
      !opts.usdcAddress ||
      opts.usdcAddress === zero ||
      !opts.cirBtcAddress ||
      opts.cirBtcAddress === zero ||
      opts.usdcAddress.toLowerCase() === opts.cirBtcAddress.toLowerCase() ||
      opts.usdcLedger.decimals !== 6 ||
      opts.cirBtcLedger.decimals !== 8 ||
      !opts.priceFeedAddress ||
      opts.priceFeedAddress === zero ||
      opts.oracle.decimals > 18 ||
      opts.maxPriceAge < 3_600n ||
      opts.maxPriceAge > 172_800n
    ) {
      throw new Error("InvalidConfiguration");
    }

    const check = validateBondedClubParams(opts.params);
    if (!check.valid) {
      throw new Error("InvalidConfiguration");
    }

    this.address = opts.address.toLowerCase();
    this.owner = opts.owner.toLowerCase();
    this.usdcAddress = opts.usdcAddress.toLowerCase();
    this.cirBtcAddress = opts.cirBtcAddress.toLowerCase();
    this.priceFeedAddress = opts.priceFeedAddress.toLowerCase();
    this.feedDecimals = opts.oracle.decimals;
    this.maxPriceAge = opts.maxPriceAge;
    this.groupName = opts.params.groupName;
    this.contributionAmount = opts.params.contributionAmount;
    this.maxMembers = BigInt(opts.params.maxMembers);
    this.totalRounds = BigInt(opts.params.maxMembers);
    this.roundDuration = BigInt(opts.params.roundDuration);
    this.rateBpsPerRound = BigInt(opts.params.rateBpsPerRound);
    this.safetyBps = BigInt(opts.params.safetyBps);
    this.liquidationBps = BigInt(opts.params.liquidationBps);
    this.interestGrace = BigInt(opts.params.interestGrace);
    this.settlementGrace = BigInt(opts.params.settlementGrace);
    this.usdcLedger = opts.usdcLedger;
    this.cirBtcLedger = opts.cirBtcLedger;
    this.oracle = opts.oracle;
    this.getNow = opts.getNow;
  }

  private onlyOwner(caller: string): void {
    if (caller.toLowerCase() !== this.owner) {
      throw new Error("OwnableUnauthorizedAccount");
    }
  }

  public transferOwnership(caller: string, newOwner: string): void {
    this.onlyOwner(caller);
    if (this.state !== BONDED_STATE.OPEN) throw new Error("TransferLockedAfterOpen");
    const norm = newOwner.toLowerCase();
    if (norm === "0x0000000000000000000000000000000000000000") {
      throw new Error("InvalidConfiguration");
    }
    if (this.isMember.get(norm)) throw new Error("AlreadyMember");
    this.pendingOwner = norm;
  }

  public acceptOwnership(caller: string): void {
    const norm = caller.toLowerCase();
    if (norm !== this.pendingOwner) throw new Error("OwnableUnauthorizedAccount");
    if (this.state !== BONDED_STATE.OPEN) throw new Error("TransferLockedAfterOpen");
    if (this.isMember.get(norm)) throw new Error("AlreadyMember");
    this.owner = norm;
    this.pendingOwner = null;
  }

  public renounceOwnership(caller: string): void {
    this.onlyOwner(caller);
    throw new Error("RenounceDisabled");
  }

  public depositCollateral(caller: string, amount: bigint): void {
    this.onlyOwner(caller);
    if (this.state !== BONDED_STATE.OPEN && this.state !== BONDED_STATE.ACTIVE) {
      throw new Error("WrongState");
    }
    if (amount <= 0n) throw new Error("InvalidAmount");
    if (this.state === BONDED_STATE.ACTIVE) {
      this._rollRounds();
    }
    const received = this.cirBtcLedger.transfer(caller, this.address, amount);
    if (received === 0n) throw new Error("InvalidAmount");
    this.collateral += received;
  }

  public withdrawCollateral(caller: string, amount: bigint): void {
    this.onlyOwner(caller);
    if (amount <= 0n || amount > this.collateral) throw new Error("InvalidAmount");
    if (this.state === BONDED_STATE.ACTIVE) {
      this._rollRounds();
      const exp = this.exposure();
      if (exp > 0n) {
        const remaining = this.collateral - amount;
        const newLimit = (this._collateralValueUsdcFor(remaining) * 10_000n) / this.safetyBps;
        if (exp > newLimit) throw new Error("CollateralLocked");
      }
    }
    this.collateral -= amount;
    this.cirBtcLedger.transfer(this.address, caller, amount);
  }

  public joinGroup(caller: string): void {
    if (this.state !== BONDED_STATE.OPEN) throw new Error("WrongState");
    const norm = caller.toLowerCase();
    if (norm === this.owner || norm === this.pendingOwner) throw new Error("OwnerCannotJoin");
    if (this.isMember.get(norm)) throw new Error("AlreadyMember");
    if (this.memberCount >= this.maxMembers) throw new Error("GroupFull");
    this.isMember.set(norm, true);
    this.memberCount += 1n;
  }

  public removeMember(caller: string, memberAddr: string): void {
    this.onlyOwner(caller);
    if (this.state !== BONDED_STATE.OPEN) throw new Error("WrongState");
    const norm = memberAddr.toLowerCase();
    if (!this.isMember.get(norm)) throw new Error("NotMember");
    this.isMember.set(norm, false);
    this.memberCount -= 1n;
  }

  public cancelOpen(caller: string): void {
    this.onlyOwner(caller);
    if (this.state !== BONDED_STATE.OPEN) throw new Error("WrongState");
    this.state = BONDED_STATE.CANCELLED;
    const col = this.collateral;
    if (col > 0n) {
      this.collateral = 0n;
      this.cirBtcLedger.transfer(this.address, caller, col);
    }
  }

  public startRounds(caller: string): void {
    this.onlyOwner(caller);
    if (this.state !== BONDED_STATE.OPEN) throw new Error("WrongState");
    if (this.memberCount < 2n || this.collateral === 0n) {
      throw new Error("InvalidConfiguration");
    }
    this.state = BONDED_STATE.ACTIVE;
    this.startTime = this.getNow();
  }

  public contribute(caller: string): void {
    if (this.state !== BONDED_STATE.ACTIVE) throw new Error("WrongState");
    this._rollRounds();
    if (this._isDefaultOrLiquidationPending()) throw new Error("DefaultPending");
    const idx = this.currentRoundIndex();
    if (idx < 1n || idx > this.maxMembers) throw new Error("RoundNotActive");
    const norm = caller.toLowerCase();
    if (!this.isMember.get(norm)) throw new Error("NotMember");
    const key = `${idx.toString()}:${norm}`;
    if (this.contributed.get(key)) throw new Error("AlreadyContributed");

    const received = this.usdcLedger.transfer(norm, this.address, this.contributionAmount);
    if (received !== this.contributionAmount) {
      this.usdcLedger.balances.set(norm, this.usdcLedger.balanceOf(norm) + this.contributionAmount);
      this.usdcLedger.balances.set(this.address, this.usdcLedger.balanceOf(this.address) - received);
      throw new Error("InvalidAmount");
    }

    this._updateMember(norm);
    this.contributed.set(key, true);

    const newDep = (this.deposit.get(norm) ?? 0n) + received;
    this.deposit.set(norm, newDep);
    this.totalDeposits += received;
    this.rewardDebt.set(norm, (newDep * this.accInterestPerShare) / 10n ** 18n);
  }

  public claimInterest(caller: string): bigint {
    if (this.state === BONDED_STATE.ACTIVE) {
      this._rollRounds();
    }
    const norm = caller.toLowerCase();
    this._updateMember(norm);
    let claimable = this.interestClaimable.get(norm) ?? 0n;
    const remaining =
      this.interestPaidTotal > this.interestClaimedTotal
        ? this.interestPaidTotal - this.interestClaimedTotal
        : 0n;
    if (claimable > remaining) {
      claimable = remaining;
    }
    if (claimable === 0n) throw new Error("NothingToClaim");
    this.interestClaimable.set(norm, 0n);
    this.interestClaimedTotal += claimable;
    this.usdcLedger.transfer(this.address, norm, claimable);
    return claimable;
  }

  public borrow(caller: string, amount: bigint): void {
    this.onlyOwner(caller);
    if (this.state !== BONDED_STATE.ACTIVE) throw new Error("WrongState");
    this._rollRounds();
    const idx = this.currentRoundIndex();
    if (idx < 1n || idx > this.maxMembers) throw new Error("RoundNotActive");
    if (amount <= 0n) throw new Error("InvalidAmount");
    if (amount > this.totalDeposits - this.totalDebt) throw new Error("InsufficientLiquidity");

    const newDebt = this.totalDebt + amount;
    const prevPeak = this.peakDebt.get(idx) ?? 0n;
    const newPeak = newDebt > prevPeak ? newDebt : prevPeak;
    const owed = this.interestDueTotal - this.interestPaidTotal;
    const currentRoundInterest = (newPeak * this.rateBpsPerRound) / 10_000n;
    const exposureAfter = newDebt + owed + currentRoundInterest;

    if (exposureAfter > this.borrowLimit()) throw new Error("ExceedsBorrowLimit");

    this.totalDebt = newDebt;
    this.peakDebt.set(idx, newPeak);
    this.usdcLedger.transfer(this.address, caller, amount);
  }

  public repay(caller: string, amount: bigint): void {
    this.onlyOwner(caller);
    if (this.state !== BONDED_STATE.ACTIVE) throw new Error("WrongState");
    this._rollRounds();
    if (amount <= 0n || amount > this.totalDebt) throw new Error("InvalidAmount");
    this.totalDebt -= amount;
    this.usdcLedger.transfer(caller, this.address, amount);
  }

  public payInterest(caller: string, amount: bigint): void {
    this.onlyOwner(caller);
    if (this.state !== BONDED_STATE.ACTIVE) throw new Error("WrongState");
    this._rollRounds();
    const unpaid = this.interestDueTotal - this.interestPaidTotal;
    if (amount <= 0n || amount > unpaid) throw new Error("InvalidAmount");
    this.interestPaidTotal += amount;
    this.accInterestPerShare += (amount * 10n ** 18n) / this.totalDeposits;
    this.usdcLedger.transfer(caller, this.address, amount);
  }

  public finalize(): void {
    if (this.state !== BONDED_STATE.ACTIVE) throw new Error("WrongState");
    this._rollRounds();
    if (!this.cycleEnded() || this.totalDebt > 0n || this.interestPaidTotal < this.interestDueTotal) {
      throw new Error("NotFinalizable");
    }
    this._settle(false, DEFAULT_REASON.INTEREST_OVERDUE);
  }

  public declareDefault(): void {
    if (this.state !== BONDED_STATE.ACTIVE) throw new Error("WrongState");
    this._rollRounds();
    const now = this.getNow();
    const intOverdue = this._interestOverdue();
    const settleOverdue =
      now >= this.startTime + this.maxMembers * this.roundDuration + this.settlementGrace &&
      (this.totalDebt > 0n || this.interestPaidTotal < this.interestDueTotal);

    if (!intOverdue && !settleOverdue) throw new Error("NotDefaultable");
    const reason = intOverdue
      ? DEFAULT_REASON.INTEREST_OVERDUE
      : DEFAULT_REASON.SETTLEMENT_OVERDUE;
    this._settle(true, reason);
  }

  public liquidate(): void {
    if (this.state !== BONDED_STATE.ACTIVE) throw new Error("WrongState");
    this._rollRounds();
    const debtAndInterest = this.totalDebt + (this.interestDueTotal - this.interestPaidTotal);
    const maxSupportedDebt = (this.collateralValueUsdc() * 10_000n) / this.liquidationBps;
    if (debtAndInterest === 0n || maxSupportedDebt >= debtAndInterest) {
      throw new Error("NotLiquidatable");
    }
    this._settle(true, DEFAULT_REASON.UNDERCOLLATERALIZED);
  }

  public withdrawPrincipal(caller: string): { usdcOut: bigint; cirBtcOut: bigint } {
    if (this.state !== BONDED_STATE.COMPLETED && this.state !== BONDED_STATE.DEFAULTED) {
      throw new Error("WrongState");
    }
    const norm = caller.toLowerCase();
    const dep = this.deposit.get(norm) ?? 0n;
    if (dep === 0n || this.principalWithdrawn.get(norm)) {
      throw new Error("NothingToClaim");
    }
    this.principalWithdrawn.set(norm, true);
    const usdcOut = (dep * this.settledRecoveredUsdc) / this.settledTotalDeposits;
    const cirBtcOut = (dep * this.settledCollateral) / this.settledTotalDeposits;
    if (usdcOut > 0n) {
      this.usdcLedger.transfer(this.address, norm, usdcOut);
    }
    if (cirBtcOut > 0n) {
      this.cirBtcLedger.transfer(this.address, norm, cirBtcOut);
    }
    return { usdcOut, cirBtcOut };
  }

  public currentRoundIndex(): bigint {
    if (this.state !== BONDED_STATE.ACTIVE) return 0n;
    const elapsed = this.getNow() - this.startTime;
    const idx = elapsed / this.roundDuration + 1n;
    return idx > this.maxMembers ? this.maxMembers + 1n : idx;
  }

  public cycleEnded(): boolean {
    if (this.startTime === 0n) return false;
    return this.getNow() >= this.startTime + this.maxMembers * this.roundDuration;
  }

  public collateralValueUsdc(): bigint {
    return this._collateralValueUsdcFor(this.collateral);
  }

  public borrowLimit(): bigint {
    return (this.collateralValueUsdc() * 10_000n) / this.safetyBps;
  }

  public interestOwed(): bigint {
    const { dueTotal } = this._previewRolledState();
    return dueTotal > this.interestPaidTotal ? dueTotal - this.interestPaidTotal : 0n;
  }

  public exposure(): bigint {
    const { dueTotal, currentPeak } = this._previewRolledState();
    const owed = dueTotal > this.interestPaidTotal ? dueTotal - this.interestPaidTotal : 0n;
    const currentRoundInterest = (currentPeak * this.rateBpsPerRound) / 10_000n;
    return this.totalDebt + owed + currentRoundInterest;
  }

  public healthBps(): bigint {
    const debtAndInterest = this.totalDebt + this.interestOwed();
    if (debtAndInterest === 0n) return (1n << 256n) - 1n;
    return (this.collateralValueUsdc() * 10_000n) / debtAndInterest;
  }

  public pendingInterest(addr: string): bigint {
    const norm = addr.toLowerCase();
    const dep = this.deposit.get(norm) ?? 0n;
    const accrued = (dep * this.accInterestPerShare) / 10n ** 18n;
    const debt = this.rewardDebt.get(norm) ?? 0n;
    const newlyAccrued = accrued > debt ? accrued - debt : 0n;
    const raw = (this.interestClaimable.get(norm) ?? 0n) + newlyAccrued;
    const remaining =
      this.interestPaidTotal > this.interestClaimedTotal
        ? this.interestPaidTotal - this.interestClaimedTotal
        : 0n;
    return raw > remaining ? remaining : raw;
  }

  public previewPrincipal(addr: string): { usdcOut: bigint; cirBtcOut: bigint } {
    const norm = addr.toLowerCase();
    const dep = this.deposit.get(norm) ?? 0n;
    if (dep === 0n || this.principalWithdrawn.get(norm)) return { usdcOut: 0n, cirBtcOut: 0n };
    if (this.state === BONDED_STATE.COMPLETED || this.state === BONDED_STATE.DEFAULTED) {
      if (this.settledTotalDeposits === 0n) return { usdcOut: 0n, cirBtcOut: 0n };
      return {
        usdcOut: (dep * this.settledRecoveredUsdc) / this.settledTotalDeposits,
        cirBtcOut: (dep * this.settledCollateral) / this.settledTotalDeposits,
      };
    }
    return { usdcOut: 0n, cirBtcOut: 0n };
  }

  private _rollRounds(): void {
    const idx = this.currentRoundIndex();
    for (let k = this.lastRolledRound + 1n; k < idx && k <= this.maxMembers; k++) {
      const prevPeak = this.peakDebt.get(k) ?? 0n;
      const pk = this.totalDebt > prevPeak ? this.totalDebt : prevPeak;
      this.peakDebt.set(k, pk);
      const due = (pk * this.rateBpsPerRound) / 10_000n;
      this.interestDue.set(k, due);
      this.interestDueTotal += due;
      lastRolledRoundAssign: this.lastRolledRound = k;
    }
    if (idx >= 1n && idx <= this.maxMembers) {
      const prevPeak = this.peakDebt.get(idx) ?? 0n;
      if (this.totalDebt > prevPeak) {
        this.peakDebt.set(idx, this.totalDebt);
      }
    }
  }

  private _previewRolledState(): { dueTotal: bigint; currentPeak: bigint } {
    let dueTotal = this.interestDueTotal;
    if (this.state !== BONDED_STATE.ACTIVE) {
      return { dueTotal, currentPeak: 0n };
    }
    const idx = this.currentRoundIndex();
    for (let k = this.lastRolledRound + 1n; k < idx && k <= this.maxMembers; k++) {
      const prevPeak = this.peakDebt.get(k) ?? 0n;
      const pk = this.totalDebt > prevPeak ? this.totalDebt : prevPeak;
      dueTotal += (pk * this.rateBpsPerRound) / 10_000n;
    }
    let currentPeak = 0n;
    if (idx >= 1n && idx <= this.maxMembers) {
      const prevPeak = this.peakDebt.get(idx) ?? 0n;
      currentPeak = this.totalDebt > prevPeak ? this.totalDebt : prevPeak;
    }
    return { dueTotal, currentPeak };
  }

  private _interestOverdue(): boolean {
    const now = this.getNow();
    let dueThrough = 0n;
    for (let k = 1n; k <= this.lastRolledRound; k++) {
      if (this.startTime + k * this.roundDuration + this.interestGrace > now) {
        break;
      }
      dueThrough += this.interestDue.get(k) ?? 0n;
    }
    return this.interestPaidTotal < dueThrough;
  }

  private _isDefaultOrLiquidationPending(): boolean {
    const now = this.getNow();
    if (this._interestOverdue()) return true;
    if (
      now >= this.startTime + this.maxMembers * this.roundDuration + this.settlementGrace &&
      (this.totalDebt > 0n || this.interestPaidTotal < this.interestDueTotal)
    ) {
      return true;
    }
    const debtAndInterest = this.totalDebt + (this.interestDueTotal - this.interestPaidTotal);
    if (debtAndInterest > 0n) {
      try {
        const colVal = this._collateralValueUsdcFor(this.collateral);
        const maxSupported = (colVal * 10_000n) / this.liquidationBps;
        if (maxSupported < debtAndInterest) return true;
      } catch {
        // Ignore oracle revert during contribute when checking undercollateralization
      }
    }
    return false;
  }

  private _updateMember(norm: string): void {
    const dep = this.deposit.get(norm) ?? 0n;
    const accrued = (dep * this.accInterestPerShare) / 10n ** 18n;
    const debt = this.rewardDebt.get(norm) ?? 0n;
    if (accrued > debt) {
      this.interestClaimable.set(norm, (this.interestClaimable.get(norm) ?? 0n) + (accrued - debt));
    }
    this.rewardDebt.set(norm, accrued);
  }

  private _settle(defaulted: boolean, reason: DefaultReasonCode): void {
    this.settledTotalDeposits = this.totalDeposits;
    if (defaulted && this.totalDeposits > 0n) {
      this.state = BONDED_STATE.DEFAULTED;
      this.settledRecoveredUsdc = this.totalDeposits - this.totalDebt;
      this.settledCollateral = this.collateral;
      this.collateral = 0n;
      this.lastDefaultReason = reason;
    } else if (defaulted) {
      this.state = BONDED_STATE.DEFAULTED;
      this.lastDefaultReason = reason;
    } else {
      this.state = BONDED_STATE.COMPLETED;
      this.settledRecoveredUsdc = this.totalDeposits;
    }
  }

  private _price(): bigint {
    const { roundId, answer, updatedAt, answeredInRound } = this.oracle.latestRoundData();
    const now = this.getNow();
    if (answer <= 0n || updatedAt === 0n || updatedAt > now || answeredInRound < roundId) {
      throw new Error("BadPrice");
    }
    if (now - updatedAt > this.maxPriceAge) {
      throw new Error("StalePrice");
    }
    return answer;
  }

  private _collateralValueUsdcFor(collateralAmount: bigint): bigint {
    const p = this._price();
    const divisor = 10n ** BigInt(this.feedDecimals + 2);
    return (collateralAmount * p) / divisor;
  }
}

export class BondedTontineFactorySimulator {
  public readonly usdc: string;
  public readonly cirBtc: string;
  public readonly priceFeed: string;
  public readonly maxPriceAge: bigint;
  public isClub = new Map<string, boolean>();
  private _clubs: BondedTontineSimulator[] = [];

  private usdcLedger: MockTokenLedger;
  private cirBtcLedger: MockTokenLedger;
  private oracle: MockOracleSimulator;
  private getNow: () => bigint;

  constructor(opts: {
    usdc: string;
    cirBtc: string;
    priceFeed: string;
    maxPriceAge: bigint;
    usdcLedger: MockTokenLedger;
    cirBtcLedger: MockTokenLedger;
    oracle: MockOracleSimulator;
    getNow: () => bigint;
  }) {
    const zero = "0x0000000000000000000000000000000000000000";
    if (
      !opts.usdc ||
      opts.usdc === zero ||
      !opts.cirBtc ||
      opts.cirBtc === zero ||
      opts.usdc.toLowerCase() === opts.cirBtc.toLowerCase() ||
      opts.usdcLedger.decimals !== 6 ||
      opts.cirBtcLedger.decimals !== 8 ||
      !opts.priceFeed ||
      opts.priceFeed === zero ||
      opts.oracle.decimals > 18 ||
      opts.maxPriceAge < 3_600n ||
      opts.maxPriceAge > 172_800n
    ) {
      throw new Error("InvalidConfiguration");
    }
    this.usdc = opts.usdc.toLowerCase();
    this.cirBtc = opts.cirBtc.toLowerCase();
    this.priceFeed = opts.priceFeed.toLowerCase();
    this.maxPriceAge = opts.maxPriceAge;
    this.usdcLedger = opts.usdcLedger;
    this.cirBtcLedger = opts.cirBtcLedger;
    this.oracle = opts.oracle;
    this.getNow = opts.getNow;
  }

  public createClub(caller: string, params: BondedClubConfigParams): BondedTontineSimulator {
    const idx = this._clubs.length + 1;
    const clubAddr = `0x${idx.toString(16).padStart(40, "0")}`;
    const club = new BondedTontineSimulator({
      address: clubAddr,
      owner: caller,
      usdcAddress: this.usdc,
      cirBtcAddress: this.cirBtc,
      priceFeedAddress: this.priceFeed,
      maxPriceAge: this.maxPriceAge,
      params,
      usdcLedger: this.usdcLedger,
      cirBtcLedger: this.cirBtcLedger,
      oracle: this.oracle,
      getNow: this.getNow,
    });
    this.isClub.set(clubAddr.toLowerCase(), true);
    this._clubs.push(club);
    return club;
  }

  public clubsLength(): number {
    return this._clubs.length;
  }

  public clubAt(index: number): BondedTontineSimulator {
    return this._clubs[index];
  }
}
