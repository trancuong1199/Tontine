import { BondedCollateralSummary, BondedLiquiditySummary } from "./BondedCollateralSummary";
import { formatRoundDuration } from "../../lib/bondedDisplay";
import { useState } from "react";
import { useModal } from "connectkit";
import {
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Users,
  Coins,
  Clock,
  Percent,
  Lock,
  Share2,
} from "lucide-react";
import { formatAddress, formatUsdc, ARC_TESTNET_CHAIN_ID } from "../../contract";
import { formatUnitsExact } from "../../onchain-money";
import { buildAddressExplorerUrl } from "../../onchain-facts";
import { buildShareGroupUrl } from "../../lib/savingsClubDirectory";
import { useBondedClub } from "../../hooks/useBondedClub";
import { BONDED_STATE } from "../../lib/bondedTontine";
import { Language, t } from "../../lib/i18n";
import { BONDED_DISCLOSURE_COPY } from "../../config/bonded-tontine";

interface UnauthenticatedBondedClubPreviewProps {
  contractAddress: `0x${string}`;
  displayedGroupName: string;
  language?: Language;
}


export function UnauthenticatedBondedClubPreview({
  contractAddress,
  displayedGroupName,
  language = "vi",
}: UnauthenticatedBondedClubPreviewProps) {
  const club = useBondedClub(contractAddress, undefined, true);
  const { setOpen: openConnectModal } = useModal();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const isEn = language === "en";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = buildShareGroupUrl(contractAddress);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const stateLabels: Record<number, { vi: string; en: string }> = {
    [BONDED_STATE.OPEN]: { vi: "ĐANG MỞ ĐĂNG KÝ", en: "OPEN FOR MEMBERS" },
    [BONDED_STATE.ACTIVE]: { vi: "ĐANG CHẠY VÒNG", en: "ACTIVE ROUNDS" },
    [BONDED_STATE.COMPLETED]: { vi: "ĐÃ HOÀN TẤT", en: "COMPLETED" },
    [BONDED_STATE.DEFAULTED]: { vi: "ĐÃ VỠ NỢ / THANH LÝ", en: "DEFAULTED / LIQUIDATED" },
    [BONDED_STATE.CANCELLED]: { vi: "ĐÃ HỦY", en: "CANCELLED" },
  };

  const currentClubName = club.groupName.trim() || displayedGroupName;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Read-Only Public Club Preview Card */}
      <div className="relative overflow-hidden text-white">
        {/* Top Badges & Address */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/40 uppercase">
              BondedTontine V2
            </span>
            {club.isVerifiedClub ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isEn ? "Verified by Factory" : "Xác minh bởi Factory"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 border border-red-500/30">
                <ShieldAlert className="h-3.5 w-3.5" />
                {isEn ? "Unverified Club" : "Chưa xác minh"}
              </span>
            )}
            <div className="inline-flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-xl border border-amber-500/20 text-xs">
              <span className="font-mono text-amber-300 font-semibold">{formatAddress(contractAddress)}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-slate-400 hover:text-amber-300 transition-colors p-0.5 cursor-pointer"
                title={isEn ? "Copy address" : "Sao chép địa chỉ"}
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
              <a
                href={buildAddressExplorerUrl(ARC_TESTNET_CHAIN_ID, contractAddress)}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-amber-300 transition-colors p-0.5"
                title={isEn ? "View on Explorer" : "Xem trên Explorer"}
              >
                <ExternalLink size={13} />
              </a>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded-xl border border-amber-500/30 text-xs font-semibold text-amber-300 transition-colors cursor-pointer"
              title={isEn ? "Copy club invite link (?group=...)" : "Sao chép link mời nhóm (?group=...)"}
            >
              {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Share2 size={12} className="text-amber-400" />}
              <span>{copiedLink ? (isEn ? "Copied!" : "Đã chép link!") : (isEn ? "Copy Club Link" : "Sao chép link mời")}</span>
            </button>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {club.isLoading ? (isEn ? "Loading…" : "Đang tải…") : club.error ? (isEn ? "Unavailable" : "Không tải được") : stateLabels[club.state]?.[language] ?? "--"}
          </span>
        </div>

        {/* Club Title & Owner */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {currentClubName}
          </h2>
          <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5 font-mono">
            <span>{isEn ? "Club Owner:" : "Chủ nhóm:"}</span>
            <span className="text-slate-300 font-semibold">{formatAddress(club.owner)}</span>
          </div>
        </div>

        {/* Key Parameters Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/50 p-4 rounded-2xl border border-amber-500/20 mb-5 text-center">
          <div>
            <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
              <Coins size={13} className="text-amber-400" />
              <span>{isEn ? "Contribution" : "Mức góp"}</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-amber-300 mt-1">
              {formatUsdc(club.contributionAmount)} USDC
            </div>
            <div className="text-xs text-slate-500">{isEn ? "/ member / round" : "/ tv / vòng"}</div>
          </div>

          <div className="border-l border-slate-800">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
              <Percent size={13} className="text-emerald-400" />
              <span>{isEn ? "Yield / Round" : "Lãi suất / vòng"}</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-400 mt-1">
              {(Number(club.rateBpsPerRound) / 100).toFixed(2)}%
            </div>
            <div className="text-xs text-slate-500">{isEn ? "paid by owner" : "chủ nhóm chi trả"}</div>
          </div>

          <div className="border-l border-slate-800">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
              <Users size={13} className="text-blue-400" />
              <span>{isEn ? "Members" : "Thành viên"}</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white mt-1">
              {club.memberCount.toString()} / {club.maxMembers.toString()}
            </div>
            <div className="text-xs text-slate-500">{isEn ? "capacity" : "sức chứa"}</div>
          </div>

          <div className="border-l border-slate-800">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
              <Clock size={13} className="text-purple-400" />
              <span>{isEn ? "Round Duration" : "Thời lượng"}</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-200 mt-1">
              {formatRoundDuration(Number(club.roundDuration), isEn)}
            </div>
            <div className="text-xs text-slate-500">{club.totalRounds.toString()} {isEn ? "rounds" : "vòng"}</div>
          </div>
        </div>

        <BondedLiquiditySummary club={club} language={language} />
        <BondedCollateralSummary club={club} language={language} />
        {/* Collateral & Risk Summary */}
        <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed">
          <Lock size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">
              {isEn ? "CirBTC Collateral: " : "Cọc CirBTC: "}
            </span>
            <span>
              {club.collateral > 0n
                ? `${formatUnitsExact(club.collateral, 8)} cirBTC ${isEn ? "locked in contract." : "đã được ký quỹ."} `
                : (isEn ? "Waiting for owner collateral deposit. " : "Đang chờ chủ nhóm nạp cọc. ")}
              {BONDED_DISCLOSURE_COPY[language]}
            </span>
          </div>
        </div>
      </div>

      {/* Connect Wallet Action Card */}
      <div className="bg-gradient-to-br from-[#161722] via-[#0e0f18] to-[#07080d] rounded-3xl p-6 sm:p-8 text-center border border-amber-500/30 shadow-xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-md shadow-amber-500/10">
          <Wallet size={24} />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {isEn ? "Connect Wallet to Join This Club" : "Kết nối ví để tham gia nhóm này"}
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            {isEn
              ? "Connect your Web3 or Passkey wallet to join the roster, contribute USDC, and receive fixed interest."
              : "Kết nối ví Web3 hoặc Passkey của bạn để vào danh sách thành viên, góp USDC và nhận tiền lãi mỗi vòng."}
          </p>
        </div>
        <div className="flex items-center justify-center pt-1">
          <button
            type="button"
            onClick={() => openConnectModal?.(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:via-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Wallet size={16} />
            <span>{isEn ? "Connect Wallet to Join" : "Kết nối ví để tham gia ngay"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
