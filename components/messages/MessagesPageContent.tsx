/**
 * MessagesPageContent - Componente condiviso per la pagina messaggi
 * 
 * Utilizzato da Admin, Collaboratori e Studenti per:
 * - Visualizzare le conversazioni
 * - Leggere e inviare messaggi
 * - Contattare altri utenti
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { Portal } from '@/components/ui/Portal';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  User,
  Shield,
  UserCog,
  GraduationCap,
  X,
  Inbox,
  CheckCheck,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MessagesPageContentProps {
  basePath: string;
  userRole: 'ADMIN' | 'COLLABORATOR' | 'STUDENT';
}

type ConversationFilter = 'all' | 'unread' | 'archived';

// Role icon mapping
const getRoleIcon = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return Shield;
    case 'COLLABORATOR':
      return UserCog;
    case 'STUDENT':
      return GraduationCap;
    default:
      return User;
  }
};

// Role label mapping
const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'COLLABORATOR':
      return 'Collaboratore';
    case 'STUDENT':
      return 'Studente';
    default:
      return role;
  }
};

// Role color mapping
const getRoleColor = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    case 'COLLABORATOR':
      return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
    case 'STUDENT':
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30';
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
  }
};

export default function MessagesPageContent({ basePath: _basePath, userRole }: MessagesPageContentProps) {
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get('conversazione');
  const newMessageToUserId = searchParams.get('nuovo');
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [preselectedRecipientId, setPreselectedRecipientId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  
  // Polling interval for real-time updates (10 seconds)
  const POLLING_INTERVAL = 10 * 1000;
  
  // Fetch conversations
  const { 
    data: conversationsData, 
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = trpc.messages.getConversations.useQuery({
    filter,
    pageSize: 50,
  }, {
    refetchInterval: POLLING_INTERVAL,
  });
  
  // Fetch messages for selected conversation
  const { 
    data: messagesData, 
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = trpc.messages.getMessages.useQuery(
    { conversationId: selectedConversationId! },
    { 
      enabled: !!selectedConversationId,
      refetchInterval: POLLING_INTERVAL,
    }
  );
  
  // Send message mutation
  const sendMessageMutation = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage('');
      refetchMessages();
      refetchConversations();
    },
    onError: handleMutationError,
  });
  
  // Archive toggle mutation
  const toggleArchiveMutation = trpc.messages.toggleArchive.useMutation({
    onSuccess: (data) => {
      showSuccess(
        data.isArchived ? 'Conversazione archiviata' : 'Conversazione ripristinata',
        data.isArchived 
          ? 'La conversazione è stata archiviata.' 
          : 'La conversazione è stata ripristinata.'
      );
      refetchConversations();
      if (data.isArchived) {
        setSelectedConversationId(null);
      }
    },
    onError: handleMutationError,
  });
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);
  
  // Handle URL param for conversation
  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversationId(initialConversationId);
    }
  }, [initialConversationId]);
  
  // Handle URL param for new message to specific user
  useEffect(() => {
    if (newMessageToUserId) {
      setPreselectedRecipientId(newMessageToUserId);
      setShowComposeModal(true);
    }
  }, [newMessageToUserId]);
  
  // Filter conversations by search query and unread filter
  const filteredConversations = conversationsData?.conversations.filter(conv => {
    // Apply unread filter (archived is already handled by the API)
    if (filter === 'unread' && conv.unreadCount === 0) return false;
    
    // Apply search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.name?.toLowerCase().includes(query) ||
      conv.otherParticipants.some(p => 
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query)
      )
    );
  }) || [];
  
  const handleSendMessage = async () => {
    if (!selectedConversationId || !newMessage.trim()) return;
    
    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content: newMessage.trim(),
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const formatMessageTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ieri';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('it-IT', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    }
  };
  
  const formatFullDate = (date: Date | string) => {
    return new Date(date).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary}`}>
            Messaggi
          </h1>
          <p className={`mt-1 ${colors.text.secondary}`}>
            {userRole === 'ADMIN' && 'Contatta collaboratori e studenti'}
            {userRole === 'COLLABORATOR' && 'Contatta admin, colleghi e studenti'}
            {userRole === 'STUDENT' && 'Contatta admin e collaboratori'}
          </p>
        </div>
        
        <button
          onClick={() => setShowComposeModal(true)}
          className={`${colors.primary.gradient} text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity`}
        >
          <Plus className="w-5 h-5" />
          Nuovo Messaggio
        </button>
      </div>
      
      {/* Retention Policy Notice */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800`}>
        <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <span className="font-medium">Policy di conservazione:</span> I messaggi archiviati vengono eliminati dopo 90 giorni. 
          Tutti i messaggi vengono rimossi automaticamente dopo 1 anno dalla loro creazione.
        </p>
      </div>
      
      {/* Main Content */}
      <div className={`${colors.background.card} rounded-2xl border ${colors.border.primary} overflow-hidden`}>
        <div className="flex h-[calc(100vh-280px)] min-h-[500px]">
          {/* Conversations List */}
          <div className={`w-full md:w-96 border-r ${colors.border.primary} flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
            {/* Search and Filters */}
            <div className={`p-4 border-b ${colors.border.primary} space-y-3`}>
              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400`} />
                <input
                  type="text"
                  placeholder="Cerca conversazioni..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500`}
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex gap-1">
                {[
                  { value: 'all', label: 'Tutte', icon: Inbox },
                  { value: 'unread', label: 'Non lette', icon: MessageSquare },
                  { value: 'archived', label: 'Archiviate', icon: Archive },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setFilter(tab.value as ConversationFilter)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                        filter === tab.value
                          ? `${colors.primary.bg} text-white`
                          : `${colors.background.secondary} ${colors.text.secondary} hover:opacity-80`
                      }`}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <MessageSquare className={`w-12 h-12 ${colors.text.muted} mb-4`} />
                  <p className={`${colors.text.secondary} text-center`}>
                    {filter === 'archived' 
                      ? 'Nessuna conversazione archiviata'
                      : filter === 'unread'
                        ? 'Nessun messaggio non letto'
                        : 'Nessuna conversazione'}
                  </p>
                  {filter === 'all' && (
                    <button
                      onClick={() => setShowComposeModal(true)}
                      className={`mt-4 ${colors.primary.text} font-medium hover:underline`}
                    >
                      Inizia una nuova conversazione
                    </button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const mainParticipant = conv.otherParticipants[0];
                  const RoleIcon = getRoleIcon(mainParticipant?.role || '');
                  const isSelected = selectedConversationId === conv.id;
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversationId(conv.id)}
                      className={`w-full p-4 text-left border-b ${colors.border.primary} transition-all ${
                        isSelected 
                          ? `${colors.primary.softBg} border-l-4 border-l-[#a8012b]`
                          : `hover:${colors.background.secondary}`
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getRoleColor(mainParticipant?.role || '')}`}>
                          <RoleIcon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-semibold truncate ${colors.text.primary}`}>
                                {mainParticipant?.name || 'Utente'}
                              </span>
                              {conv.otherParticipants.length > 1 && (
                                <span className={`text-xs ${colors.text.muted}`}>
                                  +{conv.otherParticipants.length - 1}
                                </span>
                              )}
                            </div>
                            <span className={`text-xs flex-shrink-0 ${colors.text.muted}`}>
                              {conv.lastMessageAt && formatMessageTime(conv.lastMessageAt)}
                            </span>
                          </div>
                          
                          {/* Subject/Name */}
                          {conv.name && (
                            <p className={`text-sm font-medium truncate ${colors.text.secondary}`}>
                              {conv.name}
                            </p>
                          )}
                          
                          {/* Last message preview */}
                          {conv.lastMessage && (
                            <p className={`text-sm truncate mt-0.5 ${conv.unreadCount > 0 ? colors.text.primary + ' font-medium' : colors.text.muted}`}>
                              {conv.lastMessage.sender.id === mainParticipant?.id ? '' : 'Tu: '}
                              {conv.lastMessage.content.substring(0, 50)}
                              {conv.lastMessage.content.length > 50 ? '...' : ''}
                            </p>
                          )}
                        </div>
                        
                        {/* Unread badge */}
                        {conv.unreadCount > 0 && (
                          <div className={`${colors.primary.bg} text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0`}>
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Messages View */}
          <div className={`flex-1 flex flex-col ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
            {!selectedConversationId ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <MessageSquare className={`w-16 h-16 ${colors.text.muted} mb-4`} />
                <h3 className={`text-xl font-semibold ${colors.text.primary} mb-2`}>
                  Seleziona una conversazione
                </h3>
                <p className={`${colors.text.secondary} text-center max-w-md`}>
                  Scegli una conversazione dalla lista o avvia una nuova chat
                </p>
              </div>
            ) : messagesLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className={`p-4 border-b ${colors.border.primary} flex items-center gap-4`}>
                  {/* Back button (mobile) */}
                  <button
                    onClick={() => setSelectedConversationId(null)}
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {/* Participant info */}
                  <div className="flex items-center gap-3 flex-1">
                    {messagesData?.conversation.otherParticipants[0] && (
                      <>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColor(messagesData.conversation.otherParticipants[0].role)}`}>
                          {(() => {
                            const Icon = getRoleIcon(messagesData.conversation.otherParticipants[0].role);
                            return <Icon className="w-5 h-5" />;
                          })()}
                        </div>
                        <div>
                          <h3 className={`font-semibold ${colors.text.primary}`}>
                            {messagesData.conversation.otherParticipants[0].name}
                          </h3>
                          <p className={`text-sm ${colors.text.muted}`}>
                            {getRoleLabel(messagesData.conversation.otherParticipants[0].role)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <button
                    onClick={() => toggleArchiveMutation.mutate({ conversationId: selectedConversationId })}
                    className={`p-2 rounded-lg ${colors.background.secondary} hover:opacity-80 transition-opacity`}
                    title={filter === 'archived' ? 'Ripristina' : 'Archivia'}
                  >
                    {filter === 'archived' ? (
                      <ArchiveRestore className={`w-5 h-5 ${colors.text.secondary}`} />
                    ) : (
                      <Archive className={`w-5 h-5 ${colors.text.secondary}`} />
                    )}
                  </button>
                </div>
                
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Subject/Title */}
                  {messagesData?.conversation.name && (
                    <div className="text-center mb-6">
                      <span className={`inline-block px-4 py-2 rounded-full ${colors.background.secondary} ${colors.text.secondary} text-sm`}>
                        {messagesData.conversation.name}
                      </span>
                    </div>
                  )}
                  
                  {messagesData?.messages.map((message, index) => {
                    const showDate = index === 0 || 
                      new Date(message.createdAt).toDateString() !== 
                      new Date(messagesData.messages[index - 1].createdAt).toDateString();
                    
                    return (
                      <div key={message.id}>
                        {/* Date separator */}
                        {showDate && (
                          <div className="flex items-center justify-center my-4">
                            <span className={`px-3 py-1 rounded-full ${colors.background.secondary} text-xs ${colors.text.muted}`}>
                              {new Date(message.createdAt).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        
                        {/* Message bubble */}
                        <div className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${message.isMine ? 'order-2' : 'order-1'}`}>
                            {/* Sender name for non-mine messages */}
                            {!message.isMine && (
                              <p className={`text-xs text-gray-500 dark:text-gray-400 mb-1 ml-3`}>
                                {message.senderName}
                              </p>
                            )}
                            
                            <div
                              className={`px-4 py-3 rounded-2xl ${
                                message.isMine
                                  ? `bg-red-100 dark:bg-red-800/50 text-gray-900 dark:text-gray-100 rounded-br-md`
                                  : `bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md`
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
                            
                            {/* Time and status */}
                            <div className={`flex items-center gap-1 mt-1 ${message.isMine ? 'justify-end mr-2' : 'ml-3'}`}>
                              <span className={`text-xs text-gray-500 dark:text-gray-400`}>
                                {formatFullDate(message.createdAt)}
                              </span>
                              {message.isMine && (
                                <CheckCheck className={`w-3.5 h-3.5 text-red-500`} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Message Input */}
                <div className={`p-4 border-t ${colors.border.primary}`}>
                  <div className="flex items-end gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Scrivi un messaggio..."
                      rows={1}
                      className={`flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500`}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className={`${colors.primary.gradient} text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity`}
                    >
                      {isSending ? (
                        <Spinner size="sm" variant="white" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Compose Modal */}
      {showComposeModal && (
        <ComposeMessageModal
          onClose={() => {
            setShowComposeModal(false);
            setPreselectedRecipientId(null);
          }}
          onSuccess={(conversationId) => {
            setShowComposeModal(false);
            setPreselectedRecipientId(null);
            setSelectedConversationId(conversationId);
            refetchConversations();
          }}
          preselectedRecipientId={preselectedRecipientId}
          userRole={userRole}
        />
      )}
    </div>
  );
}

// Group Info component for viewing group details
function GroupInfoPanel({ 
  group, 
  onClose 
}: { 
  group: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    type: string;
    memberCount: number;
    referents: { id: string; name: string; email: string }[];
    members: { id: string; name: string; email: string; role: string }[] | null[];
  };
  onClose: () => void;
}) {
  return (
    <div className={`p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: group.color || '#6366f1' }}
          >
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{group.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {group.memberCount} membri • {group.type === 'STUDENTS' ? 'Solo studenti' : group.type === 'COLLABORATORS' ? 'Solo collaboratori' : 'Misto'}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      
      {group.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{group.description}</p>
      )}
      
      {/* Referenti */}
      {group.referents.length > 0 && (
        <div className="mb-4">
          <h5 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Referenti</h5>
          <div className="space-y-2">
            {group.referents.map(ref => (
              <div key={ref.id} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm text-gray-900 dark:text-gray-100">{ref.name}</span>
                <span className="text-xs text-gray-500">({ref.email})</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Membri */}
      <div>
        <h5 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
          Membri ({group.memberCount})
        </h5>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {group.members.filter(Boolean).map((member) => {
            if (!member) return null;
            const RoleIcon = member.role === 'STUDENT' ? GraduationCap : UserCog;
            return (
              <div key={member.id} className="flex items-center gap-2 py-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  member.role === 'STUDENT' 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                    : 'bg-purple-100 dark:bg-purple-900/30'
                }`}>
                  <RoleIcon className={`w-3 h-3 ${
                    member.role === 'STUDENT' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-purple-600 dark:text-purple-400'
                  }`} />
                </div>
                <span className="text-sm text-gray-900 dark:text-gray-100">{member.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Compose Message Modal Component
function ComposeMessageModal({
  onClose,
  onSuccess,
  preselectedRecipientId,
  userRole,
}: {
  onClose: () => void;
  onSuccess: (conversationId: string) => void;
  preselectedRecipientId?: string | null;
  userRole: 'ADMIN' | 'COLLABORATOR' | 'STUDENT';
}) {
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(
    preselectedRecipientId ? [preselectedRecipientId] : []
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'COLLABORATOR' | 'STUDENT'>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [recipientType, setRecipientType] = useState<'users' | 'groups'>('users');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();
  
  // Fetch contactable users
  const { data: users, isLoading: usersLoading } = trpc.messages.getContactableUsers.useQuery();
  
  // Fetch contactable groups (only for admin and collaborator)
  const { data: groups, isLoading: groupsLoading } = trpc.messages.getContactableGroups.useQuery(
    undefined,
    { enabled: userRole !== 'STUDENT' }
  );
  
  // Create conversation mutation
  const createConversationMutation = trpc.messages.createConversation.useMutation({
    onSuccess: (data) => {
      showSuccess('Messaggio inviato', 'Il tuo messaggio è stato inviato con successo.');
      onSuccess(data.conversationId);
    },
    onError: handleMutationError,
  });
  
  // Filter users by search and role
  const filteredUsers = users?.filter(user => {
    // Role filter
    if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
    
    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  }) || [];
  
  // Filter groups by search
  const filteredGroups = groups?.filter(group => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return group.name.toLowerCase().includes(query);
  }) || [];
  
  // Count by role for badges
  const rolesCounts = {
    ALL: users?.length || 0,
    ADMIN: users?.filter(u => u.role === 'ADMIN').length || 0,
    COLLABORATOR: users?.filter(u => u.role === 'COLLABORATOR').length || 0,
    STUDENT: users?.filter(u => u.role === 'STUDENT').length || 0,
  };
  
  const handleToggleRecipient = (userId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const handleToggleGroup = (groupId: string) => {
    // When selecting a group, add all its members to recipients
    const group = groups?.find(g => g.id === groupId);
    if (!group) return;
    
    const memberIds = group.members
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map(m => m.id);
    
    if (selectedGroupIds.includes(groupId)) {
      // Deselect group and its members
      setSelectedGroupIds(prev => prev.filter(id => id !== groupId));
      setSelectedRecipients(prev => prev.filter(id => !memberIds.includes(id)));
    } else {
      // Select group and add its members
      setSelectedGroupIds(prev => [...prev, groupId]);
      setSelectedRecipients(prev => [...new Set([...prev, ...memberIds])]);
    }
  };
  
  const handleSelectAll = () => {
    const allFilteredIds = filteredUsers.map(u => u.id);
    const allSelected = allFilteredIds.every(id => selectedRecipients.includes(id));
    
    if (allSelected) {
      // Deselect all filtered
      setSelectedRecipients(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      // Select all filtered
      setSelectedRecipients(prev => [...new Set([...prev, ...allFilteredIds])]);
    }
  };
  
  const handleSend = async () => {
    if (selectedRecipients.length === 0 || !subject.trim() || !content.trim()) return;
    
    setIsSending(true);
    try {
      // Send to all selected recipients
      for (const recipientId of selectedRecipients) {
        await createConversationMutation.mutateAsync({
          recipientId,
          subject: subject.trim(),
          content: content.trim(),
        });
      }
    } finally {
      setIsSending(false);
    }
  };
  
  const selectedUsers = users?.filter(u => selectedRecipients.includes(u.id)) || [];
  const selectedGroups = groups?.filter(g => selectedGroupIds.includes(g.id)) || [];
  const canShowGroups = userRole !== 'STUDENT' && (groups?.length || 0) > 0;
  
  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className={`${colors.background.card} rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl`}>
          {/* Header */}
          <div className={`p-6 border-b ${colors.border.primary} flex items-center justify-between`}>
            <h2 className={`text-xl font-bold ${colors.text.primary}`}>
              Nuovo Messaggio
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Recipient Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100`}>
                Destinatari {selectedRecipients.length > 0 && `(${selectedRecipients.length} selezionati)`}
              </label>
              
              {/* Selected Recipients & Groups */}
              {(selectedUsers.length > 0 || selectedGroups.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Selected Groups */}
                  {selectedGroups.map(group => (
                    <div 
                      key={`group-${group.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium">{group.name}</span>
                      <span className="text-xs opacity-70">({group.memberCount})</span>
                      <button
                        onClick={() => handleToggleGroup(group.id)}
                        className="hover:opacity-70"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {/* Selected individual users (not part of selected groups) */}
                  {selectedUsers
                    .filter(user => !selectedGroups.some(g => 
                      g.members.some(m => m?.id === user.id)
                    ))
                    .map(user => {
                      const RoleIcon = getRoleIcon(user.role);
                      return (
                        <div 
                          key={user.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getRoleColor(user.role)}`}
                        >
                          <RoleIcon className="w-3.5 h-3.5" />
                          <span className="text-sm font-medium">{user.name}</span>
                          <button
                            onClick={() => handleToggleRecipient(user.id)}
                            className="hover:opacity-70"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
              
              {/* Tabs: Utenti / Gruppi */}
              {canShowGroups && (
                <div className="flex gap-1 mb-3">
                  <button
                    onClick={() => setRecipientType('users')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      recipientType === 'users'
                        ? `${colors.primary.bg} text-white`
                        : `bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300`
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Utenti
                  </button>
                  <button
                    onClick={() => setRecipientType('groups')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      recipientType === 'groups'
                        ? `${colors.primary.bg} text-white`
                        : `bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300`
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Gruppi
                    {(groups?.length || 0) > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        recipientType === 'groups' ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'
                      }`}>
                        {groups?.length}
                      </span>
                    )}
                  </button>
                </div>
              )}
              
              {/* Users Tab Content */}
              {recipientType === 'users' && (
                <>
                  {/* Role Filter Tabs */}
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {[
                      { value: 'ALL' as const, label: 'Tutti', count: rolesCounts.ALL },
                      { value: 'ADMIN' as const, label: 'Admin', count: rolesCounts.ADMIN, icon: Shield },
                      { value: 'COLLABORATOR' as const, label: 'Collaboratori', count: rolesCounts.COLLABORATOR, icon: UserCog },
                      { value: 'STUDENT' as const, label: 'Studenti', count: rolesCounts.STUDENT, icon: GraduationCap },
                    ].map((tab) => {
                      if (tab.count === 0) return null;
                      return (
                        <button
                          key={tab.value}
                          onClick={() => setRoleFilter(tab.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                            roleFilter === tab.value
                              ? `${colors.primary.bg} text-white`
                              : `bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:opacity-80`
                          }`}
                        >
                          {tab.icon && <tab.icon className="w-3 h-3" />}
                          {tab.label}
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            roleFilter === tab.value
                              ? 'bg-white/20'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400`} />
                    <input
                      type="text"
                      placeholder="Cerca per nome o email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500`}
                    />
                  </div>
                  
                  {/* Select All Button */}
                  {filteredUsers.length > 0 && (
                    <button
                      onClick={handleSelectAll}
                      className={`text-xs font-medium mb-2 ${colors.primary.text} hover:underline`}
                    >
                      {filteredUsers.every(u => selectedRecipients.includes(u.id))
                        ? 'Deseleziona tutti'
                        : `Seleziona tutti (${filteredUsers.length})`
                      }
                    </button>
                  )}
                  
                  {/* Users List */}
                  <div className={`max-h-40 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700`}>
                    {usersLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Spinner size="md" />
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-gray-500 dark:text-gray-400">Nessun utente trovato</p>
                      </div>
                    ) : (
                      filteredUsers.map((user) => {
                        const RoleIcon = getRoleIcon(user.role);
                        const isSelected = selectedRecipients.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            onClick={() => handleToggleRecipient(user.id)}
                            className={`w-full p-3 flex items-center gap-3 transition-colors border-b last:border-b-0 border-gray-100 dark:border-gray-800 ${
                              isSelected 
                                ? 'bg-red-50 dark:bg-red-900/20' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getRoleColor(user.role)}`}>
                              <RoleIcon className="w-4 h-4" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className={`font-medium text-gray-900 dark:text-gray-100 truncate`}>{user.name}</p>
                              <p className={`text-xs text-gray-500 dark:text-gray-400 truncate`}>{user.email}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected 
                                ? 'border-red-500 bg-red-500' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isSelected && <CheckCheck className="w-3 h-3 text-white" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
              
              {/* Groups Tab Content */}
              {recipientType === 'groups' && (
                <>
                  {/* Search Groups */}
                  <div className="relative mb-3">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400`} />
                    <input
                      type="text"
                      placeholder="Cerca gruppo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500`}
                    />
                  </div>
                  
                  {/* Groups List */}
                  <div className={`max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700`}>
                    {groupsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Spinner size="md" />
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-gray-500 dark:text-gray-400">Nessun gruppo trovato</p>
                      </div>
                    ) : (
                      filteredGroups.map((group) => {
                        const isSelected = selectedGroupIds.includes(group.id);
                        const isExpanded = expandedGroupId === group.id;
                        return (
                          <div key={group.id} className="border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                            <div className={`p-3 flex items-center gap-3 transition-colors ${
                              isSelected 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}>
                              <button
                                onClick={() => handleToggleGroup(group.id)}
                                className="flex items-center gap-3 flex-1"
                              >
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: group.color || '#6366f1' }}
                                >
                                  <Users className="w-4 h-4 text-white" />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                  <p className={`font-medium text-gray-900 dark:text-gray-100 truncate`}>{group.name}</p>
                                  <p className={`text-xs text-gray-500 dark:text-gray-400`}>
                                    {group.memberCount} membri
                                  </p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected 
                                    ? 'border-indigo-500 bg-indigo-500' 
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSelected && <CheckCheck className="w-3 h-3 text-white" />}
                                </div>
                              </button>
                              <button
                                onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                                title="Visualizza dettagli gruppo"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                            
                            {/* Expanded Group Info */}
                            {isExpanded && (
                              <div className="px-3 pb-3">
                                <GroupInfoPanel 
                                  group={group} 
                                  onClose={() => setExpandedGroupId(null)} 
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* Subject */}
            <div>
              <label className={`block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100`}>
                Oggetto
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Inserisci l'oggetto del messaggio..."
                maxLength={200}
                className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500`}
              />
            </div>
            
            {/* Content */}
            <div>
              <label className={`block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100`}>
                Messaggio
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Scrivi il tuo messaggio..."
                rows={6}
                maxLength={5000}
                className={`w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500`}
              />
              <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1 text-right`}>
                {content.length}/5000 caratteri
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <div className={`p-6 border-t ${colors.border.primary} flex gap-3`}>
            <button
              onClick={onClose}
              className={`flex-1 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:opacity-80 transition-opacity`}
            >
              Annulla
            </button>
            <button
              onClick={handleSend}
              disabled={selectedRecipients.length === 0 || !subject.trim() || !content.trim() || isSending}
              className={`flex-1 ${colors.primary.gradient} text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
            >
              {isSending ? (
                <>
                  <Spinner size="sm" variant="white" />
                  Invio...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Invia {selectedRecipients.length > 1 ? `a ${selectedRecipients.length}` : 'Messaggio'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
