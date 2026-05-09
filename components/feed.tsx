"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNav } from "@/lib/nav-context";
import { useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ImageUploadButton } from "./image-upload-button";
import { extractMentions } from "@/lib/mentions";
import { 
  getPosts, 
  createPost, 
  updatePost, 
  deletePost, 
  hasUserLikedPost, 
  toggleLike, 
  getReplies, 
  createReply, 
  updateReply, 
  deleteReply 
} from "@/lib/actions/post.actions";
import { getUser, blockUser, resolveUsernamesToIds } from "@/lib/actions/user.actions";
import { MentionTextarea } from "./mention-textarea";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile, MoreHorizontal, ShieldOff } from "lucide-react";
import clsx from "clsx";

export function Feed() {
  const { user, dbUser, blockedUserIds, blockedByUserIds, followingUserIds } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    try {
      const fetchedPosts = await getPosts();
      setPosts(fetchedPosts);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setLoading(true);
    try {
      const mentionUsernames = extractMentions(content);
      const mentionIds = await resolveUsernamesToIds(mentionUsernames);
      await createPost({
        authorId: user.id,
        content: content.trim(),
        imageUrl: imageUrl || '',
        mentions: mentionIds,
      });
      setContent("");
      setImageUrl("");
      setShowEmoji(false);
      await fetchPosts();
    } catch (err) {
      console.error("Error creating post", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(
    (post) =>
      !blockedUserIds.includes(post.authorId) &&
      !blockedByUserIds.includes(post.authorId) &&
      (post.authorId === user?.id || followingUserIds.includes(post.authorId))
  );

  return (
    <>
      <div className="h-16 border-b border-zinc-800 flex items-center px-6 backdrop-blur-md bg-zinc-950/80 sticky top-0 z-10 shrink-0 relative">
        <h2 className="text-xl font-bold text-white">Pulse</h2>
      </div>
      <div className="p-6 border-b border-zinc-800 flex flex-col gap-4 bg-zinc-900 shrink-0">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-950 border border-zinc-700 shrink-0 flex items-center justify-center font-bold text-zinc-500 overflow-hidden">
            {dbUser &&
              (dbUser.photoUrl ? (
                <img
                  src={dbUser.photoUrl}
                  className="w-full h-full object-cover"
                />
              ) : (
                dbUser.displayName?.[0]?.toUpperCase()
              ))}
          </div>
          <div className="flex-1 min-w-0">
            <MentionTextarea
              value={content}
              onChange={setContent}
              disabled={loading}
              className="w-full bg-transparent border-none focus:ring-0 text-lg placeholder-zinc-600 text-zinc-100 resize-none outline-none"
              placeholder="What's on your mind?"
              rows={3}
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
            <div className="flex justify-between items-center mt-2 border-t border-zinc-800 pt-3 relative">
              <div className="flex items-center justify-center gap-4">
                <ImageUploadButton
                  onImageSelected={setImageUrl}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowEmoji(!showEmoji)}
                  className="hover:text-white transition-colors text-rose-500 flex shrink-0"
                >
                  <Smile className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>
              {showEmoji && (
                <div className="absolute top-12 left-0 z-50 rounded-lg overflow-hidden shadow-2xl">
                  <EmojiPicker
                    onEmojiClick={(e) => setContent((c) => c + e.emoji)}
                    theme={Theme.DARK}
                  />
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || loading}
                className="px-6 py-1.5 bg-rose-500 hover:bg-rose-600 rounded-full text-sm font-bold text-white transition-colors disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full flex flex-col min-h-0">
        {filteredPosts.map((post) => (
          <PostItem key={post.id} post={post} currentUser={user} onUpdate={fetchPosts} />
        ))}
        {filteredPosts.length === 0 && (
          <div className="p-8 text-center text-zinc-500">
            Aún no hay pulsos en la red.
          </div>
        )}
      </div>
    </>
  );
}

export function PostItem({
  post,
  currentUser,
  onUpdate,
}: {
  post: any;
  currentUser: any;
  onUpdate?: () => void;
}) {
  const { blockedUserIds, blockedByUserIds, refreshBlocks } = useAuth();
  const { setCurrentView, setViewProfileUserId } = useNav();
  const [author, setAuthor] = useState<any>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState("");
  const [replyImg, setReplyImg] = useState("");
  const [replying, setReplying] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editImg, setEditImg] = useState(post.imageUrl || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    getUser(post.authorId).then((data) => {
      if (data && active) setAuthor(data);
    });
    return () => {
      active = false;
    };
  }, [post.authorId]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    hasUserLikedPost(post.id, currentUser.id).then((liked) => {
      if (active) setHasLiked(liked);
    });
    return () => {
      active = false;
    };
  }, [post.id, currentUser]);

  const fetchPostReplies = useCallback(async () => {
    try {
      const data = await getReplies(post.id);
      setReplies(data);
    } catch (err) {
      console.error(err);
    }
  }, [post.id]);

  useEffect(() => {
    if (showReplies) fetchPostReplies();
  }, [showReplies, fetchPostReplies]);

  const handleToggleLike = async () => {
    if (!currentUser) return;
    try {
      const wasLiked = await toggleLike(post.id, currentUser.id);
      setHasLiked(!!wasLiked);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlock = async () => {
    if (!currentUser) return;
    if (confirm(`Are you sure you want to block @${author?.username}?`)) {
      try {
        await blockUser(currentUser.id, post.authorId);
        await refreshBlocks();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeletePost = async () => {
    setIsDeleting(true);
    try {
      await deletePost(post.id);
      setShowDeleteConfirm(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const mentionUsernames = extractMentions(editContent);
      const mentionIds = await resolveUsernamesToIds(mentionUsernames);
      await updatePost(post.id, {
        content: editContent.trim(),
        imageUrl: editImg || '',
        mentions: mentionIds,
      });
      setIsEditing(false);
      setShowMenu(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || replying) return;
    setReplying(true);
    try {
      const mentionUsernames = extractMentions(replyContent);
      const mentionIds = await resolveUsernamesToIds(mentionUsernames);
      await createReply({
        postId: post.id,
        authorId: currentUser.id,
        content: replyContent.trim(),
        imageUrl: replyImg || '',
        mentions: mentionIds,
      });
      setReplyContent("");
      setReplyImg("");
      setShowEmoji(false);
      await fetchPostReplies();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setReplying(false);
    }
  };

  if (!author)
    return (
      <div className="p-6 border-b border-zinc-800 animate-pulse bg-zinc-900/20 h-32" />
    );

  const renderContent = (text: string) =>
    text.split(/([#@][\w\u0590-\u05ff]+)/g).map((part, i) =>
      part.startsWith("#") || part.startsWith("@") ? (
        <span
          key={i}
          className="text-rose-400 font-medium cursor-pointer hover:underline"
        >
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  const filteredReplies = replies.filter(
    (r) =>
      !blockedUserIds.includes(r.authorId) &&
      !blockedByUserIds.includes(r.authorId),
  );

  const goToProfile = () => {
    setViewProfileUserId(post.authorId);
    setCurrentView("profile");
  };

  return (
    <div className="p-6 border-b border-zinc-800 hover:bg-zinc-900/40 transition-colors w-full flex flex-col shrink-0">
      <div className="flex gap-4 min-w-0">
        <button
          onClick={goToProfile}
          className="w-12 h-12 rounded-full bg-zinc-950 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-400 font-bold overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
        >
          {author.photoUrl ? (
            <img src={author.photoUrl} className="w-full h-full object-cover" />
          ) : (
            author.displayName?.[0]?.toUpperCase()
          )}
          </button>
          <div className="flex-1 min-w-0 relative">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                onClick={goToProfile}
                className="flex items-center gap-2 text-left group"
              >
                <span className="font-bold text-white truncate group-hover:underline">
                  {author.displayName}
                </span>
                <span className="text-zinc-500 text-sm truncate">
                  @{author.username}
                </span>
              </button>
              <span className="text-zinc-600 text-sm shrink-0">
                •{" "}
                {formatDistanceToNow(post.createdAt, {
                  addSuffix: false,
                  locale: es,
                })}
                {post.isEdited && " (edited)"}
              </span>
            </div>
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-6 w-32 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 py-1 flex flex-col overflow-hidden">
                    {currentUser.id !== post.authorId ? (
                      <button
                        onClick={handleBlock}
                        className="px-4 py-2 text-sm text-rose-500 hover:bg-zinc-700 flex items-center gap-2 w-full text-left font-medium"
                      >
                        <ShieldOff className="w-4 h-4" /> Block
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="px-4 py-2 text-sm text-white hover:bg-zinc-700 flex items-center gap-2 w-full text-left font-medium cursor-pointer"
                        >
                          Edit Post
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(true);
                            setShowMenu(false);
                          }}
                          className="px-4 py-2 text-sm text-rose-500 hover:bg-zinc-700 flex items-center gap-2 w-full text-left font-medium cursor-pointer"
                        >
                          Delete Post
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="mt-3">
              <MentionTextarea
                value={editContent}
                onChange={setEditContent}
                disabled={savingEdit}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 resize-none outline-none focus:border-rose-500 mb-2"
                rows={3}
              />
              {editImg && (
                <div className="relative mt-2 mb-2 inline-block">
                  <img
                    src={editImg}
                    alt="preview"
                    className="max-h-60 rounded-xl"
                  />
                  <button
                    onClick={() => setEditImg("")}
                    className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex gap-2 justify-end items-center mt-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(post.content);
                    setEditImg(post.imageUrl || "");
                  }}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-bold text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <div className="w-8 h-8 rounded-full hover:bg-zinc-800 flex justify-center items-center text-rose-500 mr-2 cursor-pointer">
                  <ImageUploadButton onImageSelected={setEditImg} disabled={savingEdit} />
                </div>
                <button
                  onClick={handleEditSubmit}
                  disabled={savingEdit || !editContent.trim()}
                  className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-1 text-zinc-300 break-words whitespace-pre-wrap leading-relaxed">
                {renderContent(post.content)}
              </div>
              {post.imageUrl && (
                <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
                  <img
                    src={post.imageUrl}
                    alt="post"
                    className="w-full max-h-[500px] object-cover"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex gap-8 mt-5 text-zinc-500 text-sm">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-2 hover:text-white cursor-pointer transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10c-1.703 0-3.308-.426-4.72-1.18l-4.148 1.48c-.686.245-1.341-.41-1.096-1.096l1.48-4.148C2.426 15.308 2 13.703 2 12 2 6.477 6.477 2 12 2zm0 2c-4.418 0-8 3.582-8 8 0 1.41.368 2.736 1.011 3.9h.001l-1.127 3.158 3.158-1.127h.001c1.164.643 2.49 1.011 3.9 1.011 4.418 0 8-3.582 8-8s-3.582-8-8-8z" />
              </svg>
              <span>{post.repliesCount || 0}</span>
            </button>
            <button
              onClick={handleToggleLike}
              className={clsx(
                "flex items-center gap-2 cursor-pointer transition-colors",
                hasLiked ? "text-rose-500" : "hover:text-rose-500",
              )}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span>{post.likesCount || 0}</span>
            </button>
          </div>
        </div>
      </div>
      {showReplies && (
        <div className="mt-4 ml-8 pl-4 border-l-2 border-zinc-800 space-y-6">
          {filteredReplies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} render={renderContent} postId={post.id} onUpdate={fetchPostReplies} />
          ))}
          <div className="pt-2 flex flex-col gap-2 relative">
            <MentionTextarea
              value={replyContent}
              onChange={setReplyContent}
              placeholder="Echo back..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 resize-none outline-none focus:border-rose-500"
              rows={2}
            />
            {replyImg && (
              <div className="relative inline-block">
                <img src={replyImg} className="h-20 rounded-lg" />
                <button
                  onClick={() => setReplyImg("")}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full h-4 w-4 text-[10px] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex items-center justify-between mt-1">
              <div className="flex gap-4">
                <ImageUploadButton
                  onImageSelected={setReplyImg}
                  disabled={replying}
                />
                <button
                  onClick={() => setShowEmoji(!showEmoji)}
                  className="text-rose-500 hover:text-white transition-colors flex shrink-0"
                >
                  <Smile className="w-5 h-5 shrink-0" />
                </button>
              </div>
              {showEmoji && (
                <div className="absolute top-14 left-0 z-50">
                  <EmojiPicker
                    onEmojiClick={(e) => setReplyContent((c) => c + e.emoji)}
                    theme={Theme.DARK}
                  />
                </div>
              )}
              <button
                onClick={handleReply}
                disabled={!replyContent.trim()}
                className="px-4 py-1.5 bg-white text-black font-bold text-xs rounded-full hover:bg-zinc-200 disabled:opacity-50"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Delete Post?</h3>
            <p className="text-zinc-400 mb-6 font-medium text-sm">
              This can't be undone and it will be removed from your profile, the timeline of any accounts that follow you, and from search results.
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReplyItem({ reply, render, postId, onUpdate }: { reply: any; render: any; postId: string; onUpdate?: () => void }) {
  const { setCurrentView, setViewProfileUserId } = useNav();
  const { user } = useAuth();
  const [author, setAuthor] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    getUser(reply.authorId).then((data) => {
      if (data && active) setAuthor(data);
    });
    return () => {
      active = false;
    };
  }, [reply.authorId]);

  if (!author)
    return (
      <div className="h-10 animate-pulse bg-zinc-900/50 rounded-lg w-full" />
    );

  const goToProfile = () => {
    setViewProfileUserId(reply.authorId);
    setCurrentView("profile");
  };

  const handleDeleteReply = async () => {
    setIsDeleting(true);
    try {
      await deleteReply(reply.id, postId);
      setShowDeleteConfirm(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === reply.content) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      const mentions = extractMentions(editContent);
      const mentionIds = await resolveUsernamesToIds(mentions);
      await updateReply(reply.id, {
        content: editContent.trim(),
        mentions: mentionIds,
      });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="text-sm border-l-2 border-zinc-800/50 pl-3 pt-1">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={goToProfile}
            className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          >
            {author.photoUrl ? (
              <img src={author.photoUrl} className="w-full h-full object-cover" />
            ) : (
              author.displayName?.[0]?.toUpperCase()
            )}
          </button>
          <button
            onClick={goToProfile}
            className="flex items-center gap-1 text-left group"
          >
            <span className="font-bold text-white truncate group-hover:underline">
              {author.displayName}
            </span>
            <span className="text-zinc-500 truncate">@{author.username}</span>
          </button>
        </div>
        {user?.id === reply.authorId && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-zinc-500 hover:text-white transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 w-32 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 py-1 flex flex-col overflow-hidden">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="px-4 py-2 text-sm text-white hover:bg-zinc-700 flex items-center gap-2 w-full text-left font-medium cursor-pointer"
                >
                  Edit Reply
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowMenu(false);
                  }}
                  className="px-4 py-2 text-sm text-rose-500 hover:bg-zinc-700 flex items-center gap-2 w-full text-left font-medium cursor-pointer"
                >
                  Delete Reply
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-2 space-y-2">
          <MentionTextarea
            value={editContent}
            onChange={setEditContent}
            placeholder="Edit your reply..."
            className="w-full bg-transparent text-white placeholder-zinc-500 resize-none outline-none overflow-hidden pb-4"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(reply.content);
              }}
              className="px-3 py-1 bg-zinc-800 text-white font-bold text-xs rounded-full hover:bg-zinc-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={!editContent.trim() || isSaving}
              className="px-3 py-1 bg-white text-black font-bold text-xs rounded-full hover:bg-zinc-200 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="text-zinc-300 break-words whitespace-pre-wrap">
          {render(reply.content)}
        </div>
      )}

      {reply.imageUrl && (
        <div className="mt-2 rounded-lg border border-zinc-800 overflow-hidden">
          <img
            src={reply.imageUrl}
            className="w-full max-h-[300px] object-cover"
          />
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Delete Reply?</h3>
            <p className="text-zinc-400 mb-6 font-medium text-sm">
              This can't be undone and it will be removed.
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteReply}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
