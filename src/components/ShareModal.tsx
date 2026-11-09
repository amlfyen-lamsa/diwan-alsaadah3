import {
  Bluetooth,
  Check,
  Copy,
  ExternalLink,
  Facebook,
  FileText,
  MessageCircle,
  Radio,
  Send,
  Share2,
  Sparkles,
  Twitter,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { VideoItem } from '../types';

interface ShareModalProps {
  video: VideoItem | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ video, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFullText, setCopiedFullText] = useState(false);

  if (!video) return null;

  const originUrl = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://ais-pre-bz2cc5fqifdb5dnsndy7vd-8035750185.europe-west2.run.app';

  const shareUrl = `${originUrl}/?v=${video.youtubeId}`;
  const bannerImage = `${originUrl}/og-share-banner.jpg`;
  const logoImage = `${originUrl}/channel-logo.jpg`;

  const shareTitle = `جلسة: ${video.title} – ديوان السعادة`;
  const formattedShareMessage = `🌟 ديوان السعادة – نغم يجمعنا 🎵\n━━━━━━━━━━━━━━━━━━━━\n🎶 ${video.title}\n🎤 الفنان: ${video.artist}\n🏛️ الألبوم: ${video.album}\n🎧 استمع وشاهد الجلسة الآن بجودة استوديو فائقة:\n${shareUrl}`;

  const handleCopyOnlyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyFormattedText = () => {
    navigator.clipboard.writeText(formattedShareMessage);
    setCopiedFullText(true);
    setTimeout(() => setCopiedFullText(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: formattedShareMessage,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share dismissed
      }
    } else {
      handleCopyFormattedText();
    }
  };

  const sharePlatforms = [
    {
      name: 'واتساب',
      icon: MessageCircle,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedShareMessage)}`,
    },
    {
      name: 'تيليجرام',
      icon: Send,
      color: 'bg-sky-500 hover:bg-sky-600 text-white',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(formattedShareMessage)}`,
    },
    {
      name: 'فيسبوك',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'منصة X',
      icon: Twitter,
      color: 'bg-slate-900 hover:bg-slate-800 text-white',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`جلسة ${video.title} - ديوان السعادة`)}`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white border-2 border-amber-300 rounded-3xl max-w-lg w-full p-5 sm:p-6 text-right relative shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-700 flex-shrink-0 shadow-xs">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
              <span>مشاركة ونشر الجلسة</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                هوية ديوان السعادة
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              تظهر صورة وهوية ديوان السعادة تلقائياً فوق الرابط عند الإرسال بالواتساب
            </p>
          </div>
        </div>

        {/* WhatsApp & Social Media Card Visual Preview */}
        <div className="rounded-2xl border-2 border-amber-200/90 bg-[#FFFDF7] overflow-hidden shadow-md space-y-0">
          <div className="p-2.5 bg-gradient-to-r from-amber-50 via-teal-50 to-amber-50 border-b border-amber-200/60 flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span className="flex items-center gap-1.5 font-['Cairo'] text-teal-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>معاينة البطاقة كما ستظهر في الواتساب وشبكات التواصل:</span>
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-mono font-bold">
              OpenGraph HD
            </span>
          </div>

          {/* Social Banner Preview Image */}
          <div className="relative aspect-[1200/630] w-full bg-slate-900 overflow-hidden">
            <img
              src={video.thumbnail || bannerImage}
              alt="صورة بطاقة ديوان السعادة"
              className="w-full h-full object-cover"
              onError={e => {
                (e.target as HTMLImageElement).src = bannerImage;
              }}
            />
            {/* Watermark Logo Badge */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-amber-400/40 shadow-lg">
              <img
                src={logoImage}
                alt="شعار ديوان السعادة"
                className="w-5 h-5 rounded-full object-cover border border-amber-300"
              />
              <span className="text-[10px] font-black text-amber-300 font-['Cairo']">
                ديوان السعادة – نغم يجمعنا
              </span>
            </div>

            {/* Video Duration Badge */}
            <div className="absolute bottom-2.5 left-2.5 bg-slate-950/80 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
              {video.duration}
            </div>
          </div>

          {/* Meta text content */}
          <div className="p-3 bg-white space-y-1">
            <p className="text-xs font-black text-slate-900 font-['Cairo'] line-clamp-1">
              {video.title}
            </p>
            <p className="text-[11px] text-teal-800 font-bold line-clamp-1">
              {video.artist} • {video.album}
            </p>
            <p className="text-[10px] text-slate-500 font-mono truncate">
              {shareUrl}
            </p>
          </div>
        </div>

        {/* 1-Click Social Sharing Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {sharePlatforms.map((p, idx) => (
            <a
              key={idx}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-black text-xs transition shadow-xs cursor-pointer ${p.color}`}
            >
              <p.icon className="w-4 h-4" />
              <span>{p.name}</span>
            </a>
          ))}
        </div>

        {/* Bluetooth & System Nearby Share Button */}
        <button
          onClick={handleNativeShare}
          className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 border border-teal-200 text-teal-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
        >
          <Bluetooth className="w-4 h-4 text-blue-600" />
          <span>مشاركة عبر البلوتوث / الأجهزة القريبة (System Share)</span>
          <Radio className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
        </button>

        {/* Dual Copy Buttons: Link Only vs Full Invitation Message */}
        <div className="space-y-2 pt-1">
          {/* Link Only */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pr-3">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full bg-transparent text-xs text-slate-600 outline-none truncate font-mono text-left"
              dir="ltr"
            />
            <button
              onClick={handleCopyOnlyLink}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الرابط</span>
                </>
              )}
            </button>
          </div>

          {/* Full Invitation with Identity & Emoji */}
          <button
            onClick={handleCopyFormattedText}
            className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {copiedFullText ? (
              <>
                <Check className="w-4 h-4 text-emerald-700" />
                <span>تم نسخ الدعوة الكاملة مع الشعار والعنوان!</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-amber-700" />
                <span>نسخ الدعوة الكاملة مع الهوية لرسائل الواتساب</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

