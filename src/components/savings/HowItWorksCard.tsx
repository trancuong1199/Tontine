import { ShieldCheck, Users, Coins, TrendingUp, Award, Lock } from "lucide-react";
import { Language, t } from "../../lib/i18n";

interface HowItWorksCardProps {
  language?: Language;
}

export function HowItWorksCard({ language = "vi" }: HowItWorksCardProps = {}) {
  const steps = [
    {
      step: "01",
      title: t("howItWorks.step1Title", language),
      desc: t("howItWorks.step1Desc", language),
      icon: Users,
      badge: t("howItWorks.step1Badge", language),
      color: "text-amber-400 bg-amber-950/40 border-amber-500/30",
    },
    {
      step: "02",
      title: t("howItWorks.step2Title", language),
      desc: t("howItWorks.step2Desc", language),
      icon: Coins,
      badge: t("howItWorks.step2Badge", language),
      color: "text-amber-400 bg-amber-950/40 border-amber-500/30",
    },
    {
      step: "03",
      title: t("howItWorks.step3Title", language),
      desc: t("howItWorks.step3Desc", language),
      icon: TrendingUp,
      badge: t("howItWorks.step3Badge", language),
      color: "text-amber-400 bg-amber-950/40 border-amber-500/30",
    },
    {
      step: "04",
      title: t("howItWorks.step4Title", language),
      desc: t("howItWorks.step4Desc", language),
      icon: Award,
      badge: t("howItWorks.step4Badge", language),
      color: "text-amber-400 bg-amber-950/40 border-amber-500/30",
    },
  ];

  return (
    <div className="bg-[#0c0d14] rounded-3xl p-6 sm:p-7 border border-amber-500/20 shadow-lg space-y-6 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-amber-300 bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            {t("howItWorks.badge", language)}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            <span className="text-white">{t("howItWorks.title", language)}</span>
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 bg-black/60 px-3 py-1.5 rounded-xl border border-amber-500/20">
          <Lock size={15} className="text-amber-400" />
          <span>{t("howItWorks.secBadge", language)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {steps.map(({ step, title, desc, icon: Icon, badge, color }) => (
          <div
            key={step}
            className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-slate-800 hover:border-amber-500/30 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${color}`}>
                <Icon size={18} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-amber-400 font-mono">#{step}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/60 text-slate-300 border border-amber-500/20 shadow-2xs">
                  {badge}
                </span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">
                <span className="text-white">{title}</span>
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed mt-1">
                <span className="text-slate-300">{desc}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-black/60 border border-amber-500/30 text-sm text-slate-300">
        <ShieldCheck size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-900 text-base">
            <span className="text-white">{t("howItWorks.safetyTitle", language)}</span>
          </p>
          <p className="text-slate-600 leading-relaxed text-sm">
            <span className="text-slate-300">{t("howItWorks.safetyDesc", language)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
