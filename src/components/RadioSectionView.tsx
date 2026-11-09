import {
  Download,
  Headphones,
  Info,
  ListMusic,
  Maximize2,
  Music,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Bluetooth,
  BluetoothConnected,
  Smartphone,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { DataService } from '../services/dataService';
import { AdminSettings, RadioTrack } from '../types';
import { getVideoThumbnail, handleVideoThumbnailError } from '../utils/mediaUtils';
import { OfflineAudioService } from '../services/offlineAudioService';
import { BluetoothAudioService } from '../services/bluetoothAudioService';
import { BluetoothManagerModal } from './BluetoothManagerModal';
import { PWAInstallButton } from './PWAInstallButton';
import { D3AudioVisualizer } from './D3AudioVisualizer';

interface RadioSectionViewProps {
  settings: AdminSettings;
  tracks?: RadioTrack[];
  onPlayTrack?: (track: RadioTrack) => void;
  initialMode?: 'tracks' | 'live';
}

export const RadioSectionView: React.FC<RadioSectionViewProps> = ({
  settings,
  tracks: propTracks,
  onPlayTrack,
  initialMode = 'tracks',
}) => {
  const [radioMode, setRadioMode] = useState<'tracks' | 'live'>(initialMode);


  const [tracks, setTracks] = useState<RadioTrack[]>(() => propTracks || DataService.getRadioTracks());
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Audio Enhancer DSP Preset
  const [audioPreset, setAudioPreset] = useState<'natural' | 'studio' | 'vocal_clarity' | 'dewan_ambience'>('studio');
  
  // Radio Custom Themes
  const [radioTheme, setRadioTheme] = useState<'gold' | 'neon' | 'cassette' | 'minimal'>(() => {
    return (localStorage.getItem('dewan_radio_theme') as any) || 'gold';
  });

  const [copiedType, setCopiedType] = useState<'radio' | 'live' | null>(null);
  const [showAppModal, setShowAppModal] = useState(false);
  const [showBluetoothModal, setShowBluetoothModal] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(() => {
    return localStorage.getItem('dewan_selected_audio_device_name') || null;
  });

  // Live Stream state & metadata
  const [liveTrackIndex, setLiveTrackIndex] = useState<number>(0);
  const [liveStreamStatus, setLiveStreamStatus] = useState<'idle' | 'connecting' | 'connected' | 'offline'>('connected');
  const [liveStreamData, setLiveStreamData] = useState<{
    title: string;
    artist: string;
    listeners: number;
    streamUrl: string;
    session: string;
  }>({
    title: 'بث ديوان السعادة المباشر 24/7 – جلسات وسلطنة تراثية حية',
    artist: 'كوكبة فناني ديوان السعادة',
    listeners: 164,
    streamUrl: '/api/radio/live-stream',
    session: 'سمرات وأوتار يمنية مستمرة',
  });
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeTracks = tracks.filter(t => t.enabled);
  const currentTrack = activeTracks[currentIdx] || activeTracks[0] || null;
  const currentLiveTrack = activeTracks[liveTrackIndex] || activeTracks[0] || null;

  // Immediate auto-play function for live stream (instant audio playback without waiting)
  const playLiveStream = (targetIndex?: number) => {
    const idx = targetIndex !== undefined ? targetIndex : liveTrackIndex;
    const streamTarget = `/api/radio/live-stream?index=${idx}`;

    if (audioRef.current) {
      audioRef.current.pause();
    }
    setLiveStreamStatus('connecting');
    if (liveAudioRef.current) {
      liveAudioRef.current.src = streamTarget;
      liveAudioRef.current.load();
      liveAudioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setLiveStreamStatus('connected');
          setReconnectAttempts(0);
        })
        .catch(err => {
          console.warn('Live auto-play notice:', err);
          setLiveStreamStatus('connected');
        });
    }
  };

  // Automatically start live broadcast immediately when live mode is selected
  useEffect(() => {
    if (initialMode === 'live') {
      setRadioMode('live');
      const timer = setTimeout(() => {
        playLiveStream();
      }, 150);
      return () => clearTimeout(timer);
    } else if (initialMode && initialMode !== radioMode) {
      setRadioMode(initialMode);
    }
  }, [initialMode]);

  // High-Speed Track Preloader for Zero-Latency Next Track Transition
  useEffect(() => {
    if (activeTracks.length > 1) {
      const nextIndex = isShuffled
        ? Math.floor(Math.random() * activeTracks.length)
        : (currentIdx + 1) % activeTracks.length;
      const nextTrack = activeTracks[nextIndex];
      if (nextTrack) {
        OfflineAudioService.getPlayableUrl(nextTrack, nextIndex).then(url => {
          if (preloadAudioRef.current && url) {
            preloadAudioRef.current.src = url;
            preloadAudioRef.current.preload = 'auto';
          }
        });
      }
    }
  }, [currentIdx, isShuffled, activeTracks]);

  // Web Audio API Filter Nodes for Real Sound Enhancement
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);

  const applyAudioPreset = (preset: 'natural' | 'studio' | 'vocal_clarity' | 'dewan_ambience') => {
    setAudioPreset(preset);
    if (!audioRef.current) return;

    if (!audioCtxRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaElementSource(audioRef.current);
        sourceNodeRef.current = source;

        const bass = ctx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 120;

        const mid = ctx.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = 2500;
        mid.Q.value = 1.0;

        const high = ctx.createBiquadFilter();
        high.type = 'highshelf';
        high.frequency.value = 8000;

        source.connect(bass);
        bass.connect(mid);
        mid.connect(high);
        high.connect(ctx.destination);

        bassFilterRef.current = bass;
        midFilterRef.current = mid;
        highFilterRef.current = high;
      } catch (e) {
        console.warn('Web Audio DSP warning:', e);
      }
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (bassFilterRef.current && midFilterRef.current && highFilterRef.current) {
      if (preset === 'natural') {
        bassFilterRef.current.gain.value = 0;
        midFilterRef.current.gain.value = 0;
        highFilterRef.current.gain.value = 0;
      } else if (preset === 'studio') {
        bassFilterRef.current.gain.value = 5.0; // Bass warmth
        midFilterRef.current.gain.value = 2.5; // Vocal fullness
        highFilterRef.current.gain.value = 4.0; // Crisp strings
      } else if (preset === 'vocal_clarity') {
        bassFilterRef.current.gain.value = -4.0; // Remove rumble
        midFilterRef.current.gain.value = 6.0; // Boost lyrics
        highFilterRef.current.gain.value = 2.0;
      } else if (preset === 'dewan_ambience') {
        bassFilterRef.current.gain.value = 3.5;
        midFilterRef.current.gain.value = 4.5;
        highFilterRef.current.gain.value = 5.0;
      }
    }
  };

  const handleCopyRadioLink = () => {
    const url = `${window.location.origin}/radio`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedType('radio');
        setTimeout(() => setCopiedType(null), 3000);
      });
    }
  };

  const handleCopyLiveLink = () => {
    const url = `${window.location.origin}/live`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedType('live');
        setTimeout(() => setCopiedType(null), 3000);
      });
    }
  };

  const handleThemeChange = (newTheme: 'gold' | 'neon' | 'cassette' | 'minimal') => {
    setRadioTheme(newTheme);
    localStorage.setItem('dewan_radio_theme', newTheme);
  };

  // Check initial radio tracks & live stream metadata from backend
  useEffect(() => {
    fetch('/api/radio/tracks')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
          setTracks(data.tracks);
        }
      })
      .catch(() => {});

    fetch('/api/radio/live-status')
      .then(res => res.json())
      .then(data => {
        if (data && data.active) {
          if (data.currentIndex !== undefined) {
            setLiveTrackIndex(data.currentIndex);
          }
          setLiveStreamData({
            title: data.title || 'بث ديوان السعادة المباشر 24/7 – جلسات وسلطنة تراثية حية',
            artist: data.artist || 'كوكبة فناني ديوان السعادة',
            listeners: data.listeners || 164,
            streamUrl: data.streamUrl || '/api/radio/live-stream',
            session: data.session || 'سمرات وأوتار يمنية مستمرة',
          });
          setLiveStreamStatus('connected');
        }
      })
      .catch(() => {});

    // Apply saved audio sink to audio elements
    BluetoothAudioService.applyAudioSink(audioRef.current);
    BluetoothAudioService.applyAudioSink(liveAudioRef.current);

    const handleBtConnected = (e: any) => {
      if (e.detail?.deviceName) {
        setConnectedDeviceName(e.detail.deviceName);
      }
      if (e.detail?.deviceId) {
        BluetoothAudioService.applyAudioSink(audioRef.current, e.detail.deviceId);
        BluetoothAudioService.applyAudioSink(liveAudioRef.current, e.detail.deviceId);
      }
    };
    window.addEventListener('dewan:bluetooth-connected', handleBtConnected);
    return () => {
      window.removeEventListener('dewan:bluetooth-connected', handleBtConnected);
    };
  }, []);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.muted = isMuted;
    }
    if (liveAudioRef.current) {
      liveAudioRef.current.volume = isMuted ? 0 : volume;
      liveAudioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Handle Play / Pause for Tracks
  const handleTogglePlay = () => {
    if (radioMode === 'live') {
      handleToggleLive();
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(new CustomEvent('dewan:radio-play', { detail: { track: currentTrack } }));
      OfflineAudioService.getPlayableUrl(currentTrack, currentIdx).then(url => {
        if (audioRef.current) {
          if (audioRef.current.src !== url && !audioRef.current.src.endsWith(url)) {
            audioRef.current.src = url;
          }
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch(e => console.warn('Play error:', e));
        }
      });
    }
  };

  const handleNext = () => {
    if (activeTracks.length === 0) return;
    let next = 0;
    if (isShuffled) {
      next = Math.floor(Math.random() * activeTracks.length);
    } else {
      next = (currentIdx + 1) % activeTracks.length;
    }
    setCurrentIdx(next);
    const nextTrack = activeTracks[next];
    if (nextTrack) {
      OfflineAudioService.getPlayableUrl(nextTrack, next).then(url => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.currentTime = 0;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      });
    }
  };

  const handlePrev = () => {
    if (activeTracks.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prev = (currentIdx - 1 + activeTracks.length) % activeTracks.length;
    setCurrentIdx(prev);
    const prevTrack = activeTracks[prev];
    if (prevTrack) {
      OfflineAudioService.getPlayableUrl(prevTrack, prev).then(url => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.currentTime = 0;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      });
    }
  };

  const handleTrackEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } else {
      // Loops unconditionally through all library songs without stopping
      handleNext();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  // Next Track in Live Broadcast ("بعد التالي بعد التالي وهكذا إلى نهاية المكتبة")
  const handleLiveNext = () => {
    if (activeTracks.length === 0) return;
    const nextIdx = (liveTrackIndex + 1) % activeTracks.length;
    setLiveTrackIndex(nextIdx);
    const nextTrack = activeTracks[nextIdx];
    if (nextTrack) {
      setLiveStreamData(prev => ({
        ...prev,
        title: `بث ديوان السعادة – ${nextTrack.title}`,
        artist: nextTrack.artist,
        session: `${nextTrack.album || 'جلسات ديوان السعادة'} (${nextTrack.maqam || 'طرب وتراث'})`,
        streamUrl: `/api/radio/live-stream?index=${nextIdx}`,
      }));
      setLiveStreamStatus('connecting');
      if (liveAudioRef.current) {
        liveAudioRef.current.src = `/api/radio/live-stream?index=${nextIdx}`;
        liveAudioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setLiveStreamStatus('connected');
          })
          .catch(() => {
            setLiveStreamStatus('connected');
          });
      }
    }
  };

  // Previous Track in Live Broadcast
  const handleLivePrev = () => {
    if (activeTracks.length === 0) return;
    const prevIdx = (liveTrackIndex - 1 + activeTracks.length) % activeTracks.length;
    setLiveTrackIndex(prevIdx);
    const prevTrack = activeTracks[prevIdx];
    if (prevTrack) {
      setLiveStreamData(prev => ({
        ...prev,
        title: `بث ديوان السعادة – ${prevTrack.title}`,
        artist: prevTrack.artist,
        session: `${prevTrack.album || 'جلسات ديوان السعادة'} (${prevTrack.maqam || 'طرب وتراث'})`,
        streamUrl: `/api/radio/live-stream?index=${prevIdx}`,
      }));
      setLiveStreamStatus('connecting');
      if (liveAudioRef.current) {
        liveAudioRef.current.src = `/api/radio/live-stream?index=${prevIdx}`;
        liveAudioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setLiveStreamStatus('connected');
          })
          .catch(() => {
            setLiveStreamStatus('connected');
          });
      }
    }
  };

  // When a live broadcast session finishes, seamlessly jump to the next session ("بعد التالي")
  const handleLiveTrackEnded = () => {
    handleLiveNext();
  };

  // Live Stream Mode Handlers - Continuous 24/7 Live Broadcast
  const handleToggleLive = () => {
    if (isPlaying) {
      if (liveAudioRef.current) {
        liveAudioRef.current.pause();
      }
      setIsPlaying(false);
      setLiveStreamStatus('idle');
    } else {
      playLiveStream();
    }
  };

  const filtered = activeTracks.filter(
    t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.maqam && t.maqam.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatSec = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Hidden Audio Elements with High-Speed Auto Preloading */}
      <audio
        ref={audioRef}
        src={currentTrack?.audioUrl}
        preload="auto"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={handleTrackEnded}
      />
      <audio
        ref={preloadAudioRef}
        preload="auto"
        className="hidden"
        aria-hidden="true"
      />
      <audio
        ref={liveAudioRef}
        preload="none"
        onEnded={handleLiveTrackEnded}
        onError={() => {
          if (radioMode === 'live' && liveStreamStatus === 'connecting') {
            setLiveStreamStatus('offline');
          }
        }}
      />

      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-10 border border-amber-300/30 shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:20px_20px]" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>البث الإذاعي الرسمي المستمر</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-['Cairo'] text-white">
              ديوان السعادة – الراديو الرسمي
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed font-['Tajawal']">
              استمع مباشرة إلى تسجيلات الجلسات الطربية ونقاء أوتار العود الصنعاني واللحجي والحضرمي بالترتيب أو عبر بث القناة الرسمي دون انقطاع.
            </p>
          </div>

          {/* Mode Switcher with Independent Route Synchronization */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-2xl border border-amber-400/30">
              <button
                onClick={() => {
                  if (isPlaying) handleTogglePlay();
                  setRadioMode('tracks');
                  window.history.replaceState(null, '', '/radio');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  radioMode === 'tracks'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                الوضع 1: راديو الأغاني والمكتبة
              </button>
              <button
                onClick={() => {
                  setRadioMode('live');
                  window.history.replaceState(null, '', '/live');
                  playLiveStream();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  radioMode === 'live'
                    ? 'bg-red-600 text-white font-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
                <span>الوضع 2: البث المباشر</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Independent Links Bar (Direct URL for Radio & Direct URL for Live) */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-bold font-['Cairo']">روابط الاستماع والمشاركة المستقلة:</span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">روابط مباشرة مخصصة للمشاركة في واتساب والشبكات الاجتماعية</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Radio Link Button */}
            <button
              onClick={handleCopyRadioLink}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                copiedType === 'radio'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md'
              }`}
              title="نسخ الرابط المستقل لراديو الأغاني (/radio)"
            >
              <span>{copiedType === 'radio' ? '✓ تم نسخ رابط الراديو' : '📻 نسخ رابط الراديو (/radio)'}</span>
            </button>

            {/* Direct Live Broadcast Link Button */}
            <button
              onClick={handleCopyLiveLink}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                copiedType === 'live'
                  ? 'bg-red-700 text-white border-red-500 shadow-md ring-2 ring-red-400/50'
                  : 'bg-red-600/30 hover:bg-red-600/50 text-red-200 border-red-500/40 backdrop-blur-md'
              }`}
              title="نسخ الرابط المستقل للبث الحي المباشر (/live)"
            >
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              <span>{copiedType === 'live' ? '✓ تم نسخ رابط البث المباشر' : '🔴 نسخ رابط البث المباشر (/live)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Toolbars: Sound DSP Enhancement + Radio Themes + Bluetooth + Share External Link */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Real Sound DSP Enhancer */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-['Cairo']">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>معالجة وتحسين الصوت (DSP)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200">
              Web Audio
            </span>
          </div>
          <p className="text-[11px] text-slate-500">اختر نمط هندسة الصوت المفضل للجلسات:</p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {[
              { id: 'studio', label: '🎛️ استوديو ماستر' },
              { id: 'vocal_clarity', label: '🎙️ إزالة الضجيج' },
              { id: 'dewan_ambience', label: '🏛️ صدى السمرة' },
              { id: 'natural', label: '🎵 الصوت الطبيعي' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyAudioPreset(p.id as any)}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                  audioPreset === p.id
                    ? 'bg-gradient-to-r from-teal-600 to-[#13B8A6] text-white border-teal-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Radio Theme Selector */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-['Cairo']">
              <Headphones className="w-4 h-4 text-teal-600" />
              <span>مظهر وشكل الراديو المفضل</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">4 تصاميم</span>
          </div>
          <p className="text-[11px] text-slate-500">اختر النمط البصري المريح لك:</p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {[
              { id: 'gold', label: '👑 ديوان ذهبي' },
              { id: 'neon', label: '⚡ استوديو نيون' },
              { id: 'cassette', label: '📼 كاسيت تراثي' },
              { id: 'minimal', label: '🌿 فيروزي هادئ' },
            ].map(thm => (
              <button
                key={thm.id}
                type="button"
                onClick={() => handleThemeChange(thm.id as any)}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                  radioTheme === thm.id
                    ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {thm.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Bluetooth Audio Hub */}
        <div className="bg-white border border-cyan-200/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-['Cairo']">
                <Bluetooth className="w-4 h-4 text-cyan-600" />
                <span>الربط الخارجي بالبلوتوث</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 font-bold border border-cyan-200">
                {connectedDeviceName ? 'متصل 🎧' : 'متاح'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              ربط الراديو بسماعاتك اللاسلكية، الساوند بار، أو مسجل السيارة:
            </p>
          </div>

          <div className="pt-1">
            <button
              onClick={() => setShowBluetoothModal(true)}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BluetoothConnected className="w-4 h-4" />
              <span>{connectedDeviceName ? `الجهاز: ${connectedDeviceName}` : 'إعداد والبحث عن البلوتوث'}</span>
            </button>
          </div>
        </div>

        {/* 4. External Sharing & App Download Hub */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-['Cairo']">
              <Radio className="w-4 h-4 text-rose-500" />
              <span>تثبيت التطبيق ونشر الراديو</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              تثبيت تطبيق ديوان السعادة على الجوال أو الكمبيوتر ومشاركة الرابط:
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={handleCopyRadioLink}
              className={`w-full sm:flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                copiedType === 'radio'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200'
              }`}
              title="نسخ رابط الراديو المستقل"
            >
              <span>{copiedType === 'radio' ? '✓ تم نسخ الرابط' : '📻 رابط الراديو'}</span>
            </button>

            <button
              onClick={handleCopyLiveLink}
              className={`w-full sm:flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                copiedType === 'live'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
              }`}
              title="نسخ رابط البث المباشر المستقل"
            >
              <span>{copiedType === 'live' ? '✓ تم نسخ المباشر' : '🔴 رابط البث'}</span>
            </button>

            <button
              onClick={() => setShowAppModal(true)}
              className="w-full sm:w-auto py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-black shadow-xs hover:from-amber-600 hover:to-amber-700 transition cursor-pointer flex items-center justify-center gap-1 flex-shrink-0"
              title="تثبيت تطبيق ديوان السعادة على جهازك"
            >
              <Smartphone className="w-3.5 h-3.5 text-slate-950" />
              <span>تثبيت</span>
            </button>
          </div>
        </div>

      </div>

      {/* Main Studio Deck */}
      {radioMode === 'tracks' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deck Left (Now Playing Console with selected Theme) */}
          <div
            className={`lg:col-span-1 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl flex flex-col justify-between transition-all border ${
              radioTheme === 'neon'
                ? 'bg-slate-950 text-white border-cyan-500/50 shadow-cyan-500/10'
                : radioTheme === 'cassette'
                ? 'bg-amber-950/90 text-amber-100 border-amber-600/40 shadow-amber-900/20'
                : radioTheme === 'minimal'
                ? 'bg-teal-900 text-white border-teal-600 shadow-teal-900/20'
                : 'bg-white text-slate-900 border-amber-200/90'
            }`}
          >
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-amber-300/80 shadow-xl bg-slate-900 group">
                <img
                  src={getVideoThumbnail({ thumbnail: currentTrack?.thumbnail, youtubeId: currentTrack?.videoId })}
                  alt={currentTrack?.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={e => handleVideoThumbnailError(e, currentTrack?.videoId)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-4 right-4 left-4 text-white">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold mb-1.5 inline-block">
                    {currentTrack?.maqam || 'مقام يماني أصيل'}
                  </span>
                  <h3 className="text-base sm:text-lg font-black font-['Cairo'] line-clamp-2">
                    {currentTrack?.title}
                  </h3>
                  <p className="text-xs text-amber-200 font-bold mt-0.5">
                    {currentTrack?.artist}
                  </p>
                </div>
              </div>

              {/* Interactive Animated D3 Audio Waves Visualizer */}
              <D3AudioVisualizer
                audioElement={audioRef.current}
                isPlaying={isPlaying}
                theme={radioTheme}
                height={100}
                className="my-1.5"
                showModeSwitch={true}
                defaultMode="waves"
              />

              {/* Progress Slider */}
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                  <span>{formatSec(currentTime)}</span>
                  <span>{formatSec(duration)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#13B8A6]"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsShuffled(!isShuffled)}
                  className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                    isShuffled
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                  title="تشغيل عشوائي"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={handlePrev}
                  className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                  title="السابق"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                <button
                  onClick={handleTogglePlay}
                  className="w-14 h-14 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/30 transform active:scale-95 transition cursor-pointer"
                  title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current mr-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                  title="التالي"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    if (repeatMode === 'off') setRepeatMode('all');
                    else if (repeatMode === 'all') setRepeatMode('one');
                    else setRepeatMode('off');
                  }}
                  className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                    repeatMode !== 'off'
                      ? 'bg-teal-100 border-teal-300 text-teal-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                  title="تكرار"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={e => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-28 h-1.5 bg-slate-200 rounded-full appearance-none accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* PWA Install Promo */}
            <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 font-['Cairo']">تطبيق راديو ديوان السعادة</p>
                <p className="text-[11px] text-slate-500">تثبيت فوري ومجاني على جهازك</p>
              </div>
              <PWAInstallButton variant="radio" />
            </div>
          </div>

          {/* Deck Right (Full Interactive Playlist) */}
          <div className="lg:col-span-2 bg-white border border-amber-200/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-md flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Cairo'] flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-teal-600" />
                  <span>قائمة تشغيل الأغاني المعتمدة ({activeTracks.length})</span>
                </h2>
                <p className="text-xs text-slate-500">
                  انقر على أي تسجيل لتشغيله مباشرة، وستنتقل الإذاعة تلقائياً للمقطع التالي
                </p>
              </div>

              {/* Search in Playlist */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ابحث في تسجيلات الراديو..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FFFDF7] border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>
            </div>

            {/* Track List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((t, idx) => {
                const isCur = currentTrack?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setCurrentIdx(idx);
                      OfflineAudioService.getPlayableUrl(t, idx).then(url => {
                        if (audioRef.current) {
                          audioRef.current.src = url;
                          audioRef.current.currentTime = 0;
                          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                        }
                      });
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                      isCur
                        ? 'bg-amber-50/90 border-amber-300 shadow-xs'
                        : 'bg-white hover:bg-teal-50/50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                        {idx + 1}
                      </span>
                      <img
                        src={getVideoThumbnail({ thumbnail: t.thumbnail, youtubeId: t.videoId })}
                        alt={t.title}
                        className="w-12 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                        onError={e => handleVideoThumbnailError(e, t.videoId)}
                      />
                      <div className="overflow-hidden">
                        <p className={`text-xs font-bold truncate font-['Cairo'] ${isCur ? 'text-amber-900' : 'text-slate-900'}`}>
                          {t.title}
                        </p>
                        <p className="text-[11px] text-teal-800 font-bold mt-0.5">
                          {t.artist} {t.maqam && `• ${t.maqam}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-mono text-slate-500">{t.duration}</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCur && isPlaying ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'}`}>
                        {isCur && isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current mr-0.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Live Stream Mode Card - 24/7 Guaranteed Continuous Live Broadcast across entire library */
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-red-500/40 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-2xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-400 to-red-600 animate-pulse" />

            {/* Glowing Animated Live Radar Icon */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full bg-red-600/20 ${isPlaying ? 'animate-ping' : ''}`} />
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/30 border-2 border-red-400 flex items-center justify-center text-red-400 shadow-xl shadow-red-600/30">
                <Radio className={`w-8 h-8 sm:w-10 sm:h-10 ${isPlaying ? 'animate-pulse text-white' : 'text-red-400'}`} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                <span>البث الصوتي المباشر 24/7 • تسلسل مستمر بلا توقف</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white font-['Cairo']">
                {currentLiveTrack?.title || liveStreamData.title}
              </h2>

              <p className="text-xs sm:text-sm text-amber-200/90 font-bold max-w-lg mx-auto">
                {currentLiveTrack?.artist || liveStreamData.artist} • {currentLiveTrack?.maqam || 'طرب يماني'}
              </p>

              <div className="inline-block mt-1">
                <span className="text-[11px] px-3 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                  الجلسة {liveTrackIndex + 1} من أصل {activeTracks.length} في جدول البث
                </span>
              </div>
            </div>

            {/* Live Waveform & Status Visualizer */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 max-w-2xl mx-auto space-y-3">
              <div className="flex items-center justify-between text-xs font-bold px-2">
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                  <Wifi className="w-4 h-4 animate-pulse" />
                  <span>متصل بالبث الحي الآن (بعد التالي)</span>
                </span>

                <span className="text-amber-300 font-mono flex items-center gap-1">
                  <span>{liveStreamData.listeners} مستمع مباشر</span>
                </span>
              </div>

              {/* Interactive D3 Live Stream Waveform Visualizer */}
              <D3AudioVisualizer
                audioElement={liveAudioRef.current}
                isPlaying={isPlaying}
                theme={radioTheme === 'gold' ? 'neon' : radioTheme}
                height={115}
                className="my-2 border-red-500/30"
                showModeSwitch={true}
                defaultMode="waves"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 pt-1 border-t border-slate-800/60">
                <span>الجلسة الحالية: {currentLiveTrack?.album || liveStreamData.session}</span>
                <span className="font-mono text-cyan-400">جودة 320 kbps HD</span>
              </div>
            </div>

            {/* Core Action & Navigation Buttons (Next / Prev / Play in Live Broadcast) */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {/* Prev Button in Live Broadcast */}
              <button
                onClick={handleLivePrev}
                className="p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-bold"
                title="المقطع السابق في جدول البث الحي"
              >
                <SkipForward className="w-5 h-5" />
                <span className="hidden sm:inline">السابق</span>
              </button>

              {/* Main Play / Pause Button */}
              <button
                onClick={handleToggleLive}
                className={`px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer ${
                  isPlaying
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/40 ring-4 ring-red-500/20'
                    : 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-red-700 text-white shadow-red-600/30'
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current mr-0.5" />}
                <span>{isPlaying ? 'إيقاف البث الحي' : 'بدء الاستماع للبث الحي الآن 🔴'}</span>
              </button>

              {/* Next Button in Live Broadcast ("بعد التالي") */}
              <button
                onClick={handleLiveNext}
                className="p-3.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-400/40 transition cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-bold"
                title="المقطع التالي في جدول البث الحي (بعد التالي)"
              >
                <span className="hidden sm:inline">التالي</span>
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Bluetooth Button */}
              <button
                onClick={() => setShowBluetoothModal(true)}
                className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-400/30 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Bluetooth className="w-4 h-4 text-cyan-400" />
                <span>{connectedDeviceName ? `موصول: ${connectedDeviceName}` : 'ربط البلوتوث'}</span>
              </button>

              {/* Switch back to Tracks mode */}
              <button
                onClick={() => setRadioMode('tracks')}
                className="px-4 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition cursor-pointer"
              >
                راديو الأغاني
              </button>
            </div>
          </div>

          {/* Continuous Live Broadcast Queue (Schedule of all library sessions) */}
          <div className="bg-white border-2 border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-red-600" />
                  <span>جدول وقائمة البث المباشر المستمر ({activeTracks.length} جلسة بالتسلسل)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  يبث النظام كافة الجلسات واحدة تلو الأخرى ("بعد التالي") دون توقف حتى نهاية المكتبة مع إمكانية التقديم والتأخير
                </p>
              </div>

              <span className="text-[11px] px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 font-bold">
                🔴 دورة بث لا تنتهي
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {activeTracks.map((t, idx) => {
                const isCurrentLive = liveTrackIndex === idx;
                return (
                  <div
                    key={`live-q-${t.id}`}
                    onClick={() => {
                      setLiveTrackIndex(idx);
                      setLiveStreamData(prev => ({
                        ...prev,
                        title: `بث ديوان السعادة – ${t.title}`,
                        artist: t.artist,
                        session: `${t.album || 'جلسات ديوان السعادة'} (${t.maqam || 'طرب وتراث'})`,
                        streamUrl: `/api/radio/live-stream?index=${idx}`,
                      }));
                      if (liveAudioRef.current) {
                        liveAudioRef.current.src = `/api/radio/live-stream?index=${idx}`;
                        liveAudioRef.current
                          .play()
                          .then(() => {
                            setIsPlaying(true);
                            setLiveStreamStatus('connected');
                          })
                          .catch(() => {});
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition cursor-pointer ${
                      isCurrentLive
                        ? 'bg-red-50/90 border-red-400 ring-2 ring-red-400/20 shadow-xs'
                        : 'bg-slate-50 hover:bg-amber-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                      <span className="w-5 text-center text-xs font-mono font-bold text-slate-400">
                        {idx + 1}
                      </span>
                      <img
                        src={getVideoThumbnail({ thumbnail: t.thumbnail, youtubeId: t.videoId })}
                        alt={t.title}
                        className="w-11 h-9 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                        onError={e => handleVideoThumbnailError(e, t.videoId)}
                      />
                      <div className="overflow-hidden">
                        <p className={`text-xs font-bold truncate font-['Cairo'] ${isCurrentLive ? 'text-red-900' : 'text-slate-900'}`}>
                          {t.title}
                        </p>
                        <p className="text-[10px] text-teal-800 font-bold truncate">
                          {t.artist} {t.maqam && `• ${t.maqam}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isCurrentLive ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-bold animate-pulse">
                          يُبث الآن 🔴
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">{t.duration}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Dedicated App Publication & PWA Installation Modal */}
      {showAppModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="bg-white border-2 border-amber-300 rounded-3xl max-w-lg w-full p-6 text-right relative shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowAppModal(false)}
              className="absolute top-5 left-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-700 shadow-sm">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                  <span>تطبيق راديو ديوان السعادة الرسمي</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    PWA جاهز للنشر
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-['Tajawal']">
                  تثبيت فوري ومجاني لكافة أجهزة الجوال والكمبيوتر بنقاء استوديو فائق
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Primary 1-Click Install Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-xs font-black text-amber-950 font-['Cairo'] flex items-center gap-1.5 justify-center sm:justify-start">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>التثبيت المباشر الفوري</span>
                  </span>
                  <p className="text-[11px] text-slate-600">
                    يعمل كتطبيق مستقل بدون استهلاك ذاكرة، ويدعم تشغيل الصوت في شاشة القفل والخلفية
                  </p>
                </div>
                <div className="w-full sm:w-auto flex-shrink-0">
                  <PWAInstallButton variant="hero" />
                </div>
              </div>

              {/* Step-by-Step Installation Guides */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block font-['Cairo']">
                  📱 خطوات التثبيت السريعة حسب نوع جهازك:
                </span>
                <ul className="space-y-1.5 text-slate-600 text-[11px] leading-relaxed list-disc list-inside pr-1">
                  <li>
                    <strong className="text-slate-800">أندرويد (Chrome):</strong> اضغط على القائمة (⋮) ثم اختر <strong className="text-teal-700">«تثبيت التطبيق»</strong> أو <strong className="text-teal-700">«إضافة إلى الشاشة الرئيسية»</strong>.
                  </li>
                  <li>
                    <strong className="text-slate-800">آيفون وآيباد (Safari):</strong> اضغط على زر المشاركة (Share) بالأسفل ثم اختر <strong className="text-amber-700">«إضافة إلى الشاشة الرئيسية»</strong>.
                  </li>
                  <li>
                    <strong className="text-slate-800">الكمبيوتر (Windows / Mac):</strong> انقر على أيقونة التثبيت (⊕) بشريط العنوان أعلى المتصفح.
                  </li>
                </ul>
              </div>

              {/* Share and Publish Link */}
              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
                <span className="text-[11px] font-bold text-teal-900 block font-['Cairo']">
                  🔗 رابط نشر التطبيق الرسمي للمستمعين والمجموعات:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={window.location.origin}
                    className="bg-white border border-teal-300 rounded-xl px-3 py-1.5 text-xs text-teal-900 font-mono flex-1 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyRadioLink}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    {copiedType === 'radio' ? '✓ تم النسخ' : 'نسخ الرابط'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowAppModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bluetooth Connection & Devices Modal */}
      <BluetoothManagerModal
        isOpen={showBluetoothModal}
        onClose={() => setShowBluetoothModal(false)}
        onAudioDeviceSelected={(_devId, devName) => {
          setConnectedDeviceName(devName);
        }}
      />
    </div>
  );
};
