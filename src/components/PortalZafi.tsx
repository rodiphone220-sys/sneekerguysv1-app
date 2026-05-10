import React, { useState, useMemo } from 'react';
import { Package, Truck, AlertTriangle, Check, X, Search, Eye, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types';
import { cn, formatCurrency, getProxyImageUrl } from '../lib/utils';

interface PortalZafiProps {
  products: Product[];
  onShipProducts: (productIds: string[], shipmentId: string) => void;
  onReportIncident: (productId: string, type: 'damaged' | 'not_received') => void;
  isLoading?: boolean;
}

export function PortalZafi({ products, onShipProducts, onReportIncident, isLoading }: PortalZafiProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [incidentModal, setIncidentModal] = useState<{ productId: string; productName: string } | null>(null);

  const zafiProducts = useMemo(() => {
    return products.filter(p => {
      const matchesStatus = p.currentStatus === 'EN_BODEGA' || p.currentStatus === 'ENVIADO';
      const matchesSearch = searchQuery === '' || 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [products, searchQuery]);

  const overdueProducts = useMemo(() => {
    const now = new Date();
    return zafiProducts.filter(p => {
      if (!p.fechaActualizacion) return false;
      const updateDate = new Date(p.fechaActualizacion);
      const daysDiff = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 7;
    });
  }, [zafiProducts]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === zafiProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(zafiProducts.map(p => p.id)));
    }
  };

  const generateShipmentId = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `ZAFI-${now.getFullYear()}${month}-${random}`;
  };

  const handleShip = () => {
    if (selectedIds.size === 0) return;
    const shipmentId = generateShipmentId();
    onShipProducts(Array.from(selectedIds), shipmentId);
    setSelectedIds(new Set());
    setShowConfirmModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-brand-ink uppercase tracking-tight">Portal Safiro - El Paso</h2>
          <p className="text-xs text-brand-muted mt-1">Despacho de mercancía a México</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-brand-muted">{selectedIds.size} seleccionados</span>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={selectedIds.size === 0}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
              selectedIds.size > 0 
                ? "bg-green-500 text-white hover:bg-green-600 active:scale-95" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <Truck size={16} />
            Internar a México
          </button>
        </div>
      </div>

      {overdueProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-amber-500" />
            <span className="font-bold text-amber-700">Resagados en bodega ({overdueProducts.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {overdueProducts.map(p => (
              <span key={p.id} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                {p.name} ({Math.floor((new Date().getTime() - new Date(p.fechaActualizacion || Date.now()).getTime()) / (1000 * 60 * 60 * 24))} días)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por producto, cliente o SKU..."
          className="w-full pl-12 pr-4 py-3 bg-brand-surface border border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
        />
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-brand-ink text-brand-bg">
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size === zafiProducts.length && zafiProducts.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 rounded accent-white"
                />
              </th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Imagen</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Producto</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">SKU</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Tiempo en Bodega</th>
              <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {zafiProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-brand-muted">
                  <Package size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No hay productos en bodega</p>
                  <p className="text-[10px] mt-1">Los productos aparecerán aquí cuando lleguen a El Paso</p>
                </td>
              </tr>
            ) : (
              zafiProducts.map(product => {
                const isOverdue = overdueProducts.some(p => p.id === product.id);
                const daysInWarehouse = product.fechaActualizacion 
                  ? Math.floor((new Date().getTime() - new Date(product.fechaActualizacion).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                
                return (
                  <tr 
                    key={product.id} 
                    className={cn(
                      "border-t border-brand-border hover:bg-brand-bg/50 transition-colors",
                      isOverdue && "bg-amber-50/50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="w-4 h-4 rounded accent-brand-accent"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-brand-bg">
                        {product.imageUrl ? (
                          <img src={getProxyImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={20} className="text-brand-muted" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-brand-ink">{product.name}</p>
                      <p className="text-brand-muted">{product.brand}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{product.clientName || 'Sin asignar'}</td>
                    <td className="px-4 py-3 font-mono text-brand-muted">{product.sku}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isOverdue ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                            <AlertTriangle size={12} />
                            {daysInWarehouse} días
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-brand-muted">
                            <Clock size={12} />
                            {daysInWarehouse} días
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setIncidentModal({ productId: product.id, productName: product.name })}
                          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          title="Reportar incidencia"
                        >
                          <AlertTriangle size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-brand-surface border border-brand-border rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Truck size={24} className="text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-brand-ink">Confirmar Envío</h3>
                  <p className="text-xs text-brand-muted">{selectedIds.size} productos para México</p>
                </div>
              </div>
              
              <p className="text-sm text-brand-muted mb-6">
                ¿Estás seguro de que los {selectedIds.size} productos seleccionados están listos para ser despachados a San Luis Potosí?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-3 bg-brand-bg border border-brand-border rounded-xl font-bold text-sm hover:bg-brand-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleShip}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {incidentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIncidentModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-brand-surface border border-brand-border rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-brand-ink">Reportar Incidencia</h3>
                <button onClick={() => setIncidentModal(null)} className="p-2 hover:bg-brand-bg rounded-lg transition-colors">
                  <X size={20} className="text-brand-muted" />
                </button>
              </div>
              
              <p className="text-sm text-brand-muted mb-6">
                Producto: <span className="font-bold text-brand-ink">{incidentModal.productName}</span>
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    onReportIncident(incidentModal.productId, 'damaged');
                    setIncidentModal(null);
                  }}
                  className="w-full px-4 py-4 bg-red-50 border border-red-200 rounded-xl font-bold text-sm text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle size={16} />
                  Reportar como Dañado
                </button>
                <button
                  onClick={() => {
                    onReportIncident(incidentModal.productId, 'not_received');
                    setIncidentModal(null);
                  }}
                  className="w-full px-4 py-4 bg-gray-100 border border-gray-300 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  No Recibido / Cancelado
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}