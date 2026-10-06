'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '@/types';
import { Mail, Check, X, User, ChevronDown, Sparkles } from 'lucide-react';

interface AssigneeSelectorProps {
  users: UserProfile[];
  selectedUserId: string;
  selectedEmail: string;
  onChange: (userId: string, email: string) => void;
  label?: string;
  error?: string;
}

export function AssigneeSelector({
  users,
  selectedUserId,
  selectedEmail,
  onChange,
  label = 'Assignee',
  error,
}: AssigneeSelectorProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find currently selected profile
  const selectedProfile = users.find(
    (u) => (selectedUserId && u.id === selectedUserId) || (selectedEmail && u.email.toLowerCase() === selectedEmail.toLowerCase())
  );

  const displayEmail = selectedProfile?.email || selectedEmail;
  const displayName = selectedProfile?.full_name || (displayEmail ? displayEmail.split('@')[0] : '');

  // Filtered users based on search query
  const filteredUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name && u.full_name.toLowerCase().includes(q))
    );
  });

  const isQueryValidEmail = query.includes('@') && query.includes('.') && query.trim().length > 5;
  const isQueryAlreadyInList = users.some((u) => u.email.toLowerCase() === query.trim().toLowerCase());

  const handleSelectUser = (user: UserProfile) => {
    onChange(user.id, user.email);
    setQuery('');
    setIsOpen(false);
  };

  const handleSelectEmail = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      onChange(existing.id, existing.email);
    } else {
      onChange('', cleanEmail);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isQueryValidEmail) {
        handleSelectEmail(query);
      } else if (filteredUsers.length > 0) {
        handleSelectUser(filteredUsers[0]);
      }
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 tracking-wide">
            {label}
          </label>
          <span className="text-[11px] text-slate-400 font-medium">Pick or type any email</span>
        </div>
      )}

      {/* Active Selection Display OR Search Input */}
      {selectedProfile || selectedEmail ? (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar or Mail badge */}
            <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-linear-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
              {selectedProfile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProfile.avatar_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <span>{(displayName || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-indigo-700/80 truncate leading-tight font-medium flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 text-indigo-500" />
                <span>{displayEmail}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            title="Unassign task"
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Assign by email (e.g. colleague@company.com)..."
              className={`w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs font-medium transition-all shadow-2xs focus:outline-none focus:ring-3 ${
                error
                  ? 'border-rose-400 bg-rose-50/20 text-rose-900'
                  : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-500/15'
              }`}
            />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 animate-in fade-in zoom-in-95">
              {/* Option to assign directly via custom email typed */}
              {isQueryValidEmail && !isQueryAlreadyInList && (
                <button
                  type="button"
                  onClick={() => handleSelectEmail(query)}
                  className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-indigo-50/80 flex items-center justify-between transition-colors border-b border-slate-100 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-indigo-950 block">Assign via Email</span>
                      <span className="text-[11px] text-indigo-600 font-medium">{query.trim()}</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                    Direct Email
                  </span>
                </button>
              )}

              {/* Workspace team members list */}
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Workspace Team Members
              </div>

              {filteredUsers.length === 0 && !isQueryValidEmail ? (
                <div className="px-4 py-3 text-center text-xs text-slate-400">
                  <p>No matching teammate found.</p>
                  <p className="text-[11px] mt-0.5 text-slate-500">Type any full email address to assign.</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-6 h-6 rounded-md overflow-hidden shrink-0 bg-linear-to-tr from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-[10px]">
                        {u.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatar_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <span>{(u.full_name || u.email).charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate group-hover:text-indigo-600 transition-colors">
                          {u.full_name || u.email.split('@')[0]}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">{u.email}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Team Chips (1-Click Assignment) */}
      {!selectedProfile && !selectedEmail && users.length > 0 && (
        <div className="pt-1">
          <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Quick team select:</span>
          <div className="flex flex-wrap gap-1.5">
            {users.slice(0, 5).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelectUser(u)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-semibold transition-all border border-slate-200/70 hover:border-indigo-200 cursor-pointer"
              >
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  {(u.full_name || u.email).charAt(0).toUpperCase()}
                </span>
                <span className="truncate max-w-[100px]">{u.full_name || u.email.split('@')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}
