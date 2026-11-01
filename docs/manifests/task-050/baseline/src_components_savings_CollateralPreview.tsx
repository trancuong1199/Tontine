import type { CollateralView } from '../../hooks/useCollateralPolicy';
import { formatCollateral } from '../../lib/collateralPolicy';
import type { Language } from '../../lib/i18n';

export function CollateralPreview({ view, language = 'vi' }: { view?: CollateralView; language?: Language }) {
  const en = language === 'en';
  const quote = view?.quote;
  return <section className="mx-5 my-3 rounded-xl border border-amber-500/30 p-4 text-xs text-slate-300" aria-label={en ? 'Collateral review' : 'Xem trước ký quỹ'}>
    <p className="font-bold text-amber-200">{en ? 'CirBTC collateral review' : 'Xem trước ký quỹ CirBTC'}</p>
    <p className="mt-2">{view?.policy === 'enforced'
      ? (en ? 'This contract requires full collateral at join and before contributing or bidding. Restart does not automatically fund members.' : 'Hợp đồng bắt buộc đủ ký quỹ khi tham gia và trước khi góp hoặc bid. Mở chu kỳ không tự nạp tiền cho thành viên.')
      : view?.policy === 'legacy'
      ? (en ? 'Legacy contract: mandatory collateral is not enforced by this version. A requirement change after review may affect a legacy join; existing approvals can permit a different debit. Frontend checks do not upgrade this contract.' : 'Hợp đồng cũ: phiên bản này không bắt buộc ký quỹ đầy đủ. Mức yêu cầu đổi sau khi xem trước có thể làm khoản trừ khi tham gia khác đi nếu quyền sử dụng token đã cấp trước đó lớn hơn. Kiểm tra giao diện không nâng cấp hợp đồng.')
      : view?.policy === 'loading'
      ? (en ? 'Checking collateral policy and balances…' : 'Đang kiểm tra chính sách và số dư ký quỹ…')
      : (en ? 'Collateral data is unavailable. Retry before approving or transferring tokens.' : 'Chưa có dữ liệu ký quỹ. Kiểm tra lại trước khi cấp quyền hoặc chuyển token.')}</p>
    {quote && <>
      <p className="mt-2 break-all">{en ? 'Club' : 'Nhóm'}: {quote.group}<br />Token: {quote.token}<br />{en ? 'Wallet' : 'Ví'}: {quote.account}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 font-mono">
        {[
          [en ? 'Required' : 'Yêu cầu', quote.required],
          [en ? 'Locked' : 'Đã khóa', quote.locked],
          [en ? 'To deposit' : 'Cần nộp', quote.shortfall],
          [en ? 'Wallet balance' : 'Số dư ví', quote.balance],
          [en ? 'Estimated balance after' : 'Số dư dự kiến sau nộp', quote.after],
        ].map(([label, amount]) => <div key={String(label)}><dt>{String(label)}</dt><dd>{typeof amount === 'bigint' ? `${formatCollateral(amount)} CirBTC` : (en ? 'Unavailable' : 'Không khả dụng')}</dd></div>)}
      </dl>
      {quote.deficit > 0n && <p role="alert" className="mt-2 text-red-300">{en ? 'Insufficient balance. Missing' : 'Không đủ số dư. Còn thiếu'} {formatCollateral(quote.deficit)} CirBTC.</p>}
      <p className="mt-2">{en ? 'Approval only grants permission; it does not transfer tokens. The balance estimate excludes USDC gas. Claimable rewards are separate from locked collateral.' : 'Cấp quyền chỉ cho phép sử dụng token, chưa chuyển tiền. Số dư dự tính chưa gồm gas USDC. Phần thưởng có thể nhận tách biệt với ký quỹ đang khóa.'}</p>
    </>}
    {view && <button type="button" disabled={view.policy === 'loading'} onClick={() => { void view.refresh(); }} className="mt-3 underline disabled:opacity-50">{en ? 'Refresh collateral review' : 'Đọc lại ký quỹ'}</button>}
  </section>;
}
