import { useRoundHistory } from "../../hooks/useSavingsClub";
import { formatUsdc, formatAddress, ROTATING_SAVINGS_ADDRESS } from "../../contract";
import { History, Award, CheckCircle2 } from "lucide-react";
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
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <History size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg sm:text-xl">
              {t("roundHistory.title", language)}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
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
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>{t("roundHistory.loading", language)}</span>
        </div>
      ) : settledRounds.length === 0 ? (
        <div className="py-8 sm:py-10 text-center text-slate-500 text-sm bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
          <p className="font-semibold text-slate-700 mb-1">
            {isEn ? t("roundHistory.emptyTitle", language) : "Chưa có vòng nào kết thúc"}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            {t("roundHistory.emptyDesc", language)}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {settledRounds.map((round) => {
            const isUserWinner =
              Boolean(userAddress && round.winner) &&
              userAddress!.toLowerCase() === round.winner.toLowerCase();

            return (
              <div
                key={round.roundId.toString()}
                className="bg-slate-50/80 hover:bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-3.5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">
                      {isEn ? `Round ${round.roundId.toString()}` : <>Vòng {round.roundId.toString()}</>}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1">
                      <CheckCircle2 size={12} /> {isEn ? "Settled" : "Đã tất toán"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                      {formatUsdc(round.totalPot)} USDC
                    </span>
                    <span className="text-xs text-slate-400 block">{t("roundHistory.totalPotLabel", language)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/60 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-500 text-xs block mb-1 font-medium">{t("roundHistory.winnerLabel", language)}</span>
                    {isUserWinner ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                        <Award size={14} /> {isEn ? "You!" : "Bạn!"}
                      </span>
                    ) : (
                      <span className="font-mono text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/70 text-xs sm:text-sm font-semibold">
                        {formatAddress(round.winner)}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block mb-1 font-medium">{t("roundHistory.bidYieldLabel", language)}</span>
                    <span className="font-bold text-slate-800 tabular-nums text-xs sm:text-sm">
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
