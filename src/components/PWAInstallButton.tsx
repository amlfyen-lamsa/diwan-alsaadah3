import { Check, Copy, Download, Info, Laptop, Smartphone, Sparkles, X } from 'lucide-react';
import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'compact' | 'hero' | 'radio';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  // If already installed and running standalone, display a subtle badge or null
  if (isInstalled) {
    if (variant === 'hero' || variant === 'radio') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-['Cairo']">
          <Check className="w-4 h-4" />
          <span>تطبيق ديوان السعادة مُثبّت</span>
        </span>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstalledNotice(true);
        setTimeout(() => setInstalledNotice(false), 5000);
        return;
      }
    }
    // If native prompt is not available, show the universal install guide modal
    setShowGuideModal(true);
  };

  const handleCopyAppUrl = () => {
    const url = window.location.origin;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  // Render trigger button based on variant
  let buttonEl = null;

  if (variant === 'hero') {
    buttonEl = (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${className}`}
        title="تثبيت تطبيق ديوان السعادة على جهازك"
      >
        <Smartphone className="w-5 h-5 text-slate-950" />
        <span>تثبيت تطبيق ديوان السعادة</span>
      </button>
    );
  } else if (variant === 'radio') {
    buttonEl = (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer ${className}`}
        title="تثبيت التطبيق للاستماع في الخلفية دون انقطاع"
      >
        <Smartphone className="w-4 h-4 text-slate-950" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  } else {
    buttonEl = (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer ${className}`}
        title="تثبيت تطبيق ديوان السعادة على جهازك للوصول السريع"
      >
        <Download className="w-4 h-4 text-slate-950" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  return (
    <>
      {buttonEl}

      {/* Universal Step-by-Step PWA Installation & Publication Modal */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="bg-slate-900 border border-amber-400/40 rounded-3xl max-w-md w-full p-6 text-right relative shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-white font-['Cairo'] flex items-center gap-2">
                  <span>تثبيت تطبيق ديوان السعادة</span>
                  <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                    PWA فوري
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  تثبيت خفيف ومباشر بدون متجر يعمل في شاشة القفل والخلفية
                </p>
              </div>
            </div>

            {/* Platform Guides */}
            <div className="space-y-3.5 text-xs">
              {/* Android Flow */}
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold font-['Cairo']">
                  <Smartphone className="w-4 h-4" />
                  <span>لهواتف أندرويد (Google Chrome / Samsung):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pr-1 leading-relaxed">
                  <li>اضغط على زر الخيارات <strong className="text-emerald-300 font-mono">⋮</strong> أعلى أو أسفل المتصفح.</li>
                  <li>اختر <strong className="text-emerald-300">«تثبيت التطبيق»</strong> أو <strong className="text-emerald-300">«إضافة إلى الشاشة الرئيسية»</strong>.</li>
                  <li>سيتم تثبيت التطبيق فوراً والعمل مثل أي تطبيق أصلي بدون استهلاك مساحة.</li>
                </ol>
              </div>

              {/* iOS Flow */}
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-['Cairo']">
                  <Smartphone className="w-4 h-4" />
                  <span>لهواتف آيفون وأجهزة آيباد (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pr-1 leading-relaxed">
                  <li>اضغط على زر <strong className="text-amber-300">مشاركة (Share)</strong> في شريط متصفح سفاري.</li>
                  <li>مرر للأسفل واضغط على <strong className="text-amber-300">«إضافة إلى الشاشة الرئيسية»</strong>.</li>
                  <li>انقر على <strong className="text-amber-300">«إضافة»</strong> وستظهر أيقونة ديوان السعادة في شاشتك.</li>
                </ol>
              </div>

              {/* Desktop Windows & Mac Flow */}
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold font-['Cairo']">
                  <Laptop className="w-4 h-4" />
                  <span>لأجهزة الكمبيوتر (Windows / Mac / Edge / Chrome):</span>
                </div>
                <p className="text-slate-300 leading-relaxed pr-1">
                  انقر على رمز التثبيت <strong className="text-cyan-300 font-mono">⊕</strong> الموجود في نهاية شريط العنوان بالمتصفح لتثبيت التطبيق وتشغيله في نافذة مستقلة أنيقة.
                </p>
              </div>
            </div>

            {/* App URL Share & Copy */}
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 space-y-2">
              <span className="text-[11px] text-slate-400 font-bold block">
                رابط التطبيق الرسمي للنشر والمشاركة:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={window.location.origin}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono flex-1 focus:outline-none"
                />
                <button
                  onClick={handleCopyAppUrl}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
};

