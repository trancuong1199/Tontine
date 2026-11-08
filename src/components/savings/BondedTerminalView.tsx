import type { BondedClubSnapshot } from "../../hooks/useBondedClub";
import { BONDED_STATE } from "../../lib/bondedTontine";
import { formatFinancialAmount } from "../../lib/bondedDisplay";
import { formatUnitsExact } from "../../onchain-money";
import { BondedMobileActionBar } from "./BondedMobileActionBar";

export function BondedTerminalView({ club, language, isOwner, isPasskeyUser, pending, onClaim, onWithdraw, onCollateral, onDirectory, onRemove }: {
  club: BondedClubSnapshot; language: "vi" | "en"; isOwner: boolean; isPasskeyUser: boolean; pending: boolean;
  onClaim: () => void; onWithdraw: () => void; onCollateral: () => void; onDirectory?: () => void; onRemove?: () => void;
}) {
  const vi = language === "vi";
  const cancelled = club.state === BONDED_STATE.CANCELLED;
  const defaulted = club.state === BONDED_STATE.DEFAULTED;
  const ready = club.financialsAvailable && club.positionAvailable && !club.isLoading && !club.error;
  const canClaim = ready && club.pendingInterest > 0n;
  const zeroRecovery = ready && !cancelled && club.userDeposit > 0n && !club.principalWithdrawn && club.previewPrincipalUsdc === 0n && club.previewPrincipalCirBtc === 0n;
  const canWithdraw = ready && !cancelled && club.userDeposit > 0n && !club.principalWithdrawn && !zeroRecovery;
  const canCollateral = !club.isLoading && !club.error && club.financialsAvailable && isOwner && club.collateral > 0n;
  const disabled = pending || isPasskeyUser;
  const unavailable = club.isLoading ? (vi ? "Đang tải…" : "Loading…") : (vi ? "Chưa tải được số dư" : "Balances unavailable");
  const title = cancelled ? (vi ? "Nhóm đã hủy" : "Club cancelled") : defaulted ? (vi ? "Nhóm đã thanh lý" : "Club liquidated") : (vi ? "Chu kỳ đã hoàn tất" : "Cycle completed");
  const action = canWithdraw ? onWithdraw : canClaim ? onClaim : canCollateral ? onCollateral : !ready ? () => void club.refetch() : undefined;
  const actionLabel = canWithdraw ? (vi ? "Nhận tài sản thu hồi" : "Withdraw recovery") : canClaim ? (vi ? "Nhận lãi đã trả" : "Claim paid interest") : canCollateral ? (vi ? "Rút cọc còn lại" : "Withdraw remaining collateral") : !ready ? (club.isLoading ? (vi ? "Đang tải số dư…" : "Loading balances…") : (vi ? "Chưa tải được số dư — thử lại" : "Balances unavailable — retry")) : (vi ? "Không có khoản đủ điều kiện để nhận" : "No eligible claim available");
  return <div className="space-y-5 pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-0" data-testid="bonded-terminal-view">
    <section className="rounded-3xl border border-amber-500/30 bg-[#0c0d14] p-5 sm:p-7 space-y-4">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="text-slate-300">{club.groupName}</p>
      <p className="text-sm text-slate-300">{cancelled ? (vi ? "Nhóm đóng trước khi bắt đầu góp tiền. Hợp đồng đã hoàn trả cọc cho chủ nhóm khi hủy; không có thao tác rút vốn góp ở trạng thái này." : "This club closed before contributions began. Cancellation returned the owner's collateral; principal withdrawal is not available in this state.") : defaulted ? (vi ? "Tài sản thu hồi được chia theo tỷ lệ tiền góp. Khoản USDC và cirBTC dưới đây có thể ít hơn vốn ban đầu; không bảo đảm hoàn vốn đầy đủ." : "Recovery assets are shared in proportion to deposits. USDC and cirBTC recovery may be worth less than the original principal; full recovery is not guaranteed.") : (vi ? "Chu kỳ đã kết thúc. Nhận lãi đã thanh toán và rút phần vốn đủ điều kiện của bạn." : "The cycle has ended. Claim paid interest and withdraw your eligible principal.")}</p>
      {isPasskeyUser && <p className="text-amber-200 text-sm">{vi ? "Dùng ví trình duyệt Web3 để ký giao dịch BondedTontine; ví Passkey chưa hỗ trợ." : "Use a Web3 browser wallet for BondedTontine transactions; Passkey execution is not supported."}</p>}
      <div data-testid="terminal-position" className="rounded-2xl bg-black/40 p-4 space-y-2 text-sm text-slate-200">
        <p>{vi ? "Vốn đã góp" : "Original deposits"}: {ready ? `${formatFinancialAmount(club.userDeposit)} USDC` : unavailable}</p>
        {!cancelled && <p>{vi ? "Tài sản có thể thu hồi" : "Recovery available"}: {ready ? `${formatFinancialAmount(club.previewPrincipalUsdc)} USDC + ${formatUnitsExact(club.previewPrincipalCirBtc, 8)} cirBTC` : unavailable}</p>}
        <p>{vi ? "Lãi đã trả, chờ nhận" : "Paid interest available"}: {ready ? `${formatFinancialAmount(club.pendingInterest)} USDC` : unavailable}</p>
        {ready && !cancelled && <p>{club.principalWithdrawn ? (vi ? "Đã rút vốn" : "Principal already withdrawn") : club.userDeposit === 0n ? (vi ? "Ví này chưa góp vốn" : "This wallet has no principal deposit") : (vi ? "Chưa rút vốn" : "Principal not yet withdrawn")}</p>}
        {zeroRecovery && <p className="text-red-200">{vi ? "Khoản thu hồi hiện bằng 0 USDC và 0 cirBTC; vốn góp chưa thu hồi được." : "Recovery is currently 0 USDC and 0 cirBTC; the deposited principal has not been recovered."}</p>}
        {isOwner && <p>{vi ? "Cọc chủ nhóm còn lại" : "Remaining owner collateral"}: {club.financialsAvailable && !club.error && !club.isLoading ? `${formatUnitsExact(club.collateral, 8)} cirBTC` : unavailable}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        {canWithdraw && <button disabled={disabled} onClick={onWithdraw} className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{vi ? "Nhận tài sản thu hồi" : "Withdraw recovery"}</button>}
        {canClaim && <button disabled={disabled} onClick={onClaim} className="rounded-xl border border-emerald-500 px-4 py-3 text-emerald-200 disabled:opacity-50">{vi ? "Nhận lãi đã trả" : "Claim paid interest"}</button>}
        {canCollateral && <button disabled={disabled} onClick={onCollateral} className="rounded-xl border border-amber-500 px-4 py-3 text-amber-200 disabled:opacity-50">{vi ? "Rút cọc còn lại" : "Withdraw remaining collateral"}</button>}
      </div>
      {pending && <p role="status">{vi ? "Đang chờ giao dịch…" : "Transaction pending…"}</p>}
      <div className="flex flex-wrap gap-4 text-sm text-amber-200"><button onClick={() => void club.refetch()}>{vi ? "Làm mới số dư" : "Refresh balances"}</button>{onDirectory && <button onClick={onDirectory}>{vi ? "Danh sách nhóm" : "Club directory"}</button>}{onRemove && <button onClick={onRemove} className="text-red-300 hover:text-red-200">{vi ? "Xóa khỏi danh bạ" : "Remove from directory"}</button>}</div>
    </section>
    <BondedMobileActionBar label={actionLabel} onAction={action} disabled={disabled || club.isLoading} />
  </div>;
}
