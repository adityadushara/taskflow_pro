'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  CheckSquare,
  FolderPlus,
  Layers,
  Plus,
  LogOut,
  Search,
  Menu,
  X,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  onSearchChange?: (term: string) => void;
  searchValue?: string;
  hideCreateButton?: boolean;
}

export function AppLayout({
  children,
  onSearchChange,
  searchValue = '',
  hideCreateButton = false,
}: AppLayoutProps) {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Tasks', href: '/dashboard?view=assigned', icon: CheckSquare },
    { name: 'Created by Me', href: '/dashboard?view=created', icon: FolderPlus },
    { name: 'All Tasks', href: '/dashboard?view=all', icon: Layers },
  ];

  const handleLogout = async () => {
    await signOut();
  };

  // Determine a polished display name
  const displayName =
    profile?.full_name?.trim() ||
    (user?.email ? user.email.split('@')[0].replace(/[._-]/g, ' ') : 'User');

  const avatarInitial = (displayName.charAt(0) || 'U').toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-5 h-16 bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shadow-indigo-200">
            H
          </div>
          <span className="font-bold text-base text-slate-900 tracking-tight">Hairdrama</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-30 h-screen w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-sm shadow-indigo-200">
              H
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 block leading-tight">
                Hairdrama
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider block">
                Task Hub
              </span>
            </div>
          </div>

          {/* Quick Create CTA in Sidebar */}
          <div className="p-4">
            <Link
              href="/tasks/new"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-150 transition-all cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href.includes('?view=') && pathname === '/dashboard');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-50/80 text-indigo-700 font-bold border border-indigo-100/60 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs mb-2.5">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-indigo-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                {avatarInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate capitalize leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                {user?.email || 'Authenticated'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50/60 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="hidden md:flex items-center justify-between px-8 h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20">
          {/* Search bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search tasks by title or description..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all text-slate-800 placeholder-slate-400 shadow-2xs font-medium"
              />
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>RBAC Protected</span>
            </div>

            {!hideCreateButton && (
              <Link
                href="/tasks/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs shadow-indigo-200 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </Link>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
