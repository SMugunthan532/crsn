import React, { useState } from 'react';
import { 
  Wrench, 
  BookOpen, 
  HeartPulse, 
  Tv, 
  Search, 
  Plus, 
  Star, 
  MapPin, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  User as UserIcon,
  MessageSquare,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  BadgeCheck,
  Filter,
  X,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import { CRSNSystem } from '../engine/CRSNSystem';
import { CATEGORY_RULES, ItemCategory, ItemDTO, BorrowRecordDTO } from '../types';
import { BorrowService } from '../engine/service/BorrowService';
import { BorrowModal } from './BorrowModal';
import { NeighborhoodMap } from './NeighborhoodMap';
import { OwnerLocationModal } from './OwnerLocationModal';
import { 
  getLocationForLocality, 
  calculateDistanceMiles, 
  formatDistance 
} from '../engine/util/locationData';
import { MainAppView } from './Navbar';

interface ModernPortalProps {
  currentView: MainAppView;
  onViewChange: (view: MainAppView) => void;
  onOpenChatWith: (conversationId: string, peerName: string, itemTitle?: string) => void;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
}

export const ModernPortal: React.FC<ModernPortalProps> = ({
  currentView,
  onViewChange,
  onOpenChatWith,
  showAddModal,
  setShowAddModal
}) => {
  const system = CRSNSystem.getInstance();
  const currentUser = system.getCurrentUser();
  const currentDate = system.getCurrentDate();
  const currentUserLoc = currentUser ? getLocationForLocality(currentUser.getLocality()) : null;

  // Location modal target
  const [ownerLocationTarget, setOwnerLocationTarget] = useState<{
    locality: string;
    ownerName: string;
    ownerId?: string;
    itemTitle?: string;
  } | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLocality, setSelectedLocality] = useState<string>('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'title' | 'duration' | 'fine'>('title');

  // Loans View Tab
  const [loanSubTab, setLoanSubTab] = useState<'borrowed' | 'lent' | 'history'>('borrowed');

  // Modals
  const [borrowTargetItem, setBorrowTargetItem] = useState<ItemDTO | null>(null);
  const [showReturnModal, setShowReturnModal] = useState<BorrowRecordDTO | null>(null);
  const [showRateModal, setShowRateModal] = useState<BorrowRecordDTO | null>(null);
  const [showPayModal, setShowPayModal] = useState<boolean>(false);

  // Form states for adding item
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ItemCategory>('Tool');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemCondition, setNewItemCondition] = useState<'Like New' | 'Good' | 'Fair'>('Good');
  const [newItemAccessories, setNewItemAccessories] = useState('');
  const [newItemPickupInstructions, setNewItemPickupInstructions] = useState('Front porch pickup / doorstep exchange');

  // Rating modal form
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingFeedback, setRatingFeedback] = useState<string>('');

  // Fine payment form
  const [payAmount, setPayAmount] = useState<string>('');

  // Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = (text: string, isError: boolean = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Queries
  const allItems: ItemDTO[] = system.itemService.getAllItems().map(i => i.toDTO());
  const allRecords: BorrowRecordDTO[] = system.borrowService.getAllRecords().map(r => r.toDTO());

  const activeUserBorrows = currentUser
    ? system.borrowService.getActiveBorrows(currentUser.getUserId()).map(r => r.toDTO())
    : [];

  const itemsLentOutByMe = currentUser
    ? allRecords.filter(r => r.lenderId === currentUser.getUserId() && r.status !== 'RETURNED')
    : [];

  const userBorrowHistory = currentUser
    ? system.borrowService.getBorrowerHistory(currentUser.getUserId()).map(r => r.toDTO())
    : [];

  // Filter & Sort items
  const filteredItems = allItems.filter(item => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    if (selectedLocality !== 'ALL' && !item.locality.toLowerCase().includes(selectedLocality.toLowerCase())) return false;
    if (onlyAvailable && !item.isAvailable) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchOwner = item.ownerName.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchOwner) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'duration') return CATEGORY_RULES[a.category].defaultDurationDays - CATEGORY_RULES[b.category].defaultDurationDays;
    if (sortBy === 'fine') return CATEGORY_RULES[b.category].dailyFineRate - CATEGORY_RULES[a.category].dailyFineRate;
    return 0;
  });

  const getCategoryIcon = (cat: ItemCategory) => {
    switch (cat) {
      case 'Tool': return <Wrench className="w-3.5 h-3.5 text-amber-400" />;
      case 'Book': return <BookOpen className="w-3.5 h-3.5 text-sky-400" />;
      case 'MedicalEquipment': return <HeartPulse className="w-3.5 h-3.5 text-rose-400" />;
      case 'Electronics': return <Tv className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const handleBorrowSuccess = (recordId: string, itemTitle: string, lenderName: string) => {
    showToast(`Request sent! SMS notification dispatched to owner (${lenderName}) with your mobile and security proof.`);
  };

  const handleDelete = (itemId: string) => {
    if (!currentUser) return;
    if (window.confirm('Remove this resource from neighborhood sharing?')) {
      try {
        system.deleteItem(itemId);
        showToast('Resource removed from catalog.');
      } catch (err: any) {
        showToast(err.message, true);
      }
    }
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const item = system.listItem(
        newItemTitle,
        newItemCategory,
        newItemDesc,
        newItemAccessories,
        newItemCondition,
        newItemPickupInstructions
      );
      showToast(`Listed '${item.getTitle()}' in ${currentUser.getLocality()} network.`);
      setShowAddModal(false);
      setNewItemTitle('');
      setNewItemDesc('');
      setNewItemAccessories('');
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleReturnSubmit = (recordId: string) => {
    try {
      const res = system.returnItem(recordId);
      if (res.daysLate > 0) {
        showToast(
          `Resource returned ${res.daysLate} day(s) late. Late fee: $${res.fineCalculated.toFixed(2)}.`,
          true
        );
      } else {
        showToast(`Resource returned on schedule with $0.00 late fees!`);
      }
      setShowReturnModal(null);
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRateModal || !currentUser) return;
    try {
      system.rateTransaction(showRateModal.recordId, ratingScore, ratingFeedback);
      showToast(`Submitted ${ratingScore}★ community review.`);
      setShowRateModal(null);
      setRatingFeedback('');
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handlePayFineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const val = parseFloat(payAmount);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid payment amount.', true);
      return;
    }
    try {
      const paid = system.payFine(val);
      showToast(`Paid $${paid.toFixed(2)} towards your outstanding balance.`);
      setShowPayModal(false);
      setPayAmount('');
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const activeFiltersCount = (selectedCategory !== 'ALL' ? 1 : 0) + 
                             (selectedLocality !== 'ALL' ? 1 : 0) + 
                             (onlyAvailable ? 1 : 0) + 
                             (searchQuery.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedCategory('ALL');
    setSelectedLocality('ALL');
    setOnlyAvailable(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs sm:text-sm font-medium flex items-center space-x-2.5 transition-all ${
            toastMsg.isError 
              ? 'bg-rose-950/90 text-rose-200 border-rose-800' 
              : 'bg-[#181924] text-amber-300 border-amber-500/40'
          }`}
        >
          {toastMsg.isError ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* USER CONTEXT & OVERVIEW STRIP: Clean, Organized, Intuitive */}
      <div className="bg-[#151722] border border-[#232638] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* User Status Identification */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-base text-amber-400 shrink-0 font-mono">
              {currentUser ? currentUser.getName().charAt(0) : '?'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white font-mono">
                  {currentUser ? currentUser.getName() : 'Guest Explorer'}
                </span>
                {currentUser && (
                  <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                    <span>·</span>
                    <span>{currentUser.getLocality()}</span>
                  </span>
                )}
                {currentUser?.getIsVerified() && (
                  <span className="inline-flex items-center text-emerald-400" title="Verified Resident ID">
                    <BadgeCheck className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center space-x-2">
                {currentUser ? (
                  <>
                    <span className="flex items-center text-amber-400 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                      {currentUser.getRatingAverage()} Rating
                    </span>
                    <span>·</span>
                    <span>{currentUser.getRatingCount()} community reviews</span>
                  </>
                ) : (
                  <span>Select an acting neighbor from the top right to borrow items or share equipment.</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Jump Status Badges / Cards */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                onViewChange('my-loans');
                setLoanSubTab('borrowed');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center space-x-2 ${
                currentView === 'my-loans' && loanSubTab === 'borrowed'
                  ? 'bg-amber-500 text-black border-amber-500 font-bold'
                  : 'bg-[#1A1C2A] text-slate-300 hover:text-white border-[#2A2D40]'
              }`}
            >
              <span>Borrowed by You</span>
              <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded font-bold ${
                currentView === 'my-loans' && loanSubTab === 'borrowed' ? 'bg-black/20 text-black' : 'bg-[#25283C] text-amber-300'
              }`}>
                {activeUserBorrows.length}
              </span>
            </button>

            <button
              onClick={() => {
                onViewChange('my-loans');
                setLoanSubTab('lent');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center space-x-2 ${
                currentView === 'my-loans' && loanSubTab === 'lent'
                  ? 'bg-amber-500 text-black border-amber-500 font-bold'
                  : 'bg-[#1A1C2A] text-slate-300 hover:text-white border-[#2A2D40]'
              }`}
            >
              <span>Lent Out by You</span>
              <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded font-bold ${
                currentView === 'my-loans' && loanSubTab === 'lent' ? 'bg-black/20 text-black' : 'bg-[#25283C] text-slate-200'
              }`}>
                {itemsLentOutByMe.length}
              </span>
            </button>

            {currentUser && currentUser.getFinesOwed() > 0 && (
              <button
                onClick={() => setShowPayModal(true)}
                className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-xs font-bold text-rose-300 flex items-center space-x-1.5 transition"
              >
                <span>Dues: ${currentUser.getFinesOwed().toFixed(2)}</span>
                <span className="underline text-[11px]">Pay</span>
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Share New Item</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW: CATALOG (Unified search, category bar, locality filters & grid) */}
      {/* ========================================================================= */}
      {currentView === 'catalog' && (
        <div className="space-y-4">
          
          {/* UNIFIED FILTER CONSOLE (Everything in one clear, discoverable bar) */}
          <div className="bg-[#151722] border border-[#232638] rounded-2xl p-4 space-y-3.5 shadow-sm">
            
            {/* Top Row: Search Input + Locality Dropdown + Availability + Sort */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools, medical equipment, electronics, books, owner name..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#1A1C2A] border border-[#2B2E42] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Locality Filter Selector */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex items-center space-x-1.5 bg-[#1A1C2A] border border-[#2B2E42] rounded-xl px-3 py-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400 hidden sm:inline">Neighborhood:</span>
                  <select
                    aria-label="Neighborhood Locality"
                    value={selectedLocality}
                    onChange={(e) => setSelectedLocality(e.target.value)}
                    className="bg-transparent text-xs text-slate-100 font-medium focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="ALL" className="bg-[#1A1C2A]">All Neighborhoods</option>
                    <option value="Maple Heights" className="bg-[#1A1C2A]">Maple Heights</option>
                    <option value="Oakridge District" className="bg-[#1A1C2A]">Oakridge District</option>
                    <option value="Sunnyvale Community" className="bg-[#1A1C2A]">Sunnyvale Community</option>
                    <option value="Riverside Green" className="bg-[#1A1C2A]">Riverside Green</option>
                  </select>
                </div>

                {/* Available Only Toggle Button */}
                <button
                  onClick={() => setOnlyAvailable(prev => !prev)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 ${
                    onlyAvailable
                      ? 'bg-amber-500 text-black border-amber-500'
                      : 'bg-[#1A1C2A] text-slate-300 hover:text-white border-[#2B2E42]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Available Now</span>
                </button>

                {/* Sort By Dropdown */}
                <div className="flex items-center space-x-1 bg-[#1A1C2A] border border-[#2B2E42] rounded-xl px-2.5 py-1.5 text-xs">
                  <span className="text-slate-400 hidden sm:inline">Sort:</span>
                  <select
                    aria-label="Sort Catalog Items"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-xs text-slate-100 font-medium focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="title" className="bg-[#1A1C2A]">Alphabetical (A-Z)</option>
                    <option value="duration" className="bg-[#1A1C2A]">Duration (Shortest)</option>
                    <option value="fine" className="bg-[#1A1C2A]">Late Fee Rate (Highest)</option>
                  </select>
                </div>

                {/* Neighborhood Google Map View Button */}
                <button
                  onClick={() => onViewChange('map')}
                  className="hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#1A1C2A] hover:bg-[#25283C] text-amber-400 hover:text-amber-300 font-semibold border border-[#2B2E42] text-xs transition"
                  title="View items on interactive Google Map"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Map View</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Segmented Category Buttons (Anti-AI Slop, clean typography, functional tabs) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#232638]">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedCategory === 'ALL'
                      ? 'bg-amber-500 text-black font-bold shadow-sm'
                      : 'bg-[#1A1C2A] text-slate-300 hover:text-white hover:bg-[#222538]'
                  }`}
                >
                  All Items ({allItems.length})
                </button>

                {(['Tool', 'Book', 'MedicalEquipment', 'Electronics'] as ItemCategory[]).map(cat => {
                  const rule = CATEGORY_RULES[cat];
                  const count = allItems.filter(i => i.category === cat).length;
                  const isSelected = selectedCategory === cat;

                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? 'bg-amber-500 text-black font-bold shadow-sm'
                          : 'bg-[#1A1C2A] text-slate-300 hover:text-white hover:bg-[#222538]'
                      }`}
                    >
                      <span className={isSelected ? 'text-black' : ''}>{getCategoryIcon(cat)}</span>
                      <span>{rule.displayName}</span>
                      <span className={`text-[10px] font-mono px-1 rounded ${
                        isSelected ? 'bg-black/20 text-black' : 'text-slate-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Status and Clear Options */}
              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span>
                  Showing <strong className="text-white font-mono">{filteredItems.length}</strong> of {allItems.length} resources
                </span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-amber-400 hover:text-amber-300 font-semibold underline text-xs"
                  >
                    Reset Filters ({activeFiltersCount})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ITEM CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const rule = CATEGORY_RULES[item.category];
              const isOwner = currentUser && currentUser.getUserId() === item.ownerId;
              const itemLoc = getLocationForLocality(item.locality);
              const distMiles = currentUserLoc 
                ? calculateDistanceMiles(currentUserLoc.lat, currentUserLoc.lng, itemLoc.lat, itemLoc.lng)
                : null;

              return (
                <div
                  key={item.itemId}
                  className="bg-[#151722] border border-[#232638] hover:border-[#383C56] rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-colors shadow-sm group"
                >
                  <div className="space-y-3">
                    
                    {/* Header Row: Quiet unboxed metadata & availability */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center space-x-1.5 font-medium text-slate-300">
                        {getCategoryIcon(item.category)}
                        <span>{item.category}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-slate-400">{item.condition || 'Good'}</span>
                      </div>

                      {item.isAvailable ? (
                        <span className="text-[11px] font-mono font-bold text-amber-400 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>AVAILABLE</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">
                          CHECKED OUT
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-white font-mono group-hover:text-amber-400 transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Accessories note if present */}
                    {item.includedAccessories && item.includedAccessories.length > 0 && (
                      <div className="text-[11px] text-slate-400">
                        <span className="text-slate-500">Includes:</span> {item.includedAccessories.join(', ')}
                      </div>
                    )}

                    {/* Structured Loan Duration & Terms Box */}
                    <div className="p-2.5 rounded-xl bg-[#1A1C2A] border border-[#272A3C] text-xs text-slate-300 flex items-center justify-between font-mono">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{rule.defaultDurationDays} Days Loan</span>
                      </div>
                      <div className="flex items-center space-x-1 text-amber-400">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>${rule.dailyFineRate.toFixed(2)}/day fine</span>
                      </div>
                    </div>

                    {/* Owner & Pickup Neighborhood */}
                    <div className="pt-2 border-t border-[#232638] flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-200 font-medium">{item.ownerName}</span>
                        {(() => {
                          const ownerUser = system.userService.getUserById(item.ownerId);
                          if (ownerUser?.getIsVerified()) {
                            return (
                              <span className="text-emerald-400" title="Verified Neighbor ID">
                                <BadgeCheck className="w-3.5 h-3.5" />
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {isOwner && <span className="text-amber-400 font-semibold">(You)</span>}
                      </div>

                      <button
                        onClick={() => setOwnerLocationTarget({
                          locality: item.locality,
                          ownerName: item.ownerName,
                          ownerId: item.ownerId,
                          itemTitle: item.title
                        })}
                        className="flex items-center space-x-1 text-slate-300 hover:text-amber-400 transition"
                        title="Click to view pickup location on Google Maps"
                      >
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span className="underline decoration-dotted">{item.locality}</span>
                        {distMiles !== null && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({distMiles} mi)
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-[#232638] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">ID: {item.itemId}</span>

                    <div className="flex items-center space-x-2">
                      {/* Direct Location Map Icon */}
                      <button
                        onClick={() => setOwnerLocationTarget({
                          locality: item.locality,
                          ownerName: item.ownerName,
                          ownerId: item.ownerId,
                          itemTitle: item.title
                        })}
                        className="p-1.5 rounded-lg bg-[#1A1C2A] hover:bg-[#25283C] text-slate-300 hover:text-amber-400 border border-[#2B2E42] transition"
                        title="View Pickup Location on Google Map"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>

                      {isOwner ? (
                        <button
                          onClick={() => handleDelete(item.itemId)}
                          disabled={!item.isAvailable}
                          title={!item.isAvailable ? 'Item currently checked out' : 'Delete listing'}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-[#2B2E42] transition disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setBorrowTargetItem(item)}
                          disabled={!item.isAvailable}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-40 disabled:hover:bg-amber-500 transition shadow-sm flex items-center space-x-1"
                        >
                          <span>{item.isAvailable ? 'Borrow' : 'Checked Out'}</span>
                          {item.isAvailable && <ArrowRight className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16 bg-[#151722] rounded-2xl border border-[#232638] p-8 space-y-3">
              <Package className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-white font-bold text-sm">No community items match your criteria</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try clearing your search query or clicking "Reset Filters" to explore resources across all categories.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW: MY LOANS & LENDING (Tabbed, clear options, return & message actions) */}
      {/* ========================================================================= */}
      {currentView === 'my-loans' && (
        <div className="space-y-4">
          
          {/* Sub-Tabs: Clean segmented bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232638] pb-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLoanSubTab('borrowed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  loanSubTab === 'borrowed'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'bg-[#151722] text-slate-300 hover:text-white border border-[#232638]'
                }`}
              >
                <span>Items You're Borrowing</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${loanSubTab === 'borrowed' ? 'bg-black/20 text-black' : 'bg-[#222434] text-slate-400'}`}>
                  {activeUserBorrows.length}
                </span>
              </button>

              <button
                onClick={() => setLoanSubTab('lent')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  loanSubTab === 'lent'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'bg-[#151722] text-slate-300 hover:text-white border border-[#232638]'
                }`}
              >
                <span>Your Resources Lent Out</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${loanSubTab === 'lent' ? 'bg-black/20 text-black' : 'bg-[#222434] text-slate-400'}`}>
                  {itemsLentOutByMe.length}
                </span>
              </button>

              <button
                onClick={() => setLoanSubTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  loanSubTab === 'history'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'bg-[#151722] text-slate-300 hover:text-white border border-[#232638]'
                }`}
              >
                <span>Exchange History & Reviews</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${loanSubTab === 'history' ? 'bg-black/20 text-black' : 'bg-[#222434] text-slate-400'}`}>
                  {userBorrowHistory.length}
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Current network date: <strong className="text-amber-400 font-mono">{currentDate}</strong>
            </div>
          </div>

          {/* Sub-View: Borrowed Items */}
          {loanSubTab === 'borrowed' && (
            <div className="bg-[#151722] border border-[#232638] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#232638]">
                <h3 className="text-sm font-bold text-white font-mono">Resources Currently in Your Care</h3>
                <span className="text-xs text-slate-400">Zero fees when returned by due date</span>
              </div>

              {activeUserBorrows.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <p>You currently do not have any borrowed items.</p>
                  <button
                    onClick={() => onViewChange('catalog')}
                    className="text-amber-400 hover:underline font-bold"
                  >
                    Browse Catalog to Borrow Tools & Equipment →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeUserBorrows.map(rec => {
                    const daysRemaining = BorrowService.calculateDaysDifference(currentDate, rec.dueDate);
                    const isOverdue = daysRemaining < 0 || rec.status === 'OVERDUE';
                    const daysLate = Math.max(0, -daysRemaining);
                    const fineRate = CATEGORY_RULES[rec.category]?.dailyFineRate || 5.0;
                    const estimatedFine = daysLate * fineRate;

                    return (
                      <div 
                        key={rec.recordId} 
                        className={`p-4 rounded-xl border flex flex-col justify-between ${
                          isOverdue 
                            ? 'bg-rose-950/20 border-rose-800/60' 
                            : 'bg-[#1A1C2A] border-[#2A2D40]'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              {getCategoryIcon(rec.category)}
                              <span className="font-bold text-sm text-white font-mono">{rec.itemTitle}</span>
                            </div>
                            {isOverdue ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                OVERDUE ({daysLate}d)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#26293C] text-slate-300 border border-[#353952]">
                                {daysRemaining === 0 ? 'Due Today' : `${daysRemaining}d remaining`}
                              </span>
                            )}
                          </div>

                          <div className="text-xs space-y-1 text-slate-300">
                            <div>Owner: <strong className="text-white">{rec.lenderName}</strong></div>
                            <div>Return Due: <span className="font-mono text-amber-300">{rec.dueDate}</span></div>
                            {rec.pickupSlot && (
                              <div className="text-slate-400 text-[11px]">
                                Pickup slot: {rec.pickupSlot}
                              </div>
                            )}
                            {isOverdue && (
                              <div className="text-rose-400 font-bold text-[11px]">
                                Accruing Fine: ${fineRate.toFixed(2)}/day (Total: ${estimatedFine.toFixed(2)})
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#292C3E] flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => {
                                const foundItem = allItems.find(i => i.itemId === rec.itemId);
                                const loc = foundItem?.locality || 'Maple Heights';
                                setOwnerLocationTarget({
                                  locality: loc,
                                  ownerName: rec.lenderName,
                                  ownerId: rec.lenderId,
                                  itemTitle: rec.itemTitle
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#222536] hover:bg-[#2C3044] text-amber-400 text-xs font-semibold border border-[#32364E] flex items-center space-x-1"
                              title="View Owner Pickup & Return Location on Google Maps"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Map</span>
                            </button>

                            <button
                              onClick={() => onOpenChatWith(rec.recordId, rec.lenderName, rec.itemTitle)}
                              className="px-3 py-1.5 rounded-lg bg-[#222536] hover:bg-[#2C3044] text-slate-200 text-xs font-semibold border border-[#32364E] flex items-center space-x-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                              <span>Chat</span>
                            </button>
                          </div>

                          <button
                            onClick={() => setShowReturnModal(rec)}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-sm"
                          >
                            Return Resource
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-View: Lent Items */}
          {loanSubTab === 'lent' && (
            <div className="bg-[#151722] border border-[#232638] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white font-mono pb-3 border-b border-[#232638]">
                Your Resources in Neighbor Care
              </h3>

              {itemsLentOutByMe.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">
                  None of your resources are currently loaned out.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {itemsLentOutByMe.map(rec => (
                    <div key={rec.recordId} className="p-4 rounded-xl bg-[#1A1C2A] border border-[#2A2D40] space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-sm text-white font-mono">{rec.itemTitle}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Active Loan
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-300">
                        <div>Borrower: <strong className="text-white">{rec.borrowerName}</strong></div>
                        <div>Return Due: <span className="font-mono text-amber-300">{rec.dueDate}</span></div>
                        {rec.pickupSlot && <div>Pickup window: {rec.pickupSlot}</div>}
                        {rec.borrowerMobile && (
                          <div className="text-emerald-400 font-mono text-[11px] flex items-center space-x-1">
                            <span>Phone:</span>
                            <strong>{rec.borrowerMobile}</strong>
                            <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Verified</span>
                          </div>
                        )}
                        {rec.extraProofType && (
                          <div className="text-amber-300 text-[11px] pt-1">
                            <span className="text-slate-400">Security Proof:</span> <strong>{rec.extraProofType}</strong> {rec.extraProofNote ? `(${rec.extraProofNote})` : ''}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#292C3E] flex items-center justify-end">
                        <button
                          onClick={() => onOpenChatWith(rec.recordId, rec.borrowerName, rec.itemTitle)}
                          className="px-3 py-1.5 rounded-lg bg-[#222536] hover:bg-[#2C3044] text-slate-200 text-xs font-semibold border border-[#32364E] flex items-center space-x-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                          <span>Message Borrower</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-View: History & Reviews */}
          {loanSubTab === 'history' && (
            <div className="bg-[#151722] border border-[#232638] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white font-mono mb-4">Completed Exchanges & Community Reviews</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1A1C2A] text-slate-400 font-mono text-[11px] border-b border-[#2C2E42]">
                    <tr>
                      <th className="py-2.5 px-3">RECORD</th>
                      <th className="py-2.5 px-3">ITEM</th>
                      <th className="py-2.5 px-3">LENDER</th>
                      <th className="py-2.5 px-3">DUE DATE</th>
                      <th className="py-2.5 px-3">RETURNED</th>
                      <th className="py-2.5 px-3">FINE</th>
                      <th className="py-2.5 px-3">TRUST RATING</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232638] font-mono">
                    {userBorrowHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                          No past transaction records found.
                        </td>
                      </tr>
                    ) : (
                      userBorrowHistory.map(r => (
                        <tr key={r.recordId} className="hover:bg-[#1A1C2A]">
                          <td className="py-2.5 px-3 text-slate-400 font-semibold">{r.recordId}</td>
                          <td className="py-2.5 px-3 font-sans text-white font-medium">{r.itemTitle}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-300">{r.lenderName}</td>
                          <td className="py-2.5 px-3 text-slate-400">{r.dueDate}</td>
                          <td className="py-2.5 px-3 text-slate-400">{r.returnDate || 'Active'}</td>
                          <td className="py-2.5 px-3">
                            {r.fineAmount > 0 ? (
                              <span className="text-rose-400 font-bold">${r.fineAmount.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-500">$0.00</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            {r.status === 'RETURNED' ? (
                              r.borrowerRatingGiven ? (
                                <span className="text-amber-400 font-semibold flex items-center">
                                  <Star className="w-3 h-3 fill-amber-400 mr-1" />
                                  {r.borrowerRatingGiven}★
                                </span>
                              ) : (
                                <button
                                  onClick={() => setShowRateModal(r)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold border border-amber-500/30"
                                >
                                  Rate Lender
                                </button>
                              )
                            ) : (
                              <span className="text-slate-500 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW: NEIGHBORHOOD GOOGLE MAP */}
      {/* ========================================================================= */}
      {currentView === 'map' && (
        <NeighborhoodMap
          items={allItems}
          onBorrowItem={(item) => setBorrowTargetItem(item)}
          onOpenChat={(ownerId, ownerName) => onOpenChatWith(ownerId, ownerName)}
          onViewOwnerDetails={(locality, ownerName, ownerId) => setOwnerLocationTarget({ locality, ownerName, ownerId })}
        />
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* MODAL: Borrow Item */}
      <BorrowModal
        item={borrowTargetItem}
        isOpen={Boolean(borrowTargetItem)}
        onClose={() => setBorrowTargetItem(null)}
        onSuccess={handleBorrowSuccess}
      />

      {/* MODAL: Owner Location on Google Maps */}
      <OwnerLocationModal
        isOpen={Boolean(ownerLocationTarget)}
        onClose={() => setOwnerLocationTarget(null)}
        locality={ownerLocationTarget?.locality || 'Maple Heights'}
        ownerName={ownerLocationTarget?.ownerName || 'Neighbor'}
        ownerId={ownerLocationTarget?.ownerId}
        itemTitle={ownerLocationTarget?.itemTitle}
        onOpenChat={(ownerId, peerName) => onOpenChatWith(ownerId, peerName)}
        onBorrowItem={(item) => setBorrowTargetItem(item)}
      />

      {/* MODAL: Return Item with Fine Calculation Preview */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151722] border border-[#2D3043] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232638]">
              <h3 className="text-base font-bold text-white font-mono">Return Resource to Owner</h3>
              <button onClick={() => setShowReturnModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div>
              <p className="text-xs text-slate-400">Returning item:</p>
              <h4 className="text-sm font-bold text-white mt-0.5">{showReturnModal.itemTitle}</h4>
              <p className="text-xs text-slate-400">Owner: {showReturnModal.lenderName}</p>
            </div>

            {/* Calculations Breakdown */}
            {(() => {
              const daysDiff = BorrowService.calculateDaysDifference(showReturnModal.dueDate, currentDate);
              const daysLate = Math.max(0, daysDiff);
              const rule = CATEGORY_RULES[showReturnModal.category];
              const dailyRate = rule?.dailyFineRate || 5.0;
              const totalFine = daysLate * dailyRate;

              return (
                <div className="p-4 rounded-xl bg-[#1A1C2A] border border-[#272A3C] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Due Date:</span>
                    <span className="font-mono text-slate-200">{showReturnModal.dueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Date:</span>
                    <span className="font-mono text-amber-300 font-bold">{currentDate}</span>
                  </div>
                  <div className="pt-2 border-t border-[#292C3E] flex justify-between">
                    <span className="text-slate-400">Days Overdue:</span>
                    <span className={`font-mono font-bold ${daysLate > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {daysLate} day(s)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category Fine Rate:</span>
                    <span className="font-mono text-slate-200">${dailyRate.toFixed(2)}/day</span>
                  </div>
                  <div className="pt-2 border-t border-[#292C3E] flex justify-between text-sm">
                    <span className="font-semibold text-white">Calculated Due:</span>
                    <span className={`font-mono font-bold ${totalFine > 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                      ${totalFine.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReturnModal(null)}
                className="w-1/2 py-2.5 rounded-xl bg-[#222536] hover:bg-[#2C3044] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReturnSubmit(showReturnModal.recordId)}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-sm"
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Share an Item */}
      {showAddModal && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151722] border border-[#2D3043] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232638]">
              <h3 className="text-base font-bold text-white font-mono">Share a Resource in {currentUser.getLocality()}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Item Title *</label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g. Bosch Hammer Drill, Step Ladder, Camping Tent..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1C2A] border border-[#2B2E42] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category & Loan Rules *</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as ItemCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1C2A] border border-[#2B2E42] text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Tool">Tools & Hardware (3 days loan • $5.00/day late)</option>
                  <option value="Book">Books & Learning (14 days loan • $1.00/day late)</option>
                  <option value="MedicalEquipment">Medical & Mobility (7 days loan • $10.00/day late)</option>
                  <option value="Electronics">Electronics & Media (5 days loan • $8.00/day late)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Condition</label>
                  <select
                    value={newItemCondition}
                    onChange={(e) => setNewItemCondition(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1C2A] border border-[#2B2E42] text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Included Accessories</label>
                  <input
                    type="text"
                    value={newItemAccessories}
                    onChange={(e) => setNewItemAccessories(e.target.value)}
                    placeholder="e.g. Case, 2x batteries, bit set"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1C2A] border border-[#2B2E42] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description & Care Precautions *</label>
                <textarea
                  rows={3}
                  required
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Describe condition, handling instructions, or battery charging..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1C2A] border border-[#2B2E42] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-[#222536] hover:bg-[#2C3044] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-sm"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Rate Peer / Trust Score */}
      {showRateModal && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151722] border border-[#2D3043] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232638]">
              <h3 className="text-base font-bold text-white font-mono">Rate Neighbor Trust Score</h3>
              <button onClick={() => setShowRateModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRateSubmit} className="space-y-4 text-xs">
              <div>
                <p className="text-slate-400">Reviewing exchange for:</p>
                <h4 className="text-sm font-bold text-white mt-0.5">{showRateModal.itemTitle}</h4>
                <p className="text-slate-400">Neighbor: <strong className="text-white">{showRateModal.lenderName}</strong></p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Select Rating (1 to 5 Stars)</label>
                <div className="flex items-center space-x-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingScore(star)}
                      className="p-1 text-slate-600 hover:text-amber-400 transition"
                    >
                      <Star className={`w-7 h-7 ${star <= ratingScore ? 'text-amber-400 fill-amber-400' : 'text-[#2A2D40]'}`} />
                    </button>
                  ))}
                  <span className="font-bold text-sm text-amber-400 font-mono">{ratingScore}.0 Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Feedback Comment</label>
                <textarea
                  rows={2}
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  placeholder="Was the resource clean and working properly? Was coordination easy?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1C2A] border border-[#2B2E42] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRateModal(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-[#222536] hover:bg-[#2C3044] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-sm"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Pay Fines */}
      {showPayModal && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151722] border border-[#2D3043] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232638]">
              <h3 className="text-base font-bold text-white font-mono">Settle Late Return Dues</h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handlePayFineSubmit} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#1A1C2A] border border-[#272A3C] flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Dues Outstanding:</span>
                  <span className="text-xl font-mono font-bold text-rose-400">
                    ${currentUser.getFinesOwed().toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPayAmount(currentUser.getFinesOwed().toString())}
                  className="px-2.5 py-1 rounded-lg bg-[#25283C] hover:bg-[#2E324C] text-slate-200 text-[11px] font-semibold border border-[#373A54]"
                >
                  Pay Full Balance
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={currentUser.getFinesOwed()}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter amount to settle..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1C2A] border border-[#2B2E42] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-sm"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-[#222536] hover:bg-[#2C3044] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-sm"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
