import { Calendar, Clock, Disc, Music, Play, Sparkles, UserCheck, Layers } from 'lucide-react';
import React, { useMemo } from 'react';
import { Album, VideoItem } from '../types';

interface AlbumsViewProps {
  albums: Album[];
  videos: VideoItem[];
  onSelectVideo: (video: VideoItem) => void;
}

// Fallback verified frame covers as requested:
// 1. "أناني | من روائع الشاعر حسين المحضار | الفنان محمد الناخبي| ديوان السعادة" (6C9c8bSUDvs)
// 2. "بث مباشر من قِبل ديوان السعادة" (r0EHXmgI9h8)
const ANANI_FRAME_COVER = 'https://img.youtube.com/vi/6C9c8bSUDvs/hqdefault.jpg';
const LIVE_STREAM_FRAME_COVER = 'https://img.youtube.com/vi/r0EHXmgI9h8/hqdefault.jpg';

export const AlbumsView: React.FC<AlbumsViewProps> = ({ albums: propAlbums, videos, onSelectVideo }) => {
  // Aggregate all albums including any unique albums present in the videos database
  const allAlbums = useMemo(() => {
    const list: Album[] = [...propAlbums];
    const albumTitles = new Set(list.map(a => a.title.trim()));

    // Discover albums directly from video records
    videos.forEach(v => {
      if (v.album && !albumTitles.has(v.album.trim())) {
        albumTitles.add(v.album.trim());
        list.push({
          id: `alb-auto-${v.album.slice(0, 10).replace(/\s+/g, '-')}`,
          title: v.album,
          year: 2026,
          cover: v.thumbnail || ANANI_FRAME_COVER,
          description: `سلسلة تسجيلات جلسات ديوان السعادة التراثية في صنعاء، تضم روائع الطرب والسمرات الحية.`,
          sessionSupervisor: 'محمد قائد سيف',
        });
      }
    });

    return list;
  }, [propAlbums, videos]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Cairo'] flex items-center gap-3">
            <Disc className="w-7 h-7 text-[#13B8A6] animate-spin" style={{ animationDuration: '12s' }} />
            <span>ألبومات وجلسات ديوان السعادة التوثيقية</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            إصدارات وسلاسل طربية حية موثقة في استوديوهات ومقيل ديوان السعادة بصنعاء بإطارات فنية فاخرة ({allAlbums.length} ألبومات)
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold self-start">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>جودة استوديو أصلية 320kbps</span>
        </div>
      </div>

      {/* Albums Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {allAlbums.map(album => {
          const albumVideos = videos.filter(
            v => (v.albumId && v.albumId === album.id) || (v.album && v.album.trim() === album.title.trim())
          );

          // Guaranteed resolution of cover frame:
          // 1. album.cover
          // 2. Thumbnail from first video
          // 3. Fallback to Anani / Live stream frame
          let resolvedCover = album.cover && album.cover.trim() !== '' ? album.cover : '';
          if (!resolvedCover && albumVideos.length > 0 && albumVideos[0].thumbnail) {
            resolvedCover = albumVideos[0].thumbnail;
          }
          if (!resolvedCover) {
            resolvedCover = ANANI_FRAME_COVER;
          }

          return (
            <div
              key={album.id}
              className="group bg-white border-2 border-amber-200/80 hover:border-teal-400 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 space-y-5 relative overflow-hidden"
            >
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 via-teal-500 to-blue-600" />

              {/* Album Showcase Row: Framed Artwork + Vinyl Record Effect + Details */}
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start pt-1">
                {/* Vinyl Record Jacket & Framed Cover */}
                <div className="relative flex-shrink-0 group-hover:scale-[1.02] transition-transform duration-300">
                  {/* Subtle Vinyl Disc Peeking out from Behind the Frame */}
                  <div className="absolute -left-3 sm:-left-4 top-2 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-900 border-4 border-slate-950 shadow-xl flex items-center justify-center transform group-hover:-translate-x-2 transition-transform duration-300 pointer-events-none">
                    {/* Vinyl concentric groove texture */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-slate-700/60 flex items-center justify-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-slate-800 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 border-2 border-slate-900 shadow-xs flex items-center justify-center">
                          <Disc className="w-3.5 h-3.5 text-slate-950" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* High Quality Album Cover Frame */}
                  <div className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-amber-300 shadow-lg shadow-amber-900/15 bg-slate-900 ring-4 ring-amber-100">
                    <img
                      src={resolvedCover}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:brightness-105 transition-all duration-300"
                      onError={e => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('6C9c8bSUDvs')) {
                          target.src = ANANI_FRAME_COVER;
                        } else {
                          target.src = LIVE_STREAM_FRAME_COVER;
                        }
                      }}
                    />

                    {/* Frame Inner Glass Gloss Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 pointer-events-none" />

                    {/* Frame Badge */}
                    <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/75 text-amber-300 font-bold font-mono text-[10px] backdrop-blur-xs border border-amber-400/40">
                      {album.year}
                    </span>
                  </div>
                </div>

                {/* Album Metadata & Description */}
                <div className="space-y-2 flex-1 text-center sm:text-right">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200">
                      إصدار رسمي
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 font-bold border border-amber-200">
                      {albumVideos.length} جلسات مسجلة
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-['Cairo'] leading-snug">
                    {album.title}
                  </h3>

                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-600 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>المشرف الفني: <strong className="text-slate-800">{album.sessionSupervisor || 'محمد قائد'}</strong></span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {album.description}
                  </p>
                </div>
              </div>

              {/* Tracks in this album */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-teal-600" />
                    <span>الجلسات والمقاطع في هذا الألبوم ({albumVideos.length})</span>
                  </span>
                  <span>المدة</span>
                </div>

                {albumVideos.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {albumVideos.map((track, idx) => (
                      <div
                        key={track.id}
                        onClick={() => onSelectVideo(track)}
                        className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#FFFDF7] hover:bg-teal-50 hover:border-teal-300 cursor-pointer transition-all group/item border border-amber-100/70"
                        title={`تشغيل جلسة: ${track.title}`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="text-xs text-teal-700 font-mono font-bold w-5 text-center">
                            {idx + 1}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 group-hover/item:bg-teal-600 group-hover/item:text-white flex items-center justify-center flex-shrink-0 transition-colors">
                            <Play className="w-3 h-3 fill-current mr-0.5" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 group-hover/item:text-teal-900 truncate">
                              {track.title}
                            </p>
                            <p className="text-[11px] text-teal-700 font-medium truncate">{track.artist}</p>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono font-medium flex-shrink-0 mr-2">
                          {track.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/50 text-center text-xs text-slate-600 font-medium">
                    انقر على أي جلسة من قائمة الفيديوهات لإضافتها لهذا الألبوم وسماعها.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
