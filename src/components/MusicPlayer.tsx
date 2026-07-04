import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, SkipForward, SkipBack, Music, Volume2, Plus, Sparkles, AlertCircle, FileText, CheckCircle } from "lucide-react";
import { MusicPost, User } from "../types";

// Shared global audio engine to persist music across components and page switches
let sharedAudio: HTMLAudioElement | null = null;
let globalCurrentIdx = 0;
let globalTracks: MusicPost[] = [];

if (typeof window !== "undefined") {
  if (!(window as any).__shared_starry_audio__) {
    (window as any).__shared_starry_audio__ = new Audio();
  }
  sharedAudio = (window as any).__shared_starry_audio__;
}

interface MusicPlayerProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export default function MusicPlayer({ currentUser, onRefreshData }: MusicPlayerProps) {
  const [tracks, setTracks] = useState<MusicPost[]>(globalTracks);
  const [currentIdx, setCurrentIdx] = useState(globalCurrentIdx);
  const [isPlaying, setIsPlaying] = useState(sharedAudio ? !sharedAudio.paused && !!sharedAudio.src : false);
  const [currentTime, setCurrentTime] = useState(sharedAudio ? sharedAudio.currentTime : 0);
  const [duration, setDuration] = useState(sharedAudio ? sharedAudio.duration || 0 : 0);
  const [volume, setVolume] = useState(sharedAudio ? sharedAudio.volume : 0.8);
  const [isLoading, setIsLoading] = useState(globalTracks.length === 0);

