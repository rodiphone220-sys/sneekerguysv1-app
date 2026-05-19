import React from 'react';
import { Product, OrderStatus } from '../types';
import { cn, formatCurrency, getProxyImageUrl } from '../lib/utils';
import { StatusPipeline } from './StatusPipeline';
import { MoreHorizontal, Edit2, Trash2, ArrowUpRight, ChevronDown, Check, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  globalMarkup?: number;
  onEdit: (p: Product) => void;
  onStatusChange: (id: string, s: OrderStatus) => void;
  onDelete: (id: string) => void;
  isHighlighted?: boolean;
}

export function ProductCard({ product, globalMarkup = 35, onEdit, onStatusChange, onDelete, isHighlighted }: ProductCardProps) {
  const [showActions, setShowActions] = React.useState(false);
  const [justUpdated, setJustUpdated] = React.useState(false);

  const displayPriceMxn = (product.sellPriceMxn && product.sellPriceMxn > 0) 
    ? product.sellPriceMxn 
    : Math.round((product.buyPriceMxn || 0) * (1 + (globalMarkup / 100)));

  // Debug imageUrl
  const imageProxyUrl = getProxyImageUrl(product.imageUrl);
  if (product.imageUrl) {
    console.log('🖼️ ProductCard Debug:', {
      sku: product.sku,
      originalImageUrl: product.imageUrl,
      proxyImageUrl: imageProxyUrl,
      startsWithHttp: product.imageUrl.startsWith('http'),
      startsWithData: product.imageUrl.startsWith('data:'),
    });
  }

  React.useEffect(() => {
    if (justUpdated) {
      const timer = setTimeout(() => setJustUpdated(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justUpdated]);

  const handleStatusChange = (status: OrderStatus) => {
    onStatusChange(product.id, status);
    setJustUpdated(true);
  };

  // Status mapping for labels
  const getStatusLabel = (status: OrderStatus) => {
    switch(status) {
      case 'COMPRADO': return '📦 Comprado USA';
      case 'EN_RUTA': return '✈️ En Ruta Zafi';
      case 'EN_BODEGA': return '📍 Recibido Zafi';
      case 'ENVIADO': return '🚚 Enviado MX';
      case 'ENTREGADO': return '✅ Entregado';
      default: return status;
    }
  };

  // Status mapping for pills
  const getStatusStyle = (status: OrderStatus) => {
    switch(status) {
      case 'ENTREGADO': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'EN_BODEGA': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'COMPRADO': return 'bg-brand-bg text-brand-muted';
      case 'EN_RUTA': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'ENVIADO': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default: return 'bg-brand-bg text-brand-muted';
    }
  };

  return (
    <motion.div 
      whileHover={{ 
        y: -10, 
        scale: 1.02,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)"
      }}
      whileTap={{ scale: 0.98 }}
      id={isHighlighted ? `product-${product.id}` : undefined}
      className={cn(
        "bg-brand-surface border rounded-xl overflow-hidden flex flex-col h-full hover:border-brand-ink/40 transition-all group shadow-sm",
        isHighlighted && "border-[#00FF85] shadow-[0_0_20px_rgba(0,255,133,0.4)] ring-2 ring-[#00FF85]"
      )}
    >
      <div className="relative aspect-video bg-brand-bg border-b border-brand-border">
        {(() => {
          const isValidUrl = product.imageUrl && (product.imageUrl.startsWith('http') || product.imageUrl.startsWith('data:'));
          return isValidUrl ? (
            <img 
              src={getProxyImageUrl(product.imageUrl)} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/400/400';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-brand-bg">
              <Package className="text-brand-muted/30" size={40} />
            </div>
          );
        })()}
        <div className="absolute top-3 right-3 z-10">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowActions(!showActions)}
            className="w-8 h-8 rounded-md bg-brand-surface/90 backdrop-blur-md border border-brand-border shadow-sm flex items-center justify-center text-brand-muted hover:text-brand-ink transition-colors"
          >
            <MoreHorizontal size={16} />
          </motion.button>
          
          {showActions && (
            <div className="absolute top-10 right-0 w-32 bg-brand-surface rounded-lg shadow-xl border border-brand-border py-1 z-20">
              <button 
                onClick={() => { onEdit(product); setShowActions(false); }}
                className="w-full px-4 py-2 text-left text-[13px] font-bold flex items-center gap-2 hover:bg-brand-bg text-brand-ink"
              >
                <Edit2 size={14} /> Editar
              </button>
              <button 
                onClick={() => { onDelete(product.id); setShowActions(false); }}
                className="w-full px-4 py-2 text-left text-[13px] font-bold flex items-center gap-2 hover:bg-[#FCE8E8] text-[#C53030]"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex gap-2">
          {product.destino && (
             <span className="px-2 py-1 rounded-md bg-brand-ink text-white text-[9px] font-bold uppercase tracking-wider">
               {product.destino.replace('_', ' ')}
             </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-brand-label uppercase tracking-wider">{product.sku}</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                product.quantity <= product.minStock ? "bg-red-50 text-red-600 border border-red-100" : "bg-brand-ink text-white"
              )}>
                {product.quantity} uds
              </span>
              <div className="relative group/status flex items-center">
                <select 
                  value={product.currentStatus}
                  onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                  className={cn(
                    "pl-2 pr-6 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border-2 border-transparent appearance-none transition-all hover:border-brand-ink/20",
                    getStatusStyle(product.currentStatus),
                    justUpdated && "ring-2 ring-brand-accent scale-105"
                  )}
                >
                  <option value="COMPRADO">📦 Comprado</option>
                  <option value="EN_RUTA">✈️ En Ruta</option>
                  <option value="EN_BODEGA">📍 En Zafi</option>
                  <option value="ENVIADO">🚚 Enviado</option>
                  <option value="ENTREGADO">✅ Entregado</option>
                </select>
                <ChevronDown size={10} className="absolute right-2 pointer-events-none opacity-50" />
                
                <AnimatePresence>
                  {justUpdated && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-accent text-white rounded-full p-1"
                    >
                      <Check size={8} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <h4 className="text-15px font-bold text-brand-ink line-clamp-2 leading-tight min-h-[2.5rem]">{product.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[12px] text-brand-muted">{product.brand}</span>
            <span className="w-1 h-1 rounded-full bg-brand-border" />
            <span className="text-[12px] text-brand-muted">{product.category} {product.subcategory ? `• ${product.subcategory}` : ''}</span>
            <span className="w-1 h-1 rounded-full bg-brand-border" />
            <span className="text-[12px] text-brand-muted">{product.size || 'No Size'}</span>
          </div>
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.tags.map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-brand-ink/5 text-brand-muted text-[8px] font-bold uppercase tracking-wider rounded border border-brand-ink/10">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4 border-t border-brand-border mt-auto">
          <div className="flex justify-between text-[11px]">
            <span className="text-brand-label font-bold uppercase tracking-wider">Tarjeta</span>
            <span className="px-1.5 py-0.5 rounded bg-brand-accent/5 border border-brand-accent/20 text-brand-accent font-bold text-[9px] uppercase">{product.card || '-'}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-brand-label font-bold uppercase tracking-wider">Boutique</span>
            <span className="text-brand-ink font-semibold">{product.boutique || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-brand-label font-bold uppercase tracking-wider">Cliente</span>
            <span className={cn("font-semibold", product.clientName ? "text-brand-accent" : "text-brand-ink")}>{product.clientName || 'STOCK DISPONIBLE'}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[10px] text-brand-accent font-bold uppercase tracking-wider block mb-0.5">Precio Venta</span>
              <span className="text-[22px] font-extrabold text-brand-ink leading-none">
                ${displayPriceMxn.toLocaleString()} <span className="text-[10px] opacity-50">MXN</span>
              </span>
              {(product.quantity > 1) && (
                <div className="text-[10px] text-brand-ink font-semibold mt-0.5 bg-brand-ink/5 px-1.5 py-0.5 rounded block w-fit">
                  Total: ${(displayPriceMxn * product.quantity).toLocaleString()}
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block mb-0.5">Costo Unit.</span>
              <span className="text-[14px] font-mono font-semibold text-gray-500">
                {formatCurrency(product.buyPriceUsd || 0)}
              </span>
              <div className="text-[11px] text-gray-400 mt-0.5">
                $¥{(product.buyPriceMxn || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
