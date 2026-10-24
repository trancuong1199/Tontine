import { useRoundHistory } from "../../hooks/useSavingsClub";
import { formatUsdc, formatAddress, ROTATING_SAVINGS_ADDRESS } from "../../contract";
import { History, Award, CheckCircle2 } from "lucide-react";

interface RoundHistoryProps {
  currentRound: bigint | undefined;
  contractAddress?: `0x${string}`;
  userAddress?: string;
}

export function RoundHistory({
  currentRound,
  contractAddress = ROTATING_SAVINGS_ADDRESS,
  userAddress,
}: RoundHistoryProps) {
  const { settledRounds, isLoading } = useRoundHistory(currentRound, contractAddress);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <History size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Lịch sử các vòng
            </h3>
            <p className="text-xs text-slate-400">Danh sách các vòng hụi đã tất toán và trao giải</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 tabular-nums">
          {settledRounds.length} vòng đã tất toán
        </span>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Đang tải lịch sử vòng...</span>
        </div>
      ) : settledRounds.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
          <p className="font-medium text-slate-500 mb-0.5">Chưa có vòng nào kết thúc</p>
          <p className="text-[11px] text-slate-400">Khi vòng đầu tiên hoàn tất và tất toán, thông tin trúng pot sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settledRounds.map((round) => {
            const isUserWinner =
              Boolean(userAddress && round.winner) &&
              userAddress!.toLowerCase() === round.winner.toLowerCase();

            return (
              <div
                key={round.roundId.toString()}
                className="bg-slate-50/80 hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-3 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      Vòng {round.roundId.toString()}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1">
                      <CheckCircle2 size={11} /> Đã tất toán
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 tabular-nums" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {formatUsdc(round.totalPot)} USDC
                    </span>
                    <span className="text-[10px] text-slate-400 block">Tổng quỹ nhận</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-0.5">Người thắng vòng</span>
                    {isUserWinner ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                        <Award size={13} /> Bạn!
                      </span>
                    ) : (
                      <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200/70 text-[11px]">
                        {formatAddress(round.winner)}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-0.5">Tổng tiền bid đã chia</span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {formatUsdc(round.totalBids)} USDC
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
