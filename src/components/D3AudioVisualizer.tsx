import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Activity, BarChart3, Disc, Sparkles, Waves } from 'lucide-react';

export type VisualizerMode = 'waves' | 'bars' | 'radial';

interface D3AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  theme?: 'gold' | 'neon' | 'cassette' | 'minimal' | 'royal' | 'talent';
  height?: number;
  className?: string;
  showModeSwitch?: boolean;
  defaultMode?: VisualizerMode;
}

export const D3AudioVisualizer: React.FC<D3AudioVisualizerProps> = ({
  audioElement,
  isPlaying,
  theme = 'gold',
  height = 130,
  className = '',
  showModeSwitch = true,
  defaultMode = 'waves',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>(defaultMode);
  const [boost, setBoost] = useState<number>(1.2);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Web Audio API refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // Theme Color Configurations
  const getThemePalette = () => {
    switch (theme) {
      case 'neon':
        return {
          primary: '#06b6d4', // cyan-500
          secondary: '#3b82f6', // blue-500
          accent: '#10b981', // emerald-500
          glow: 'rgba(6, 182, 212, 0.45)',
          bgGradient: 'from-slate-950/80 via-cyan-950/20 to-slate-950/80',
          textColor: 'text-cyan-400',
        };
      case 'cassette':
        return {
          primary: '#f59e0b', // amber-500
          secondary: '#d97706', // amber-600
          accent: '#b45309', // amber-700
          glow: 'rgba(245, 158, 11, 0.45)',
          bgGradient: 'from-amber-950/40 via-amber-900/20 to-amber-950/40',
          textColor: 'text-amber-400',
        };
      case 'minimal':
        return {
          primary: '#13b8a6', // teal-500
          secondary: '#0d9488', // teal-600
          accent: '#0284c7', // sky-600
          glow: 'rgba(19, 184, 166, 0.45)',
          bgGradient: 'from-teal-950/30 via-slate-900/30 to-teal-950/30',
          textColor: 'text-teal-400',
        };
      case 'royal':
        return {
          primary: '#0d65d9', // royal blue
          secondary: '#38bdf8', // sky blue
          accent: '#e8b957', // gold
          glow: 'rgba(13, 101, 217, 0.45)',
          bgGradient: 'from-blue-950/40 via-slate-900/30 to-blue-950/40',
          textColor: 'text-blue-400',
        };
      case 'talent':
        return {
          primary: '#10b981', // emerald-500
          secondary: '#06b6d4', // cyan-500
          accent: '#f59e0b', // amber-500
          glow: 'rgba(16, 185, 129, 0.45)',
          bgGradient: 'from-emerald-950/30 via-slate-900/30 to-emerald-950/30',
          textColor: 'text-emerald-400',
        };
      case 'gold':
      default:
        return {
          primary: '#eab308', // yellow-500
          secondary: '#13b8a6', // teal-500
          accent: '#f97316', // orange-500
          glow: 'rgba(234, 179, 8, 0.45)',
          bgGradient: 'from-amber-950/20 via-teal-950/15 to-amber-950/20',
          textColor: 'text-amber-400',
        };
    }
  };

  const palette = getThemePalette();

  // Try connecting Web Audio API Analyser
  useEffect(() => {
    if (!audioElement) return;

    const setupAudioContext = () => {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.82;

            audioCtxRef.current = ctx;
            analyserRef.current = analyser;

            try {
              const source = ctx.createMediaElementSource(audioElement);
              source.connect(analyser);
              analyser.connect(ctx.destination);
              sourceRef.current = source;
            } catch {
              // Element might already be connected by another node
            }
          }
        }
      } catch (err) {
        console.warn('AudioContext Analyser notice:', err);
      }
    };

    if (isPlaying) {
      setupAudioContext();
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    }
  }, [audioElement, isPlaying]);

  // D3 Rendering Loop
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth || 320;
    const h = height;

    svg.attr('width', width).attr('height', h).attr('viewBox', `0 0 ${width} ${h}`);

    // Clean previous children
    svg.selectAll('*').remove();

    // Defs for Gradients and Glow Filter
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'd3-glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradient 1 (Primary)
    const grad1 = defs
      .append('linearGradient')
      .attr('id', 'd3-grad-primary')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    grad1.append('stop').attr('offset', '0%').attr('stop-color', palette.primary).attr('stop-opacity', 0.9);
    grad1.append('stop').attr('offset', '50%').attr('stop-color', palette.secondary).attr('stop-opacity', 0.85);
    grad1.append('stop').attr('offset', '100%').attr('stop-color', palette.accent).attr('stop-opacity', 0.9);

    // Gradient Area Fill
    const gradArea = defs
      .append('linearGradient')
      .attr('id', 'd3-grad-area')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradArea.append('stop').attr('offset', '0%').attr('stop-color', palette.primary).attr('stop-opacity', 0.45);
    gradArea.append('stop').attr('offset', '100%').attr('stop-color', palette.secondary).attr('stop-opacity', 0.02);

    // Main Content Group
    const g = svg.append('g');

    // Setup Render Frame Function
    const render = () => {
      phaseRef.current += isPlaying ? 0.05 : 0.01;
      const phase = phaseRef.current;

      // Acquire Frequency Data if available
      let freqData: number[] = [];
      if (analyserRef.current && isPlaying) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        freqData = Array.from(dataArray.slice(0, 48)).map(v => v / 255);
      }

      // Fallback synthetic harmonic wave calculation (natural acoustic behavior)
      const pointCount = 36;
      const syntheticData = d3.range(pointCount).map(i => {
        if (!isPlaying) {
          // Gentle resting ambient harmonic
          return 0.08 + Math.sin(i * 0.3 + phase * 0.5) * 0.03;
        }

        const realVal = freqData[i % freqData.length] || 0;
        const harmonic1 = Math.sin(i * 0.28 + phase * 1.4) * 0.35;
        const harmonic2 = Math.cos(i * 0.55 - phase * 1.8) * 0.25;
        const harmonic3 = Math.sin(i * 0.85 + phase * 2.2) * 0.15;
        const beatPulse = (harmonic1 + harmonic2 + harmonic3 + 0.5) * boost;

        // Interaction modifier if mouse hovering
        let mouseInfluence = 0;
        if (mousePos) {
          const normMouseX = mousePos.x / width;
          const dist = Math.abs(i / pointCount - normMouseX);
          if (dist < 0.2) {
            mouseInfluence = (0.2 - dist) * 1.5;
          }
        }

        const combined = Math.max(0.05, Math.min(1, (realVal * 0.7 + beatPulse * 0.3) + mouseInfluence));
        return combined;
      });

      // Clear previous dynamic elements
      g.selectAll('*').remove();

      // =====================================
      // 1. Flowing Sine Waves (mode === 'waves')
      // =====================================
      if (mode === 'waves') {
        const xScale = d3.scaleLinear().domain([0, pointCount - 1]).range([0, width]);
        const yScale = d3.scaleLinear().domain([0, 1]).range([h - 8, 12]);

        // Background Secondary Sine Wave
        const lineSecondary = d3
          .line<number>()
          .x((_, i) => xScale(i))
          .y((d, i) => {
            const offset = Math.sin(i * 0.4 + phase * 1.8) * 12;
            return yScale(d * 0.75) + offset;
          })
          .curve(d3.curveBasis);

        g.append('path')
          .datum(syntheticData)
          .attr('fill', 'none')
          .attr('stroke', palette.secondary)
          .attr('stroke-width', 1.8)
          .attr('stroke-opacity', 0.5)
          .attr('d', lineSecondary);

        // Gradient Area Fill under Main Wave
        const areaMain = d3
          .area<number>()
          .x((_, i) => xScale(i))
          .y0(h)
          .y1(d => yScale(d))
          .curve(d3.curveBasis);

        g.append('path')
          .datum(syntheticData)
          .attr('fill', 'url(#d3-grad-area)')
          .attr('d', areaMain);

        // Foreground Glowing Primary Line
        const lineMain = d3
          .line<number>()
          .x((_, i) => xScale(i))
          .y(d => yScale(d))
          .curve(d3.curveBasis);

        g.append('path')
          .datum(syntheticData)
          .attr('fill', 'none')
          .attr('stroke', 'url(#d3-grad-primary)')
          .attr('stroke-width', 3)
          .attr('filter', 'url(#d3-glow)')
          .attr('d', lineMain);

        // Interactive particle nodes along peak frequencies
        if (isPlaying) {
          const step = Math.floor(pointCount / 6);
          syntheticData.forEach((val, idx) => {
            if (idx % step === 2 && val > 0.3) {
              const cx = xScale(idx);
              const cy = yScale(val);

              g.append('circle')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 3.5)
                .attr('fill', palette.accent)
                .attr('filter', 'url(#d3-glow)');

              g.append('circle')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 7)
                .attr('fill', 'none')
                .attr('stroke', palette.primary)
                .attr('stroke-width', 1)
                .attr('opacity', 0.7);
            }
          });
        }
      }

      // =====================================
      // 2. Frequency Spectrum Bars (mode === 'bars')
      // =====================================
      else if (mode === 'bars') {
        const barCount = 28;
        const barWidth = Math.max(3, (width / barCount) * 0.65);
        const barGap = width / barCount;
        const maxBarH = h - 24;

        for (let i = 0; i < barCount; i++) {
          const dataIdx = Math.floor((i / barCount) * pointCount);
          const val = syntheticData[dataIdx] || 0.1;
          const barHeight = Math.max(4, val * maxBarH);
          const x = i * barGap + (barGap - barWidth) / 2;
          const y = h - barHeight - 4;

          // Bar Body
          g.append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', barWidth)
            .attr('height', barHeight)
            .attr('rx', barWidth / 2)
            .attr('fill', i % 2 === 0 ? palette.primary : palette.secondary)
            .attr('opacity', isPlaying ? 0.85 : 0.4);

          // Glowing Floating Cap
          if (isPlaying && barHeight > 10) {
            g.append('circle')
              .attr('cx', x + barWidth / 2)
              .attr('cy', y - 4)
              .attr('r', Math.min(3, barWidth / 2))
              .attr('fill', palette.accent)
              .attr('filter', 'url(#d3-glow)');
          }
        }
      }

      // =====================================
      // 3. Radial Pulse Orbit (mode === 'radial')
      // =====================================
      else if (mode === 'radial') {
        const centerX = width / 2;
        const centerY = h / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.48;
        const radialPoints = 32;

        const radialData = d3.range(radialPoints).map(i => {
          const angle = (i / radialPoints) * 2 * Math.PI;
          const val = syntheticData[i % syntheticData.length];
          const r = baseRadius + val * (baseRadius * 0.95);
          return {
            x: centerX + Math.cos(angle) * r,
            y: centerY + Math.sin(angle) * r,
          };
        });

        // Center Pulsing Core
        g.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', baseRadius * (isPlaying ? 0.65 + Math.sin(phase * 2) * 0.08 : 0.55))
          .attr('fill', 'url(#d3-grad-area)')
          .attr('stroke', palette.primary)
          .attr('stroke-width', 1.5)
          .attr('filter', 'url(#d3-glow)');

        // Closed Radial Perimeter
        const radialLine = d3
          .line<{ x: number; y: number }>()
          .x(d => d.x)
          .y(d => d.y)
          .curve(d3.curveBasisClosed);

        g.append('path')
          .datum(radialData)
          .attr('fill', 'none')
          .attr('stroke', 'url(#d3-grad-primary)')
          .attr('stroke-width', 2.8)
          .attr('filter', 'url(#d3-glow)')
          .attr('d', radialLine);

        // Orbiting Satellites
        if (isPlaying) {
          for (let k = 0; k < 4; k++) {
            const orbitAngle = phase * 1.5 + (k * Math.PI) / 2;
            const ox = centerX + Math.cos(orbitAngle) * (baseRadius * 1.35);
            const oy = centerY + Math.sin(orbitAngle) * (baseRadius * 1.35);

            g.append('circle')
              .attr('cx', ox)
              .attr('cy', oy)
              .attr('r', 2.5)
              .attr('fill', palette.accent)
              .attr('opacity', 0.8);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mode, isPlaying, palette, boost, height, mousePos]);

  // Handle Mouse Interactive Ripple
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden p-3 bg-gradient-to-r ${palette.bgGradient} border border-amber-300/30 shadow-inner select-none ${className}`}
      dir="rtl"
    >
      {/* Top Visualizer Control Header */}
      {showModeSwitch && (
        <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/10 text-[11px]">
          <div className="flex items-center gap-1.5 font-bold">
            <Activity className={`w-3.5 h-3.5 ${palette.textColor} ${isPlaying ? 'animate-pulse' : ''}`} />
            <span className="font-['Cairo'] text-white">الموجات الصوتية التفاعلية (D3 Engine)</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border ${
                isPlaying
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isPlaying ? 'تفاعل حي 🔴' : 'وضع السكون'}
            </span>
          </div>

          {/* Mode Switchers */}
          <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setMode('waves')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                mode === 'waves'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="موجات نغمية انسيابية"
            >
              <Waves className="w-3 h-3" />
              <span>موجات</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('bars')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                mode === 'bars'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="أعمدة الطيف الترددي"
            >
              <BarChart3 className="w-3 h-3" />
              <span>أطياف</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('radial')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                mode === 'radial'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="النبض الإيقاعي الدائري"
            >
              <Disc className="w-3 h-3" />
              <span>دائري</span>
            </button>
          </div>
        </div>
      )}

      {/* SVG Canvas for D3 Graphics */}
      <svg
        ref={svgRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full cursor-crosshair block overflow-visible"
        style={{ height: `${height}px` }}
      />

      {/* Live Equalizer Status Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 px-1 border-t border-white/5">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>تفاعل ديناميكي مع أوتار العود والإيقاعات</span>
        </span>
        <div className="flex items-center gap-2 font-mono text-[9px]">
          <span className="text-teal-300">20Hz - 20kHz</span>
          <span className="text-amber-300">D3.js SVG Vector</span>
        </div>
      </div>
    </div>
  );
};
