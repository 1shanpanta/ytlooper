import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { YouTubePlayer, VideoInfo, AppStatus, PlaybackState } from '../types';

interface PlayerStore extends PlaybackState {
  // Video state
  currentVideo: VideoInfo | null;
  player: YouTubePlayer | null;
  apiReady: boolean;
  status: AppStatus;

  // Input state
  url: string;
  startTime: string;
  endTime: string;

  // Timer ref for looping
  loopTimer: NodeJS.Timeout | null;

  // Actions
  setUrl: (url: string) => void;
  setStartTime: (time: string) => void;
  setEndTime: (time: string) => void;
  setPlayer: (player: YouTubePlayer | null) => void;
  setApiReady: (ready: boolean) => void;
  setStatus: (message: string, type?: AppStatus['type']) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaybackRate: (rate: number) => void;
  setIsLooping: (looping: boolean) => void;
  setLoopTimer: (timer: NodeJS.Timeout | null) => void;

  // Complex actions
  loadVideo: (videoId: string) => void;
  clearVideo: () => void;
  reset: () => void;
}

const initialState: Omit<PlayerStore, 'setUrl' | 'setStartTime' | 'setEndTime' | 'setPlayer' | 'setApiReady' | 'setStatus' | 'setIsPlaying' | 'setCurrentTime' | 'setDuration' | 'setPlaybackRate' | 'setIsLooping' | 'setLoopTimer' | 'loadVideo' | 'clearVideo' | 'reset'> = {
  // Video state
  currentVideo: null,
  player: null,
  apiReady: false,
  status: {
    message: 'Paste a YouTube URL, set start/end times, then load and play.',
    type: 'info',
    timestamp: new Date(),
  },

  // Playback state
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  isLooping: false,
  activeClip: null,

  // Input state
  url: '',
  startTime: '',
  endTime: '',

  // Timer
  loopTimer: null,
};

export const usePlayerStore = create<PlayerStore>()(
  devtools(
    persist(
      (set, get) => ({
      ...initialState,

      // Simple setters
      setUrl: (url) => set({ url }, false, 'setUrl'),
      setStartTime: (startTime) => set({ startTime }, false, 'setStartTime'),
      setEndTime: (endTime) => set({ endTime }, false, 'setEndTime'),
      setPlayer: (player) => set({ player }, false, 'setPlayer'),
      setApiReady: (apiReady) => set({ apiReady }, false, 'setApiReady'),
      setIsPlaying: (isPlaying) => set({ isPlaying }, false, 'setIsPlaying'),
      setCurrentTime: (currentTime) => set({ currentTime }, false, 'setCurrentTime'),
      setDuration: (duration) => set({ duration }, false, 'setDuration'),
      setPlaybackRate: (playbackRate) => set({ playbackRate }, false, 'setPlaybackRate'),
      setIsLooping: (isLooping) => set({ isLooping }, false, 'setIsLooping'),
      setLoopTimer: (loopTimer) => {
        const current = get().loopTimer;
        if (current) {
          clearInterval(current);
        }
        set({ loopTimer }, false, 'setLoopTimer');
      },

      setStatus: (message, type = 'info') =>
        set({
          status: {
            message,
            type,
            timestamp: new Date()
          }
        }, false, 'setStatus'),

      // Complex actions
      loadVideo: (videoId) => {
        const { player, currentVideo, setStatus, setLoopTimer } = get();

        if (!videoId) {
          setStatus('Invalid video ID', 'error');
          return;
        }

        // The player component only rebuilds when the id changes. Reloading the
        // same id would destroy the live player and leave an empty box.
        if (currentVideo?.id === videoId) return;

        // Stop any current loop
        setLoopTimer(null);

        // Destroy existing player
        if (player?.destroy) {
          try {
            player.destroy();
          } catch (error) {
            console.warn('Error destroying player:', error);
          }
        }

        set({
          currentVideo: { id: videoId, url: `https://www.youtube.com/watch?v=${videoId}` },
          player: null,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
        }, false, 'loadVideo');

        setStatus('Loading video...', 'info');
      },

      clearVideo: () => {
        const { player, setLoopTimer } = get();

        // Stop loop
        setLoopTimer(null);

        // Destroy player
        if (player?.destroy) {
          try {
            player.destroy();
          } catch (error) {
            console.warn('Error destroying player:', error);
          }
        }

        set({
          currentVideo: null,
          player: null,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          isLooping: false,
          activeClip: null,
        }, false, 'clearVideo');
      },

      reset: () => {
        const { clearVideo } = get();
        clearVideo();
        set({
          ...initialState,
          status: {
            message: 'Paste a YouTube URL, set start/end times, then load and play.',
            type: 'info',
            timestamp: new Date(),
          },
        }, false, 'reset');
      },
      }),
      {
        name: 'youtube-looper-session',
        partialize: (state) => ({
          url: state.url,
          startTime: state.startTime,
          endTime: state.endTime,
          playbackRate: state.playbackRate,
        }),
        // currentVideo must not come back from storage: it would mount the
        // player before the YouTube API is ready. The restore path in
        // useUrlClipLoader loads the video once the API is ready. Sessions
        // saved by older builds still hold the key, so pick fields explicitly.
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<PlayerStore>;
          return {
            ...current,
            url: saved.url ?? current.url,
            startTime: saved.startTime ?? current.startTime,
            endTime: saved.endTime ?? current.endTime,
            playbackRate: saved.playbackRate ?? current.playbackRate,
          };
        },
      }
    ),
    {
      name: 'player-store',
    }
  )
);