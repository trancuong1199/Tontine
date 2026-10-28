import type { ReactNode } from 'react';
import type { CollateralView } from '../../hooks/useCollateralPolicy';
import { formatCollateral } from '../../lib/collateralPolicy';
import type { Language } from '../../lib/i18n';

interface CollateralPreviewProps {
  view?: CollateralView;
  language?: Language;
  status?: string;
  required?: bigint;
  locked?: bigint;
  balance?: bigint;
  rewards?: bigint;
  groupAddress?: string;
  tokenAddress?: string;
  accountAddress?: string;
  detailsNotice?: ReactNode;
  children?: ReactNode;
}

export function CollateralPreview({ view, language = 'vi', status, required, locked, balance, rewards, groupAddress, tokenAddress, accountAddress, detailsNotice, children }: CollateralPreviewProps) {
  const en = language === 'en';
  const quote = view?.quote;
  const hasShortfall = quote !== undefined && quote.shortfall > 0n;
  const lockedAmount = quote?.locked ?? locked;
  const walletBalance = quote?.balance ?? balance;
  const amount = (value: bigint | undefined) => value === undefined
    ? (en ? 'Unavailable' : 'Chưa đọc được')
    : `${formatCollateral(value)} CirBTC`;
  const policyExplanation = view?.policy === 'enforced'
    ? (en ? 'This contract requires full collateral at join and before contributing or bidding. Restart does not automatically fund members.' : 'Hợp đồng bắt buộc đủ ký quỹ khi tham gia và trước khi góp hoặc bid. Mở chu kỳ không tự nạp tiền cho thành viên.')
    : view?.policy === 'legacy'
    ? (en ? 'Legacy contract: mandatory collateral is not enforced by this version. A requirement change after review may affect a legacy join; existing approvals can permit a different debit. Frontend checks do not upgrade this contract.' : 'Hợp đồng cũ: phiên bản này không bắt buộc ký quỹ đầy đủ. Mức yêu cầu đổi sau khi xem trước có thể làm khoản trừ khi tham gia khác đi nếu quyền sử dụng token đã cấp trước đó lớn hơn. Kiểm tra giao diện không nâng cấp hợp đồng.')
    : (en ? 'Collateral data is unavailable. Retry before approving or transferring tokens.' : 'Chưa có dữ liệu ký quỹ. Kiểm tra lại trước khi cấp quyền hoặc chuyển token.');

  return <section className="mx-4 my-3 min-w-0 rounded-xl border border-amber-500/25 bg-amber-950/15 p-4 text-xs text-slate-300 sm:mx-5" aria-label={en ? 'Collateral review' : 'Xem trước ký quỹ'}>
    <div className="min-w-0">
      <h4 className="font-semibold text-amber-200">{en ? 'CirBTC collateral' : 'Ký quỹ CirBTC'}</h4>
      {status && <p className="mt-1 text-xs leading-relaxed text-slate-400">{status}</p>}
    </div>
    <div className="mt-3 min-w-0">
      <p className="text-slate-400">{hasShortfall ? (en ? 'To deposit' : 'Cần nộp') : (en ? 'Locked' : 'Đang khóa')}</p>
      <p className="mt-0.5 break-all text-lg font-bold tabular-nums text-amber-200 sm:text-xl">{amount(hasShortfall ? quote?.shortfall : lockedAmount)}</p>
      <p className="mt-1 break-words text-xs text-slate-400">
        {hasShortfall ? (en ? 'Balance after deposit:' : 'Số dư sau nộp:') : (en ? 'Wallet balance:' : 'Số dư ví:')}{' '}
        <span className="break-all tabular-nums">{amount(hasShortfall ? quote?.after : walletBalance)}</span>
      </p>
    </div>
    {quote && quote.deficit > 0n && <p role="alert" className="mt-2 break-words text-red-300">{en ? 'Insufficient balance. Missing' : 'Không đủ số dư. Còn thiếu'} <span className="break-all">{amount(quote.deficit)}</span>.</p>}
    {view?.policy === 'loading' && <p role="status" className="mt-2 text-amber-200">{en ? 'Checking collateral…' : 'Đang kiểm tra ký quỹ…'}</p>}
    {(!view || view.policy === 'unknown') && <p role="status" className="mt-2 text-amber-200">{en ? 'Collateral unavailable. Refresh in Details before signing.' : 'Chưa đọc được ký quỹ. Đọc lại trong Chi tiết trước khi ký.'}</p>}
    {view?.policy === 'legacy' && <p className="mt-2 text-amber-200">{en ? 'Legacy contract: changed requirements and prior approvals may change the debit.' : 'Hợp đồng cũ: mức yêu cầu thay đổi và quyền đã cấp có thể làm đổi khoản trừ.'}</p>}
    {children && <div className="mt-3 space-y-2 empty:hidden">{children}</div>}
    <details className="mt-3 min-w-0 border-t border-amber-500/10 pt-2">
      <summary className="cursor-pointer select-none text-xs text-slate-400 hover:text-amber-200">{en ? 'Details' : 'Chi tiết'}</summary>
      <dl className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {[
          [en ? 'Required' : 'Yêu cầu', quote?.required ?? required],
          [en ? 'Locked' : 'Đã khóa', lockedAmount],
          [en ? 'To deposit' : 'Cần nộp', quote?.shortfall],
          [en ? 'Wallet balance' : 'Số dư ví', walletBalance],
          [en ? 'Rewards (separate)' : 'Phần thưởng (riêng)', rewards],
        ].map(([label, value]) => <div key={String(label)} className="min-w-0"><dt className="text-slate-400">{String(label)}</dt><dd className="break-all tabular-nums">{amount(typeof value === 'bigint' ? value : undefined)}</dd></div>)}
      </dl>
      <div className="mt-3 space-y-1 break-all text-xs text-slate-400">
        <p>{en ? 'Club' : 'Nhóm'}: {quote?.group ?? groupAddress ?? '—'}</p>
        <p>Token: {quote?.token ?? tokenAddress ?? '—'}</p>
        <p>{en ? 'Wallet' : 'Ví'}: {quote?.account ?? accountAddress ?? '—'}</p>
      </div>
      <p className="mt-3 leading-relaxed">{policyExplanation}</p>
      {detailsNotice && <p className="mt-2 leading-relaxed">{detailsNotice}</p>}
      <p className="mt-2 leading-relaxed">{en ? 'Approval only grants permission; it does not transfer tokens. The balance estimate excludes USDC gas. Claimable rewards are separate from locked collateral.' : 'Cấp quyền chỉ cho phép sử dụng token, chưa chuyển tiền. Số dư dự tính chưa gồm gas USDC. Phần thưởng có thể nhận tách biệt với ký quỹ đang khóa.'}</p>
      {view && <button type="button" disabled={view.policy === 'loading'} onClick={() => { void view.refresh(); }} className="mt-3 underline disabled:opacity-50">{en ? 'Refresh collateral review' : 'Đọc lại ký quỹ'}</button>}
    </details>
  </section>;
}
