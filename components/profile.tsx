"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNav } from "@/lib/nav-context";
import { 
  getUser, 
  updateUserProfile, 
  toggleFollow, 
  getBlockedUsers, 
  unblockUser 
} from "@/lib/actions/user.actions";
import { 
  getPostsByAuthor, 
  getRepliesByAuthor, 
  getLikedPosts,
  getPost
} from "@/lib/actions/post.actions";
import { PostItem, ReplyItem } from "./feed";
import { ImageUploadButton } from "./image-upload-button";
import { Camera, Edit2 } from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";

export function ProfileView() {
  const { user, dbUser, refreshDbUser, followingUserIds, refreshFollows } = useAuth();
  const { viewProfileUserId } = useNav();

  const [profileUser, setProfileUser] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    let active = true;
    if (!viewProfileUserId || viewProfileUserId === user?.id) {
      setProfileUser(dbUser);
    } else {
      setLoadingProfile(true);
      getUser(viewProfileUserId)
        .then((s) => {
          if (active && s) setProfileUser(s);
        })
        .finally(() => {
          if (active) setLoadingProfile(false);
        });
    }
    return () => {
      active = false;
    };
  }, [viewProfileUserId, dbUser, user?.id]);

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [replies, setReplies] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);

  const [savingPhoto, setSavingPhoto] = useState(false);
  const [togglingFollow, setTogglingFollow] = useState(false);

  useEffect(() => {
    if (profileUser) {
      setDisplayName(profileUser.displayName || "");
      setUsername(profileUser.username || "");
      setBio(profileUser.bio || "");
    }
  }, [profileUser]);

  const fetchProfileData = useCallback(async () => {
    if (!profileUser?.id) return;
    try {
      const fetchedPosts = await getPostsByAuthor(profileUser.id);
      setPosts(fetchedPosts);

      const fetchedReplies = await getRepliesByAuthor(profileUser.id);
      // Ensure we get the post to pass into ReplyItem if necessary, wait ReplyItem might expect something else.
      setReplies(fetchedReplies);

      const fetchedLikedPosts = await getLikedPosts(profileUser.id);
      setLikedPosts(fetchedLikedPosts);
    } catch (err) {
      console.error(err);
    }
  }, [profileUser?.id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  if (!user || !profileUser) return null;

  const isCurrentUser = !viewProfileUserId || viewProfileUserId === user.id;

  const editsLeft =
    profileUser.usernameEditsLeft === undefined
      ? 1
      : profileUser.usernameEditsLeft;
  const canEditDisplayName =
    Date.now() >= (profileUser.displayNameUpdatedAt || 0) + 1209600000;
  const canEditUsername = editsLeft > 0;

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await updateUserProfile(user.id, {
        bio,
        displayName: displayName !== profileUser.displayName ? displayName : undefined,
        username: username !== profileUser.username ? username : undefined,
      });
      await refreshDbUser();
      setEditing(false);
    } catch (err) {
      console.error("Error updating profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user || togglingFollow || !profileUser) return;
    setTogglingFollow(true);
    
    try {
      await toggleFollow(user.id, profileUser.id);
      await refreshFollows();
      // To refresh followers count locally, fetch again
      const updatedUser = await getUser(profileUser.id);
      if (updatedUser) setProfileUser(updatedUser);
    } catch(e) {
      console.error(e);
    } finally {
      setTogglingFollow(false);
    }
  };

  const updatePhoto = async (type: "photoUrl" | "coverUrl", base64: string) => {
    setSavingPhoto(true);
    try {
      await updateUserProfile(user.id, { [type]: base64 });
      await refreshDbUser();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPhoto(false);
    }
  };

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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="h-16 border-b border-zinc-800 flex items-center px-6 backdrop-blur-md bg-zinc-950/80 sticky top-0 z-10 shrink-0">
        <h2 className="text-xl font-bold text-white">
          {profileUser.displayName}
        </h2>
      </div>

      <div className="relative">
        <div className="h-48 bg-zinc-800 w-full relative">
          {profileUser.coverUrl && (
            <img
              src={profileUser.coverUrl}
              className="w-full h-full object-cover"
            />
          )}
          {isCurrentUser && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="bg-black/50 p-2 rounded-full cursor-pointer relative">
                <Camera className="text-white w-6 h-6" />
                <div className="absolute inset-0 opacity-0 cursor-pointer">
                  <ImageUploadButton
                    onImageSelected={(b) => updatePhoto("coverUrl", b)}
                    disabled={savingPhoto}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 relative">
          <div className="flex justify-between items-start">
            <div className="relative -mt-16">
              <div className="w-32 h-32 rounded-full border-4 border-zinc-950 bg-zinc-800 relative flex items-center justify-center overflow-hidden">
                {profileUser.photoUrl ? (
                  <img
                    src={profileUser.photoUrl}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-zinc-500 font-bold">
                    {profileUser.displayName?.charAt(0).toUpperCase()}
                  </span>
                )}
                {isCurrentUser && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <div className="relative">
                      <Camera className="text-white w-6 h-6" />
                      <div className="absolute inset-0 -m-2 opacity-0 cursor-pointer flex items-center justify-center">
                        <ImageUploadButton
                          onImageSelected={(b) => updatePhoto("photoUrl", b)}
                          disabled={savingPhoto}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              {isCurrentUser ? (
                <button
                  onClick={() => {
                    setEditing(!editing);
                    setDisplayName(profileUser.displayName);
                    setUsername(profileUser.username);
                    setBio(profileUser.bio);
                  }}
                  className="px-4 py-1.5 border border-zinc-700 rounded-full font-bold text-white hover:bg-zinc-900 transition-colors"
                >
                  {editing ? "Cancel" : "Edit profile"}
                </button>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  disabled={togglingFollow}
                  className={clsx(
                    "px-4 py-1.5 rounded-full font-bold transition-colors disabled:opacity-50",
                    followingUserIds.includes(profileUser.id)
                      ? "border border-zinc-700 text-white hover:bg-zinc-900"
                      : "bg-white text-zinc-950 hover:bg-zinc-200"
                  )}
                >
                  {followingUserIds.includes(profileUser.id) ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 pb-6">
            {editing && isCurrentUser ? (
              <div className="space-y-4 max-w-sm">
                <div>
                  <label className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-1 block">
                    Display Name
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={!canEditDisplayName}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-white disabled:opacity-50"
                  />
                  {!canEditDisplayName && (
                    <p className="text-xs text-rose-500 mt-1">
                      Podrás cambiarlo en{" "}
                      {14 -
                        Math.floor(
                          (Date.now() - (dbUser.displayNameUpdatedAt || 0)) /
                            (1000 * 60 * 60 * 24),
                        )}{" "}
                      días.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-1 block">
                    Username (@)
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!canEditUsername}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-white disabled:opacity-50"
                  />
                  {!canEditUsername && (
                    <p className="text-xs text-rose-500 mt-1">
                      Ya no tienes cambios de username disponibles.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-1 block">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-white resize-none"
                    rows={3}
                  />
                </div>

                <button
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="w-full bg-white text-black font-bold py-2 rounded-full"
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-white">
                  {profileUser.displayName}
                </h1>
                <p className="text-zinc-500">@{profileUser.username}</p>
                <div className="mt-4 text-zinc-200">
                  {profileUser.bio || (
                    <span className="text-zinc-600 italic">
                      This node has no bio yet.
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-2 text-sm text-zinc-300">
                  <div className="flex gap-1 hover:underline cursor-pointer">
                    <span className="font-bold text-white">{profileUser.followingCount || 0}</span>
                    <span className="text-zinc-500">Following</span>
                  </div>
                  <div className="flex gap-1 hover:underline cursor-pointer">
                    <span className="font-bold text-white">{profileUser.followersCount || 0}</span>
                    <span className="text-zinc-500">Followers</span>
                  </div>
                </div>
                <div className="flex gap-4 mt-4 text-zinc-500 text-sm">
                  <span>
                    Joined{" "}
                    {format(profileUser.createdAt || Date.now(), "MMMM yyyy")}
                  </span>
                  {profileUser.role !== "unset" && (
                    <span className="capitalize px-2 py-0.5 border border-zinc-800 rounded bg-zinc-900 text-xs text-rose-400">
                      {profileUser.role}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Aqui irian los posts del usuario */}
      <div className="flex border-b border-zinc-800 overflow-x-auto whitespace-nowrap hide-scrollbar">
        <div
          onClick={() => setActiveTab("posts")}
          className={clsx(
            "flex-1 px-4 py-4 font-bold text-center transition-colors cursor-pointer text-sm sm:text-base",
            activeTab === "posts"
              ? "text-white border-b-4 border-sky-500"
              : "text-zinc-500 hover:bg-zinc-900",
          )}
        >
          Posts
        </div>
        <div
          onClick={() => setActiveTab("replies")}
          className={clsx(
            "flex-1 px-4 py-4 font-bold text-center transition-colors cursor-pointer text-sm sm:text-base",
            activeTab === "replies"
              ? "text-white border-b-4 border-sky-500"
              : "text-zinc-500 hover:bg-zinc-900",
          )}
        >
          Replies
        </div>
        <div
          onClick={() => setActiveTab("highlights")}
          className={clsx(
            "flex-1 px-4 py-4 font-bold text-center transition-colors cursor-pointer text-sm sm:text-base",
            activeTab === "highlights"
              ? "text-white border-b-4 border-sky-500"
              : "text-zinc-500 hover:bg-zinc-900",
          )}
        >
          Highlights
        </div>
        {isCurrentUser && (
          <div
            onClick={() => setActiveTab("articles")}
            className={clsx(
              "flex-1 px-4 py-4 font-bold text-center transition-colors cursor-pointer text-sm sm:text-base",
              activeTab === "articles"
                ? "text-white border-b-4 border-sky-500"
                : "text-zinc-500 hover:bg-zinc-900",
            )}
          >
            Articles
          </div>
        )}
        <div
          onClick={() => setActiveTab("media")}
          className={clsx(
            "flex-1 px-4 py-4 font-bold text-center transition-colors cursor-pointer text-sm sm:text-base",
            activeTab === "media"
              ? "text-white border-b-4 border-sky-500"
              : "text-zinc-500 hover:bg-zinc-900",
          )}
        >
          Media
        </div>
        {isCurrentUser && (
          <div
            onClick={() => setActiveTab("likes")}
            className={clsx(
              "flex-1 px-4 py-4 font-bold text-center transition-colors cursor-pointer text-sm sm:text-base",
              activeTab === "likes"
                ? "text-white border-b-4 border-sky-500"
                : "text-zinc-500 hover:bg-zinc-900",
            )}
          >
            Likes
          </div>
        )}
      </div>

      {activeTab === "posts" && (
        <div className="flex-1 w-full flex flex-col min-h-0">
          {posts.map((post) => (
            <PostItem key={post.id} post={post} currentUser={user} onUpdate={fetchProfileData} />
          ))}
          {posts.length === 0 && (
            <div className="p-8 text-center text-zinc-500">No posts yet.</div>
          )}
        </div>
      )}
      
      {activeTab === "replies" && (
        <div className="flex-1 w-full flex flex-col min-h-0">
          {replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} render={renderContent} onUpdate={fetchProfileData} />
          ))}
          {replies.length === 0 && (
            <div className="p-8 text-center text-zinc-500">No replies yet.</div>
          )}
        </div>
      )}

      {activeTab === "media" && (
        <div className="flex-1 w-full flex flex-col min-h-0">
          {posts.filter(p => p.imageUrl).map((post) => (
            <PostItem key={post.id} post={post} currentUser={user} onUpdate={fetchProfileData} />
          ))}
          {posts.filter(p => p.imageUrl).length === 0 && (
            <div className="p-8 text-center text-zinc-500">No media yet.</div>
          )}
        </div>
      )}

      {activeTab === "likes" && (
        <div className="flex-1 w-full flex flex-col min-h-0">
          {likedPosts.map((post) => (
            <PostItem key={post.id} post={post} currentUser={user} onUpdate={fetchProfileData} />
          ))}
          {likedPosts.length === 0 && (
            <div className="p-8 text-center text-zinc-500">No likes yet.</div>
          )}
        </div>
      )}

      {(activeTab === "highlights" || activeTab === "articles") && (
        <div className="p-8 text-center text-zinc-500">Not implemented yet.</div>
      )}
    </div>
  );
}

export function BlockedUsersTab() {
  const { user, blockedUserIds, refreshBlocks } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const fetchBlocked = async () => {
      if (!user) return;
      try {
        const users = await getBlockedUsers(user.id);
        if (active) setBlockedUsers(users);
      } catch (e) {
        console.error(e);
      }
    };
    fetchBlocked();
    return () => {
      active = false;
    };
  }, [blockedUserIds, user]);

  const handleUnblock = async (uid: string) => {
    if (!user) return;
    try {
      await unblockUser(user.id, uid);
      await refreshBlocks();
    } catch (err) {
      console.error(err);
    }
  };

  if (blockedUserIds.length === 0)
    return (
      <div className="p-8 text-center text-zinc-500">
        You haven't blocked anyone.
      </div>
    );

  return (
    <div className="flex flex-col">
      {blockedUsers.map((u) => (
        <div
          key={u.id}
          className="flex items-center justify-between p-4 border-b border-zinc-800"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center font-bold text-zinc-500">
              {u.photoUrl ? (
                <img src={u.photoUrl} className="w-full h-full object-cover" />
              ) : (
                u.displayName?.[0]?.toUpperCase()
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white">{u.displayName}</span>
              <span className="text-zinc-500 text-sm">@{u.username}</span>
            </div>
          </div>
          <button
            onClick={() => handleUnblock(u.id)}
            className="px-4 py-1.5 border border-zinc-700 rounded-full font-bold text-white text-sm hover:bg-zinc-900 transition-colors"
          >
            Unblock
          </button>
        </div>
      ))}
    </div>
  );
}
