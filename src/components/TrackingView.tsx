import React from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle2, Clock, MapPin, Building2, Calendar, Smartphone } from 'lucide-react';
import { Product, OrderStatus } from '../types';
import { cn, formatDate, getProxyImageUrl } from '../lib/utils';

interface TrackingViewProps {
  product: Product;
}

const STEPS: { status: OrderStatus; label: string; icon: React.ReactNode; description: string }[] = [
  { status: 'COMPRADO', label: 'Comprado', icon: <Smartphone size={16} />, description: 'Artículo adquirido en boutique/tienda USA.' },
  { status: 'EN_RUTA', label: 'En Ruta', icon: <Truck size={16} />, description: 'En tránsito hacia nuestro centro de logística en El Paso.' },
  { status: 'EN_BODEGA', label: 'Recibido', icon: <Building2 size={16} />, description: 'Procesado y verificado en Warehouse Zafi.' },
  { status: 'ENVIADO', label: 'Enviado', icon: <Package size={16} />, description: 'En camino a tu dirección en México.' },
  { status: 'ENTREGADO', label: 'Entregado', icon: <CheckCircle2 size={16} />, description: '¡Gracias por tu compra! Pedido finalizado.' },
];

export function TrackingView({ product }: TrackingViewProps) {
  const currentStepIndex = STEPS.findIndex(s => s.status === product.currentStatus);

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-6 lg:p-12">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/20">
            <Package size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">The Sneacker Guys - Sales & Stock Manager Tracking</h1>
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.3em]">Seguimiento de tu pedido en tiempo real</p>
          </div>
        </div>

        {/* Product Info Card */}
        <div className="bg-white rounded-3xl p-8 border border-brand-border shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {product.imageUrl ? (
              <div className="w-32 h-32 rounded-2xl overflow-hidden border border-brand-border bg-[#F8FAF9]">
                <img src={getProxyImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-[#F8FAF9] flex items-center justify-center border border-brand-border text-brand-border">
                <Package size={40} />
              </div>
            )}
            
            <div className="flex-1 text-center md:text-left">
              <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest bg-brand-accent/5 px-3 py-1 rounded-full">{product.brand}</span>
              <h2 className="text-xl font-black tracking-tight text-brand-ink mt-2">{product.name}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Talla</span>
                  <span className="font-bold text-sm tracking-tight">{product.size}</span>
                </div>
                <div className="w-px h-6 bg-brand-border" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Pedido ID</span>
                  <span className="font-mono font-bold text-sm text-brand-ink">{product.sku}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-brand-border flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Calendar size={14} className="text-brand-muted" />
                <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">Fecha de pedido: {formatDate(product.createdAt)}</span>
             </div>
             <div className="flex items-center gap-2">
                <MapPin size={14} className="text-brand-accent" />
                <span className="text-[11px] font-bold text-brand-ink uppercase tracking-wider">{product.destino}</span>
             </div>
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="bg-white rounded-3xl p-8 border border-brand-border shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-brand-ink mb-10 flex items-center gap-2">
            <Clock size={16} className="text-brand-accent" /> Status de Envío
          </h3>

          <div className="relative space-y-10">
            {/* Vertical Line */}
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100" />
            
            {STEPS.map((step, index) => {
              const isPast = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isFuture = index > currentStepIndex;

              return (
                <div key={step.status} className="relative pl-12">
                  {/* Dot */}
                  <div className={cn(
                    "absolute left-2.5 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-4 transition-all duration-500",
                    isPast ? "bg-brand-ink border-brand-ink" : 
                    isCurrent ? "bg-white border-brand-ink scale-125 shadow-lg shadow-black/20" : 
                    "bg-white border-gray-100"
                  )} />

                  <div className={cn(
                    "transition-all duration-500",
                    isFuture ? "opacity-40 grayscale" : "opacity-100"
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        isCurrent ? "bg-brand-ink text-white" : "bg-[#F8FAF9] text-brand-muted"
                      )}>
                        {step.icon}
                      </div>
                      <span className={cn(
                        "text-xs font-black uppercase tracking-widest",
                        isCurrent ? "text-brand-ink" : "text-brand-muted"
                      )}>
                        {step.label}
                        {isCurrent && <span className="ml-3 px-2 py-0.5 bg-brand-accent text-white rounded text-[8px] tracking-tight">ACTUAL</span>}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-brand-muted max-w-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center pt-8">
           <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] mb-4">The Sneacker Guys - Sales & Stock Manager Logistics System v2.0</p>
           <button className="text-[11px] font-black underline underline-offset-4 decoration-2 decoration-brand-accent/30 hover:decoration-brand-accent">
             ¿Necesitas ayuda con tu pedido? Contactar Soporte
           </button>
        </div>
      </div>
    </div>
  );
}
