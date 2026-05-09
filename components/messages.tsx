'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';
import { searchUsers, getUser } from '@/lib/actions/user.actions';
import { getUserChats, getOrCreateChat, getChatMessages, sendMessage } from '@/lib/actions/chat.actions';
import { Send, ArrowLeft, Search, Plus } from 'lucide-react';
import { ImageUploadButton } from './image-upload-button';

export function MessagesView() {
  const { user, dbUser, blockedUserIds, blockedByUserIds } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    try {
      const fetchedChats = await getUserChats(user.id);
      setChats(fetchedChats);
      
      const missingUserIds = new Set<string>();
      fetchedChats.forEach(chat => {
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
    fetchChats();
    const interval = setInterval(fetchChats, 5000); // Polling every 5 seconds for chats update
    return () => clearInterval(interval);
  }, [fetchChats]);

  useEffect(() => {
    let active = true;
    if (searchQuery.trim().length > 0) {
      searchUsers(searchQuery.trim()).then(res => {
        if (active) setSearchResults(res.filter(r => r.id !== user?.id && !blockedUserIds.includes(r.id) && !blockedByUserIds.includes(r.id)));
      });
    } else {
      setSearchResults([]);
    }
    return () => { active = false; };
  }, [searchQuery, user, blockedUserIds, blockedByUserIds]);

  const startChat = async (otherUserId: string) => {
    const existing = chats.find(c => c.participants.includes(otherUserId));
    if (existing) {
      setActiveChatId(existing.id);
      setIsSearching(false);
      setSearchQuery('');
      return;
    }
    
    try {
      const newChatId = await getOrCreateChat(user!.id, otherUserId);
      if (!usersMap[otherUserId]) {
        const u = await getUser(otherUserId);
        if (u) {
          setUsersMap(prev => ({ ...prev, [otherUserId]: u }));
        }
      }
      
      setActiveChatId(newChatId);
      setIsSearching(false);
      setSearchQuery('');
      await fetchChats();
    } catch (err) {
      console.error(err);
    }
  };

  const visibleChats = chats.filter(chat => {
    const otherParticipant = chat.participants.find((p: string) => p !== user!.id);
    return !blockedUserIds.includes(otherParticipant) && !blockedByUserIds.includes(otherParticipant);
  });

  if (!user || !dbUser) return null;

  return (
    <div className="flex-1 flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className={clsx("w-full sm:w-80 border-r border-zinc-800 flex flex-col shrink-0 bg-zinc-950", activeChatId ? "hidden sm:flex" : "flex")}>
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 pt-2">
          <h2 className="text-xl font-bold text-white">Messages</h2>
          <button onClick={() => setIsSearching(!isSearching)} className="w-8 h-8 rounded-full hover:bg-zinc-900 flex items-center justify-center transition-colors">
             <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {isSearching && (
           <div className="p-4 border-b border-zinc-800">
             <div className="relative">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
               <input 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 placeholder="Search people..."
                 className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-rose-500"
               />
             </div>
             {searchResults.length > 0 && (
               <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                 {searchResults.map(res => (
                   <div key={res.id} onClick={() => startChat(res.id)} className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer">
                     <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center text-zinc-500 font-bold">
                       {res.photoUrl ? <img src={res.photoUrl} className="w-full h-full object-cover" /> : res.displayName?.[0]?.toUpperCase()}
                     </div>
                     <div className="flex flex-col min-w-0">
                       <span className="font-bold text-white text-sm truncate">{res.displayName}</span>
                       <span className="text-zinc-500 text-xs truncate">@{res.username}</span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {visibleChats.map(chat => {
            const otherUserId = chat.participants.find((p: string) => p !== user.id);
            const otherUser = usersMap[otherUserId];
            
            return (
              <div 
                key={chat.id} 
                onClick={() => setActiveChatId(chat.id)}
                className={clsx(
                  "p-4 border-b border-zinc-800 flex items-center gap-4 cursor-pointer hover:bg-zinc-900 transition-colors",
                  activeChatId === chat.id && "bg-zinc-900"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center font-bold text-zinc-500">
                  {otherUser?.photoUrl ? <img src={otherUser.photoUrl} className="w-full h-full object-cover"/> : otherUser?.displayName?.[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white text-sm truncate">{otherUser?.displayName || 'Unknown User'}</span>
                    {chat.updatedAt && <span className="text-zinc-500 text-xs shrink-0 pl-2">{formatDistanceToNow(chat.updatedAt, { addSuffix: false, locale: es })}</span>}
                  </div>
                  <span className="text-zinc-400 text-sm truncate">{chat.lastMessage || 'Start conversation'}</span>
                </div>
              </div>
            );
          })}
          {chats.length === 0 && !isSearching && (
            <div className="p-8 text-center text-zinc-500">
               No messages yet.
            </div>
          )}
        </div>
      </div>

      {/* Active Chat */}
      <div className={clsx("flex-1 flex flex-col bg-zinc-950", !activeChatId && "hidden sm:flex")}>
        {activeChatId ? (
          <ActiveChat 
            chatId={activeChatId} 
            otherUser={usersMap[chats.find(c => c.id === activeChatId)?.participants.find((p: string) => p !== user.id)]} 
            onBack={() => setActiveChatId(null)} 
            onMessageSent={fetchChats}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 h-full p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Select a message</h3>
            <p className="max-w-xs">Choose from your existing conversations, start a new one, or just keep swimming.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveChat({ chatId, otherUser, onBack, onMessageSent }: { chatId: string, otherUser: any, onBack: () => void, onMessageSent: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(fetchMessages, 3000); // Polling every 3 seconds for new messages
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !imgUrl) || !user) return;
    
    const text = content.trim();
    const currentImg = imgUrl;
    setContent('');
    setImgUrl('');
    
    try {
      await sendMessage({
        chatId,
        authorId: user.id,
        content: text,
        imageUrl: currentImg
      });
      await fetchMessages();
      onMessageSent();
    } catch (err) {
      console.error(err);
    }
  };

  if (!otherUser) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent" /></div>;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="h-16 border-b border-zinc-800 flex items-center gap-4 px-4 bg-zinc-950/80 backdrop-blur-md shrink-0 z-10 pt-2">
        <button onClick={onBack} className="sm:hidden p-2 -ml-2 rounded-full hover:bg-zinc-900 text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center font-bold text-zinc-500">
          {otherUser.photoUrl ? <img src={otherUser.photoUrl} className="w-full h-full object-cover"/> : otherUser.displayName?.[0]?.toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-white text-sm truncate">{otherUser.displayName}</span>
        </div>
      </div>
      
      <div id="messages-container" className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg, i) => {
          const isMine = msg.authorId === user?.id;
          const showTime = i === 0 || msg.createdAt - messages[i-1].createdAt > 1000 * 60 * 5; // 5 min
          
          return (
            <div key={msg.id} className="flex flex-col">
              {showTime && (
                <div className="text-center text-xs text-zinc-600 my-2">
                   {formatDistanceToNow(msg.createdAt, { addSuffix: true, locale: es })}
                </div>
              )}
              <div className={clsx("flex flex-col max-w-[80%]", isMine ? "self-end items-end" : "self-start items-start")}>
                <div className={clsx("rounded-2xl px-4 py-2", isMine ? "bg-rose-600 text-white rounded-br-sm" : "bg-zinc-800 text-white rounded-bl-sm")}>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} className="max-w-[200px] sm:max-w-[300px] rounded-lg mb-2 object-cover" />
                  )}
                  {msg.content && <span className="break-words whitespace-pre-wrap">{msg.content}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {imgUrl && (
        <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 relative inline-flex">
          <img src={imgUrl} className="h-20 rounded-lg" />
          <button onClick={() => setImgUrl('')} className="absolute -top-2 w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-zinc-700">✕</button>
        </div>
      )}
      <div className="p-4 bg-zinc-950 shrink-0 border-t border-zinc-800">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <ImageUploadButton onImageSelected={setImgUrl} disabled={false} />
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Start a message"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full py-2.5 px-4 text-white focus:outline-none focus:border-rose-500 transition-colors"
          />
          <button 
            type="submit" 
            disabled={!content.trim() && !imgUrl} 
            className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white disabled:opacity-50 disabled:bg-zinc-800 transition-colors"
          >
             <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
