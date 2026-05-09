"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface OCRData {
  category?: string;
  brand?: string;
  name?: string;
  gender?: string;
  color_description?: string;
  size?: string;
  buyPriceUsd?: number;
  moneda_compra?: 'USD' | 'MXN';
}

interface OCRModalProps {
  imageUrl: string;
  ocrData: OCRData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: OCRData) => void;
  itemIndex: number;
  totalItems: number;
}

const CATEGORIES = ['CALZADO', 'ACCESORIOS', 'STREETWEAR', 'COLECCIONABLES', 'OTROS'];
const GENDERS = ['HOMBRE', 'MUJER', 'UNISEX', 'KIDS'];

export function OCRModal({ imageUrl, ocrData, isOpen, onClose, onSave, itemIndex, totalItems }: OCRModalProps) {
  const [localData, setLocalData] = useState<OCRData>(ocrData);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalData(ocrData);
    setHasChanges(false);
  }, [ocrData, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
      if (e.key === '+' || e.key === '=') {
        setZoomLevel(z => Math.min(z + 0.25, 3));
      }
      if (e.key === '-') {
        setZoomLevel(z => Math.max(z - 0.25, 0.5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleChange = (field: keyof OCRData, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleClose = () => {
    if (hasChanges) {
      onSave(localData);
    }
    onClose();
  };

  const handleSave = () => {
    onSave(localData);
    onClose();
  };

  const handleReset = () => {
    setLocalData(ocrData);
    setHasChanges(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 z-[200] bg-[#0D0D0D]/95 backdrop-blur-xl flex items-center justify-center p-4 lg:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocr-modal-title"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-6xl h-[85vh] bg-[#1A1A1A] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-brand-ink border-b border-white/10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-accent to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
                <Search size={20} className="text-white" />
              </div>
              <div>
                <h2 id="ocr-modal-title" className="text-white font-black text-lg uppercase tracking-tight">
                  Verificación OCR
                </h2>
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                  Item {itemIndex + 1} de {totalItems} • Compara la imagen con los datos detectados
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
                <button
                  onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
                  title="Alejar (-)"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-white/70 text-[10px] font-mono px-2">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3))}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
                  title="Acercar (+)"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-all"
                  title="Reset zoom"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
              
              <button
                onClick={handleClose}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
                aria-label="Cerrar modal"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Split View Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Image Viewer */}
            <div 
              className="flex-1 bg-[#0a0a0a] overflow-hidden p-6 flex items-center justify-center min-w-0 relative"
              onWheel={(e) => {
                e.preventDefault();
                setZoomLevel(z => Math.max(0.5, Math.min(3, z - e.deltaY * 0.002)));
              }}
            >
              <motion.div 
                className="relative"
                drag={zoomLevel > 1}
                dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
                dragMomentum={false}
              >
                <motion.img
                  src={imageUrl}
                  alt="Product label for OCR verification"
                  animate={{ scale: zoomLevel }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl border border-white/10 cursor-grab active:cursor-grabbing"
                  draggable={false}
                />
              </motion.div>
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-[#1A1A1A]/80 p-2 rounded-full border border-white/10 backdrop-blur-sm">
                <button onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
                  <ZoomOut size={16} />
                </button>
                <span className="px-3 py-2 text-white/70 text-xs font-mono">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3))} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
                  <ZoomIn size={16} />
                </button>
                <button onClick={() => setZoomLevel(1)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded">
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px bg-white/10" />

            {/* Right: Quick Edit Form */}
            <div className="w-[380px] xl:w-[420px] bg-[#F8FAF9] overflow-y-auto p-6 space-y-6 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-brand-ink font-black text-sm uppercase tracking-widest">
                  Datos Detectados por OCR
                </h3>
                {hasChanges && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-full">
                    Editado
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Categoría</label>
                  <select
                    value={localData.category || ''}
                    onChange={e => handleChange('category', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
                  >
                    <option value="">Seleccionar...</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Marca</label>
                  <input
                    type="text"
                    value={localData.brand || ''}
                    onChange={e => handleChange('brand', e.target.value)}
                    placeholder="Nike, Jordan, Adidas..."
                    className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
                  />
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Modelo</label>
                  <input
                    type="text"
                    value={localData.name || ''}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="Air Jordan 1 Retro..."
                    className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
                  />
                </div>

                {/* Gender & Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Género</label>
                    <select
                      value={localData.gender || ''}
                      onChange={e => handleChange('gender', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
                    >
                      <option value="">Seleccionar...</option>
                      {GENDERS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Color</label>
                    <input
                      type="text"
                      value={localData.color_description || ''}
                      onChange={e => handleChange('color_description', e.target.value)}
                      placeholder="Black/Red"
                      className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
                    />
                  </div>
                </div>

                {/* Size */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Talla</label>
                  <input
                    type="text"
                    value={localData.size || ''}
                    onChange={e => handleChange('size', e.target.value)}
                    placeholder="8.5 US"
                    className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
                  />
                </div>

                {/* Currency Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Tipo de Compra</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleChange('moneda_compra', 'USD')}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                        localData.moneda_compra !== 'MXN' 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : 'bg-white border-2 border-brand-border text-brand-muted'
                      }`}
                    >
                      🇺🇸 USD
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('moneda_compra', 'MXN')}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                        localData.moneda_compra === 'MXN' 
                          ? 'bg-green-500 text-white shadow-lg' 
                          : 'bg-white border-2 border-brand-border text-brand-muted'
                      }`}
                    >
                      🇲🇽 MXN
                    </button>
                  </div>
                </div>

                {/* Price - Solo mostrar si es USD */}
                {localData.moneda_compra !== 'MXN' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Precio USD</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted font-mono">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={localData.buyPriceUsd || ''}
                        onChange={e => handleChange('buyPriceUsd', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-mono font-bold outline-none focus:border-brand-ink transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Price MXN - Solo mostrar si es MXN */}
                {localData.moneda_compra === 'MXN' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Precio MXN</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted font-mono">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={localData.buyPriceUsd || ''}
                        onChange={e => handleChange('buyPriceUsd', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-mono font-bold outline-none focus:border-brand-ink transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-brand-border space-y-3">
                <button
                  onClick={handleSave}
                  className="w-full py-4 bg-brand-ink text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Aplicar Cambios
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 bg-white border border-brand-border text-brand-muted rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Resetear
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 py-3 bg-white border border-brand-border text-brand-muted rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    {hasChanges ? 'Guardar y Cerrar' : 'Cerrar'}
                  </button>
                </div>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="p-3 bg-brand-ink/5 rounded-xl border border-brand-border/20">
                <p className="text-[9px] text-brand-muted font-bold uppercase tracking-widest text-center">
                  Atajos: ESC cerrar • +/- zoom
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}