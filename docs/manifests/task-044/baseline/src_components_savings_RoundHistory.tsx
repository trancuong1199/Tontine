import { useRoundHistory } from "../../hooks/useSavingsClub";
import { formatUsdc, formatAddress, ROTATING_SAVINGS_ADDRESS } from "../../contract";
import { History, Award, CheckCircle2, RotateCcw } from "lucide-react";
import { Language, t } from "../../lib/i18n";

interface RoundHistoryProps {
  currentRound: bigint | undefined;
  contractAddress?: `0x${string}`;
  userAddress?: string;
  language?: Language;
}

export function RoundHistory({
  currentRound,
  contractAddress = ROTATING_SAVINGS_ADDRESS,
  userAddress,
  language = "vi",
}: RoundHistoryProps) {
  const { settledRounds, isLoading } = useRoundHistory(currentRound, contractAddress);
  const isEn = language === "en";

  return (
    <div className="bg-[#0c0d14] rounded-3xl p-6 sm:p-7 border border-amber-500/20 shadow-lg space-y-5 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-950/40 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <History size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg sm:text-xl">
              <span className="text-white">{t("roundHistory.title", language)}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              {t("roundHistory.desc", language)}
            </p>
          </div>
        </div>
        <span className="text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 tabular-nums">
          {isEn
            ? `${settledRounds.length} rounds settled`
            : `${settledRounds.length} vòng đã tất toán`}
        </span>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>{t("roundHistory.loading", language)}</span>
        </div>
      ) : settledRounds.length === 0 ? (
        <div className="py-8 sm:py-10 text-center text-slate-400 text-sm bg-black/40 rounded-2xl border border-dashed border-amber-500/20">
          <p className="font-semibold text-slate-200 mb-1">
            {isEn ? t("roundHistory.emptyTitle", language) : "Chưa có vòng nào kết thúc"}
          </p>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            {t("roundHistory.emptyDesc", language)}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {settledRounds.map((round) => {
            const isNoWinner =
              !round.winner ||
              round.winner === "0x0000000000000000000000000000000000000000" ||
              round.winner.toLowerCase() === "0x0000000000000000000000000000000000000000";
            const isUserWinner =
              !isNoWinner &&
              Boolean(userAddress && round.winner) &&
              userAddress!.toLowerCase() === round.winner.toLowerCase();

            return (
              <div
                key={round.roundId.toString()}
                className="bg-black/40 hover:bg-black/60 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3.5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">
                      <span className="text-white">{isEn ? `Round ${round.roundId.toString()}` : <>Vòng {round.roundId.toString()}</>}</span>
                    </span>
                    <span className="bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 font-semibold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-400" /> {isEn ? "Settled" : "Đã tất toán"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                      <span className="text-amber-300">{formatUsdc(round.totalPot)} USDC</span>
                    </span>
                    <span className="text-xs text-slate-400 block">{t("roundHistory.totalPotLabel", language)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-800 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block mb-1 font-medium">{t("roundHistory.winnerLabel", language)}</span>
                    {isNoWinner ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-indigo-300 bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-500/30 shadow-xs">
                        <RotateCcw size={12} className="text-indigo-400 shrink-0" />
                        <span>{t("roundHistory.noWinnerBadge", language)}</span>
                      </span>
                    ) : isUserWinner ? (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/30 shadow-2xs">
                        <Award size={14} className="text-amber-400" /> {isEn ? "You!" : "Bạn!"}
                      </span>
                    ) : (
                      <span className="font-mono text-amber-300 bg-black/60 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs sm:text-sm font-semibold">
                        {formatAddress(round.winner)}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block mb-1 font-medium">{t("roundHistory.bidYieldLabel", language)}</span>
                    <span className="font-bold text-amber-300 tabular-nums text-xs sm:text-sm">
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
