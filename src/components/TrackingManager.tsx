import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Copy, Share2, MessageCircle, Send, Check, Settings, Layout, Smartphone } from 'lucide-react';
import { Product, OrderStatus } from '../types';
import { cn } from '../lib/utils';

interface TrackingManagerProps {
  product: Product;
  onClose: () => void;
}

const TEMPLATES: Record<OrderStatus, string> = {
  'COMPRADO': '¡Hola! 🇺🇸 Tu artículo {name} ha sido adquirido con éxito en tienda USA. Te notificaremos cuando llegue a nuestro centro de logística.',
  'COMPRADO_MX': '¡Hola! 🇲🇽 Tu artículo {name} ha sido adquirido con éxito en México. Te notificaremos cuando llegue a nuestro centro de logística.',
  'EN_RUTA': '¡Hola! ✈️ Tu pedido {name} ya está en tránsito hacia nuestro centro en El Paso. Próximo paso: Verificación en Warehouse.',
  'EN_BODEGA': '¡Hola! 📍 Hemos recibido y verificado tu {name} en Warehouse Zafi. Todo está listo para su envío a México.',
  'ENVIADO': '¡Hola! 🚚 ¡Buenas noticias! Tu {name} ha sido enviado a tu dirección en México. SKU de rastreo interno: {sku}.',
  'ENTREGADO': '¡Hola! ✅ Tu pedido {name} ha sido entregado. ¡Gracias por confiar en StockMaster!',
};

export function TrackingManager({ product, onClose }: TrackingManagerProps) {
  const [copied, setCopied] = useState(false);
  const [template, setTemplate] = useState<string>(TEMPLATES[product.currentStatus as OrderStatus] || '');

  const trackingUrl = `${window.location.origin}${window.location.pathname}?tracking=${product.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `${template.replace('{name}', product.name).replace('{sku}', product.sku)}\n\nSigue tu pedido aquí: ${trackingUrl}`;
    const url = `https://wa.me/${product.clientPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-brand-surface rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl transition-colors duration-300"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-accent rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
                <Smartphone size={20} className="text-brand-bg" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-brand-ink uppercase">Gestión de Tracking</h2>
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em]">Sku: {product.sku}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-brand-bg rounded-full transition-colors">
              <Settings size={20} className="text-brand-muted" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Main Template Card */}
            <div className="bg-brand-bg rounded-2xl p-6 border border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted flex items-center gap-2">
                  <MessageCircle size={14} className="text-brand-accent" /> Mensaje Premeditado (Status: {product.currentStatus})
                </span>
                <button 
                  onClick={() => setTemplate(TEMPLATES[product.currentStatus as OrderStatus])}
                  className="text-[9px] font-black text-brand-accent hover:underline uppercase tracking-widest"
                >
                  Reiniciar
                </button>
              </div>
              <textarea 
                value={template}
                onChange={e => setTemplate(e.target.value)}
                className="w-full h-24 bg-brand-surface border border-brand-border rounded-xl p-4 text-xs font-bold text-brand-ink outline-none focus:border-brand-ink transition-all resize-none"
              />
              <button 
                onClick={shareWhatsApp}
                disabled={!product.clientPhone}
                className="w-full py-4 bg-[#25D366] text-white rounded-xl font-black uppercase tracking-tighter text-sm flex items-center justify-center gap-3 shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                <Send size={18} /> Enviar Vía WhatsApp
              </button>
              {!product.clientPhone && (
                <p className="text-[10px] font-medium text-red-500 italic text-center">No hay teléfono registrado para este cliente.</p>
              )}
            </div>

            {/* Tracking Link Card */}
            <div className="border border-brand-border rounded-2xl p-6 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted flex items-center gap-2">
                <ExternalLink size={14} className="text-brand-accent" /> Link de Seguimiento para Cliente
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-brand-bg px-4 py-3 rounded-xl border border-brand-border text-[11px] font-mono font-bold text-brand-muted truncate">
                  {trackingUrl}
                </div>
                <button 
                  onClick={copyLink}
                  className={cn(
                    "p-3 rounded-xl transition-all border",
                    copied ? "bg-green-500 border-green-500 text-white" : "bg-brand-surface border-brand-border text-brand-ink hover:border-brand-ink"
                  )}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
                <button 
                  onClick={() => window.open(trackingUrl, '_blank')}
                  className="p-3 bg-brand-ink text-brand-bg rounded-xl hover:scale-105 transition-transform"
                >
                  <Share2 size={18} />
                </button>
              </div>
              <p className="text-[10px] font-medium text-brand-muted leading-relaxed">
                Este link redirige al cliente a su portal de tracking personalizado donde podrá ver el avance logístico de su artículo {product.name}.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4">
            <button 
              onClick={onClose}
              className="px-8 py-3 rounded-xl font-black uppercase tracking-tighter text-xs text-brand-ink hover:bg-brand-bg transition-colors"
            >
              Cerrar Panel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
