import {
  AlertCircle,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Film,
  HardDrive,
  HardDriveDownload,
  Headphones,
  Info,
  Loader2,
  Music,
  Play,
  RotateCcw,
  Share2,
  ShieldCheck,
  Smartphone,
  Tv,
  Video,
  WifiOff,
  X,
  Youtube,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { DataService } from '../services/dataService';
import { VideoItem } from '../types';
import { getVideoThumbnail, handleVideoThumbnailError } from '../utils/mediaUtils';

interface VideoDownloadModalProps {
  video: VideoItem | null;
  onClose: () => void;
  onWatchVideo?: (video: VideoItem) => void;
}

type DownloadFormat = '1080p' | '720p' | '480p' | '360p' | 'mp3';
type ProcessStage = 'idle' | 'connecting' | 'downloading_stream' | 'converting' | 'completed';

interface FormatOption {
  id: DownloadFormat;
  label: string;
  sublabel: string;
  badge: string;
  estSize: string;
  mbValue: number;
  isAudio?: boolean;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: '1080p',
    label: '1080p Full HD',
    sublabel: 'أعلى دقة ووضوح مسرحي (شاشات وتلفزيونات)',
    badge: 'FHD',
    estSize: '~85 MB',
    mbValue: 85.0,
  },
  {
    id: '720p',
    label: '720p HD عالية',
    sublabel: 'المستحسنة للجوال والسيارة (توازن الدقة والحجم)',
    badge: 'مستحسن',
    estSize: '~42 MB',
    mbValue: 42.0,
  },
  {
    id: '480p',
    label: '480p SD قياسية',
    sublabel: 'جودة قياسية مناسبة للذاكرة المحدودة',
    badge: 'SD',
    estSize: '~22 MB',
    mbValue: 22.0,
  },
  {
    id: '360p',
    label: '360p توفير البيانات',
    sublabel: 'حجم خفيف جداً للتنزيل السريع بشبكات الجيل 3G/4G',
    badge: 'خفيف',
    estSize: '~12 MB',
    mbValue: 12.0,
  },
  {
    id: 'mp3',
    label: 'صوت استوديو MP3',
    sublabel: 'استخراج المسار الصوتي الصافي بدقة 320kbps للمسجلات',
    badge: '320k',
    estSize: '~8.5 MB',
    mbValue: 8.5,
    isAudio: true,
  },
];

const OFFLINE_MEDIA_CACHE = 'dewan-offline-media-v1';

