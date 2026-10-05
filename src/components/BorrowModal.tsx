import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Calendar, 
  MapPin, 
  User, 
  Send, 
  X, 
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Navigation,
  ExternalLink,
  Phone,
  FileCheck,
  Lock,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { ItemDTO, CATEGORY_RULES } from '../types';
import { CRSNSystem } from '../engine/CRSNSystem';
import { BorrowService } from '../engine/service/BorrowService';
import { 
  getLocationForLocality, 
  calculateDistanceMiles, 
  formatDistance, 
  getDirectionsUrl,
  OBSIDIAN_MAP_STYLES 
} from '../engine/util/locationData';
import { loadGoogleMaps } from '../engine/util/googleMapsLoader';

interface BorrowModalProps {
  item: ItemDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (recordId: string, itemTitle: string, lenderName: string) => void;
}

export const BorrowModal: React.FC<BorrowModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess
}) => {
  const system = CRSNSystem.getInstance();
  const currentUser = system.getCurrentUser();
  const currentDate = system.getCurrentDate();

  const [pickupSlot, setPickupSlot] = useState('Today Evening (5:00 PM - 7:00 PM)');
  const [pickupNote, setPickupNote] = useState('');
  
  // Mobile notification & SMS alerts
  const [borrowerMobile, setBorrowerMobile] = useState('');
  const [sendSmsAlerts, setSendSmsAlerts] = useState(true);

  // Extra security proof for lender assurance
  const [extraProofType, setExtraProofType] = useState<string>('Government Photo ID');
  const [extraProofNote, setExtraProofNote] = useState<string>('');
  const [securityDepositAck, setSecurityDepositAck] = useState(true);

  const [carePledge, setCarePledge] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const miniMapRef = useRef<HTMLDivElement>(null);

  const locationInfo = item ? getLocationForLocality(item.locality) : null;
  const currentUserLoc = currentUser ? getLocationForLocality(currentUser.getLocality()) : null;
  const distanceMiles = (currentUserLoc && locationInfo)
    ? calculateDistanceMiles(currentUserLoc.lat, currentUserLoc.lng, locationInfo.lat, locationInfo.lng)
    : 0;

  // Prepopulate mobile and extra proof from user profile if available
  useEffect(() => {
    if (currentUser) {
      if (currentUser.getPhone()) {
        setBorrowerMobile(currentUser.getPhone()!);
      }
      if (currentUser.getExtraProofDetails()) {
        setExtraProofNote(currentUser.getExtraProofDetails()!);
      }
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (!isOpen || !item || !locationInfo) return;

    let isMounted = true;
    loadGoogleMaps()
      .then((googleMaps) => {
        if (!isMounted || !miniMapRef.current) return;

        const map = new googleMaps.Map(miniMapRef.current, {
          center: { lat: locationInfo.lat, lng: locationInfo.lng },
          zoom: 15,
          styles: OBSIDIAN_MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: 'cooperative'
        });

        const svgIcon: google.maps.Icon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#f59e0b" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3" fill="#000000"></circle>
            </svg>
          `)}`,
          scaledSize: new googleMaps.Size(32, 32),
          anchor: new googleMaps.Point(16, 32)
        };

        new googleMaps.Marker({
          position: { lat: locationInfo.lat, lng: locationInfo.lng },
          map,
          icon: svgIcon,
          title: `${item.ownerName}'s Pickup Station`
        });
      })
      .catch((err) => {
        console.error('Failed to load mini map in BorrowModal', err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, item, locationInfo]);

  if (!isOpen || !item) return null;

  const rule = CATEGORY_RULES[item.category];
  const dueDate = BorrowService.addDaysToDate(currentDate, rule.defaultDurationDays);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg('Please select an acting neighbor profile to borrow.');
      return;
    }

    if (!borrowerMobile.trim()) {
      setErrorMsg('Please provide your mobile number so the owner can send you pickup notifications.');
      return;
    }

    if (!extraProofNote.trim()) {
      setErrorMsg('Please provide security proof details (e.g. ID number or residence proof) to guarantee security for the lender.');
      return;
    }

    if (!carePledge || !securityDepositAck) {
      setErrorMsg('Please confirm the community care pledge and security terms to proceed.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const record = system.borrowItem(
        item.itemId,
        pickupNote.trim() || undefined,
        pickupSlot,
        borrowerMobile.trim(),
        extraProofType,
        extraProofNote.trim()
      );

      onSuccess(record.getRecordId(), item.title, item.ownerName);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to borrow resource.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141622] border border-[#2B2E42] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#191C2B] border-b border-[#242738] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">Borrow & Secure Request</h3>
              <p className="text-[11px] text-slate-400">Owner alert, mobile SMS & security proof verification</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#252838] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Item Card Summary */}
          <div className="p-4 rounded-2xl bg-[#191B28] border border-[#25283A] space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 font-mono">
                  {item.category}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5 font-mono">{item.title}</h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Ready for Pickup
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
              {item.description}
            </p>

            {/* Accountability rules grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232638] text-[11px]">
              <div className="p-2.5 rounded-xl bg-[#1E2132] border border-[#2B2E44] flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Standard Loan:</span>
                  <span className="text-white font-bold">{rule.defaultDurationDays} Days</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#1E2132] border border-[#2B2E44] flex items-center space-x-2">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Agreed Due Date:</span>
                  <span className="text-amber-300 font-bold font-mono">{dueDate}</span>
                </div>
              </div>
            </div>

            {/* Owner badge */}
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#232638] text-slate-400">
              <div className="flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Owner: <strong className="text-white">{item.ownerName}</strong></span>
              </div>
              <span className="flex items-center text-slate-400">
                <MapPin className="w-3 h-3 text-slate-500 mr-0.5" />
                {item.locality}
              </span>
            </div>
          </div>

          {/* SECTION 1: Mobile Number for Instant Notifications */}
          <div className="p-4 rounded-2xl bg-[#181B28] border border-amber-500/25 space-y-3">
            <div className="flex items-center space-x-2 text-white font-bold text-xs font-mono">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Mobile Phone & Owner Alert Channel *</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              We notify the owner ({item.ownerName}) immediately. Your mobile number will be used to exchange pickup codes and return reminders.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Your Mobile Number (SMS Enabled) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={borrowerMobile}
                  onChange={(e) => setBorrowerMobile(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full bg-[#1F2234] border border-[#2D314A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <label className="flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={sendSmsAlerts}
                onChange={(e) => setSendSmsAlerts(e.target.checked)}
                className="rounded text-amber-500 bg-[#1D1F2B] border-[#2D3043] focus:ring-0"
              />
              <span>Send me SMS dispatch confirmation & return reminders</span>
            </label>
          </div>

          {/* SECTION 2: Lender Security & Extra Proof Guarantee */}
          <div className="p-4 rounded-2xl bg-[#181B28] border border-emerald-500/25 space-y-3">
            <div className="flex items-center space-x-2 text-white font-bold text-xs font-mono">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Lender Security Guarantee & Extra Proof *</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              To safeguard neighbor property and prevent equipment loss, lenders require verified proof before equipment handover.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Type of Security Proof *
                </label>
                <select
                  value={extraProofType}
                  onChange={(e) => setExtraProofType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1F2234] border border-[#2D314A] text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Government Photo ID">Government Photo ID / Driver License</option>
                  <option value="Proof of Address / Utility Bill">Proof of Address / Utility Bill</option>
                  <option value="Neighborhood HOA / Resident Card">Neighborhood HOA / Resident Card</option>
                  <option value="Work / Student Verified Credential">Work / Student Verified Credential</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Proof ID / Document Ref *
                </label>
                <input
                  type="text"
                  required
                  value={extraProofNote}
                  onChange={(e) => setExtraProofNote(e.target.value)}
                  placeholder="e.g. DL-9821 / Apt 4B Electric Bill"
                  className="w-full bg-[#1F2234] border border-[#2D314A] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <label className="flex items-start space-x-2 text-[11px] text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={securityDepositAck}
                onChange={(e) => setSecurityDepositAck(e.target.checked)}
                className="mt-0.5 rounded text-amber-500 bg-[#1D1F2B] border-[#2D3043] focus:ring-0"
              />
              <span className="text-slate-300">
                I agree to present this proof to <strong>{item.ownerName}</strong> upon physical collection if requested.
              </span>
            </label>
          </div>

          {/* Pickup Window Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Select Preferred Pickup Time Window *
            </label>
            <select
              value={pickupSlot}
              onChange={(e) => setPickupSlot(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1D1F2B] border border-[#2D3043] text-white focus:outline-none focus:border-amber-500 text-xs"
            >
              <option value="Today Evening (5:00 PM - 7:00 PM)">Today Evening (5:00 PM - 7:00 PM)</option>
              <option value="Tonight (7:00 PM - 9:00 PM)">Tonight (7:00 PM - 9:00 PM)</option>
              <option value="Tomorrow Morning (9:00 AM - 11:30 AM)">Tomorrow Morning (9:00 AM - 11:30 AM)</option>
              <option value="Tomorrow Afternoon (2:00 PM - 5:00 PM)">Tomorrow Afternoon (2:00 PM - 5:00 PM)</option>
              <option value="Weekend Flexible (Coordinate via Chat)">Weekend Flexible (Coordinate via Chat)</option>
            </select>
          </div>

          {/* Message / Pickup Note to Owner */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span>Pickup Note & Project Details to {item.ownerName}</span>
              <span className="text-slate-400 font-normal text-[10px]">Owner receives instant alert</span>
            </label>
            <textarea
              rows={2}
              value={pickupNote}
              onChange={(e) => setPickupNote(e.target.value)}
              placeholder="e.g. Hi! Mounting bookshelves this weekend. Will pick up on schedule and return in clean condition."
              className="w-full px-3.5 py-2 rounded-xl bg-[#1D1F2B] border border-[#2D3043] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs leading-relaxed"
            />
          </div>

          {/* Google Map Mini Card */}
          {locationInfo && (
            <div className="p-3.5 rounded-xl bg-[#191B26] border border-[#262838] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-white font-mono">Owner Pickup Station</span>
                </div>
                {currentUserLoc && (
                  <span className="text-amber-400 font-mono text-[11px] font-semibold flex items-center">
                    <Navigation className="w-3 h-3 mr-1" />
                    {formatDistance(distanceMiles)}
                  </span>
                )}
              </div>

              <div className="relative h-24 w-full rounded-lg overflow-hidden border border-[#2B2E42]">
                <div ref={miniMapRef} className="w-full h-full" />
              </div>

              <div className="flex items-start justify-between text-[11px] pt-1">
                <div>
                  <p className="text-white font-mono font-medium">{locationInfo.address}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">{locationInfo.pickupZoneNotes}</p>
                </div>

                <a
                  href={getDirectionsUrl(locationInfo.address, locationInfo.lat, locationInfo.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 p-1.5 rounded-lg bg-[#242738] hover:bg-[#2e3248] text-amber-400 hover:text-amber-300 border border-[#35394E] ml-2"
                  title="Open in Google Maps"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Neighborhood Care Pledge */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={carePledge}
                onChange={(e) => setCarePledge(e.target.checked)}
                className="mt-0.5 rounded text-amber-500 bg-[#1D1F2B] border-[#2D3043] focus:ring-0"
              />
              <span className="text-amber-200 leading-relaxed text-[11px]">
                <strong className="text-white">Community Care Pledge:</strong> I agree to return this item to {item.ownerName} in good working order on or before <strong>{dueDate}</strong> to avoid late dues (${rule.dailyFineRate.toFixed(2)}/day).
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl bg-[#222432] hover:bg-[#2C3042] text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Request & Alert Owner</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
