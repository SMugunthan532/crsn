import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, ShieldCheck } from 'lucide-react';
import { DirectMessageDTO } from '../types';
import { CRSNSystem } from '../engine/CRSNSystem';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  peerName: string;
  peerId?: string;
  itemTitle?: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  peerName,
  peerId,
  itemTitle
}) => {
  const system = CRSNSystem.getInstance();
  const currentUser = system.getCurrentUser();
  const [messages, setMessages] = useState<DirectMessageDTO[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = () => {
    if (conversationId) {
      const msgs = system.notificationService.getMessagesForConversation(conversationId);
      setMessages(msgs);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !currentUser) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const recipient = peerId || (conversationId.startsWith('U') ? conversationId : 'U101');
    system.notificationService.sendMessage(
      conversationId,
      currentUser.getUserId(),
      currentUser.getName(),
      recipient,
      text
    );
    setInputText('');
    loadMessages();
    system.notify();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#151720] border border-[#2D3043] rounded-2xl max-w-lg w-full flex flex-col h-[560px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#1B1D28] border-b border-[#242636] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
              {peerName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white font-mono">{peerName}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#242738] text-slate-300 font-mono">
                  Neighbor
                </span>
              </div>
              {itemTitle && (
                <p className="text-xs text-slate-400 truncate max-w-[280px]">
                  Exchange: <span className="text-white font-medium">{itemTitle}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#252838] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Coordination Banner */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-300 flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>Coordinate porch drop-off, gate access, power cords, and return times directly.</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#11121A]">
          {messages.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-slate-300 font-mono">No messages in this exchange yet.</p>
              <p className="text-[11px] text-slate-500">Send a note to coordinate pickup logistics!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === currentUser.getUserId();
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-500 mb-1 px-1">
                    {isMe ? 'You' : m.senderName} • {m.timestamp.split(' ')[1] || m.timestamp}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      isMe
                        ? 'bg-amber-500 text-black font-medium rounded-br-xs shadow-sm'
                        : 'bg-[#1E202E] text-slate-100 rounded-bl-xs border border-[#2B2E42]'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input form */}
        <form onSubmit={handleSend} className="p-3 bg-[#181924] border-t border-[#242636] flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a pickup note or message..."
            className="flex-1 bg-[#12131C] border border-[#2D3043] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
