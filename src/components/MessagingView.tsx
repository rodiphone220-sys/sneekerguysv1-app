import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Search, MessageSquare, Clock, CheckCheck, Bot, Sparkles, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { SystemSettings } from '../types';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface ChatState {
  isFirstMessage: boolean;
  isWaitingForSatisfaction: boolean;
  lastInteractionTime: number;
}

interface User {
  id: string;
  nombre: string;
  email: string;
  rol?: string;
  activo?: boolean;
  unreadCount?: number;
}

interface Chat {
  id: string;
  userName: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  online: boolean;
}

const getAi = async (messages: { role: string; content: string }[], systemPrompt: string) => {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt, provider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct' })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI error');
  return data.response;
};

export function MessagingView({ settings }: { settings: SystemSettings }) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [chatStates, setChatStates] = useState<Record<string, ChatState>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [currentUser, setCurrentUser] = useState<{id: string, name: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('sneaker_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser({ id: user.id || user.idCode || 'user', name: user.nombre || 'Usuario' });
    }
  }, []);

  // Load users from Google Sheets
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch('/api/customers');
        if (res.ok) {
          const data = await res.json();
          const users = data.map((u: any, idx: number) => ({
            id: u.ID_USUARIO || u.id || `USER-${idx}`,
            nombre: u.NOMBRE || u.name || 'Usuario sin nombre',
            email: u.EMAIL || u.email || '',
            rol: u.ROL || u.role || 'USUARIO',
            activo: u.ACTIVO === 'TRUE'
          })).filter((u: User) => u.nombre && u.nombre !== 'Usuario sin nombre');
          setAllUsers(users);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  // Load messages from Sheets
  const loadMessages = async () => {
    try {
      const res = await fetch('/api/messaging');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const grouped: Record<string, Message[]> = {};
          const unreadCounts: Record<string, number> = {};
          
          data.forEach((msg: any) => {
            const senderId = msg.EMISOR_ID || '';
            const receiverId = msg.RECEPTOR_ID || '';
            const isUnread = msg.LEIDO !== 'TRUE';
            
            // Count unread for each user
            if (isUnread && receiverId === currentUser?.id) {
              unreadCounts[senderId] = (unreadCounts[senderId] || 0) + 1;
            }
            
            const chatKey = senderId === currentUser?.id ? receiverId : senderId;
            if (!grouped[chatKey]) grouped[chatKey] = [];
            grouped[chatKey].push({
              id: msg.ID_MENSAJE || msg.id,
              senderId: senderId,
              senderName: msg.EMISOR_NOMBRE || 'Usuario',
              content: msg.MENSAJE || '',
              timestamp: msg.FECHA || '',
              read: msg.LEIDO === 'TRUE'
            });
          });
          
          setAllMessages(grouped);
          
          // Update users with unread counts
          setAllUsers(prev => prev.map(u => ({
            ...u,
            unreadCount: unreadCounts[u.id] || 0
          })));
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Mark messages as read
  const markAsRead = async (userId: string) => {
    try {
      await fetch('/api/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markRead',
          emisorId: userId,
          receptorId: currentUser?.id
        })
      });
      // Update local state
      setAllUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, unreadCount: 0 } : u
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedUserId]);

  // Filter users based on search
  const filteredUsers = allUsers.filter(user => 
    !searchQuery || 
    user.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.rol || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get messages for selected user
  const messages = selectedUserId ? (allMessages[selectedUserId] || []) : [];
  const activeUser = allUsers.find(u => u.id === selectedUserId);

  // Send message function
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedUserId || !currentUser?.id) return;
    if (!allUsers.find(u => u.id === selectedUserId)) {
      console.error('Invalid recipient');
      return;
    }

    const userName = currentUser?.name || 'Usuario';
    
    // Save to Google Sheets
    try {
      const res = await fetch('/api/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emisorId: currentUser?.id || 'user',
          emisorNombre: userName,
          receptorId: selectedUserId,
          mensaje: messageText,
          tipo: 'internal'
        })
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Send error:', err);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }

    // Add to local state
    const newMessage: Message = {
      id: `MSG-${Date.now()}`,
      senderId: currentUser?.id || 'me',
      senderName: userName,
      content: messageText,
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

setAllMessages(prev => {
        const key = selectedUserId || 'temp';
        return {
          ...prev,
          [key]: [...(prev[key] || []), newMessage]
        };
      });

    setMessageText('');
  };

  // AI response handler
  const handleAiResponse = async (text: string) => {
    if (!settings?.isAiAssistantEnabled) return;
    setIsAiLoading(true);
    try {
      const response = await getAi(
        [{ role: 'user', content: text }],
        settings.aiPrimaryPrompt
      );
      const botMsg: Message = {
        id: `AI-${Date.now()}`,
        senderId: 'ai',
        senderName: 'Asistente AI',
        content: response || 'Lo siento, hubo un error.',
        timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        read: false
      };
      setAllMessages(prev => {
        const key = selectedUserId || 'temp';
        return {
          ...prev,
          [key]: [...(prev[key] || []), botMsg]
        };
      });
    } catch (error) {
      console.error('AI error:', error);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-brand-surface rounded-2xl border border-brand-border overflow-hidden shadow-sm">
      {/* Sidebar: User List */}
      <div className="w-80 border-r border-brand-border flex flex-col bg-brand-bg/50">
        <div className="p-4 border-b border-brand-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar usuarios..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-ink transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingUsers ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin mx-auto text-brand-muted" size={24} />
              <p className="text-xs text-brand-muted mt-2">Cargando usuarios...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-brand-muted">No se encontraron usuarios</p>
            </div>
          ) : (
            filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => {
                  setSelectedUserId(user.id);
                  if (user.unreadCount && user.unreadCount > 0) {
                    markAsRead(user.id);
                  }
                }}
                className={cn(
                  "w-full p-4 flex items-center gap-3 transition-all border-l-4",
                  selectedUserId === user.id 
                    ? "bg-brand-ink border-l-brand-accent" 
                    : "bg-transparent border-l-transparent hover:bg-brand-border/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs",
                  selectedUserId === user.id ? "bg-brand-surface text-brand-ink" : "bg-brand-ink text-white"
                )}>
                  {user.nombre.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "font-semibold text-xs",
                      selectedUserId === user.id ? "text-white" : "text-brand-ink"
                    )}>
                      {user.nombre}
                    </span>
                    {user.unreadCount && user.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-[#E11D48] text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                        {user.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px]",
                    selectedUserId === user.id ? "text-gray-400" : "text-brand-muted"
                  )}>
                    {user.rol || 'Usuario'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-brand-bg">
        {!selectedUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-brand-surface rounded-full flex items-center justify-center mb-6 border border-brand-border">
              <MessageSquare size={32} className="text-brand-muted" />
            </div>
            <h3 className="text-lg font-bold text-brand-ink mb-2">Selecciona un usuario</h3>
            <p className="text-sm text-brand-muted max-w-xs">
              Elige una conversación de la lista para comenzar a enviar mensajes internos.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 bg-brand-surface border-b border-brand-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-ink rounded-full flex items-center justify-center text-brand-bg font-bold text-[10px]">
                  {activeUser?.nombre.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-brand-ink">{activeUser?.nombre}</h3>
                  <p className="text-[9px] text-green-500 font-bold uppercase">En línea</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUserId(null)}
                className="text-brand-muted hover:text-brand-ink"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-brand-muted italic">No hay mensajes aún. ¡Inicia la conversación!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.senderId === currentUser?.id || msg.senderId === 'me';
                  return (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[70%]",
                        isMine ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      {msg.senderId === 'ai' && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Bot size={10} className="text-brand-accent" />
                          <span className="text-[8px] font-bold uppercase text-brand-accent">AI</span>
                        </div>
                      )}
                      <div className={cn(
                        "p-3 rounded-2xl text-[11px] font-medium",
                        isMine 
                          ? "bg-brand-ink text-brand-bg rounded-tr-none" 
                          : msg.senderId === 'ai'
                            ? "bg-brand-accent/10 text-brand-ink border border-brand-accent/20 rounded-tl-none italic"
                            : "bg-brand-surface text-brand-ink border border-brand-border rounded-tl-none"
                      )}>
                        {msg.content}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[9px] text-brand-muted">{msg.timestamp}</span>
                        {isMine && (
                          <CheckCheck size={12} className={msg.read ? "text-blue-500" : "text-brand-muted"} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-brand-surface border-t border-brand-border">
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Escribe un mensaje interno..."
                  className="flex-1 px-4 py-3 bg-brand-bg border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-ink"
                />
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || !selectedUserId}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    messageText.trim() && selectedUserId
                      ? "bg-brand-ink text-brand-bg shadow-lg" 
                      : "bg-brand-border text-brand-muted"
                  )}
                >
                  <Send size={16} />
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}