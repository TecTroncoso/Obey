"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { searchUsers, getUser } from "@/lib/actions/user.actions";
import { getUserChats, getOrCreateChat, getChatMessages, sendMessage } from "@/lib/actions/chat.actions";
import clsx from "clsx";
import {
  Send,
  ArrowLeft,
  Search,
  Plus,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { ImageUploadButton } from "./image-upload-button";

export function MessagesWidget() {
  const { user, dbUser, blockedUserIds, blockedByUserIds } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    try {
      const fetchedChats = await getUserChats(user.id);
      setChats(fetchedChats);

      const missingUserIds = new Set<string>();
      fetchedChats.forEach((chat) => {
        chat.participants.forEach((pid: string) => {
          if (pid !== user.id && !usersMap[pid]) {
            missingUserIds.add(pid);
          }
        });
      });

      if (missingUserIds.size > 0) {
        const newMap = { ...usersMap };
        for (const pid of missingUserIds) {
          const u = await getUser(pid);
          if (u) {
            newMap[pid] = u;
          }
        }
        setUsersMap(newMap);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user, usersMap]);

  useEffect(() => {
    if (!isOpen) return;
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, [fetchChats, isOpen]);

  useEffect(() => {
    let active = true;
    if (searchQuery.trim().length > 0) {
      searchUsers(searchQuery.trim()).then((res) => {
        if (active)
          setSearchResults(
            res.filter(
              (r) =>
                r.id !== user?.id &&
                !blockedUserIds.includes(r.id) &&
                !blockedByUserIds.includes(r.id),
            ),
          );
      });
    } else {
      setSearchResults([]);
    }
    return () => {
      active = false;
    };
  }, [searchQuery, user, blockedUserIds, blockedByUserIds]);

  const startChat = async (otherUserId: string) => {
    const existing = chats.find((c) => c.participants.includes(otherUserId));
    if (existing) {
      setActiveChatId(existing.id);
      setIsSearching(false);
      setSearchQuery("");
      return;
    }

    try {
      const newChatId = await getOrCreateChat(user!.id, otherUserId);

      if (!usersMap[otherUserId]) {
        const u = await getUser(otherUserId);
        if (u) {
          setUsersMap((prev) => ({
            ...prev,
            [otherUserId]: u,
          }));
        }
      }

      setActiveChatId(newChatId);
      setIsSearching(false);
      setSearchQuery("");
      await fetchChats();
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || !dbUser) return null;

  const visibleChats = chats.filter((chat) => {
    const otherParticipant = chat.participants.find(
      (p: string) => p !== user.id,
    );
    return (
      !blockedUserIds.includes(otherParticipant) &&
      !blockedByUserIds.includes(otherParticipant)
    );
  });

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-900 transition-all shadow-2xl group"
        >
          <MessageCircle className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </button>
      )}

      {isOpen && (
        <div className="absolute bottom-0 right-0 w-80 h-[500px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden">
          <div className="h-[60px] px-4 flex items-center justify-between shrink-0 border-b border-zinc-800 bg-zinc-900/50">
            <span className="font-bold text-white text-lg flex items-center gap-2">
              Messages
            </span>
            <div className="flex items-center gap-2">
              {activeChatId ? (
                <button
                  onClick={() => setActiveChatId(null)}
                  className="w-8 h-8 rounded-full hover:bg-zinc-800 flex items-center justify-center transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-white" />
                </button>
              ) : (
                <button
                  onClick={() => setIsSearching(!isSearching)}
                  className="w-8 h-8 rounded-full hover:bg-zinc-800 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="w-8 h-8 rounded-full hover:bg-zinc-800 flex items-center justify-center transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {activeChatId ? (
              <WidgetActiveChat
                chatId={activeChatId}
                otherUser={
                  usersMap[
                    chats
                      .find((c) => c.id === activeChatId)
                      ?.participants.find((p: string) => p !== user.id)
                  ]
                }
              />
            ) : (
              <>
                {isSearching && (
                  <div className="p-3 border-b border-zinc-800">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search people..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                        {searchResults.map((res) => (
                          <div
                            key={res.id}
                            onClick={() => startChat(res.id)}
                            className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center text-zinc-500 font-bold">
                              {res.photoUrl ? (
                                <img
                                  src={res.photoUrl}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                res.displayName?.[0]?.toUpperCase()
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-white text-xs truncate">
                                {res.displayName}
                              </span>
                              <span className="text-zinc-500 text-[10px] truncate">
                                @{res.username}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto">
                  {visibleChats.map((chat) => {
                    const otherUserId = chat.participants.find(
                      (p: string) => p !== user.id,
                    );
                    const otherUser = usersMap[otherUserId];
                    return (
                      <div
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        className="p-3 border-b border-zinc-800 flex items-center gap-3 cursor-pointer hover:bg-zinc-900 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center font-bold text-zinc-500">
                          {otherUser?.photoUrl ? (
                            <img
                              src={otherUser.photoUrl}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            otherUser?.displayName?.[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-white text-sm truncate">
                              {otherUser?.displayName || "Unknown User"}
                            </span>
                          </div>
                          <span className="text-zinc-400 text-xs truncate">
                            {chat.lastMessage || "Start conversation"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {chats.length === 0 && !isSearching && (
                    <div className="p-6 text-center text-zinc-500 text-sm">
                      No messages yet.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WidgetActiveChat({
  chatId,
  otherUser,
}: {
  chatId: string;
  otherUser: any;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [imgUrl, setImgUrl] = useState("");

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const msgs = await getChatMessages(chatId);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  }, [chatId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    const el = document.getElementById("widget-messages-container");
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !imgUrl) || !user) return;

    const text = content.trim();
    const currentImg = imgUrl;
    setContent("");
    setImgUrl("");

    try {
      await sendMessage({
        chatId,
        authorId: user.id,
        content: text,
        imageUrl: currentImg,
      });
      await fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  if (!otherUser)
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 rounded-full border-2 border-rose-500 border-t-transparent" />
      </div>
    );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
      <div className="p-2 border-b border-zinc-800 flex items-center gap-2 bg-zinc-950 shrink-0">
        <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center font-bold text-zinc-500">
          {otherUser.photoUrl ? (
            <img
              src={otherUser.photoUrl}
              className="w-full h-full object-cover"
            />
          ) : (
            otherUser.displayName?.[0]?.toUpperCase()
          )}
        </div>
        <span className="font-bold text-white text-sm truncate">
          {otherUser.displayName}
        </span>
      </div>

      <div
        id="widget-messages-container"
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-3"
      >
        {messages.map((msg, i) => {
          const isMine = msg.authorId === user?.id;

          return (
            <div key={msg.id} className="flex flex-col">
              <div
                className={clsx(
                  "flex flex-col max-w-[85%] text-sm rounded-2xl px-3 py-1.5",
                  isMine
                    ? "self-end items-end bg-rose-600 text-white rounded-br-sm"
                    : "self-start items-start bg-zinc-800 text-white rounded-bl-sm",
                )}
              >
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    className="max-w-[150px] rounded-lg mb-1 object-cover"
                  />
                )}
                {msg.content && (
                  <span className="break-words whitespace-pre-wrap">
                    {msg.content}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {imgUrl && (
        <div className="px-3 py-2 bg-zinc-950 border-t border-zinc-800 relative inline-flex">
          <img src={imgUrl} className="h-16 rounded-lg" />
          <button
            onClick={() => setImgUrl("")}
            className="absolute -top-1 w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-zinc-700 text-xs shadow-md"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-2 bg-zinc-950 shrink-0 border-t border-zinc-800">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <ImageUploadButton onImageSelected={setImgUrl} disabled={false} />
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start a message"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full py-1.5 px-3 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!content.trim() && !imgUrl}
            className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white disabled:opacity-50 disabled:bg-zinc-800 transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
