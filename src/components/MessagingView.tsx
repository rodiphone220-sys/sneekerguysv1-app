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
  const [currentUser, setCurrentUser] = useState<{id: string, name: string, email?: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('sneaker_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser({ id: user.id || user.idCode || 'user', name: user.nombre || user.name || 'Usuario', email: user.email });
    }
  }, []);

  // Load users from Google Sheets - staff from USUARIOS sheet
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Load staff from USUARIOS sheet (team members)
        const usersRes = await fetch('/api/auth?all=true');
        const usersData = usersRes.ok ? await usersRes.json() : [];
        
        // If usersData is not an array, handle it
        const staffUsers = Array.isArray(usersData) ? usersData : [];
        
        // Also get users from messages
        const msgRes = await fetch('/api/messaging');
        const messages = msgRes.ok ? await msgRes.json() : [];
        
        // Extract unique users from messages
        const messageUsers = new Map();
        messages.forEach((msg: any) => {
          if (msg.EMISOR_ID && !messageUsers.has(msg.EMISOR_ID)) {
            const parts = (msg.EMISOR_NOMBRE || msg.EMISOR_ID).split(' ');
            const rol = msg.EMISOR_ROL || (msg.EMISOR_ID?.startsWith('USR-') ? 'USUARIO' : 'CLIENTE');
            messageUsers.set(msg.EMISOR_ID, {
              id: msg.EMISOR_ID,
              nombre: msg.EMISOR_NOMBRE || msg.EMISOR_ID,
              email: '',
              rol: rol
            });
          }
          if (msg.RECEPTOR_ID && !messageUsers.has(msg.RECEPTOR_ID)) {
            const parts = (msg.RECEPTOR_NOMBRE || msg.RECEPTOR_ID).split(' ');
            const rol = msg.RECEPTOR_ROL || (msg.RECEPTOR_ID?.startsWith('USR-') ? 'USUARIO' : 'CLIENTE');
            messageUsers.set(msg.RECEPTOR_ID, {
              id: msg.RECEPTOR_ID,
              nombre: msg.RECEPTOR_NOMBRE || msg.RECEPTOR_ID,
              email: '',
              rol: rol
            });
          }
        });
        
        // Combine staff users with message users
        const allUsersList = [...Array.from(messageUsers.values())];
        
        // Add staff from auth endpoint if available
        if (staffUsers.length > 0) {
          staffUsers.forEach((u: any) => {
            const id = u.id || u.ID_USUARIO;
            if (id && !allUsersList.find((existing: any) => existing.id === id)) {
              allUsersList.push({
                id: id,
                nombre: u.nombre || u.NOMBRE || u.name || 'Usuario',
                email: u.email || u.EMAIL || '',
                rol: u.rol || u.ROL || 'USUARIO'
              });
            }
          });
        }
        
        // Filter out current user and keep only internal users
        const filtered = allUsersList.filter((u: any) => 
          u.id !== currentUser?.id && 
          (u.rol === 'USUARIO' || u.rol === 'MASTER 1' || u.rol === 'MASTER 2' || u.rol === 'VENTAS' || u.rol === 'CONTABILIDAD' || u.id?.startsWith('USR-'))
        );
        
        setAllUsers(filtered);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    loadUsers();
  }, [currentUser?.id]);

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
            
// Use the formatted date from API or fallback
            const timestamp = msg.FECHA_DISPLAY || msg.FECHA || '';
            
            // Get message content - try multiple field names
            const messageContent = 
              msg.MENSAJE || 
              msg.mensaje || 
              msg.MESSAGE || 
              msg.message || 
              msg.MENSAJE_TEXT ||
              (msg.ID_MENSAJE && !msg.MENSAJE ? '' : 'Sin contenido');
            
            const chatKey = senderId === currentUser?.id ? receiverId : senderId;
            if (!grouped[chatKey]) grouped[chatKey] = [];
            grouped[chatKey].push({
              id: msg.ID_MENSAJE || msg.id || `MSG-${Date.now()}`,
              senderId: senderId,
              senderName: msg.EMISOR_NOMBRE || msg.EMISOR_ID || 'Usuario',
              content: messageContent,
              timestamp: timestamp,
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

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Delay initial load slightly to avoid race conditions
    const timer = setTimeout(() => {
      loadMessages();
      setIsInitialLoad(false);
    }, 500);
    
    // Poll every 30 seconds to avoid quota issues
    const interval = setInterval(loadMessages, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [currentUser?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, selectedUserId]);

  // Filter users based on search
  const filteredUsers = allUsers.filter(user => 
    user.id !== currentUser?.id && user.email !== currentUser?.email && (
    !searchQuery || 
    user.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.rol || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  ));

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
      <div className="w-80 border-r border-brand-border flex flex-col bg-brand-bg/50 shrink-0">
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
<div className="flex-1 flex flex-col bg-brand-bg min-w-0">
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
              <div className="p-4 bg-brand-surface border-b border-brand-border flex items-center justify-between shrink-0">
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

              {/* Messages Area - with contained scroll */}
              <div className="flex-1 overflow-y-auto p-6 pb-4" style={{ contain: 'strict' }}>
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-brand-muted italic">No hay mensajes aún. ¡Inicia la conversación!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                  const isMine = msg.senderId === currentUser?.id || msg.senderId === 'me';
                  const isAi = msg.senderId === 'ai';
                  
                  return (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[75%]",
                        isMine ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      {/* Sender Name & Time Header */}
                      <div className={cn(
                        "flex items-center gap-2 mb-1.5",
                        isMine ? "flex-row-reverse" : ""
                      )}>
                        {isAi ? (
                          <>
                            <Bot size={12} className="text-brand-accent" />
                            <span className="text-[9px] font-bold text-brand-accent uppercase">Asistente AI</span>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-brand-ink">
                            {msg.senderName}
                          </span>
                        )}
                        <span className="text-[9px] text-gray-400">•</span>
                        <span className="text-[9px] text-gray-400">{msg.timestamp}</span>
                      </div>
                      
                      {/* Message Bubble */}
                      <div className={cn(
                        "p-4 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm",
                        isMine 
                          ? "bg-brand-ink text-brand-bg rounded-tr-xl rounded-br-none" 
                          : isAi
                            ? "bg-gradient-to-r from-brand-accent/10 to-blue-50 text-brand-ink border border-brand-accent/20 rounded-tl-xl rounded-bl-none"
                            : "bg-white text-brand-ink border border-gray-200 rounded-tl-xl rounded-bl-none"
                      )}>
                        {msg.content}
                      </div>
                      
                      {/* Footer - Read Status */}
                      <div className={cn(
                        "mt-1.5 flex items-center gap-1.5",
                        isMine ? "flex-row-reverse" : ""
                      )}>
                        {msg.read && isMine && (
                          <CheckCheck size={12} className="text-blue-500" />
                        )}
                        {!msg.read && isMine && (
                          <CheckCheck size={12} className="text-gray-400" />
                        )}
                        <span className={cn(
                          "text-[8px]",
                          msg.read ? "text-blue-400" : "text-gray-400"
                        )}>
                          {msg.read ? 'Leído' : 'Enviado'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Fixed at bottom */}
            <div className="p-4 bg-brand-surface border-t border-brand-border shrink-0 sticky bottom-0 z-10">
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Escribe un mensaje interno..."
                  className="flex-1 px-4 py-3 bg-brand-bg border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-ink scroll-m-0"
                  style={{ scrollMarginTop: '0px' }}
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