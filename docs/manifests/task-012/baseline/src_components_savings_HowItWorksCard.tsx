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
      color: "text-blue-600 bg-blue-50 border-blue-200/60",
    },
    {
      step: "02",
      title: t("howItWorks.step2Title", language),
      desc: t("howItWorks.step2Desc", language),
      icon: Coins,
      badge: t("howItWorks.step2Badge", language),
      color: "text-indigo-600 bg-indigo-50 border-indigo-200/60",
    },
    {
      step: "03",
      title: t("howItWorks.step3Title", language),
      desc: t("howItWorks.step3Desc", language),
      icon: TrendingUp,
      badge: t("howItWorks.step3Badge", language),
      color: "text-violet-600 bg-violet-50 border-violet-200/60",
    },
    {
      step: "04",
      title: t("howItWorks.step4Title", language),
      desc: t("howItWorks.step4Desc", language),
      icon: Award,
      badge: t("howItWorks.step4Badge", language),
      color: "text-emerald-600 bg-emerald-50 border-emerald-200/60",
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
            {t("howItWorks.badge", language)}
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            {t("howItWorks.title", language)}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
          <Lock size={15} className="text-emerald-600" />
          <span>{t("howItWorks.secBadge", language)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {steps.map(({ step, title, desc, icon: Icon, badge, color }) => (
          <div
            key={step}
            className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${color}`}>
                <Icon size={18} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400 font-mono">#{step}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shadow-2xs">
                  {badge}
                </span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">{title}</h4>
              <p className="text-slate-600 text-sm leading-relaxed mt-1">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100/80 text-sm text-slate-700">
        <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-900 text-base">
            {t("howItWorks.safetyTitle", language)}
          </p>
          <p className="text-slate-600 leading-relaxed text-sm">
            {t("howItWorks.safetyDesc", language)}
          </p>
        </div>
      </div>
    </div>
  );
}
