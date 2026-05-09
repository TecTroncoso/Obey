'use client';

import { useState, useRef, useEffect } from 'react';
import { searchUsers } from '@/lib/actions/user.actions';
import clsx from 'clsx';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function MentionTextarea({ value, onChange, disabled, placeholder, className, rows = 3 }: MentionTextareaProps) {
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (cursorPos === null) return;
    const textBefore = value.slice(0, cursorPos);
    const match = textBefore.match(/@([a-z0-9_]*)$/i);
    
    if (match) {
      setSearchQuery(match[1]);
    } else {
      setSearchQuery(null);
      setResults([]);
    }
  }, [value, cursorPos]);

  useEffect(() => {
    let active = true;
    if (searchQuery !== null) {
      searchUsers(searchQuery).then(res => {
        if (active) {
          setResults(res);
          setFocusedIndex(0);
        }
      });
    }
    return () => { active = false; };
  }, [searchQuery]);

  const handleSelect = (username: string) => {
    if (cursorPos === null) return;
    const textBefore = value.slice(0, cursorPos);
    const textAfter = value.slice(cursorPos);
    
    const match = textBefore.match(/@([a-z0-9_]*)$/i);
    if (!match) return;

    const newBefore = textBefore.slice(0, match.index) + `@${username} `;
    onChange(newBefore + textAfter);
    setSearchQuery(null);
    setResults([]);
    
    // reset focus to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newBefore.length, newBefore.length);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => (i + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => (i - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(results[focusedIndex].username);
      } else if (e.key === 'Escape') {
        setSearchQuery(null);
        setResults([]);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setCursorPos(e.target.selectionStart);
  };

  const handleSelectEvent = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPos(e.currentTarget.selectionStart);
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onSelect={handleSelectEvent}
        onKeyDown={handleKeyDown}
        onClick={handleSelectEvent}
        onKeyUp={handleSelectEvent}
        disabled={disabled}
        className={className}
        placeholder={placeholder}
        rows={rows}
      />
      {results.length > 0 && typeof window !== 'undefined' && (
        <div className="absolute z-50 mt-1 max-h-60 w-64 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
          {results.map((r, i) => (
            <div
              key={r.id}
              onClick={(e) => {
                e.preventDefault();
                handleSelect(r.username);
              }}
              onMouseEnter={() => setFocusedIndex(i)}
              className={clsx(
                "flex cursor-pointer items-center gap-3 p-3 transition-colors",
                i === focusedIndex ? "bg-zinc-800" : "hover:bg-zinc-800/50"
              )}
            >
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-400">
                {r.photoUrl ? <img src={r.photoUrl} className="h-full w-full object-cover" /> : r.displayName?.[0]?.toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm font-bold text-white">{r.displayName}</span>
                <span className="truncate text-xs text-zinc-500">@{r.username}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