  // Submission Form State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [newAudioUrl, setNewAudioUrl] = useState("");
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch approved tracks from server
  const fetchTracks = async () => {
    if (globalTracks.length === 0) {
      setIsLoading(true);
    }
    try {
      const res = await fetch("/api/posts/music");
      if (res.ok) {
        const data = await res.json();
        setTracks(data);
        globalTracks = data;
        
        // If shared audio doesn't have a source yet but we have tracks, set the default
        if (sharedAudio && !sharedAudio.src && data.length > 0) {
          sharedAudio.src = data[globalCurrentIdx].audio_url;
        }
      }
    } catch (err) {
      console.error("Error fetching tracks", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  // Update global index reference when currentIdx changes
  useEffect(() => {
    globalCurrentIdx = currentIdx;
  }, [currentIdx]);

  const currentTrack = tracks[currentIdx] || null;

  // Sync state with HTMLAudioElement events
  useEffect(() => {
    if (!sharedAudio) return;

    const onTimeUpdate = () => {
      setCurrentTime(sharedAudio!.currentTime);
    };

    const onDurationChange = () => {
      setDuration(sharedAudio!.duration || 0);
    };

    const onEnded = () => {
      nextTrack();
    };

    const onPlay = () => {
      setIsPlaying(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    sharedAudio.addEventListener("timeupdate", onTimeUpdate);
    sharedAudio.addEventListener("durationchange", onDurationChange);
    sharedAudio.addEventListener("ended", onEnded);
    sharedAudio.addEventListener("play", onPlay);
    sharedAudio.addEventListener("pause", onPause);

    // Initial sync
    setCurrentTime(sharedAudio.currentTime);
    setDuration(sharedAudio.duration || 0);
    setIsPlaying(!sharedAudio.paused && !!sharedAudio.src);

    return () => {
      if (sharedAudio) {
        sharedAudio.removeEventListener("timeupdate", onTimeUpdate);
        sharedAudio.removeEventListener("durationchange", onDurationChange);
        sharedAudio.removeEventListener("ended", onEnded);
        sharedAudio.removeEventListener("play", onPlay);
        sharedAudio.removeEventListener("pause", onPause);
      }
    };
  }, [tracks, currentIdx]);

  // Handle Track Source Change
  const selectTrack = (idx: number, autoPlay = true) => {
    if (!sharedAudio || tracks.length === 0) return;
    const track = tracks[idx];
    if (!track) return;

    setCurrentIdx(idx);
    globalCurrentIdx = idx;

    const isSameSrc = sharedAudio.src === track.audio_url;
    if (!isSameSrc) {
      sharedAudio.src = track.audio_url;
      sharedAudio.load();
    }

    if (autoPlay) {
      sharedAudio.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.log("Playback interrupted or error:", e));
    }
  };

  // Sync play state
  const togglePlay = () => {
    if (!sharedAudio || tracks.length === 0) return;
    
    // Ensure src is loaded
    if (!sharedAudio.src && currentTrack) {
      sharedAudio.src = currentTrack.audio_url;
      sharedAudio.load();
    }

    if (isPlaying) {
      sharedAudio.pause();
      setIsPlaying(false);
    } else {
      sharedAudio.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error("Audio play error", err);
          setIsPlaying(false);
        });
    }
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    const nextIdx = (currentIdx + 1) % tracks.length;
    selectTrack(nextIdx, isPlaying);
  };

  const prevTrack = () => {
    if (tracks.length === 0) return;
    const prevIdx = (currentIdx - 1 + tracks.length) % tracks.length;
    selectTrack(prevIdx, isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (sharedAudio) {
      sharedAudio.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (sharedAudio) {
      sharedAudio.volume = val;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Submit new music
  const handleSubmitMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!newTitle || !newArtist || !newAudioUrl) {
      setSubmitError("請填寫必填欄位 (歌名、歌手、音訊網址)！");
      return;
    }

    try {
      const payload = {
        title: newTitle,
        artist: newArtist,
        audio_url: newAudioUrl,
        cover_url: newCoverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500",
        duration: "4:00", // Default display duration
        user_id: currentUser?.id || "anonymous",
        username: currentUser?.username || "Anonymous Visitor",
        role: currentUser?.role || "user"
      };

      const res = await fetch("/api/posts/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload })
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setNewTitle("");
        setNewArtist("");
        setNewAudioUrl("");
        setNewCoverUrl("");
        if (currentUser?.role === "admin") {
          // Instantly refresh
          fetchTracks();
        }
        if (onRefreshData) {
          onRefreshData();
        }
        setTimeout(() => {
          setShowSubmitModal(false);
          setSubmitSuccess(false);
        }, 2000);
      } else {
        const data = await res.json();
        setSubmitError(data.error || "投稿失敗，請稍後再試。");
      }
    } catch (err) {
      setSubmitError("伺服器連線出錯，請確認網路連線。");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto glass p-6 rounded-[32px] border border-[#FF799C]/20 relative overflow-hidden shadow-xl text-[#6E4B55]">


      {/* Decorative tag */}
      <div className="absolute top-4 left-6 flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-[#FF799C] animate-pulse" />
        <span className="text-[10px] font-mono tracking-widest text-[#FF799C]/80 uppercase">
          JEREMY • VINYL PLAYER • ZACK
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mt-4">
        {/* Vinyl Section (5 columns on desktop) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          {/* Turntable Stylus Arm */}
          <div 
            className="absolute top-[-20px] right-[40px] z-20 origin-top-left transition-transform duration-700"
            style={{
              transform: isPlaying ? "rotate(15deg)" : "rotate(-12deg)"
            }}
          >
            <svg width="60" height="120" viewBox="0 0 60 120" fill="none">
              {/* Base pivot */}
              <circle cx="15" cy="15" r="12" fill="#2d1e3d" stroke="#FF799C" strokeWidth="2" />
              <circle cx="15" cy="15" r="4" fill="#FF799C" />
              {/* Main metal arm */}
              <path d="M 15 15 L 15 80 L 40 105" stroke="#a09fb1" strokeWidth="4" strokeLinecap="round" />
              {/* Cartridge head */}
              <rect x="34" y="100" width="12" height="18" rx="2" fill="#FF799C" stroke="#2d1e3d" strokeWidth="1" />
              <circle cx="40" cy="109" r="2" fill="#fff" />
            </svg>
          </div>

          {/* Vinyl Disc */}
          <div className="relative h-60 w-60 rounded-full bg-neutral-900 border-4 border-[#FF799C]/30 flex items-center justify-center shadow-lg shadow-[#FF799C]/20 relative overflow-hidden">
            {/* Vinyl record grooves */}
            <div className="absolute inset-2 rounded-full border border-black/40" />
            <div className="absolute inset-6 rounded-full border border-black/40" />
            <div className="absolute inset-10 rounded-full border border-black/40" />
            <div className="absolute inset-14 rounded-full border border-black/40" />
            <div className="absolute inset-18 rounded-full border border-white/5" />
            <div className="absolute inset-24 rounded-full border border-black/40" />

            {/* Album artwork in the center */}
            <div 
              className={`h-28 w-28 rounded-full overflow-hidden border-4 border-neutral-900 relative z-10 transition-transform ${isPlaying ? "animate-vinyl-spin" : ""}`}
              style={{ transform: !isPlaying ? "rotate(12deg)" : undefined }}
            >
              {currentTrack?.cover_url ? (
                <img 
                  src={currentTrack.cover_url} 
                  alt={currentTrack.title} 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-tr from-[#FF799C] to-[#FFCCDD] flex items-center justify-center">
                  <Music className="h-8 w-8 text-white" />
                </div>
              )}
              {/* Center hole spindle */}
              <div className="absolute inset-0 m-auto h-4 w-4 rounded-full bg-neutral-900 border-2 border-[#FFCCDD]" />
            </div>
          </div>

          {/* Player controls */}
          <div className="flex items-center gap-6 mt-6 z-10">
            <button 
              onClick={prevTrack}
              className="p-3 rounded-full hover:bg-[#FF799C]/5 text-[#6E4B55]/70 hover:text-[#FF799C] transition-all active:scale-95"
              title="上一首"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button 
              onClick={togglePlay}
              className="p-5 rounded-full bg-[#FF799C] hover:bg-[#FF799C]/90 text-white shadow-lg shadow-[#FF799C]/20 transition-all active:scale-95 hover:scale-105"
              title={isPlaying ? "暫停" : "播放"}
            >
              {isPlaying ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white ml-0.5" />}
            </button>
            <button 
              onClick={nextTrack}
              className="p-3 rounded-full hover:bg-[#FF799C]/5 text-[#6E4B55]/70 hover:text-[#FF799C] transition-all active:scale-95"
              title="下一首"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Music Metadata and Playlist (7 columns) */}
        <div className="md:col-span-7 flex flex-col h-full justify-between">
          <div>
            {currentTrack ? (
              <div className="text-left">
                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono bg-[#FF799C]/10 text-[#FF799C] border border-[#FF799C]/20 mb-3">
                  NOW PLAYING
                </span>
                <h3 className="text-2xl font-serif font-light text-[#FF799C] tracking-wide">
                  {currentTrack.title}
                </h3>
                <p className="text-[#6E4B55]/70 text-sm mt-1 font-sans">
                  {currentTrack.artist}
                </p>
              </div>
            ) : (
              <div className="text-left text-[#6E4B55]/40 py-4">
                <Music className="h-8 w-8 mb-2 animate-pulse" />
                <p className="font-serif">{"目前還沒有內容 >< 歡迎投稿你的作品"}</p>
              </div>
            )}

            {/* Seek Bar */}
            <div className="mt-6">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-[#FF799C]/10 rounded-lg appearance-none cursor-pointer accent-[#FF799C]"
              />
              <div className="flex justify-between text-[11px] font-mono text-[#6E4B55]/50 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 mt-4 text-[#6E4B55]/50 justify-end">
              <Volume2 className="h-4 w-4 text-[#FF799C]" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-1 bg-[#FF799C]/10 rounded-lg appearance-none cursor-pointer accent-[#FF799C]"
              />
            </div>
          </div>

          {/* Tracklist Area */}
          <div className="mt-6 border-t border-[#FF799C]/10 pt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-mono tracking-widest text-[#6E4B55]/50 uppercase">
                STARRY TRACKS ({tracks.length})
              </span>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="text-xs text-[#FF799C] hover:text-[#FFCCDD] flex items-center gap-1 bg-[#FF799C]/5 px-2.5 py-1.5 rounded-full border border-[#FF799C]/10 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>應援投稿</span>
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
              {isLoading ? (
                <div className="text-center py-4 text-xs font-mono text-[#6E4B55]/30">載入音樂庫中...</div>
              ) : tracks.length === 0 ? (
                <div className="text-center py-4 text-xs font-serif text-[#6E4B55]/40">{"目前還沒有內容 >< 歡迎投稿你的作品"}</div>
              ) : (
                tracks.map((track, idx) => (
                  <div
                    key={track.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${currentIdx === idx ? "bg-[#FF799C]/10 border border-[#FF799C]/20 text-[#FF799C]" : "hover:bg-[#FF799C]/5 text-[#6E4B55]/70"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg overflow-hidden bg-[#FF799C]/5 flex items-center justify-center shrink-0 border border-[#FF799C]/10">
                        {track.cover_url ? (
                          <img src={track.cover_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Music className="h-4 w-4 text-[#FF799C]" />
                        )}
                      </div>
                      <div className="text-left text-xs">
                        <p className="font-semibold truncate max-w-[160px] md:max-w-[200px]">{track.title}</p>
                        <p className="opacity-75 truncate max-w-[120px]">{track.artist}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono opacity-50">{track.duration}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white/95 text-[#6E4B55] p-6 rounded-3xl border border-[#FF799C]/25 shadow-2xl relative"
            >
              <h4 className="text-xl font-serif font-light text-[#FF799C] mb-2 flex items-center gap-2">
                <Music className="h-5 w-5 text-[#FF799C]" />
                音樂應援投稿
              </h4>
              <p className="text-xs text-[#6E4B55]/60 mb-6">
                {currentUser ? `親愛的 ${currentUser.username}，請分享你的應援歌曲：` : "分享你的應援歌曲：(非登入用戶投稿需審核)"}
              </p>

              {submitSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-[#FF799C]">
                  <CheckCircle className="h-16 w-16 mb-4 animate-bounce" />
                  <p className="text-lg font-serif">應援投稿成功！</p>
                  <p className="text-xs text-[#6E4B55]/60 mt-2">
                    {currentUser?.role === "admin" ? "已直接發布至音樂庫！" : "已進入星願審核佇列，請耐心等待管理員核可。"}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitMusic} className="space-y-4 text-left">
                  {submitError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono text-[#6E4B55]/70 mb-1.5">歌名 *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Starry Echo"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-[#FFF6F2]/60 border border-[#FF799C]/20 focus:border-[#FF799C] focus:outline-none text-[#6E4B55] text-sm px-3.5 py-2.5 rounded-xl transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#6E4B55]/70 mb-1.5">歌手 / 製作人 *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Zack & Jeremy"
                      value={newArtist}
                      onChange={(e) => setNewArtist(e.target.value)}
                      className="w-full bg-[#FFF6F2]/60 border border-[#FF799C]/20 focus:border-[#FF799C] focus:outline-none text-[#6E4B55] text-sm px-3.5 py-2.5 rounded-xl transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#6E4B55]/70 mb-1.5">音樂串流網址 (MP3) *</label>
                    <input
                      type="url"
                      required
                      placeholder="e.g. https://domain.com/track.mp3"
                      value={newAudioUrl}
                      onChange={(e) => setNewAudioUrl(e.target.value)}
                      className="w-full bg-[#FFF6F2]/60 border border-[#FF799C]/20 focus:border-[#FF799C] focus:outline-none text-[#6E4B55] text-sm px-3.5 py-2.5 rounded-xl transition-all font-mono"
                    />
                    <span className="text-[10px] text-[#6E4B55]/50 mt-1 block">提示：必須是直接以 .mp3 結尾的公開存取音樂檔案。</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#6E4B55]/70 mb-1.5">封面圖片網址 (可空)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://domain.com/cover.jpg"
                      value={newCoverUrl}
                      onChange={(e) => setNewCoverUrl(e.target.value)}
                      className="w-full bg-[#FFF6F2]/60 border border-[#FF799C]/20 focus:border-[#FF799C] focus:outline-none text-[#6E4B55] text-sm px-3.5 py-2.5 rounded-xl transition-all font-mono"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSubmitModal(false)}
                      className="flex-1 bg-[#FFF6F2]/80 hover:bg-[#FFF6F2] text-[#6E4B55]/80 hover:text-[#6E4B55] text-sm py-3 rounded-xl transition-all border border-[#FF799C]/10 active:scale-95"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-[#FF799C] to-[#FFCCDD] hover:opacity-90 text-white font-medium text-sm py-3 rounded-xl shadow-lg shadow-[#FF799C]/25 transition-all active:scale-95"
                    >
                      遞交投稿
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
