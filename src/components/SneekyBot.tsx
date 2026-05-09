import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  X, 
  Bot, 
  Loader2,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SystemSettings } from '../types';
import { aiService } from '../lib/aiService';

interface SneekyBotProps {
  settings: SystemSettings;
}

export function SneekyBot({ settings }: SneekyBotProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: '¡Hola! Soy Sneeky. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

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
        El usuario está navegando por la aplicación The Sneacker Guys - Sales & Stock Manager (Sistema de gestión de inventario y CRM).
        
        Historial de chat:
        ${messages.map(m => `${m.role}: ${m.text}`).join('\n')}
        User: ${userMessage}
        
        Responde de manera profesional, corta y simpática. Preséntate si es la primera vez.
      `;

      const aiMessages = messages.map(m => ({
        role: m.role === 'bot' ? 'assistant' as const : m.role,
        content: m.text
      }));
      
      const botResponse = await aiService.chat(
        [...aiMessages, { role: 'user', content: userMessage }],
        prompt
      );

      setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
    } catch (error) {
      console.error('Sneeky Bot Error:', error);
      setMessages(prev => [...prev, { role: 'bot', text: "Ocurrió un error de conexión. Intentando con otro modelo..." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 bg-brand-ink text-brand-bg rounded-full flex items-center justify-center shadow-2xl z-[100] transition-all",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
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
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-brand-surface rounded-2xl border border-brand-border shadow-2xl z-[101] flex flex-col overflow-hidden transition-colors duration-300"
          >
            {/* Header */}
            <div className="p-4 bg-brand-ink text-brand-bg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-bg rounded-full flex items-center justify-center text-brand-ink">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-tight">Sneeky Bot</h3>
                  <p className="text-[9px] text-brand-bg/60 font-medium">Asistente Frontal Activo</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
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
            <div className="p-4 border-t border-brand-border bg-brand-surface">
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
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
