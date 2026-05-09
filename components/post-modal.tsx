"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  X,
  Globe2,
  Smile,
  Calendar,
  MapPin,
  AlignLeft,
  FileVideo,
} from "lucide-react";
import { extractHashtags } from "@/lib/hashtags";
import { extractMentions } from "@/lib/mentions";
import { resolveUsernamesToIds } from "@/lib/actions/user.actions";
import { createPost } from "@/lib/actions/post.actions";
import { MentionTextarea } from "@/components/mention-textarea";
import { ImageUploadButton } from "@/components/image-upload-button";
import EmojiPicker from "emoji-picker-react";

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PostModal({ isOpen, onClose }: PostModalProps) {
  const { user, dbUser } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  // For simplicity we just replicate the pure UI first

  if (!isOpen || !user || !dbUser) return null;

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setLoading(true);
    try {
      const mentionUsernames = extractMentions(content);
      const mentionIds = await resolveUsernamesToIds(mentionUsernames);
      
      await createPost({
        authorId: user.id,
        content: content,
        imageUrl: imageUrl,
        mentions: mentionIds,
      });

      setContent("");
      setImageUrl("");
      setShowEmoji(false);
      onClose();
    } catch (err) {
      console.error("Error creating post:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[5vh] sm:pt-[10vh] bg-zinc-600/40">
      <div className="w-full max-w-[600px] bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        <div className="h-14 px-4 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <button className="text-sky-500 font-bold hover:bg-sky-500/10 px-4 py-1.5 rounded-full transition-colors text-sm">
            Drafts
          </button>
        </div>

        <div className="flex px-4 pt-4 pb-2">
          <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center font-bold text-zinc-500 mr-3">
            {dbUser.photoUrl ? (
              <img
                src={dbUser.photoUrl}
                className="w-full h-full object-cover"
              />
            ) : (
              dbUser.displayName?.[0]?.toUpperCase()
            )}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <MentionTextarea
              value={content}
              onChange={setContent}
              disabled={loading}
              className="w-full bg-transparent border-none focus:ring-0 text-xl placeholder-zinc-600 text-zinc-100 resize-none outline-none min-h-[120px]"
              placeholder="What's happening?"
            />
            {imageUrl && (
              <div className="relative mt-2 mb-2 inline-block">
                <img
                  src={imageUrl}
                  alt="preview"
                  className="max-h-60 rounded-xl"
                />
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Audience selector */}
            <div className="mt-2 mb-4 border-b border-zinc-800 pb-4">
              <button className="inline-flex items-center gap-1.5 text-sky-500 hover:bg-sky-500/10 px-3 py-0.5 rounded-full font-bold text-sm transition-colors">
                <Globe2 className="w-4 h-4" />
                Everyone can reply
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between relative pb-4">
              <div className="flex items-center gap-0.5 text-sky-500">
                <div className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sky-500/10 transition-colors">
                  <ImageUploadButton
                    onImageSelected={setImageUrl}
                    disabled={loading}
                  />
                </div>
                <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sky-500/10 transition-colors">
                  <FileVideo className="w-5 h-5" />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sky-500/10 transition-colors">
                  <AlignLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowEmoji(!showEmoji)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sky-500/10 transition-colors"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sky-500/10 transition-colors hidden sm:flex">
                  <Calendar className="w-5 h-5" />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-sky-500/10 transition-colors opacity-50 cursor-not-allowed hidden sm:flex">
                  <MapPin className="w-5 h-5" />
                </button>
              </div>

              {showEmoji && (
                <div className="absolute top-12 left-0 z-50 rounded-lg overflow-hidden shadow-2xl border border-zinc-800">
                  <EmojiPicker
                    onEmojiClick={(e) => setContent((c) => c + e.emoji)}
                    theme="dark"
                    as
                    any
                  />
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !content.trim()}
                className="bg-sky-500 text-white font-bold px-5 py-1.5 rounded-full hover:bg-sky-600 disabled:opacity-50 disabled:bg-zinc-600 disabled:text-zinc-400 transition-colors"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
