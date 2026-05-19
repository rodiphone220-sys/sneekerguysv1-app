"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  X, 
  Bot, 
  Loader2,
  GripHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SystemSettings } from '../types';
import { aiService } from '../lib/aiService';

interface SneekyBotProps {
  settings: SystemSettings;
}

const CHAT_WIDTH = 360;
const CHAT_HEIGHT = 520;
const ICON_SIZE = 56;

export function SneekyBot({ settings }: SneekyBotProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: '¡Hola! Soy Sneeky. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0, iconX: 0, iconY: 0 });
  
  // Cargar posición guardada
  const initialPos = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sneeky_icon_position');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return { x: parsed.x, y: parsed.y };
          }
        } catch { /* ignore */ }
      }
    }
    // Posición por defecto: esquina inferior derecha
    return { x: window.innerWidth - ICON_SIZE - 24, y: window.innerHeight - ICON_SIZE - 24 };
  }, []);
  
  const [iconPosition, setIconPosition] = React.useState(initialPos);
  
  // Handle drag del icono
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { 
      x: e.clientX, 
      y: e.clientY, 
      iconX: iconPosition.x, 
      iconY: iconPosition.y 
    };
  };

  const handleDragMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    let newX = dragStartRef.current.iconX + deltaX;
    let newY = dragStartRef.current.iconY + deltaY;
    
    // Bounds: mantener dentro de la ventana
    const maxX = window.innerWidth - ICON_SIZE;
    const maxY = window.innerHeight - ICON_SIZE;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    setIconPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = React.useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('sneeky_icon_position', JSON.stringify(iconPosition));
    }
  }, [isDragging, iconPosition]);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const prompt = `
        Instrucciones de Personalidad (Sneeky Bot):
        ${settings.sneekyBotPrompt || 'Eres un bot amable llamado Sneeky.'}
        
        Instrucciones del Sistema General:
        ${settings.aiGeneralPrompt || 'Ayuda al usuario con lo que necesite de manera concisa.'}
        
        Contexto del Usuario:
        El usuario está navegando por la aplicación The Sneacker Guys - Sales & Stock Manager.
        
        Historial de chat:
        ${messages.map(m => `${m.role}: ${m.text}`).join('\n')}
        User: ${userMessage}
        
        Responde de manera profesional, corta y simpática.
      `;

      const botResponse = await aiService.chat(
        [...messages.map(m => ({ role: m.role === 'bot' ? 'assistant' as const : m.role, content: m.text })), { role: 'user', content: userMessage }],
        prompt
      );

      setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
    } catch (error) {
      console.error('Sneeky Bot Error:', error);
      setMessages(prev => [...prev, { role: 'bot', text: "Ocurrió un error de conexión. Intenta de nuevo." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular posición del chat (encima del icono)
  const getChatPosition = () => {
    const chatY = iconPosition.y - CHAT_HEIGHT - 10;
    const chatX = iconPosition.x + ICON_SIZE / 2 - CHAT_WIDTH / 2;
    
    // Ajustar si se sale de los bounds
    const adjustedX = Math.max(16, Math.min(chatX, window.innerWidth - CHAT_WIDTH - 16));
    const adjustedY = Math.max(16, chatY);
    
    // Si no hay espacio arriba, abrir debajo
    if (adjustedY < 16 && iconPosition.y + ICON_SIZE + CHAT_HEIGHT + 16 < window.innerHeight) {
      return { x: adjustedX, y: iconPosition.y + ICON_SIZE + 10 };
    }
    
    return { x: adjustedX, y: adjustedY };
  };

  const chatPos = isOpen ? getChatPosition() : { x: 0, y: 0 };

  return (
    <>
      {/* Icono Flotante Draggable */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ 
          left: iconPosition.x, 
          top: iconPosition.y,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        className={cn(
          "fixed w-[56px] h-[56px] bg-brand-ink text-brand-bg rounded-full flex items-center justify-center shadow-2xl z-[100] transition-shadow",
          isDragging && "shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        )}
        onMouseDown={handleDragStart}
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="relative">
          <Bot size={28} />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [1, 0, 1] 
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent rounded-full border-2 border-brand-ink"
          />
        </div>
        
        {/* Indicador de drag */}
        {isDragging && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-[9px] font-bold rounded whitespace-nowrap">
            Soltar para guardar
          </div>
        )}
      </motion.div>

      {/* Chat Window - Aparece relativo al icono */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ 
              left: chatPos.x, 
              top: chatPos.y,
              width: CHAT_WIDTH,
              height: CHAT_HEIGHT
            }}
            className="fixed bg-brand-surface rounded-2xl border border-brand-border shadow-2xl z-[9999] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-brand-ink text-brand-bg flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-bg rounded-full flex items-center justify-center text-brand-ink">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-tight">Sneeky Bot</h3>
                  <p className="text-[9px] text-brand-bg/60 font-medium flex items-center gap-1">
                    <GripHorizontal size={10} /> Arrastra el icono para mover
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-brand-bg/30">
              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm",
                    msg.role === 'user' 
                      ? "bg-brand-ink text-brand-bg rounded-tr-none" 
                      : "bg-brand-surface text-brand-ink border border-brand-border rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-brand-muted">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Sneeky pensando...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-brand-border bg-brand-surface shrink-0">
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Habla con Sneeky..."
                  className="flex-1 px-4 py-2 bg-brand-bg border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-ink transition-all text-brand-ink"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-brand-ink text-brand-bg rounded-xl flex items-center justify-center disabled:opacity-30 transition-all shadow-lg"
                >
                  <Send size={16} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}