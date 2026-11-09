import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileAudio,
  Heart,
  Maximize2,
  Minimize2,
  Music,
  Play,
  Quote,
  Share2,
  Tv,
} from 'lucide-react';
import React, { useState } from 'react';
import { DataService } from '../services/dataService';
import { VideoItem } from '../types';

interface VideoCardProps {
  video: VideoItem;
  onWatch: (video: VideoItem) => void;
  onConvertMp3: (video: VideoItem) => void;
  onDownloadVideo: (video: VideoItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (videoId: string) => void;
  onCategoryClick?: (category: string) => void;
  onArtistClick?: (artistName: string) => void;
  onShare?: (video: VideoItem) => void;
  viewMode?: 'standard' | 'large' | 'compact';
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onWatch,
  onConvertMp3,
  onDownloadVideo,
  isFavorite,
  onToggleFavorite,
  onCategoryClick,
  onArtistClick,
  onShare,
  viewMode = 'standard',
}) => {
  const [copied, setCopied] = useState(false);
  const [imgFallbackIndex, setImgFallbackIndex] = useState(0);
  const [isInlinePlaying, setIsInlinePlaying] = useState(false);

  // Get true YouTube thumbnail hierarchy
  const thumbnailCandidates = DataService.getThumbnailHierarchy(video.youtubeId);
  const currentThumbnail = thumbnailCandidates[imgFallbackIndex] || video.thumbnail;

  const handleImgError = () => {
    if (imgFallbackIndex < thumbnailCandidates.length - 1) {
      setImgFallbackIndex(prev => prev + 1);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(video);
      return;
    }
    const shareUrl = `${window.location.origin}/?v=${video.youtubeId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleInlinePlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsInlinePlaying(prev => !prev);
  };

  const primaryCategory =
    video.categories && video.categories.length > 0 ? video.categories[0] : 'جلسات ديوان السعادة';

  // ----------------------------------------------------
  // 1. Compact View (Horizontal Row)
  // ----------------------------------------------------
  if (viewMode === 'compact') {
    return (
      <div className="bg-white rounded-2xl border border-amber-200/80 hover:border-teal-500/80 p-3 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Right Section: Thumbnail + Info */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div
            className="relative w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 cursor-pointer group"
            onClick={() => onWatch(video)}
          >
            <img
              src={currentThumbnail}
              alt={video.title}
              onError={handleImgError}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 flex items-center justify-center transition-colors">
              <Play className="w-5 h-5 text-amber-400 fill-current drop-shadow-md" />
            </div>
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-white">
              {video.duration}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h4
              onClick={() => onWatch(video)}
              className="text-xs sm:text-sm font-bold text-slate-900 hover:text-teal-700 cursor-pointer truncate font-['Cairo']"
              title={video.title}
            >
              {video.title}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <button
                onClick={() => onArtistClick?.(video.artist)}
                className="font-bold text-amber-900 hover:text-teal-700 truncate"
              >
                {video.artist}
              </button>
              <span>•</span>
              <button
                onClick={() => onCategoryClick?.(primaryCategory)}
                className="text-teal-800 hover:underline truncate"
              >
                {primaryCategory}
              </button>
              <span>•</span>
              <span className="font-mono text-slate-400">{video.views.toLocaleString('ar-YE')} مشاهدة</span>
            </div>
          </div>
        </div>

        {/* Left Section: Actions */}
        <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
          <button
            onClick={() => onWatch(video)}
            className="px-3 py-1.5 rounded-xl bg-[#13B8A6] hover:bg-[#0F766E] text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
            title="مشاهدة الجلسة"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>مشاهدة</span>
          </button>
          <button
            onClick={() => onDownloadVideo(video)}
            className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition cursor-pointer"
            title="تحميل فيديو MP4"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" />
          </button>
          <button
            onClick={() => onConvertMp3(video)}
            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition cursor-pointer"
            title="تحويل وتنزيل MP3"
          >
            <FileAudio className="w-3.5 h-3.5 text-amber-700" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="مشاركة الرابط"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onToggleFavorite(video.id)}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isFavorite ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600 hover:text-rose-500'
            }`}
            title="إضافة للمفضلة"
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. Large View (Cinematic Theater View)
  // ----------------------------------------------------
  if (viewMode === 'large') {
    return (
      <div className="group bg-white rounded-3xl border-2 border-amber-200/90 hover:border-amber-400 overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
        {/* Top Media Frame (Large 16:9 Container) */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
          {isInlinePlaying ? (
            <div className="w-full h-full relative">
              <iframe
                src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&modestbranding=1&rel=0`}
                title={video.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <button
                onClick={handleToggleInlinePlayer}
                className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-amber-400/40 shadow-lg backdrop-blur-md cursor-pointer transition z-20"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>تصغير العرض المكبّر</span>
              </button>
            </div>
          ) : (
            <div
              className="w-full h-full relative cursor-pointer"
              onClick={() => onWatch(video)}
            >
              <img
                src={currentThumbnail}
                alt={video.title}
                onError={handleImgError}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                loading="lazy"
              />

              {/* Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

              {/* Center Play Watermark */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-2xl shadow-amber-500/40">
                  <Play className="w-7 h-7 fill-current translate-x-0.5" />
                </div>
              </div>

              {/* Inline Enlarge Button (Watch directly in list) */}
              <button
                onClick={handleToggleInlinePlayer}
                className="absolute top-3 left-3 px-3.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-[#13B8A6] text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 shadow-lg backdrop-blur-md transition cursor-pointer z-10"
                title="مشاهدة وتكبير الجلسة داخل القائمة مباشرة"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                <span>تكبير ومشاهدة فورية</span>
              </button>

              {/* Top Right Badges */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-md">
                  {primaryCategory}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-xs font-mono font-bold border border-white/20 backdrop-blur-md flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-300" />
                  <span>{video.duration}</span>
                </span>
              </div>

              {/* Bottom Overlay Title & Artist info */}
              <div className="absolute bottom-3 right-3 left-3 text-white">
                <span className="text-[11px] text-amber-300 font-bold block mb-1">
                  جلسات ديوان السعادة – نغم يجمعنا
                </span>
                <h3 className="text-base sm:text-lg font-black font-['Cairo'] line-clamp-1 text-white drop-shadow-md">
                  {video.title}
                </h3>
              </div>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-between bg-white space-y-4">
          <div className="space-y-3">
            {/* Artist, Album & View Statistics */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <button
                onClick={() => onArtistClick?.(video.artist)}
                className="flex items-center gap-2 text-sm font-bold text-slate-800 hover:text-teal-700 transition"
              >
                <Music className="w-4 h-4 text-amber-500" />
                <span className="text-amber-950">{video.artist}</span>
              </button>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{video.publishedAt}</span>
                </span>
                <span className="flex items-center gap-1 text-teal-800 font-bold">
                  <Eye className="w-3.5 h-3.5 text-teal-600" />
                  <span>{video.views.toLocaleString('ar-YE')} مشاهدة</span>
                </span>
              </div>
            </div>

            {/* Lyrics Preview if available */}
            {video.lyrics && (
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-950/80 flex items-start gap-2 italic leading-relaxed">
                <Quote className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">«{video.lyrics.substring(0, 140)}...»</span>
              </div>
            )}
          </div>

          {/* Action Buttons Toolbar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {/* 1. Watch in Full Player */}
            <button
              onClick={() => onWatch(video)}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#13B8A6] to-[#0F766E] hover:from-[#0F766E] hover:to-[#115E59] text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>مشاهدة كاملة</span>
            </button>

            {/* 2. Download Video MP4 */}
            <button
              onClick={() => onDownloadVideo(video)}
              className="py-2.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-700" />
              <span>تحميل فيديو</span>
            </button>

            {/* 3. Convert MP3 */}
            <button
              onClick={() => onConvertMp3(video)}
              className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <FileAudio className="w-3.5 h-3.5 text-amber-700" />
              <span>تحويل MP3</span>
            </button>

            {/* 4. Share & Favorite */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleShare}
                className="flex-1 py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                title="مشاركة الرابط والهوية"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>مشاركة</span>
              </button>

              <button
                onClick={() => onToggleFavorite(video.id)}
                className={`p-2.5 rounded-xl border transition cursor-pointer ${
                  isFavorite
                    ? 'bg-rose-50 text-rose-600 border-rose-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-rose-500'
                }`}
                title={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. Standard Grid View (with Inline Enlarge Feature!)
  // ----------------------------------------------------
  return (
    <div className="group bg-white rounded-2xl border border-amber-200/90 hover:border-teal-500 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between transform hover:-translate-y-1">
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900 cursor-pointer">
        {isInlinePlaying ? (
          <div className="w-full h-full relative">
            <iframe
              src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&modestbranding=1&rel=0`}
              title={video.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            <button
              onClick={handleToggleInlinePlayer}
              className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-950 text-amber-300 text-[11px] font-bold flex items-center gap-1 border border-amber-400/40 shadow-lg backdrop-blur-md cursor-pointer z-20"
            >
              <Minimize2 className="w-3 h-3" />
              <span>إغلاق العرض</span>
            </button>
          </div>
        ) : (
          <div onClick={() => onWatch(video)} className="w-full h-full relative">
            <img
              src={currentThumbnail}
              alt={video.title}
              onError={handleImgError}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />

            {/* Play Icon Overlay */}
            <div className="absolute inset-0 bg-teal-950/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300 shadow-xl shadow-amber-500/30">
                <Play className="w-6 h-6 fill-current translate-x-0.5" />
              </div>
            </div>

            {/* Enlarge in list button on card */}
            <button
              onClick={handleToggleInlinePlayer}
              className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-950/80 hover:bg-amber-400 hover:text-slate-950 text-white text-[10px] font-bold flex items-center gap-1 border border-white/20 backdrop-blur-sm opacity-90 group-hover:opacity-100 transition z-10 cursor-pointer"
              title="مشاهدة وتكبير الفيديو مباشرة في القائمة"
            >
              <Maximize2 className="w-3 h-3" />
              <span>تكبير</span>
            </button>

            {/* Duration Badge */}
            <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-900/85 backdrop-blur-sm text-[11px] font-mono text-white flex items-center gap-1 border border-white/10">
              <Clock className="w-3 h-3 text-[#E8B957]" />
              <span>{video.duration}</span>
            </div>

            {/* Category Pill */}
            <div className="absolute top-2.5 right-2.5">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onCategoryClick?.(primaryCategory);
                }}
                className="px-2.5 py-0.5 rounded-full bg-white/95 hover:bg-[#13B8A6] hover:text-white text-teal-900 text-[11px] font-bold border border-teal-200/80 transition-colors shadow-sm backdrop-blur-sm"
              >
                {primaryCategory}
              </button>
            </div>

            {/* Favorite & Share buttons */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onToggleFavorite(video.id);
                }}
                className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
                  isFavorite
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-white/90 text-slate-700 hover:text-rose-500 shadow-sm'
                }`}
                title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={handleShare}
                className="p-1.5 rounded-full bg-white/90 text-slate-700 hover:text-teal-600 shadow-sm backdrop-blur-md transition-all"
                title="مشاركة الرابط والهوية"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Body */}
      <div className="p-4 flex-1 flex flex-col justify-between bg-white">
        <div>
          {/* Title */}
          <h3
            onClick={() => onWatch(video)}
            className="text-sm font-bold text-slate-900 hover:text-teal-700 cursor-pointer line-clamp-2 transition-colors mb-2 font-['Cairo'] leading-snug"
            title={video.title}
          >
            {video.title}
          </h3>

          {/* Artist & Album */}
          <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
            <button
              onClick={() => onArtistClick?.(video.artist)}
              className="flex items-center gap-1.5 hover:text-teal-700 transition-colors font-bold text-slate-800 truncate max-w-[65%]"
            >
              <Music className="w-3.5 h-3.5 text-[#E8B957] flex-shrink-0" />
              <span className="truncate">{video.artist}</span>
            </button>
            <span className="text-[11px] text-teal-800 truncate max-w-[35%] bg-teal-50 px-2 py-0.5 rounded-md font-medium border border-teal-100">
              {video.album.replace('جلسات ديوان السعادة – ', '')}
            </span>
          </div>

          {/* Metadata: Date & Views */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2.5 mb-3 font-medium">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{video.publishedAt}</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-teal-800">
              <Eye className="w-3 h-3 text-teal-600" />
              <span>{video.views.toLocaleString('ar-YE')} مشاهدة</span>
            </div>
          </div>
        </div>

        {/* 3 Explicit Action Buttons */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {/* 1. Download Video */}
          <button
            onClick={() => onDownloadVideo(video)}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200 transition-all cursor-pointer"
            title="تحميل الفيديو المصرح به"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span className="truncate">تحميل فيديو</span>
          </button>

          {/* 2. Watch Video */}
          <button
            onClick={() => onWatch(video)}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl bg-[#13B8A6] hover:bg-[#0F766E] text-white text-[11px] font-bold shadow-sm shadow-teal-500/20 transition-all cursor-pointer"
            title="مشاهدة الجلسة كاملة"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="truncate">مشاهدة</span>
          </button>

          {/* 3. Convert & Download MP3 */}
          <button
            onClick={() => onConvertMp3(video)}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200 transition-all cursor-pointer"
            title="تحويل وتنزيل بصيغة MP3 عالية النقاء 320kbps"
          >
            <FileAudio className="w-3.5 h-3.5 text-amber-600" />
            <span className="truncate">تحويل MP3</span>
          </button>
        </div>
      </div>
    </div>
  );
};
