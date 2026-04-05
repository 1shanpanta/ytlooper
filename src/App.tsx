import React, { useEffect } from 'react';
import { Repeat, AlertTriangle } from 'lucide-react';
import {
  Header,
  MobileWarning,
  Background,
  StatusDisplay,
  ShareButton,
  UrlInput,
  TimeInput,
  PlaybackControls,
  YouTubePlayer,
} from './components';
import { usePlayerStore } from './store';
import { useYouTubeAPI, useUrlClipLoader } from './hooks';
import { validateTimeRange, parseVideoId } from './utils/youtube';

function App() {
  // Zustand stores
  const {
    url,
    startTime,
    endTime,
    status,
    isPlaying,
    playbackRate,
    currentVideo,
    player,
    loopTimer,
    setUrl,
    setStartTime,
    setEndTime,
    setStatus,
    setIsPlaying,
    setPlaybackRate,
    setApiReady,
    setLoopTimer,
    loadVideo,
  } = usePlayerStore();


  // YouTube API hook
  const { isApiReady, isLoading: apiLoading } = useYouTubeAPI();

  // URL clip loader hook with proper orchestration
  const { isLoadingFromUrl, isUrlParamLoad, resetUrlParamLoad } = useUrlClipLoader(isApiReady);

  // Update API ready state
  useEffect(() => {
    setApiReady(isApiReady);
  }, [isApiReady, setApiReady]);

  // Auto-load video when URL changes (but prevent conflicts with URL param loading)
  useEffect(() => {
    if (!url.trim() || !isApiReady || isLoadingFromUrl || isUrlParamLoad) return;

    const debounceTimer = setTimeout(() => {
      const videoId = parseVideoId(url);
      if (videoId) {
        loadVideo(videoId);
      } else {
        setStatus('Invalid URL. Please paste a valid YouTube link or video ID.', 'error');
      }
    }, 800); // Longer debounce to prevent conflicts

    return () => clearTimeout(debounceTimer);
  }, [url, isApiReady, isLoadingFromUrl, isUrlParamLoad, loadVideo, setStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopTimer) {
        clearInterval(loopTimer);
      }
      if (player?.destroy) {
        try {
          player.destroy();
        } catch (error) {
          console.warn('Error destroying player on unmount:', error);
        }
      }
    };
  }, []);

  const handleVideoReady = () => {
    if (player && playbackRate !== 1) {
      player.setPlaybackRate(playbackRate);
    }
    setStatus('Video ready. Set times and click Play Clip to loop.', 'success');
  };

  const handleVideoError = (error: string) => {
    setStatus(error, 'error');
  };

  const handlePlayClip = () => {
    if (!player) {
      setStatus('Load a video first, then set times.', 'warning');
      return;
    }

    const duration = player.getDuration ? player.getDuration() : 0;
    const validation = validateTimeRange(startTime, endTime, duration);

    if (!validation.isValid) {
      setStatus(validation.error || 'Invalid time range.', 'error');
      return;
    }

    const { startSeconds, endSeconds } = validation;

    // Stop any existing loop
    if (loopTimer) {
      clearInterval(loopTimer);
      setLoopTimer(null);
    }

    // Calculate safe end time
    let endBound = endSeconds;
    if (duration > 0 && endBound > duration) {
      endBound = Math.max(0, duration - 0.05);
    }

    try {
      // Set playback rate
      if (playbackRate !== 1 && player.setPlaybackRate) {
        player.setPlaybackRate(playbackRate);
      }

      // Start playback
      player.seekTo(startSeconds, true);
      player.playVideo();
      setIsPlaying(true);

      const rateText = playbackRate !== 1 ? ` at ${playbackRate}x speed` : '';
      setStatus(
        `Playing clip ${startSeconds.toFixed(2)}s → ${endBound.toFixed(2)}s (looping)${rateText}`,
        'success'
      );

      // Set up loop timer
      const timer = setInterval(() => {
        if (!player || !player.getCurrentTime) return;
        const currentTime = player.getCurrentTime();
        if (currentTime >= endBound - 0.02) {
          player.seekTo(startSeconds, true);
          player.playVideo();
        }
      }, 200);

      setLoopTimer(timer);
    } catch {
      setStatus('Unable to play. Please try reloading the video.', 'error');
    }
  };

  const handlePauseClip = () => {
    if (!player?.pauseVideo) {
      setStatus('No video loaded to pause.', 'warning');
      return;
    }

    // Stop loop
    if (loopTimer) {
      clearInterval(loopTimer);
      setLoopTimer(null);
    }

    player.pauseVideo();
    setIsPlaying(false);
    setStatus('Clip paused.', 'info');
  };


  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);

    // Immediately change speed on YouTube player if it exists
    if (player && player.setPlaybackRate) {
      player.setPlaybackRate(rate);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    // Reset URL param load flag to allow auto-load for new manually entered URLs
    if (isUrlParamLoad) {
      resetUrlParamLoad();
    }
    setUrl(newUrl);
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePlayClip();
    }
  };

  return (
    <div
      className="relative h-screen overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:flex lg:items-center lg:justify-center bg-[#0a0a0b] text-white antialiased selection:bg-cyan-500/30 selection:text-cyan-100"
      style={{
        fontFamily: '"Inter", "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <Background />

      <div className="w-full max-w-6xl">
        <header>
          <Header />
        </header>
        <MobileWarning />

        {/* Content */}
        <main className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {/* Controls Card */}
          <section className="rounded-2xl bg-white/5 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_40px_rgba(0,0,0,0.45)]">
            <div className="p-5 sm:p-6 md:p-7">
              <div className="space-y-5">
                {/* URL Input */}
                <UrlInput
                  value={url}
                  onChange={handleUrlChange}
                  onSubmit={handlePlayClip}
                  disabled={apiLoading || isLoadingFromUrl}
                />

                {/* Playback Controls */}
                <PlaybackControls
                  isPlaying={isPlaying}
                  onPlay={handlePlayClip}
                  onPause={handlePauseClip}
                  playbackRate={playbackRate}
                  onPlaybackRateChange={handlePlaybackRateChange}
                  disabled={!currentVideo || apiLoading || isLoadingFromUrl}
                />

                {/* Time Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <TimeInput
                    value={startTime}
                    onChange={setStartTime}
                    onKeyDown={handleKeyPress}
                    label="Start Time"
                    placeholder="0 or 1m26s"
                  />
                  <TimeInput
                    value={endTime}
                    onChange={setEndTime}
                    onKeyDown={handleKeyPress}
                    label="End Time"
                    placeholder="10 or 2m30s"
                  />
                </div>


                {/* Share and Loop Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-white/70 rounded-xl px-3 py-2 bg-white/5 ring-1 ring-white/10">
                    <Repeat className="h-4 w-4 text-white/60" />
                    Auto-loop enabled
                  </div>
                  <div className="flex items-center gap-2">
                    <ShareButton />
                    <button
                      className="group inline-flex items-center justify-center rounded-xl p-3 min-h-[48px] min-w-[48px] bg-amber-400/10 text-amber-200 ring-1 ring-amber-300/20 hover:bg-amber-400/15 hover:ring-amber-300/30 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                      title="⚠️ Use headphones to avoid audio feedback if testing multiple players."
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-200 group-hover:text-amber-100" />
                    </button>
                  </div>
                </div>

                {/* Status */}
                <StatusDisplay status={status} />

                {/* Tips */}
                <div className="text-[11px] sm:text-xs text-amber-200/60">
                  ⚠️ Avoid playing the same video on YouTube and here simultaneously to prevent conflicts.
                </div>
              </div>
            </div>
          </section>

          {/* Player Card */}
          <YouTubePlayer
            videoId={currentVideo?.id}
            onReady={handleVideoReady}
            onError={handleVideoError}
          />
        </main>

        <footer className="mt-4 text-center text-xs text-white/40">
          <p>YouTube Looper — Loop any section of a YouTube video.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;