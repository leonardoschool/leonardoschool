'use client';

import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import Button from '@/components/ui/Button';
import { colors } from '@/lib/theme/colors';
import { 
  MessageSquare, 
  X, 
  Send,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface Message {
  id: string;
  senderType: 'ADMIN' | 'STUDENT';
  message: string;
  createdAt: Date;
  isRead: boolean;
}

interface InTestMessagingProps {
  participantId: string;
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onUnreadChange: (count: number) => void;
}

export default function InTestMessaging({ 
  participantId, 
  isOpen, 
  onClose, 
  unreadCount,
  onUnreadChange 
}: InTestMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch messages - polling for near real-time (2 seconds for good balance)
  const messagesQuery = trpc.virtualRoom.getMessages.useQuery(
    { participantId },
    { 
      enabled: !!participantId,
      refetchInterval: 2000, // Poll every 2 seconds - still responsive, 4x less queries
      staleTime: 1500,
    }
  );

  // Send message mutation with optimistic update
  const sendMessage = trpc.virtualRoom.sendMessage.useMutation({
    onMutate: (variables) => {
      // Optimistically add the message to the UI
      if (!variables || typeof variables !== 'object') return;
      const messageText = 'message' in variables ? (variables.message || '') : '';
      if (!messageText) return;
      
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        senderType: 'STUDENT',
        message: messageText,
        createdAt: new Date(),
        isRead: true,
      };
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
    },
    onSuccess: () => {
      setIsSending(false);
      // Refetch to get the real message with proper ID
      messagesQuery.refetch();
    },
    onError: () => {
      setIsSending(false);
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    },
  });

  // Mark messages as read mutation
  const markAsRead = trpc.virtualRoom.markMessagesRead.useMutation({
    onSuccess: () => {
      // Immediately update local unread count to 0
      onUnreadChange(0);
      // Refetch to sync with server
      messagesQuery.refetch();
    },
  });

  // Update messages when query data changes
  useEffect(() => {
    if (messagesQuery.data) {
      const serverMessages = messagesQuery.data.map(m => ({
        id: m.id,
        senderType: m.senderType as 'ADMIN' | 'STUDENT',
        message: m.message,
        createdAt: new Date(m.createdAt),
        isRead: m.isRead,
      }));
      
      // Merge server messages with optimistic messages (temp- prefixed)
      // Keep optimistic messages that don't have a server counterpart yet
      setMessages(prev => {
        const optimisticMessages = prev.filter(m => m.id.startsWith('temp-'));
        // Check if optimistic messages are now in server response
        const stillPendingOptimistic = optimisticMessages.filter(optMsg => {
          // Consider message confirmed if server has a message with same content from same sender within 30 seconds
          return !serverMessages.some(
            serverMsg => 
              serverMsg.senderType === optMsg.senderType && 
              serverMsg.message === optMsg.message &&
              Math.abs(serverMsg.createdAt.getTime() - optMsg.createdAt.getTime()) < 30000
          );
        });
        return [...serverMessages, ...stillPendingOptimistic];
      });
      
      // Update unread count
      const unread = serverMessages.filter(m => m.senderType === 'ADMIN' && !m.isRead).length;
      onUnreadChange(unread);
    }
  }, [messagesQuery.data, onUnreadChange]);

  // Mark admin messages as read when opening or when new messages arrive while open
  useEffect(() => {
    if (isOpen && participantId && unreadCount > 0 && !markAsRead.isPending) {
      markAsRead.mutate({ participantId });
    }
  }, [isOpen, participantId, unreadCount, markAsRead]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim() || isSending) return;
    const messageToSend = newMessage.trim();
    setIsSending(true);
    sendMessage.mutate({
      participantId,
      message: messageToSend,
    });
  }, [newMessage, isSending, participantId, sendMessage]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className={`${colors.primary.gradient} text-white px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Messaggi</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages list */}
        <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
          {messagesQuery.isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <span>Caricamento...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-sm">Nessun messaggio</span>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === 'STUDENT' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.senderType === 'STUDENT'
                      ? 'bg-pink-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {msg.senderType === 'ADMIN' && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Esaminatore</span>
                    </div>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    msg.senderType === 'STUDENT' 
                      ? 'text-white/70' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {formatDistanceToNow(msg.createdAt, { addSuffix: true, locale: it })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Scrivi un messaggio..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              className={`${colors.primary.gradient} px-3`}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Usa questa chat per comunicare con l&apos;esaminatore
          </p>
        </div>
      </div>
    </div>
  );
}

// Floating button component to toggle messages
export function MessagingButton({ 
  onClick, 
  unreadCount 
}: { 
  onClick: () => void; 
  unreadCount: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-4 right-4 z-40 ${colors.primary.gradient} text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow`}
    >
      <MessageSquare className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
