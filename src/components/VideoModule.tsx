import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Video, Play, Pause, Plus, AlertCircle, Film, Sparkles, Check, Flame, Clock } from "lucide-react";
import { VideoPost, User } from "../types";

interface VideoModuleProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export default function VideoModule({ currentUser, onRefreshData }: VideoModuleProps) {
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Video Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [category, setCategory] = useState("Stage");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const categories = ["All", "Stage", "Vlog", "Teaser", "General"];
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);

  const fetchVideos = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/posts/videos");
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
        if (data.length > 0) {
          setActiveVideo(data[0]);
        }
      } else {
        setError("無法載入影片區，請稍後重試。");
      }
    } catch (err) {
      setError("連線伺服器失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Update player source and play state on active video change
  useEffect(() => {
    setIsPlayerPlaying(false);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.load();
    }
  }, [activeVideo]);

  const toggleVideoPlayback = () => {
    if (!videoPlayerRef.current) return;
    if (isPlayerPlaying) {
      videoPlayerRef.current.pause();
      setIsPlayerPlaying(false);
    } else {
      videoPlayerRef.current.play()
        .then(() => setIsPlayerPlaying(true))
        .catch(e => console.error("Video play failed:", e));
    }
  };

  const filteredVideos = videos.filter(
    (vid) => selectedCategory === "All" || vid.category === selectedCategory
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!title || !videoUrl) {
      setSubmitError("請填寫所有欄位 (標題、影片網址)！");
      return;
    }

    try {
      const payload = {
        title,
        video_url: videoUrl,
        category,
        user_id: currentUser?.id || "anonymous",
        username: currentUser?.username || "Anonymous Visitor",
        role: currentUser?.role || "user"
      };

      const res = await fetch("/api/posts/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload })
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTitle("");
        setVideoUrl("");
        if (currentUser?.role === "admin") {
          fetchVideos();
        }
        if (onRefreshData) {
          onRefreshData();
        }
        setTimeout(() => {
          setShowForm(false);
          setSubmitSuccess(false);
        }, 2000);
      } else {
        const data = await res.json();
        setSubmitError(data.error || "投稿失敗，請確認網址格式。");
      }
    } catch (err) {
      setSubmitError("連線伺服器出錯。");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-mono tracking-[0.3em] text-[#FF799C] uppercase block mb-1">
            ZACK • VIDEO FANZONE • JEREMY
          </span>
          <h2 className="text-3xl font-serif font-light text-[#FF799C] tracking-wider">
            星光舞台影音 <span className="font-sans text-lg text-[#6E4B55]/50 ml-1">Video</span>
          </h2>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-[#FF799C] to-[#FFCCDD] hover:opacity-90 text-white px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 shadow-lg shadow-[#FF799C]/25 transition-all active:scale-95 hover:scale-105 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>投稿應援影片</span>
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Video player (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-black/60 border border-white/10 shadow-[0_0_50px_rgba(255,121,156,0.15)] group">
            {activeVideo ? (
              <video
                ref={videoPlayerRef}
                src={activeVideo.video_url}
                controls
                className="w-full h-full object-cover"
                onPlay={() => setIsPlayerPlaying(true)}
                onPause={() => setIsPlayerPlaying(false)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
                <Film className="h-16 w-16 mb-2 animate-pulse" />
                <p className="font-serif">無選定播放的影片</p>
              </div>
            )}

            {/* Custom Overlay (Only visible when paused) */}
            {activeVideo && !isPlayerPlaying && (
              <div 
                onClick={toggleVideoPlayback}
                className="absolute inset-0 bg-black/35 flex items-center justify-center cursor-pointer transition-all hover:bg-black/20"
              >
                <div className="p-5 rounded-full bg-[#FF799C]/90 text-white shadow-2xl transition-all scale-100 hover:scale-110 active:scale-90">
                  <Play className="h-10 w-10 fill-white ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Active video metadata */}
          {activeVideo && (
            <div className="bg-white/85 backdrop-blur-md p-5 rounded-2xl border border-[#FF799C]/20 text-left text-[#6E4B55]">
              <div className="flex gap-2 items-center mb-2">
                <span className="text-xs font-mono bg-[#FF799C]/10 text-[#FF799C] px-2.5 py-0.5 rounded-full border border-[#FF799C]/20">
                  {activeVideo.category}
                </span>
                <span className="text-xs font-mono text-[#6E4B55]/50 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(activeVideo.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-xl font-serif font-light text-[#FF799C] tracking-wide">
                {activeVideo.title}
              </h3>
              <p className="text-xs text-[#6E4B55]/80 mt-2">
                由星願主應援者 <span className="text-[#6E4B55] font-semibold">@{activeVideo.username}</span> 溫馨分享
              </p>
            </div>
          )}
        </div>

        {/* Right column: Playlist & Filters (4 cols) */}
        <div className="lg:col-span-4 flex flex-col h-full space-y-4">
          {/* Filters Bar */}
          <div className="bg-white/85 backdrop-blur-md p-4 rounded-2xl border border-[#FF799C]/20 text-left text-[#6E4B55]">
            <span className="text-xs font-mono tracking-widest text-[#6E4B55]/50 block mb-2 uppercase">
              CATEGORIES
            </span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${selectedCategory === cat ? "bg-[#FF799C] text-white font-medium shadow-sm" : "bg-[#FFF6F2]/60 hover:bg-[#FFF6F2]/90 text-[#6E4B55]/70"}`}
                >
                  {cat === "All" ? "全部" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Playlist list */}
          <div className="bg-white/85 backdrop-blur-md p-4 rounded-3xl border border-[#FF799C]/20 flex-1 flex flex-col min-h-[300px] text-[#6E4B55]">
            <span className="text-xs font-mono tracking-widest text-[#6E4B55]/50 text-left block mb-3 uppercase">
              VIDEO PLAYLIST ({filteredVideos.length})
            </span>

            <div className="space-y-2 overflow-y-auto max-h-[350px] flex-1 pr-1.5">
              {isLoading ? (
                <div className="text-center py-12 text-xs font-mono text-[#6E4B55]/40">載入影音串流中...</div>
              ) : filteredVideos.length === 0 ? (
                <div className="text-center py-12 text-xs font-serif text-[#6E4B55]/40">尚無符合類別的應援影片</div>
              ) : (
                filteredVideos.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => setActiveVideo(vid)}
                    className={`flex gap-3 p-2.5 rounded-xl transition-all cursor-pointer text-left items-center ${activeVideo?.id === vid.id ? "bg-[#FF799C]/10 border border-[#FF799C]/20 text-[#FF799C]" : "hover:bg-[#FFF6F2]/60 text-[#6E4B55]/70 hover:text-[#6E4B55] border border-transparent"}`}
                  >
                    {/* Fake Thumbnail (since we stream directly) */}
                    <div className="h-12 w-20 rounded-lg bg-[#FFF6F2] flex items-center justify-center shrink-0 border border-[#FF799C]/10 relative overflow-hidden group">
                      <Film className="h-5 w-5 text-[#FF799C]/60" />
                      <div className="absolute inset-0 bg-[#FF799C]/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <Play className="h-4 w-4 text-[#FF799C] fill-[#FF799C]" />
                      </div>
                    </div>

                    <div className="text-xs min-w-0 flex-1">
                      <p className="font-semibold truncate leading-snug">{vid.title}</p>
                      <p className="text-[#6E4B55]/50 font-mono text-[10px] mt-1">@{vid.username} • {vid.category}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white/95 text-[#6E4B55] p-6 rounded-3xl border border-[#FF799C]/25 shadow-2xl relative text-left"
            >
              <h3 className="text-xl font-serif font-light text-[#FF799C] mb-2 flex items-center gap-2">
                <Video className="h-5 w-5 text-[#FF799C]" />
                影片應援投稿
              </h3>
              <p className="text-xs text-[#6E4B55]/60 mb-6">
                {currentUser ? `親愛的 ${currentUser.username}，請提供你的應援短片或直拍網址：` : "上傳你的應援影片網址：(非登入用戶投稿需審核)"}
              </p>

              {submitSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-[#FF799C]">
                  <Check className="h-16 w-16 mb-4 animate-bounce bg-[#FF799C]/10 p-3 rounded-full" />
                  <p className="text-lg font-serif">影片投稿完成！</p>
                  <p className="text-xs text-[#6E4B55]/60 mt-2">
                    {currentUser?.role === "admin" ? "已直接登陸影音播放列表！" : "已送往管理員信箱，核准後即可在此看見。"}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  {submitError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono text-[#6E4B55]/70 mb-1.5">影片標題 *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jeremy 2026 世界巡演法蘭克福站"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#FFF6F2]/60 border border-[#FF799C]/20 focus:border-[#FF799C] focus:outline-none text-[#6E4B55] text-sm px-3.5 py-2.5 rounded-xl transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#6E4B55]/70 mb-1.5">影片串流網址 (MP4 / WebM) *</label>
                    <input
                      type="url"
                      required
                      placeholder="e.g. https://domain.com/video.mp4"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-[#FFF6F2]/60 border border-[#FF799C]/20 focus:border-[#FF799C] focus:outline-none text-[#6E4B55] text-sm px-3.5 py-2.5 rounded-xl transition-all font-mono"
                    />
                    <span className="text-[10px] text-[#6E4B55]/50 mt-1 block">提示：影片必須是公開可存取、直接以 .mp4 結尾的格式。</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#6E4B55]/70 mb-1.5">影片類別</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#FFF6F2]/60 border border-[#FF799C]/20 focus:border-[#FF799C] focus:outline-none text-[#6E4B55] text-sm px-3.5 py-2.5 rounded-xl transition-all"
                    >
                      <option value="Stage">舞台直拍 (Stage)</option>
                      <option value="Vlog">應援Vlog (Vlog)</option>
                      <option value="Teaser">官方預告 (Teaser)</option>
                      <option value="General">日常合輯 (General)</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-[#FFF6F2]/80 hover:bg-[#FFF6F2] text-[#6E4B55]/80 hover:text-[#6E4B55] text-sm py-3 rounded-xl transition-all border border-[#FF799C]/10 active:scale-95 cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-[#FF799C] to-[#FFCCDD] hover:opacity-90 text-white font-medium text-sm py-3 rounded-xl shadow-lg shadow-[#FF799C]/25 transition-all active:scale-95 cursor-pointer"
                    >
                      遞交影片
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
