import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { usePlayerStore } from '../../store';
import { copyClipUrl, updateUrlWithClip } from '../../utils/urlSharing';

interface ShareButtonProps {
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ className = "" }) => {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const {
    currentVideo,
    startTime,
    endTime,
    playbackRate,
    setStatus,
  } = usePlayerStore();

  const canShare = currentVideo && (startTime || endTime);

  const handleShare = async () => {
    if (!currentVideo) {
      setStatus('Load a video first to share', 'warning');
      return;
    }

    const clipParams = {
      videoId: currentVideo.id,
      startTime,
      endTime,
      playbackRate,
    };

    // Update current URL
    updateUrlWithClip(clipParams);

    // Copy to clipboard
    const success = await copyClipUrl(clipParams);

    if (success) {
      setCopied(true);
      setStatus('Clip URL copied to clipboard!', 'success');

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } else {
      setStatus('Failed to copy URL to clipboard', 'error');
    }
  };

  const handleMouseEnter = () => {
    if (canShare) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleShare}
        disabled={!canShare}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 min-h-[48px] text-sm font-medium ring-1 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed ${
          copied
            ? 'bg-green-400/20 text-green-200 ring-green-300/30'
            : 'bg-white/5 text-white/90 ring-white/10 hover:bg-white/7 hover:ring-white/20'
        }`}
        title={canShare ? 'Share this clip' : 'Set video and times to share'}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-green-300" />
            Copied!
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4 text-white/70 group-hover:text-white/90" />
            Share Clip
          </>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && canShare && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/80 text-white/90 text-xs rounded-lg whitespace-nowrap border border-white/10">
          Copy shareable URL
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/80"></div>
        </div>
      )}
    </div>
  );
};