import React, { useState } from 'react';
import { 
  HeartHandshake, 
  Plus, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { CommunityWishlistRequestDTO, ItemCategory } from '../types';
import { CRSNSystem } from '../engine/CRSNSystem';

interface CommunityWishlistProps {
  onOpenChat: (requesterId: string, requesterName: string, title: string) => void;
  onShareItem: (prefillTitle?: string, prefillCategory?: ItemCategory) => void;
}

export const CommunityWishlist: React.FC<CommunityWishlistProps> = ({
  onOpenChat,
  onShareItem
}) => {
  const system = CRSNSystem.getInstance();
  const currentUser = system.getCurrentUser();
  const [requests, setRequests] = useState<CommunityWishlistRequestDTO[]>(() =>
    system.notificationService.getWishlistRequests()
  );
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Tool');
  const [neededDate, setNeededDate] = useState('This Weekend');
  const [note, setNote] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    system.notificationService.addWishlistRequest(
      currentUser.getUserId(),
      currentUser.getName(),
      currentUser.getLocality(),
      title,
      category,
      neededDate,
      note
    );

    setRequests(system.notificationService.getWishlistRequests());
    setShowAddModal(false);
    setTitle('');
    setNote('');
    system.notify();
  };

  const handleOfferHelp = (req: CommunityWishlistRequestDTO) => {
    if (!currentUser) return;
    system.notificationService.fulfillWishlistRequest(req.id);
    setRequests(system.notificationService.getWishlistRequests());
    onOpenChat(req.requesterId, req.requesterName, req.title);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#151720] border border-[#242636] rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Community Wishlist</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">
            Looking to Borrow Something Not Yet Listed?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Broadcast a resource request to your neighborhood network so someone with an idle item can connect and lend it.
          </p>
        </div>

        {currentUser && (
          <button
            id="post-request-btn"
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs sm:text-sm font-bold shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Post an Item Request</span>
          </button>
        )}
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requests.map((req) => {
          const isMe = currentUser && currentUser.getUserId() === req.requesterId;
          const isFulfilled = req.status === 'OFFERED';

          return (
            <div
              key={req.id}
              className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                isFulfilled
                  ? 'bg-[#151720]/50 border-[#242636] opacity-75'
                  : 'bg-[#151720] border-[#242636] hover:border-[#383B50] shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#1F2130] text-slate-300 border border-[#2D3043]">
                    {req.category}
                  </span>
                  {isFulfilled ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#212433] text-slate-300 border border-[#2F3348] flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      <span>Neighbor Offered</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Looking to Borrow
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-base font-bold text-white font-mono">{req.title}</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{req.note}</p>

                <div className="mt-4 pt-3 border-t border-[#222434] flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-200 font-medium">{req.requesterName}</span>
                    {isMe && <span className="text-amber-400 font-bold">(You)</span>}
                  </div>
                  <span className="flex items-center text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 mr-0.5" />
                    {req.locality}
                  </span>
                </div>

                <div className="mt-2 flex items-center text-[11px] text-slate-300 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
                  <span>Needed: <strong className="text-white">{req.neededDate}</strong></span>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-[#222434] flex items-center justify-between">
                {!isMe ? (
                  <button
                    onClick={() => handleOfferHelp(req)}
                    disabled={isFulfilled}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center justify-center space-x-1.5 disabled:opacity-40 disabled:hover:bg-amber-500"
                  >
                    <HeartHandshake className="w-4 h-4" />
                    <span>{isFulfilled ? 'Offer Connected' : 'I Have This — Offer to Lend'}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">Your active community request</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Post Request */}
      {showAddModal && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151720] border border-[#2D3043] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#242636]">
              <h3 className="text-base font-bold text-white font-mono">Post Wishlist Request</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">What item do you need? *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lawn Aerator, Roof Cargo Box, Projector, Tile Cutter..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1D28] border border-[#2B2E40] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ItemCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1D28] border border-[#2B2E40] text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Tool">Tool / Hardware</option>
                    <option value="Book">Book / Learning</option>
                    <option value="MedicalEquipment">Medical Aid</option>
                    <option value="Electronics">Electronics / Media</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Needed Timeframe</label>
                  <input
                    type="text"
                    required
                    value={neededDate}
                    onChange={(e) => setNeededDate(e.target.value)}
                    placeholder="e.g. This Saturday, 3 days"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1D28] border border-[#2B2E40] text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Project Reason / Context</label>
                <textarea
                  rows={3}
                  required
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Explain your project or need. Neighbors love knowing how their resources help!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1B1D28] border border-[#2B2E40] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-[#222432] hover:bg-[#2C3042] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-sm"
                >
                  Post to Community
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
