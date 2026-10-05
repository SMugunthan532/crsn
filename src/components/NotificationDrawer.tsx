import React from 'react';
import { 
  Bell, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  Star, 
  CheckCircle2, 
  PackageCheck,
  X,
  Phone,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { NotificationDTO } from '../types';
import { CRSNSystem } from '../engine/CRSNSystem';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationDTO[];
  onSelectNotification?: (notif: NotificationDTO) => void;
  onOpenChat?: (recordId: string, peerName: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectNotification,
  onOpenChat
}) => {
  const system = CRSNSystem.getInstance();
  const currentUser = system.getCurrentUser();

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    if (currentUser) {
      system.notificationService.markAllAsRead(currentUser.getUserId());
      system.notify();
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    system.notificationService.deleteNotification(id);
    system.notify();
  };

  const getIcon = (type: NotificationDTO['type']) => {
    switch (type) {
      case 'BORROW_REQUEST':
        return <PackageCheck className="w-4 h-4 text-amber-400" />;
      case 'BORROW_CONFIRMED':
        return <CheckCircle2 className="w-4 h-4 text-amber-300" />;
      case 'ITEM_RETURNED':
        return <CheckCircle2 className="w-4 h-4 text-slate-300" />;
      case 'DUE_SOON':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'OVERDUE':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'RATING_RECEIVED':
        return <Star className="w-4 h-4 text-amber-400 fill-amber-400" />;
      case 'CHAT_MESSAGE':
        return <MessageSquare className="w-4 h-4 text-slate-300" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#141620] border-l border-[#242636] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 bg-[#1A1C28] border-b border-[#242636] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">Neighborhood Alerts</h3>
                <p className="text-[11px] text-slate-400">
                  {notifications.filter(n => !n.read).length} unread alerts
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {notifications.some(n => !n.read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-[#222434] border border-[#31354A]"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#222434] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#11121A]">
            {notifications.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#1B1D2B] border border-[#27293A] flex items-center justify-center mx-auto text-slate-500">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-white font-mono">All caught up!</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  When neighbors borrow your resources, send mobile pickup alerts, or present security proof, notifications appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) {
                      system.notificationService.markAsRead(n.id);
                      system.notify();
                    }
                    if (onSelectNotification) onSelectNotification(n);
                  }}
                  className={`p-3.5 rounded-xl border transition cursor-pointer relative group ${
                    !n.read 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-[#181A25] border-[#252838] hover:border-[#35394E]'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 p-2 rounded-lg bg-[#202230] border border-[#2D3044] shrink-0">
                      {getIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate font-mono">{n.title}</h4>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-1" />
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>

                      {/* Extra Security Proof & Mobile Details Badge if available */}
                      {(n.borrowerMobile || n.extraProofType || n.pickupSlot) && (
                        <div className="mt-2 p-2.5 rounded-lg bg-[#141520] border border-[#25283A] text-[11px] space-y-1.5">
                          {n.pickupSlot && (
                            <div className="flex items-center text-slate-300">
                              <Clock className="w-3 h-3 text-amber-400 mr-1.5 shrink-0" />
                              <span>Pickup Window: <strong className="text-white">{n.pickupSlot}</strong></span>
                            </div>
                          )}

                          {n.borrowerMobile && (
                            <div className="flex items-center text-emerald-300">
                              <Smartphone className="w-3 h-3 text-emerald-400 mr-1.5 shrink-0" />
                              <span>Borrower Mobile: <strong className="font-mono text-white">{n.borrowerMobile}</strong></span>
                              <span className="text-[9px] px-1 py-0.2 ml-2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                                SMS ALERT SENT
                              </span>
                            </div>
                          )}

                          {n.extraProofType && (
                            <div className="flex items-center text-amber-300">
                              <ShieldCheck className="w-3 h-3 text-amber-400 mr-1.5 shrink-0" />
                              <span>Security Proof: <strong className="text-white">{n.extraProofType}</strong> {n.extraProofNote ? `(${n.extraProofNote})` : ''}</span>
                            </div>
                          )}

                          {n.pickupNote && (
                            <p className="text-slate-400 italic pt-0.5 border-t border-[#232534]">
                              "{n.pickupNote}"
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-mono">{n.timestamp}</span>

                        {n.recordId && onOpenChat && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenChat(n.recordId!, n.senderName || 'Neighbor');
                            }}
                            className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Reply / Direct Chat</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delete action */}
                    <button
                      onClick={(e) => handleDelete(n.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition p-1"
                      title="Remove alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
