import React from 'react';
import { 
  Calculator, 
  Send, 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  BrainCircuit,
  CornerDownRight,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types';
import { formatCurrency, cn } from '../lib/utils';

const parseAmount = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const cleanValue = String(value).replace(/[$,\s]/g, '');
  const num = parseFloat(cleanValue);
  return isNaN(num) ? 0 : num;
};

interface InvestmentAdvisorProps {
  products: Product[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function InvestmentAdvisor({ products }: InvestmentAdvisorProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const [calcValue, setCalcValue] = React.useState('0');
  const [calcMemory, setCalcMemory] = React.useState<number | null>(null);
  const [calcOperator, setCalcOperator] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Initial Greeting
  React.useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: "Hola Master. Soy tu Asesor de Inversión. He analizado los datos de tu inventario. Si tienes una oportunidad de compra, pregúntame. Seré directo: si los datos no cuadran, te diré que NO compres.",
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Prepare context for the AI
      const inventoryContext = products.map(p => ({
        name: p.name,
        brand: p.brand,
        category: p.category,
        buyPriceUsd: p.buyPriceUsd,
        sellPriceMxn: p.sellPriceMxn,
        status: p.currentStatus,
        createdAt: p.createdAt,
        quantity: p.quantity
      }));

      // Find top sellers (delivered items)
      const topSellers = products
        .filter(p => p.currentStatus === 'ENTREGADO')
        .reduce((acc, p) => {
          const key = `${p.brand} ${p.name}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const sortedSellers = Object.entries(topSellers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => `${name} (${count} vendidos)`)
        .join(', ');

      const systemPrompt = `
        Eres un Asesor Financiero y de Compras experto para StockMaster.
        Tu objetivo es maximizar el ROI del "Usuario Master".
        
        REGLAS DE ORO:
        1. SÉ DIRECTO Y BRUSCO SI ES NECESARIO. No uses rodeos.
        2. BASATE EN DATOS. Si un producto tardó en venderse, recuérdalo.
        3. Si te preguntan si comprar algo, responde: "TE RECOMIENDO [SI/NO] COMPRAR YA QUE..."
        4. Después de tu análisis, ofrece SIEMPRE una alternativa mejor basada en los artículos más vendidos.
        
        CONTEXTO ACTUAL DEL SISTEMA:
        - Total de artículos en histórico: ${products.length}
        - Artículos top vendidos últimamente: ${sortedSellers || 'Ninguno aún'}
        - Datos crudos de inventario para análisis: ${JSON.stringify(inventoryContext.slice(0, 50))} (Nota: solo ves una muestra parcial).
        
        FORMATO DE RESPUESTA:
        - Respuesta del Asistente AI: [Tu veredicto directo]
        - Análisis de Datos: [Justificación técnica breve]
        - Recomendación Alternativa: [Basada en los datos de mayor rotación]
      `;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })), { role: 'user', content: userMsg.content }],
          systemPrompt,
          provider: 'groq',
          model: 'llama-3.3-70b-versatile'
        })
      });
      
      const data = await response.json();
      const aiResponse = data.response || "Lo siento, hubo un error analizando los datos.";

      const aiMsg: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('AI Advisor error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Error de conexión con mi módulo de análisis. Verifica tu API Key.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Calculator Logic
  const handleCalcInput = (val: string) => {
    if (calcValue === '0' || calcValue === 'Error') {
      setCalcValue(val);
    } else {
      setCalcValue(prev => prev + val);
    }
  };

  const handleCalcOperator = (op: string) => {
    setCalcMemory(parseAmount(calcValue));
    setCalcOperator(op);
    setCalcValue('0');
  };

  const calculate = () => {
    if (calcMemory === null || calcOperator === null) return;
    const current = parseAmount(calcValue);
    const memory = parseAmount(calcMemory);
    let result = 0;
    switch (calcOperator) {
      case '+': result = memory + current; break;
      case '-': result = memory - current; break;
      case '*': result = memory * current; break;
      case '/': result = current !== 0 ? memory / current : 0; break;
    }
    setCalcValue(result.toString());
    setCalcMemory(null);
    setCalcOperator(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]">
      {/* Sidebar: Calculator */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="bg-brand-ink text-white p-6 rounded-2xl shadow-xl border border-white/5 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="text-brand-accent" size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Cálculo Rápido de Inversión</span>
          </div>

          <div className="bg-white/5 rounded-xl p-4 mb-4 text-right">
            <div className="text-[10px] text-white/40 font-mono h-4">
              {calcMemory !== null && `${calcMemory} ${calcOperator}`}
            </div>
            <div className="text-3xl font-mono font-bold truncate">
              {calcValue}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 flex-1">
            {['7', '8', '9', '/'].map(btn => (
              <button
                key={btn}
                onClick={() => btn === '/' ? handleCalcOperator('/') : handleCalcInput(btn)}
                className="py-4 rounded-xl font-bold flex items-center justify-center bg-white/10 text-white hover:bg-white/20 border border-white/5 transition-all active:scale-95"
              >
                {btn}
              </button>
            ))}
            {['4', '5', '6', '*'].map(btn => (
              <button
                key={btn}
                onClick={() => btn === '*' ? handleCalcOperator('*') : handleCalcInput(btn)}
                className="py-4 rounded-xl font-bold flex items-center justify-center bg-white/10 text-white hover:bg-white/20 border border-white/5 transition-all active:scale-95"
              >
                {btn}
              </button>
            ))}
            {['1', '2', '3', '-'].map(btn => (
              <button
                key={btn}
                onClick={() => btn === '-' ? handleCalcOperator('-') : handleCalcInput(btn)}
                className="py-4 rounded-xl font-bold flex items-center justify-center bg-white/10 text-white hover:bg-white/20 border border-white/5 transition-all active:scale-95"
              >
                {btn}
              </button>
            ))}
            {['0', '.', '=', '+'].map(btn => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === '=') calculate();
                  else if (btn === '+') handleCalcOperator('+');
                  else handleCalcInput(btn);
                }}
                className={cn(
                  "py-4 rounded-xl font-bold flex items-center justify-center transition-all active:scale-95",
                  btn === '=' 
                    ? "bg-brand-accent text-brand-ink" 
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
                )}
              >
                {btn}
              </button>
            ))}
            <button 
              onClick={() => { setCalcValue('0'); setCalcMemory(null); setCalcOperator(null); }}
              className="col-span-4 py-3 bg-red-500/20 text-red-500 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-red-500/30 transition-all border border-red-500/20"
            >
              Borrar Todo (AC)
            </button>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl hidden lg:block">
          <h4 className="font-bold text-xs uppercase tracking-widest text-brand-muted mb-4">Métricas de Análisis</h4>
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-label">ROI Promedio</span>
                <span className="text-xs font-black text-green-600">+18.5%</span>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-label">Días en Stock (Avg)</span>
                <span className="text-xs font-black text-brand-ink">24 días</span>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-label">Riesgo de Liquidez</span>
                <span className="text-xs font-black text-red-500">Bajo</span>
             </div>
          </div>
        </div>
      </div>

      {/* Main: Chatbot Area */}
      <div className="flex-1 bg-white border border-brand-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <header className="p-6 border-b border-brand-border bg-brand-surface flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-ink text-brand-accent rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h3 className="font-black text-brand-ink uppercase tracking-tight text-lg">AI Investment Advisor</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-brand-muted tracking-widest uppercase">Módulo de Análisis Real-Time Activo</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setMessages([])}
            className="p-2 text-brand-muted hover:text-brand-ink transition-colors"
            title="Reiniciar Análisis"
          >
            <RefreshCcw size={18} />
          </button>
        </header>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-brand-bg/30"
        >
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col max-w-[85%] space-y-1",
                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "px-5 py-3.5 rounded-2xl text-sm shadow-sm",
                msg.role === 'user' 
                  ? "bg-brand-ink text-white rounded-tr-none" 
                  : "bg-white border border-brand-border text-brand-ink rounded-tl-none"
              )}>
                <div className="whitespace-pre-wrap leading-relaxed">
                   {msg.content}
                </div>
              </div>
              <span className="text-[8px] font-bold text-brand-muted uppercase tracking-widest px-2">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 p-4 bg-white border border-brand-border rounded-xl w-fit animate-pulse">
              <Bot size={16} className="text-brand-ink" />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Analizando historial y tendencias...</span>
            </div>
          )}
        </div>

        <div className="p-6 bg-brand-surface border-t border-brand-border">
          <div className="relative flex items-center gap-4">
            <div className="relative flex-1 group">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ej: ¿Me recomiendas comprar 10 Camisas Polo a $15 USD?"
                className="w-full bg-white border border-brand-border rounded-xl py-4 pl-12 pr-4 text-sm outline-none focus:border-brand-ink transition-all shadow-sm group-focus-within:shadow-md"
              />
              <Bot className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-ink transition-colors" size={20} />
            </div>
            <button 
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              className="w-14 h-14 bg-brand-ink text-brand-accent rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10 disabled:opacity-50 disabled:scale-100"
            >
              <Send size={24} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4 px-2">
            <CornerDownRight size={12} className="text-brand-muted" />
            <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">
              El asistente basa sus veredictos en la rotación histórica de tu Google Sheet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
