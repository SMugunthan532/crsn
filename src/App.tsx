/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CRSNSystem } from './engine/CRSNSystem';
import { Navbar, MainAppView } from './components/Navbar';
import { ModernPortal } from './components/ModernPortal';
import { CommunityWishlist } from './components/CommunityWishlist';
import { ImpactDashboard } from './components/ImpactDashboard';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ChatModal } from './components/ChatModal';
import { AuthModal } from './components/AuthModal';
import { UserDTO, NotificationDTO, ItemDTO, BorrowRecordDTO } from './types';
import { ShieldCheck } from 'lucide-react';
import { auth, onAuthStateChanged } from './firebase';

export default function App() {
  const system = CRSNSystem.getInstance();
  const [currentView, setCurrentView] = useState<MainAppView>('catalog');
  const [currentDate, setCurrentDate] = useState<string>(system.getCurrentDate());
  const [users, setUsers] = useState<UserDTO[]>(() =>
    system.userService.getAllUsers().map(u => u.toDTO())
  );
  const [items, setItems] = useState<ItemDTO[]>(() =>
    system.itemService.getAllItems().map(i => i.toDTO())
  );
  const [records, setRecords] = useState<BorrowRecordDTO[]>(() =>
    system.borrowService.getAllRecords().map(r => r.toDTO())
  );

  // Auth & Verification Modal
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    mode: 'login' | 'register' | 'verify';
  }>({
    isOpen: false,
    mode: 'login'
  });

  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false);
  const [userNotifications, setUserNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Chat Modal state
  const [chatState, setChatState] = useState<{
    isOpen: boolean;
    conversationId: string;
    peerName: string;
    peerId?: string;
    itemTitle?: string;
  }>({
    isOpen: false,
    conversationId: '',
    peerName: ''
  });

  // Add Item Modal state
  const [showAddModal, setShowAddModal] = useState(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        system.registerOrSyncFirebaseUser({
          uid: fbUser.uid,
          displayName: fbUser.displayName,
          email: fbUser.email,
          emailVerified: fbUser.emailVerified
        });
      }
      refreshState();
    });
    return () => unsubscribe();
  }, []);

  // Refresh reactive state from CRSNSystem
  const refreshState = () => {
    const user = system.getCurrentUser();
    setCurrentDate(system.getCurrentDate());
    setUsers(system.userService.getAllUsers().map(u => u.toDTO()));
    setItems(system.itemService.getAllItems().map(i => i.toDTO()));
    setRecords(system.borrowService.getAllRecords().map(r => r.toDTO()));

    if (user) {
      const notifs = system.notificationService.getNotificationsForUser(user.getUserId());
      setUserNotifications(notifs);
      setUnreadCount(system.notificationService.getUnreadCount(user.getUserId()));
    } else {
      setUserNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    refreshState();
    const unsubscribe = system.subscribe(() => {
      refreshState();
    });
    return unsubscribe;
  }, []);

  const handleAdvanceDays = (days: number) => {
    system.advanceDays(days);
  };

  const handleResetData = () => {
    system.resetToDefaults();
  };

  const handleOpenChat = (conversationId: string, peerName: string, itemTitle?: string) => {
    setChatState({
      isOpen: true,
      conversationId,
      peerName,
      itemTitle
    });
    setShowNotifications(false);
  };

  return (
    <div className="min-h-screen bg-[#0D0E12] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black antialiased">
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        users={users}
        currentDate={currentDate}
        onAdvanceDays={handleAdvanceDays}
        onResetData={handleResetData}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenNewListing={() => setShowAddModal(true)}
        onOpenAuth={(mode = 'login') => setAuthModalState({ isOpen: true, mode })}
        unreadCount={unreadCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {(currentView === 'catalog' || currentView === 'my-loans' || currentView === 'map') && (
          <ModernPortal
            currentView={currentView}
            onViewChange={setCurrentView}
            onOpenChatWith={handleOpenChat}
            showAddModal={showAddModal}
            setShowAddModal={setShowAddModal}
          />
        )}

        {currentView === 'wishlist' && (
          <CommunityWishlist
            onOpenChat={handleOpenChat}
            onShareItem={() => {
              setCurrentView('catalog');
              setShowAddModal(true);
            }}
          />
        )}

        {currentView === 'impact' && (
          <ImpactDashboard items={items} records={records} />
        )}
      </main>

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={userNotifications}
        onOpenChat={handleOpenChat}
      />

      {/* Direct Chat / Pickup Modal */}
      <ChatModal
        isOpen={chatState.isOpen}
        onClose={() => setChatState(prev => ({ ...prev, isOpen: false }))}
        conversationId={chatState.conversationId}
        peerName={chatState.peerName}
        peerId={chatState.peerId}
        itemTitle={chatState.itemTitle}
      />

      {/* Firebase Authentication & User Verification Modal */}
      <AuthModal
        isOpen={authModalState.isOpen}
        onClose={() => setAuthModalState(prev => ({ ...prev, isOpen: false }))}
        defaultMode={authModalState.mode}
      />

      {/* Structured Dark Footer */}
      <footer className="border-t border-[#22242F] bg-[#121318] py-6 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white font-mono">
              Community Resource Sharing Network (CRSN)
            </span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-400 hidden md:inline">
              Peer-to-peer accountability, instant notifications & community circularity
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
            <span>Instant Owner Alerts</span>
            <span>•</span>
            <span>Zero Fees on Time</span>
            <span>•</span>
            <span>4.9★ Trust Index</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
