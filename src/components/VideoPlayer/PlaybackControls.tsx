import React from 'react';
import { Play, Pause, MonitorPlay } from 'lucide-react';
import { PlaybackControlsProps } from '../../types';

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlay,
  onPause,
  playbackRate,
  onPlaybackRateChange,
  disabled = false,
  className = "",
}) => {
  return (
    <div className={`space-y-5 ${className}`}>
      {/* Playback Speed */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70 flex items-center gap-2 mb-1">
          <MonitorPlay className="h-4 w-4 text-white/60" />
          Playback Speed
        </label>
        <div className="flex flex-wrap gap-2">
           {PLAYBACK_RATES.map((rate) => (
            <button
              key={rate}
              onClick={() => onPlaybackRateChange(rate)}
              disabled={disabled}
              className={`px-3 py-2 min-h-[48px] min-w-[48px] text-xs rounded-lg ring-1 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                playbackRate === rate
                  ? 'bg-cyan-400/20 text-cyan-200 ring-cyan-300/30'
                  : 'bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white/90'
              }`}
            >
              {rate === 0.25 || rate === 0.5 || rate === 0.75 ? `${rate}x (Slow)` : `${rate}x`}
            </button>
          ))}
        </div>
      </div>

      {/* Play/Pause Controls */}
      <div className="flex gap-2 justify-start">
        <button
          onClick={onPlay}
          disabled={disabled || isPlaying}
          className="group inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 min-h-[48px] text-sm font-medium bg-white/5 text-white/90 ring-1 ring-white/10 hover:bg-white/7 hover:ring-white/20 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Play Clip"
        >
          <Play className="h-4 w-4 text-emerald-300 group-hover:text-emerald-200" />
          Play
        </button>
        <button
          onClick={onPause}
          disabled={disabled || !isPlaying}
          className="group inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 min-h-[48px] text-sm font-medium bg-white/5 text-white/90 ring-1 ring-white/10 hover:bg-white/7 hover:ring-white/20 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Pause Clip"
        >
          <Pause className="h-4 w-4 text-red-300 group-hover:text-red-200" />
          Pause
        </button>
      </div>
    </div>
  );
};