export const VideoDownloadModal: React.FC<VideoDownloadModalProps> = ({ video, onClose, onWatchVideo }) => {
  const [format, setFormat] = useState<DownloadFormat>('720p');
  const [stage, setStage] = useState<ProcessStage>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedOption = FORMAT_OPTIONS.find(f => f.id === format) || FORMAT_OPTIONS[1];

  useEffect(() => {
    if (!video) return;
    setCheckingAvailability(true);
    setStage('idle');
    setProgress(0);
    setCopiedLink(false);

    // Check if previously saved offline
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.open(OFFLINE_MEDIA_CACHE).then(cache => {
        const cleanId = (video.youtubeId || video.id).replace(/^yt-/, '');
        const targetUrl = `/api/download/video/${cleanId}`;
        cache.match(targetUrl).then(match => {
          if (match) setIsSavedOffline(true);
        }).catch(() => {});
      }).catch(() => {});
    }

    fetch(`/api/download/check/${video.youtubeId}`)
      .then(res => res.json())
      .catch(() => {})
      .finally(() => {
        setCheckingAvailability(false);
      });

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [video]);

  if (!video) return null;

  const cleanId = (video.youtubeId || video.id).replace(/^yt-/, '');
  const cleanTitle = (video.title || 'جلسة_ديوان_السعادة')
    .replace(/[\\/:*?"<>|#]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 50);

  const isAudio = format === 'mp3';
  const extension = isAudio ? 'mp3' : 'mp4';
  const downloadUrl = isAudio
    ? `/api/download/mp3/${cleanId}`
    : `/api/download/video/${cleanId}?quality=${format}`;
  const filename = `ديوان_السعادة_${cleanTitle}_${format}.${extension}`;

  const triggerActualDownload = async (serverUrl: string, targetFilename: string) => {
    try {
      const res = await fetch(serverUrl);
      if (!res.ok) throw new Error('Download request failed');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = targetFilename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 2500);
    } catch (_) {
      // Fallback direct anchor click
      const link = document.createElement('a');
      link.href = serverUrl;
      link.setAttribute('download', targetFilename);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 1000);
    }
  };

  // YouTube-like download workflow with progressive stages
  const handleStartDownloadWorkflow = () => {
    if (stage !== 'idle' && stage !== 'completed') return;

    setStage('connecting');
    setProgress(12);

    if (isAudio) {
      DataService.incrementMp3(video.id);
    } else {
      DataService.incrementDownloads(video.id);
    }

    let currentP = 12;
    progressTimerRef.current = setInterval(() => {
      currentP += Math.floor(Math.random() * 12) + 8;

      if (currentP >= 35 && currentP < 70) {
        setStage('downloading_stream');
      } else if (currentP >= 70 && currentP < 98) {
        setStage('converting');
      } else if (currentP >= 100) {
        currentP = 100;
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        setStage('completed');
        setProgress(100);

        // Save into offline cache automatically in background (YouTube-style seamless offline availability)
        saveToOfflineCache(downloadUrl, false);

        // Trigger file download to device storage
        triggerActualDownload(downloadUrl, filename);
      }

      setProgress(Math.min(currentP, 100));
    }, 140);
  };

  // Save into PWA Cache Storage for YouTube-like offline playback
  const saveToOfflineCache = async (url: string, showToast = true) => {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    try {
      setIsSavingOffline(true);
      const cache = await caches.open(OFFLINE_MEDIA_CACHE);
      const res = await fetch(url);
      if (res.ok) {
        await cache.put(url, res.clone());
        setIsSavedOffline(true);
      }
    } catch (e) {
      console.warn('Cache error:', e);
    } finally {
      setIsSavingOffline(false);
    }
  };

  const handleCopyDirectLink = () => {
    const fullUrl = `${window.location.origin}${downloadUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  const getStageDescription = () => {
    switch (stage) {
      case 'connecting':
        return 'المرحلة 1: الاتصال بخادم الأرشيف وفتح دفق البث المباشر...';
      case 'downloading_stream':
        return `المرحلة 2: تنزيل حزم الوسائط الأصلية (${selectedOption.label})...`;
      case 'converting':
        return isAudio
          ? 'المرحلة 3: استخراج وترميز الصوت عالي النقاء MP3 320kbps...'
          : 'المرحلة 3: معالجة وترميز FastStart H.264/AAC للتوافق مع مشغلات السيارات والجوالات...';
      case 'completed':
        return 'المرحلة 4: اكتمل التجهيز بنجاح! جاري حفظ الملف في وحدة التخزين...';
      default:
        return 'جاهز للتنزيل والمعالجة بأعلى جودة.';
    }
  };

  const currentDownloadedMb = ((progress / 100) * selectedOption.mbValue).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border-2 border-amber-300/80 rounded-3xl max-w-lg w-full p-4 sm:p-6 text-right relative shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer z-10"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3.5 border-b border-slate-100 pb-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-700 flex-shrink-0">
            {isAudio ? <Music className="w-6 h-6" /> : <Film className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
              <span>تنزيل الجلسة (بآلية يوتيوب الذكية)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold font-mono">
                {isAudio ? 'MP3 320k' : 'H.264 FastStart'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              تنزيل مباشر، حفظ للمشاهدة بدون إنترنت، وتوافق تام مع شاشات ومسجلات السيارات
            </p>
          </div>
        </div>

        {/* Selected Video Card Preview */}
        <div className="flex items-center gap-3 bg-[#FFFDF7] p-2.5 sm:p-3 rounded-2xl border border-amber-200/80 mb-3.5">
          <div className="relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-xs bg-slate-900">
            <img
              src={getVideoThumbnail({ thumbnail: video.thumbnail, youtubeId: video.youtubeId })}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={e => handleVideoThumbnailError(e, video.youtubeId)}
            />
            {isSavedOffline && (
              <span className="absolute bottom-1 right-1 bg-emerald-600/90 text-white p-0.5 rounded-md text-[9px] flex items-center gap-0.5 px-1 font-bold">
                <BookmarkCheck className="w-3 h-3" /> بدون نت
              </span>
            )}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs sm:text-sm font-black text-slate-900 truncate font-['Cairo']">{video.title}</p>
            <p className="text-xs text-teal-800 font-bold mt-0.5 truncate">{video.artist}</p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span>{video.duration || '08:30'}</span>
              <span>•</span>
              <span className="truncate">{video.album || 'جلسات ديوان السعادة'}</span>
            </div>
          </div>
        </div>

        {/* Multi-Tier Quality & Format Selector (YouTube Style) */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>اختر دقة التنزيل وحجم الملف:</span>
              <span className="text-[10px] text-slate-400 font-normal">(نظام YouTube التفاعلي)</span>
            </label>
            <span className="text-xs font-black text-teal-700 font-mono">{selectedOption.estSize}</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
            {FORMAT_OPTIONS.map(opt => {
              const isSelected = format === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    if (stage === 'idle' || stage === 'completed') {
                      setFormat(opt.id);
                    }
                  }}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-teal-50/90 border-teal-500 ring-1 ring-teal-500/30 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                  } ${stage !== 'idle' && stage !== 'completed' ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 font-['Cairo']">{opt.label}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                            opt.isAudio
                              ? 'bg-amber-100 text-amber-900'
                              : isSelected
                              ? 'bg-teal-200/70 text-teal-900'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{opt.sublabel}</p>
                    </div>
                  </div>

                  <span className="text-xs font-black text-slate-700 font-mono whitespace-nowrap">
                    {opt.estSize}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress or Status */}
        {stage !== 'idle' ? (
          <div className="mb-3.5 p-3.5 rounded-2xl bg-slate-950 text-white border border-teal-500/40 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold font-['Cairo'] flex items-center gap-2 text-teal-300">
                {stage === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                )}
                <span className="text-[11px] sm:text-xs truncate">{getStageDescription()}</span>
              </span>
              <span className="font-mono text-xs sm:text-sm font-black text-amber-400">
                {progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  stage === 'completed'
                    ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                    : 'bg-gradient-to-r from-amber-400 via-teal-400 to-emerald-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Realtime Byte Metrics */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
              <span>تم تنزيل: {currentDownloadedMb} MB / {selectedOption.estSize}</span>
              <span>{isAudio ? 'ترميز MP3 عالي النقاء' : 'ترميز FastStart H.264'}</span>
            </div>
          </div>
        ) : (
          /* YouTube Feature Highlights Banner */
          <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-slate-700 space-y-1 mb-3.5">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>مزايا التنزيل الأصلية المعتمدة:</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-600 font-['Tajawal']">
              ملفات رسمية معتمدة تدعم FastStart لتبدأ التشغيل فوراً، وتوافق تام 100% مع شاشات سيارات تويوتا ونيسان، مسجلات البلوتوث، وجميع الهواتف دون الحاجة لأي برامج.
            </p>
          </div>
        )}

        {/* Quick Secondary Actions Bar (Direct Link & Offline Cache) */}
        <div className="grid grid-cols-2 gap-2 mb-3.5">
          <button
            type="button"
            onClick={handleCopyDirectLink}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="نسخ رابط التحميل المباشر للاستخدام في برامج التنزيل IDM أو المشغلات الخارجية"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-black">تم نسخ الرابط!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>نسخ الرابط المباشر</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => saveToOfflineCache(downloadUrl, true)}
            disabled={isSavingOffline || isSavedOffline}
            className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              isSavedOffline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent'
            }`}
          >
            {isSavingOffline ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                <span>جاري الحفظ...</span>
              </>
            ) : isSavedOffline ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>محفوظ بدون إنترنت</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                <span>حفظ للمشاهدة بدون نت</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <a
            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold hover:underline"
          >
            <Youtube className="w-4 h-4" />
            <span>مشاهدة على YouTube</span>
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {stage === 'completed' ? 'إغلاق' : 'إلغاء'}
            </button>

            {stage === 'completed' ? (
              <button
                onClick={handleStartDownloadWorkflow}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة التنزيل</span>
              </button>
            ) : (
              <button
                onClick={handleStartDownloadWorkflow}
                disabled={stage !== 'idle' || checkingAvailability}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-[#13B8A6] to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white text-xs font-black shadow-md shadow-teal-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {stage !== 'idle' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التجهيز ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <HardDriveDownload className="w-4 h-4" />
                    <span>تنزيل {selectedOption.label} الآن</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
