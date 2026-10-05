import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Clock, 
  Bell, 
  Plus,
  HeartHandshake,
  TrendingUp,
  RotateCcw,
  Calendar,
  MapPin,
  BadgeCheck,
  LogIn,
  Sliders,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { UserDTO } from '../types';
import { CRSNSystem } from '../engine/CRSNSystem';

export type MainAppView = 'catalog' | 'my-loans' | 'map' | 'wishlist' | 'impact';

interface NavbarProps {
  currentView: MainAppView;
  onViewChange: (view: MainAppView) => void;
  users: UserDTO[];
  currentDate: string;
  onAdvanceDays: (days: number) => void;
  onResetData: () => void;
  onOpenNotifications: () => void;
  onOpenNewListing: () => void;
  onOpenAuth: (mode?: 'login' | 'register' | 'verify') => void;
  unreadCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  users,
  currentDate,
  onAdvanceDays,
  onResetData,
  onOpenNotifications,
  onOpenNewListing,
  onOpenAuth,
  unreadCount
}) => {
  const system = CRSNSystem.getInstance();
  const currentUser = system.getCurrentUser();
  const [showSimMenu, setShowSimMenu] = useState(false);

  const navItems: { id: MainAppView; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'catalog', label: 'Browse Catalog', icon: <Layers className="w-4 h-4" />, desc: 'Tools & equipment' },
    { id: 'my-loans', label: 'My Loans & Lending', icon: <Clock className="w-4 h-4" />, desc: 'Active & borrowed' },
    { id: 'map', label: 'Neighborhood Map', icon: <MapPin className="w-4 h-4" />, desc: 'Pickup locations' },
    { id: 'wishlist', label: 'Wishlist', icon: <HeartHandshake className="w-4 h-4" />, desc: 'Community requests' },
    { id: 'impact', label: 'Impact & Savings', icon: <TrendingUp className="w-4 h-4" />, desc: 'Metrics & circularity' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#121318]/95 backdrop-blur-md border-b border-[#22242F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Identity */}
          <div 
            className="flex items-center space-x-3 cursor-pointer shrink-0" 
            onClick={() => onViewChange('catalog')}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-black flex items-center justify-center shadow-md shadow-amber-500/20 font-bold">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-extrabold tracking-tight text-white font-mono">CRSN</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono font-semibold border border-amber-500/30">
                  Resource Sharing
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xl:block leading-tight">
                Neighborhood Peer-to-Peer Network
              </p>
            </div>
          </div>

          {/* Clean Primary Navigation with Clear Active State */}
          <nav className="hidden lg:flex items-center space-x-1 bg-[#181924] p-1 rounded-xl border border-[#27293A]">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}-btn`}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-sm font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-[#222432]'
                  }`}
                >
                  <span className={isActive ? 'text-black' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools: Unified, Uncluttered Utility Bar */}
          <div className="flex items-center space-x-2">
            
            {/* Simulation Calendar Menu Dropdown (Compact, Non-Intrusive) */}
            <div className="relative">
              <button
                onClick={() => setShowSimMenu(prev => !prev)}
                className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#181924] hover:bg-[#222432] border border-[#27293A] text-xs text-slate-300 hover:text-white transition"
                title="Simulation Date & Due-Date Testing"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-amber-300 font-semibold">{currentDate}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showSimMenu && (
                <div 
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-[#181924] border border-[#2B2E42] shadow-2xl p-3 z-50 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="flex items-center justify-between border-b border-[#2B2E42] pb-2">
                    <span className="text-[11px] font-semibold text-slate-300">Fast-Forward Time</span>
                    <span className="text-[10px] font-mono text-amber-400">{currentDate}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Advance date to test upcoming loan reminders and overdue calculations:</p>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button
                      onClick={() => { onAdvanceDays(1); setShowSimMenu(false); }}
                      className="px-2 py-1.5 rounded-lg bg-[#222432] hover:bg-amber-500 hover:text-black text-slate-200 font-mono text-xs font-semibold text-center transition"
                    >
                      +1 Day
                    </button>
                    <button
                      onClick={() => { onAdvanceDays(3); setShowSimMenu(false); }}
                      className="px-2 py-1.5 rounded-lg bg-[#222432] hover:bg-amber-500 hover:text-black text-slate-200 font-mono text-xs font-semibold text-center transition"
                    >
                      +3 Days
                    </button>
                    <button
                      onClick={() => { onAdvanceDays(7); setShowSimMenu(false); }}
                      className="px-2 py-1.5 rounded-lg bg-[#222432] hover:bg-rose-500 hover:text-white text-slate-200 font-mono text-xs font-semibold text-center transition"
                    >
                      +7 Days
                    </button>
                  </div>
                  <div className="pt-2 border-t border-[#2B2E42] flex justify-between items-center">
                    <button
                      onClick={() => {
                        setShowSimMenu(false);
                        if (window.confirm('Reset demo accounts, items, and borrowed records?')) {
                          onResetData();
                        }
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Demo Data</span>
                    </button>
                    <button
                      onClick={() => setShowSimMenu(false)}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <button
              id="notifications-bell-btn"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-[#181924] hover:bg-[#222432] text-slate-300 hover:text-white border border-[#27293A] transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black font-extrabold text-[10px] flex items-center justify-center shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Acting Neighbor Switcher (Structured, Clear Label) */}
            <div className="flex items-center space-x-2 bg-[#181924] border border-[#27293A] rounded-xl px-2.5 py-1.5">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xs relative shrink-0">
                {currentUser ? currentUser.getName().charAt(0) : '?'}
                {currentUser?.getIsVerified() && (
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[8px]" title="Verified Neighbor">
                    ✓
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1 leading-none">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                    Acting As
                  </span>
                  {currentUser?.getIsVerified() && (
                    <span className="text-[8px] px-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold leading-none">
                      VERIFIED
                    </span>
                  )}
                </div>
                <select
                  id="user-select"
                  aria-label="Select Acting User"
                  value={currentUser ? currentUser.getUserId() : 'guest'}
                  onChange={(e) => {
                    if (e.target.value === 'guest') {
                      system.setCurrentUser(null);
                    } else {
                      const user = system.userService.getUserById(e.target.value);
                      system.setCurrentUser(user);
                    }
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="guest" className="bg-[#181924] text-slate-400">Guest Explorer</option>
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId} className="bg-[#181924] text-slate-100">
                      {u.isVerified ? '✓ ' : ''}{u.name} ({u.locality}) {u.finesOwed > 0 ? `[Due $${u.finesOwed}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auth / Verify ID Button */}
            {currentUser ? (
              <button
                onClick={() => onOpenAuth('verify')}
                className={`hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  currentUser.getIsVerified()
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                    : 'bg-[#221F18] border-amber-500/40 text-amber-300 hover:bg-[#2C271C]'
                }`}
                title="Manage ID Verification"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{currentUser.getIsVerified() ? 'Verified ID' : 'Verify ID'}</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold transition shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Primary Action Button: Share Item */}
            {currentUser && (
              <button
                id="share-item-nav-btn"
                onClick={onOpenNewListing}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Share Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-[#22242F] text-xs">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 ${
                currentView === item.id ? 'bg-amber-500 text-black font-bold' : 'text-slate-300'
              }`}
            >
              {item.icon}
              <span className="text-[11px]">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
