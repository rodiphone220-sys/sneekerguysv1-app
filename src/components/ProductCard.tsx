import React from 'react';
import { Product, OrderStatus } from '../types';
import { cn, formatCurrency, getProxyImageUrl } from '../lib/utils';
import { StatusPipeline } from './StatusPipeline';
import { MoreHorizontal, Edit2, Trash2, ArrowUpRight, ChevronDown, Check, Package, Hash, CreditCard, Calendar, DollarSign, ShoppingCart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  globalMarkup?: number;
  onEdit: (p: Product) => void;
  onStatusChange: (id: string, s: OrderStatus) => void;
  onDelete: (id: string) => void;
  isHighlighted?: boolean;
  allProducts?: Product[];
}

export function ProductCard({ product, globalMarkup = 35, onEdit, onStatusChange, onDelete, isHighlighted, allProducts = [] }: ProductCardProps) {
  const [showActions, setShowActions] = React.useState(false);
  const [justUpdated, setJustUpdated] = React.useState(false);
  const [showReferencia, setShowReferencia] = React.useState(false);
  const [showIdCompra, setShowIdCompra] = React.useState(false);

  const getBatchId = (sku: string) => {
    const lastDash = sku.lastIndexOf('-');
    return lastDash > 0 ? sku.substring(0, lastDash) : sku;
  };

  const batchId = getBatchId(product.sku || product.id || '');
  const siblingProducts = allProducts.filter(p => {
    if ((p.sku || p.id) === (product.sku || product.id)) return false;
    return getBatchId(p.sku || p.id || '') === batchId;
  });

  const displayPriceMxn = (product.sellPriceMxn && product.sellPriceMxn > 0) 
    ? product.sellPriceMxn 
    : Math.round((product.buyPriceMxn || 0) * (1 + (globalMarkup / 100)));

  const referenciaValue = product.referido_por || product.numero_pedido || product.sku_manual || '';

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
      case 'COMPRADO': return '🇺🇸 Comprado USA';
      case 'COMPRADO_MX': return '🇲🇽 Comprado MX';
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
      case 'COMPRADO_MX': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
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
                  <option value="COMPRADO">🇺🇸 Comprado USA</option>
                  <option value="COMPRADO_MX">🇲🇽 Comprado MX</option>
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
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button
              onClick={() => setShowReferencia(!showReferencia)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border-2 border-transparent transition-all",
                showReferencia
                  ? "bg-brand-ink text-white border-brand-ink"
                  : "bg-brand-bg text-brand-muted border-transparent hover:border-brand-ink/20"
              )}
            >
              <Hash size={10} />
              Referencia de compra
            </button>
            <button
              onClick={() => setShowIdCompra(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border-2 border-brand-ink/20 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white transition-all"
            >
              <ShoppingCart size={10} />
              ID COMPRA
            </button>
            <AnimatePresence>
              {showReferencia && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden w-full"
                >
                  <div className="mt-1.5 px-2.5 py-2 rounded-lg bg-brand-bg border border-brand-border text-[11px] text-brand-ink font-mono">
                    {referenciaValue ? (
                      <span className="font-bold">{referenciaValue}</span>
                    ) : (
                      <span className="text-brand-muted italic">Sin referencia registrada</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ID COMPRA Modal */}
          <AnimatePresence>
            {showIdCompra && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowIdCompra(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-brand-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-5 border-b border-brand-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                        <ShoppingCart size={20} className="text-brand-accent" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-brand-ink uppercase tracking-tight">ID Compra</h3>
                        <p className="text-[10px] font-mono text-brand-muted">{batchId}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowIdCompra(false)} className="p-2 rounded-lg text-brand-muted hover:text-brand-ink hover:bg-brand-bg transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Datos de Pago */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
                        <div className="flex items-center gap-2 mb-3">
                          <CreditCard size={14} className="text-brand-accent" />
                          <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Tarjeta</span>
                        </div>
                        <span className="text-sm font-bold text-brand-ink">{product.payment_card || product.card || '-'}</span>
                      </div>
                      <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar size={14} className="text-brand-accent" />
                          <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Fecha</span>
                        </div>
                        <span className="text-sm font-bold text-brand-ink">
                          {product.fecha_registro 
                            ? new Date(product.fecha_registro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                            : product.createdAt
                              ? new Date(product.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '-'}
                        </span>
                      </div>
                      <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign size={14} className="text-brand-accent" />
                          <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Costo USD</span>
                        </div>
                        <span className="text-sm font-bold text-brand-ink">{formatCurrency(product.buyPriceUsd || 0)}</span>
                      </div>
                      <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign size={14} className="text-brand-accent" />
                          <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Costo MXN</span>
                        </div>
                        <span className="text-sm font-bold text-brand-ink">${(product.buyPriceMxn || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="bg-brand-bg rounded-xl p-4 border border-brand-border space-y-2">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-brand-muted font-bold">Boutique / Tienda</span>
                        <span className="text-brand-ink font-semibold">{product.boutique || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-brand-muted font-bold">Origen</span>
                        <span className="text-brand-ink font-semibold">{product.origen_articulo || 'USA'}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-brand-muted font-bold">Cantidad</span>
                        <span className="text-brand-ink font-semibold">{product.quantity || 1} ud(s)</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-brand-muted font-bold">Total USD</span>
                        <span className="text-brand-ink font-semibold">{formatCurrency((product.buyPriceUsd || 0) * (product.quantity || 1))}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-brand-muted font-bold">Total MXN</span>
                        <span className="text-brand-ink font-semibold">${((product.buyPriceMxn || 0) * (product.quantity || 1)).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Artículos en la misma compra */}
                    {siblingProducts.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-3">Artículos en esta compra</h4>
                        <div className="space-y-2">
                          {[product, ...siblingProducts].map(p => (
                            <div key={p.id} className="flex items-center gap-3 bg-brand-bg rounded-xl p-3 border border-brand-border">
                              <div className="w-8 h-8 rounded-lg bg-brand-ink/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {p.imageUrl && (p.imageUrl.startsWith('http') || p.imageUrl.startsWith('data:')) ? (
                                  <img src={getProxyImageUrl(p.imageUrl)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={14} className="text-brand-muted" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-brand-ink truncate">{p.name || 'Sin nombre'}</div>
                                <div className="text-[9px] text-brand-muted">{p.sku} · {p.size || 'N/A'}</div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-[10px] font-bold text-brand-ink">{formatCurrency(p.buyPriceUsd || 0)}</div>
                                <div className="text-[9px] text-brand-muted">${(p.buyPriceMxn || 0).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 p-3 rounded-xl bg-brand-accent/5 border border-brand-accent/10 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Total Compra</span>
                          <div className="text-right">
                            <div className="text-xs font-bold text-brand-ink">{formatCurrency([product, ...siblingProducts].reduce((s, p) => s + (p.buyPriceUsd || 0) * (p.quantity || 1), 0))} USD</div>
                            <div className="text-[10px] text-brand-muted">${[product, ...siblingProducts].reduce((s, p) => s + (p.buyPriceMxn || 0) * (p.quantity || 1), 0).toLocaleString()} MXN</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
            <span className="px-1.5 py-0.5 rounded bg-brand-accent/5 border border-brand-accent/20 text-brand-accent font-bold text-[9px] uppercase">{product.payment_card || product.card || '-'}</span>
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
