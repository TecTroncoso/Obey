'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { searchUsers } from '@/lib/actions/user.actions';
import { useAuth } from '@/lib/auth-context';
import { useNav } from '@/lib/nav-context';

export function SearchWidget() {
  const { user, blockedUserIds, blockedByUserIds } = useAuth();
  const { setViewProfileUserId, setCurrentView } = useNav();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    if (query.trim().length > 0) {
      searchUsers(query.trim()).then(res => {
        if (active) {
          setResults(res.filter(r => r.id !== user?.id && !blockedUserIds.includes(r.id) && !blockedByUserIds.includes(r.id)));
        }
      });
    } else {
      setResults([]);
    }
    return () => { active = false; };
  }, [query, user, blockedUserIds, blockedByUserIds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (userId: string) => {
    setViewProfileUserId(userId);
    setCurrentView('profile');
    setIsFocused(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative z-50 mb-6">
      <div className={`relative flex items-center bg-zinc-900 rounded-full border transition-colors ${isFocused ? 'border-rose-500' : 'border-zinc-800'}`}>
        <div className="pl-4 text-zinc-500">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search Users"
          className="w-full bg-transparent border-none py-3 px-4 text-white focus:outline-none placeholder-zinc-500"
        />
      </div>

      {isFocused && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm">
              No results for "{query}"
            </div>
          ) : (
            results.map((res) => (
              <div 
                key={res.id} 
                onClick={() => handleResultClick(res.id)}
                className="flex items-center gap-3 p-4 hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center text-zinc-500 font-bold">
                  {res.photoUrl ? <img src={res.photoUrl} className="w-full h-full object-cover" /> : res.displayName?.[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-white text-sm truncate">{res.displayName}</span>
                  <span className="text-zinc-500 text-xs truncate">@{res.username}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
