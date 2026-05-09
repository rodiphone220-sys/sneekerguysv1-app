"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Search, 
  Calculator, 
  CreditCard, 
  DollarSign, 
  Tag, 
  Clock, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Clipboard,
  Loader2,
  ListFilter,
  ShoppingBag,
  TrendingUp,
  Info,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, Customer } from '../types';
import { cn } from '../lib/utils';
import { OCRModal } from './OCRModal';

interface ProductFormProps {
  product?: Product | null;
  onSave: (product: any | any[]) => void;
  onClose: () => void;
  exchangeRate?: number;
  customers?: Customer[];
  boutiques?: string[];
  masterCategories?: any[];
  globalMarkup?: number;
  onRefresh?: () => void;
}

const CATEGORIES = ['CALZADO', 'ACCESORIOS', 'STREETWEAR', 'COLECCIONABLES', 'OTROS'];
const GENDERS = ['HOMBRE', 'MUJER', 'UNISEX', 'KIDS'];
const STATUSES = ['En Tienda / Boutique', 'Tránsito a Warehouse', 'En Bodega (Ready)', 'Vendido / Entregado'];
const CARD_TYPES = ['AMEX CORPORATE', 'VISA BUSINESS', 'MASTERCARD BLACK', 'CITI PREMIER', 'EFECTIVO', 'TRANSFERENCIA', 'OTRO'];

// Helper to extract product info via AI (OCR)
const getRuntimeEnv = () => (window as any).__ENV__ || {};

const parseAmount = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const cleanValue = String(value).replace(/[$,\s]/g, '');
  const num = parseFloat(cleanValue);
  return isNaN(num) ? 0 : num;
};

// Compress image to reduce size
const compressImage = (base64: string, maxWidth = 400): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.onerror = reject;
    img.src = base64;
  });
};

const extractProductFromImage = async (base64Image: string) => {
  const env = getRuntimeEnv();
  const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || env.VITE_GROQ_API_KEY || '';
  
  if (!groqKey) {
    console.error('Missing GROQ_API_KEY');
    return {};
  }
  
  try {
    // Compress image first
    const compressed = await compressImage(base64Image);
    console.log('Compressed image size:', Math.round(compressed.length / 1024), 'KB');
    
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analiza esta imagen de etiqueta/producto y extrae en JSON válido: modelo, marca, categoria (CALZADO, ACCESORIOS, STREETWEAR, COLECCIONABLES), genero (HOMBRE, MUJER, UNISEX, KIDS), color, talla, precio_compra USD. Responde SOLO JSON.' },
            { type: 'image_url', image_url: { url: compressed } }
          ]
        }],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct'
      })
    });
    
    if (!res.ok) {
      console.error('AI OCR failed:', res.status);
      return {};
    }
    
    const data = await res.json();
    const response = data.response || '';
    
    // Try to parse JSON from response
    try {
      // Find JSON in response - handle nested objects
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Handle nested price object like {"USD": 25600}
        if (parsed.precio_compra && typeof parsed.precio_compra === 'object') {
          const priceValues = Object.values(parsed.precio_compra);
          if (priceValues.length > 0) {
            parsed.precio_compra = Number(priceValues[0]) || 0;
          }
        }
        
        return parsed;
      }
    } catch {
      console.error('Failed to parse JSON:', response);
    }
    
    return {};
  } catch (e) {
    console.error('AI OCR error:', e);
    return {};
  }
};

export function ProductForm({ 
  product, 
  onSave, 
  onClose, 
  exchangeRate: initialExchangeRate = 18.00,
  customers = [],
  boutiques = [],
  masterCategories = [],
  globalMarkup: initialGlobalMarkup = 30,
  onRefresh
}: ProductFormProps) {
  // Common data for the entire purchase session
  const [commonData, setCommonData] = useState({
    destination: 'MEXICO',
    exchangeRate: initialExchangeRate,
    sku_manual: '',
    internal_notes: '',
    boutique: '',
    payment_card: '',
    origen_articulo: 'USA',
    moneda_compra: 'USD',
  });

  // Array of items in this purchase
  const [items, setItems] = useState<any[]>(product ? [product] : [{
    id: Date.now(),
    name: '',
    brand: '',
    category: 'CALZADO',
    gender: 'UNISEX',
    color_description: '',
    size: '',
    buyPriceUsd: 0,
    buyPriceMxn: 0,
    sellPriceMxn: 0,
    quantity: 1,
    imageUrl: '',
    currentStatus: 'En Tienda / Boutique',
    isShowcase: true,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    clientIg: '',
    referido_por: '',
    metodo_pago_cliente: 'Efectivo/Transferencia',
    tags: []
  }]);

  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [globalMarkup, setGlobalMarkup] = useState(initialGlobalMarkup);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [ocrModalData, setOcrModalData] = useState({
    category: '',
    brand: '',
    name: '',
    gender: 'UNISEX',
    color_description: '',
    size: '',
    buyPriceUsd: 0,
  });

  const currentItem = items[activeItemIndex];

  const fetchExchangeRate = async () => {
    try {
      setIsUploading(true);
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      const rate = data.rates.MXN;
      
      setCommonData(prev => ({ ...prev, exchangeRate: rate }));
      
      // Update all items
      const updatedItems = items.map(item => {
        const buyPriceMxn = Math.round(item.buyPriceUsd * rate);
        // If we have a global markup, maybe we should update sell price too
        const sellPriceMxn = Math.round(buyPriceMxn * (1 + (globalMarkup / 100)));
        return {
          ...item,
          buyPriceMxn,
          sellPriceMxn: item.sellPriceMxn === 0 ? sellPriceMxn : item.sellPriceMxn
        };
      });
      setItems(updatedItems);
    } catch (error) {
      console.error("Error fetching rate:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const applyMarkupToAll = (markup: number) => {
    setGlobalMarkup(markup);
    const updatedItems = items.map(item => ({
      ...item,
      sellPriceMxn: Math.round(item.buyPriceMxn * (1 + (markup / 100)))
    }));
    setItems(updatedItems);
  };

  // El tipo de cambio se mantiene fijo. Solo se actualiza manualmente al presionar "Actualizar"
  // useEffect(() => {}, []);

  // OCR scanning with AI
  const scanImageWithAI = async (base64Image: string) => {
    const env = getRuntimeEnv();
    const hasAI = process.env.NEXT_PUBLIC_GROQ_API_KEY || env.GROQ_API_KEY || process.env.NEXT_PUBLIC_OLLAMA_URL;
    if (!hasAI) {
      console.error("Missing AI configuration");
      return;
    }
    
    setIsUploading(true);
    try {
      const data = await extractProductFromImage(base64Image);

      if (!data.modelo && !data.marca) {
        console.error("No se pudo extraer información del producto");
        return;
      }

      const ocrData = {
        category: data.categoria || currentItem.category,
        brand: data.marca || currentItem.brand,
        name: data.modelo || currentItem.name,
        gender: data.genero || currentItem.gender,
        color_description: data.color || currentItem.color_description,
        size: data.talla || currentItem.size,
        buyPriceUsd: parseFloat(data.precio_compra) || currentItem.buyPriceUsd,
      };

      updateItem(activeItemIndex, {
        name: ocrData.name,
        brand: ocrData.brand,
        category: ocrData.category,
        gender: ocrData.gender,
        color_description: ocrData.color_description,
        size: ocrData.size,
        buyPriceUsd: ocrData.buyPriceUsd,
        buyPriceMxn: Math.round((ocrData.buyPriceUsd || 0) * (commonData.exchangeRate)),
        imageUrl: base64Image
      });

      setOcrModalData(ocrData);
      setModalImageUrl(base64Image);
      setShowOCRModal(true);
    } catch (error) {
      console.error("AI Scan failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Handling clipboard paste
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = event.target?.result as string;
                    updateItem(activeItemIndex, { imageUrl: base64 });
                    scanImageWithAI(base64);
                };
                reader.readAsDataURL(blob);
            }
            e.preventDefault();
        }
    }
  }, [activeItemIndex, commonData.exchangeRate]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste as any);
    return () => window.removeEventListener('paste', handlePaste as any);
  }, [handlePaste]);

  const addItem = () => {
    setItems([...items, {
      id: Date.now(),
      name: '',
      brand: '',
      category: 'CALZADO',
      gender: 'UNISEX',
      color_description: '',
      size: '',
      buyPriceUsd: 0,
      buyPriceMxn: 0,
      sellPriceMxn: 0,
      quantity: 1,
      imageUrl: '',
      currentStatus: 'En Tienda / Boutique',
      isShowcase: true,
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      clientIg: '',
      referido_por: '',
      metodo_pago_cliente: 'Efectivo/Transferencia',
      tags: []
    }]);
    setActiveItemIndex(items.length);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== idx);
    setItems(newItems);
    if (activeItemIndex >= newItems.length) {
      setActiveItemIndex(newItems.length - 1);
    }
  };

  const updateItem = (idx: number, data: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], ...data };
    setItems(newItems);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        updateItem(idx, { imageUrl: base64 });
        scanImageWithAI(base64);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProducts = items.map(item => ({
      ...item,
      ...commonData
    }));
    onSave(product ? finalProducts[0] : finalProducts);
  };

  const selectCustomer = (c: Customer) => {
    updateItem(activeItemIndex, {
      clientName: c.name,
      clientEmail: c.email || '',
      clientPhone: c.phone || '',
      clientAddress: c.address || '',
      clientIg: c.ig_handle || '',
      referido_por: c.referido_por || ''
    });
    setCustomerSearch('');
    setShowCustomerSearch(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const globalTotalUsd = items.reduce((sum, item) => sum + (parseAmount(item.quantity) * parseAmount(item.buyPriceUsd)), 0);
  const globalTotalMxn = items.reduce((sum, item) => sum + (parseAmount(item.quantity) * parseAmount(item.buyPriceMxn)), 0);

  const handleOCRModalSave = (data: any) => {
    // Update the item with OCR data
    updateItem(activeItemIndex, {
      category: data.category,
      brand: data.brand,
      name: data.name,
      gender: data.gender,
      color_description: data.color_description,
      size: data.size,
      buyPriceUsd: data.moneda_compra === 'MXN' ? 0 : data.buyPriceUsd,
      buyPriceMxn: data.moneda_compra === 'MXN' ? (data.buyPriceUsd || 0) : Math.round((data.buyPriceUsd || 0) * (commonData.exchangeRate))
    });
    // Update commonData with currency selection
    if (data.moneda_compra) {
      const origen = data.moneda_compra === 'MXN' ? 'NACIONAL' : 'USA';
      setCommonData({
        ...commonData,
        moneda_compra: data.moneda_compra,
        origen_articulo: origen
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 lg:p-0">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[1400px] h-full lg:h-[90vh] bg-[#F1F3F2] rounded-[40px] shadow-2xl shadow-black/20 overflow-hidden flex flex-col relative border border-white/20"
      >
        <header className="px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-12 border border-brand-border">
               <Plus className="text-brand-ink" size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-black text-brand-ink uppercase tracking-tight leading-tight">
                 {product ? 'Edición de Registro' : 'Nueva Compra Consolidada'}
               </h2>
               <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.3em]">
                 Registro de Pedido Master
               </p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/50 hover:bg-white text-brand-ink rounded-full transition-all border border-brand-border hover:shadow-lg"
          >
            <X size={24} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-24">
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white mx-8 mb-4 rounded-[32px] border border-brand-border shadow-sm">
            {/* Left Panel: Global Configuration */}
            <div className="w-full lg:w-[380px] bg-[#F8FAF9] border-r border-brand-border p-8 flex flex-col gap-8 shrink-0 overflow-y-auto custom-scrollbar">
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-ink text-white flex items-center justify-center shadow-lg">
                    <Building2 size={16} />
                  </div>
                  <h3 className="text-xs font-black text-brand-ink uppercase tracking-widest italic">Configuración de Origen</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest pl-1">Destino Global</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                      <select 
                        value={commonData.destination}
                        onChange={e => setCommonData({ ...commonData, destination: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold appearance-none outline-none focus:border-brand-ink"
                      >
                        <option value="MEXICO">MEXICO</option>
                        <option value="USA">USA</option>
                        <option value="CANADA">CANADA</option>
                        <option value="OTRO">OTRO</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">T.C. Base (Real-time)</label>
                      <button 
                        type="button"
                        onClick={fetchExchangeRate}
                        className="text-[9px] font-black text-brand-accent uppercase hover:scale-105 transition-transform"
                      >
                        Actualizar
                      </button>
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent" size={16} />
                      <input 
                        type="number" 
                        step="0.01"
                        value={commonData.exchangeRate}
                        onChange={e => {
                          const rate = parseFloat(e.target.value) || 0;
                          setCommonData({ ...commonData, exchangeRate: rate });
                          // Auto update MXN costs and suggested sale prices when TC changes
                          const updatedItems = items.map(item => {
                            const buyMxn = Math.round(item.buyPriceUsd * rate);
                            const sellMxn = Math.round(buyMxn * (1 + (globalMarkup / 100)));
                            return {
                              ...item,
                              buyPriceMxn: buyMxn,
                              sellPriceMxn: sellMxn
                            };
                          });
                          setItems(updatedItems);
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center shadow-lg">
                    <TrendingUp size={16} />
                  </div>
                  <h3 className="text-xs font-black text-brand-ink uppercase tracking-widest italic">Gestor de Precios Sugeridos</h3>
                </div>

                <div className="bg-white/50 p-4 rounded-2xl border border-brand-border space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">% Ganancia Global</label>
                      <span className="text-[10px] font-black text-brand-ink">{globalMarkup}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={globalMarkup}
                      onChange={e => applyMarkupToAll(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-ink"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-brand-accent/5 rounded-xl border border-brand-accent/10">
                    <Info size={12} className="text-brand-accent" />
                    <p className="text-[9px] text-brand-muted font-bold leading-tight">
                      Este porcentaje se aplica sobre el costo en MXN para sugerir el precio de venta final.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent text-white flex items-center justify-center shadow-lg">
                      <Tag size={16} />
                    </div>
                    <h3 className="text-xs font-black text-brand-ink uppercase tracking-widest italic">Identificación</h3>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest pl-1">Identificador / SKU (Editable)</label>
                    <input 
                      type="text" 
                      value={commonData.sku_manual}
                      onChange={e => setCommonData({ ...commonData, sku_manual: e.target.value })}
                      placeholder="TSG26-00000"
                      className="w-full px-5 py-3 bg-white border border-brand-border rounded-xl text-sm font-mono font-bold outline-none focus:border-brand-ink border-b-2 border-brand-accent/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest pl-1">Notas Internas / Ubicación Física</label>
                    <textarea 
                      value={commonData.internal_notes}
                      onChange={e => setCommonData({ ...commonData, internal_notes: e.target.value })}
                      placeholder="Ej: Rack A4, Bodega Sur..."
                      rows={3}
                      className="w-full px-5 py-3 bg-white border border-brand-border rounded-xl text-sm outline-none focus:border-brand-ink resize-none"
                    />
                  </div>
                </div>
              </section>

              <section className="pt-6 border-t border-brand-border bg-brand-ink/5 p-4 rounded-2xl space-y-4">
                <h4 className="text-[10px] font-black text-brand-ink uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calculator size={14} className="text-brand-accent" /> Total Consolidado
                </h4>
                
                <div className="space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest pl-1">Tienda / Boutique</label>
                    <input 
                      type="text" 
                      value={commonData.boutique}
                      onChange={e => setCommonData({ ...commonData, boutique: e.target.value })}
                      placeholder="Ej: StockX"
                      className="w-full px-4 py-2.5 bg-white border border-brand-border rounded-xl text-xs font-bold outline-none focus:border-brand-ink"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest pl-1">Tarjeta de Pago</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" size={14} />
                      <select 
                        value={commonData.payment_card}
                        onChange={e => setCommonData({ ...commonData, payment_card: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-border rounded-xl text-xs font-bold appearance-none outline-none focus:border-brand-ink"
                      >
                        <option value="">Seleccionar Tarjeta</option>
                        {CARD_TYPES.map(card => <option key={card} value={card}>{card}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-brand-ink/10">
                  <div className="flex justify-between items-end border-b border-brand-border pb-2">
                    <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider">Monto USD</span>
                    <span className="text-xl font-mono font-black text-brand-ink">${globalTotalUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider italic">Inversión Final MXN</span>
                    <span className="text-xl font-mono font-black text-brand-accent">${globalTotalMxn.toLocaleString()}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Panel: Items Dynamic List */}
            <div className="flex-1 flex flex-col min-w-0 bg-white lg:h-full">
              {!product && (
                <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between shrink-0 bg-white z-10">
                  <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                    {items.map((item, idx) => (
                      <div key={idx} className="relative group shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveItemIndex(idx)}
                          className={cn(
                            "px-2 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all min-w-[70px] flex flex-col items-center gap-1",
                            activeItemIndex === idx ? "bg-brand-ink text-white shadow-lg shadow-black/10" : "bg-[#F8FAF9] text-brand-muted border border-brand-border hover:border-brand-ink"
                          )}
                        >
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt="" 
                              className="w-10 h-10 rounded-md object-cover border border-white/20"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center">
                              <ImageIcon size={16} className="text-gray-400" />
                            </div>
                          )}
                          <span className="text-[8px]">ÍTEM {idx + 1}</span>
                        </button>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Trash2 size={8} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-accent text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-accent/20"
                  >
                    <Plus size={14} /> Añadir Ítem
                  </motion.button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-10 custom-scrollbar pb-32">
                <main className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                  {/* Left Column: Image & OCR */}
                  <div className="xl:col-span-4 space-y-6">
                    {/* Tipo de Compra y Moneda - PRIMERO para evitar confusiones */}
                    <div className="bg-brand-surface border border-brand-border rounded-2xl p-5">
                      <div className="flex items-center gap-2 text-brand-ink mb-4">
                        <Tag size={16} className="text-brand-accent" />
                        <h3 className="text-xs font-black uppercase tracking-wider">Tipo de Compra y Moneda</h3>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        {/* Origen - Define tanto tipo de compra como moneda */}
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest block mb-2">Origen (Moneda)</label>
                          <div className="flex gap-2">
                            {[
                              { id: 'NACIONAL', emoji: '🇲🇽', currency: 'MXN' },
                              { id: 'USA', emoji: '🇺🇸', currency: 'USD' }
                            ].map(orig => (
                              <button
                                key={orig.id}
                                type="button"
                                onClick={() => setCommonData({
                                  ...commonData, 
                                  origen_articulo: orig.id,
                                  moneda_compra: orig.currency
                                })}
                                className={`flex-1 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                                  commonData.origen_articulo === orig.id 
                                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30' 
                                    : 'bg-white border-2 border-brand-border text-brand-muted hover:border-brand-ink'
                                }`}
                              >
                                {orig.emoji} {orig.id}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative group aspect-square rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center p-4 transition-all hover:border-brand-ink/30 overflow-hidden shadow-inner">
                      {currentItem.imageUrl ? (
                        <div 
                          className="absolute inset-0 flex items-center justify-center"
                          onClick={() => {
                            setModalImageUrl(currentItem.imageUrl);
                            setOcrModalData({
                              category: currentItem.category,
                              brand: currentItem.brand,
                              name: currentItem.name,
                              gender: currentItem.gender,
                              color_description: currentItem.color_description,
                              size: currentItem.size,
                              buyPriceUsd: currentItem.buyPriceUsd,
                            });
                            setShowOCRModal(true);
                          }}
                        >
                          <img 
                            src={currentItem.imageUrl} 
                            alt="Product preview" 
                            className="w-full h-full object-contain p-2 cursor-zoom-in"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <div className="p-3 rounded-full bg-white/90 text-brand-ink shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 transform cursor-zoom-in">
                              <Search size={22} />
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateItem(activeItemIndex, { imageUrl: '' });
                            }}
                            className="absolute top-3 right-3 p-2 rounded-full bg-red-500 text-white hover:scale-110 transition-transform opacity-0 group-hover:opacity-100 shadow-lg"
                          >
                            <X size={16} />
                          </button>
                          <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-brand-ink/80 backdrop-blur-sm rounded-full text-white text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                            Toca para ampliar y verificar OCR
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-brand-border flex items-center justify-center mx-auto text-brand-muted group-hover:text-brand-ink transition-colors">
                            {isUploading ? <Loader2 className="animate-spin" size={28} /> : <ImageIcon size={28} />}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-brand-ink">Subir imagen / Pegar</p>
                            <p className="text-[10px] text-brand-muted font-medium italic text-brand-accent">Ctrl+V para pegar directamente</p>
                          </div>
                          <label className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-all shadow-lg active:scale-95 w-full">
                            <Upload size={16} />
                            Subir Imagen
                            <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, activeItemIndex)} />
                          </label>
                        </div>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        if (currentItem.imageUrl) {
                          scanImageWithAI(currentItem.imageUrl);
                        }
                      }}
                      className={cn(
                        "w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.2em] transition-all border-2",
                        isUploading ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" : "bg-gradient-to-br from-brand-accent to-blue-600 border-brand-accent/20 text-white shadow-xl shadow-brand-accent/20 hover:scale-[1.02] active:scale-98"
                      )}
                    >
                      {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      {isUploading ? 'Escaneando con IA...' : 'Lector OCR / Inteligencia Artificial'}
                    </button>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-2 mb-2 text-brand-ink">
                        <Clipboard size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Tip de Usuario Master</span>
                      </div>
                      <p className="text-[11px] text-brand-muted leading-relaxed">
                        Copia la imagen de tu pedido (StockX, Nike, etc.) y <b>pégala directamente (Ctrl+V)</b> aquí para que la IA complete los datos por ti.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Information Flow */}
                  <div className="xl:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest flex items-center gap-2">
                          <Tag size={12} className="text-brand-accent" /> 1. Categoría
                        </label>
                        <select 
                          required
                          value={currentItem.category}
                          onChange={e => updateItem(activeItemIndex, { category: e.target.value })}
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-[#F8FAF9] appearance-none"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">2. Artículo (Marca)</label>
                        <input 
                          type="text" 
                          required
                          value={currentItem.brand}
                          onChange={e => updateItem(activeItemIndex, { brand: e.target.value })}
                          placeholder="Nike, Jordan, Adidas..."
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">3. Modelo</label>
                        <input 
                          type="text" 
                          required
                          value={currentItem.name}
                          onChange={e => updateItem(activeItemIndex, { name: e.target.value })}
                          placeholder="Air Jordan 1 Retro..."
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">4. Género</label>
                        <select 
                          value={currentItem.gender}
                          onChange={e => updateItem(activeItemIndex, { gender: e.target.value as any })}
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-[#F8FAF9]"
                        >
                          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">5. Color</label>
                        <input 
                          type="text" 
                          value={currentItem.color_description}
                          onChange={e => updateItem(activeItemIndex, { color_description: e.target.value })}
                          placeholder="Black/Red..."
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest italic flex items-center justify-between">
                          6. Talla
                          <span className="text-[9px] font-medium text-brand-muted lowercase">US, MX, EU...</span>
                        </label>
                        <input 
                          type="text" 
                          value={currentItem.size}
                          onChange={e => updateItem(activeItemIndex, { size: e.target.value })}
                          placeholder="8.5 US"
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-white"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-brand-border space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-brand-accent/5 border border-brand-accent/10 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                            currentItem.isShowcase ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" : "bg-white text-brand-muted border border-brand-border"
                          )}>
                            <ShoppingBag size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-brand-ink uppercase tracking-tight">Publicar en Vitrina</h4>
                            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest">Estado: {currentItem.isShowcase ? 'VISIBLE' : 'OCULTO'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={currentItem.isShowcase}
                            onChange={e => updateItem(activeItemIndex, { isShowcase: e.target.checked })}
                          />
                          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
                        </label>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-black text-brand-ink uppercase tracking-wider">Asignación de Cliente</h3>
                          <p className="text-[10px] text-brand-muted border-b border-brand-accent/30 inline-block">¿Para quién es este artículo?</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowNewCustomerModal(true)}
                            className="text-[10px] font-bold text-white bg-brand-accent border border-brand-accent px-4 py-2 rounded-xl hover:bg-brand-accent/90 transition-all flex items-center gap-2 shadow-sm"
                          >
                            <User size={14} /> Nuevo Cliente
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                            className="text-[10px] font-bold text-brand-ink bg-[#F8FAF9] border border-brand-border px-4 py-2 rounded-xl hover:bg-brand-ink hover:text-white transition-all flex items-center gap-2 shadow-sm"
                          >
                            <Search size={14} /> {showCustomerSearch ? 'Cerrar' : 'Buscar'}
                          </button>
                        </div>
                      </div>

                      {showCustomerSearch && (
                        <div className="bg-[#F8FAF9] border border-brand-border rounded-2xl p-4 space-y-4 shadow-inner">
                          <input 
                            autoFocus
                            type="text"
                            placeholder="Nombre, email o teléfono del cliente..."
                            value={customerSearch}
                            onChange={e => setCustomerSearch(e.target.value)}
                            className="w-full px-5 py-3 text-sm border border-brand-border rounded-xl outline-none focus:border-brand-ink bg-white shadow-sm"
                          />
                          <div className="max-h-56 overflow-y-auto divide-y divide-[#E0E5E2] bg-white rounded-xl border border-brand-border overflow-hidden">
                            {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => selectCustomer(c)}
                                className="w-full text-left p-4 hover:bg-brand-ink hover:text-white transition-all group flex items-center justify-between"
                              >
                                <div>
                                  <div className="text-sm font-bold flex items-center gap-2">
                                    {c.name}
                                    {currentItem.clientName === c.name && <CheckCircle2 size={14} className="text-brand-accent" />}
                                  </div>
                                  <div className="text-[10px] opacity-60 font-mono">{c.email || c.phone}</div>
                                </div>
                                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            )) : (
                              <div className="p-8 text-center text-brand-muted flex flex-col items-center gap-2">
                                <Search size={24} className="opacity-20" />
                                <span className="text-xs font-bold uppercase tracking-widest">Sin resultados</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {currentItem.clientName && !showCustomerSearch && (
                         <div className="flex items-center justify-between p-4 bg-[#F8FAF9] border border-brand-border rounded-xl">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-brand-ink text-white flex items-center justify-center text-[10px] font-black">
                               {currentItem.clientName.charAt(0).toUpperCase()}
                             </div>
                             <div>
                               <div className="text-xs font-bold text-brand-ink">{currentItem.clientName}</div>
                               <div className="text-[10px] text-brand-muted lowercase">{currentItem.clientEmail}</div>
                             </div>
                           </div>
                           <button 
                             type="button" 
                             onClick={() => updateItem(activeItemIndex, { clientName: '', clientEmail: '', clientPhone: '', clientAddress: '', clientIg: '', referido_por: '' })}
                             className="text-red-500 hover:scale-110 transition-transform"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                      )}
                    </div>

                    <div className="pt-8 border-t border-brand-border grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-brand-ink">
                          <Calculator size={16} className="text-brand-accent" />
                          <h3 className="text-xs font-black uppercase tracking-wider">Precio de Compra</h3>
                          <span className={commonData.moneda_compra === 'MXN' ? 'ml-auto text-[10px] font-bold bg-green-500 text-white px-2 py-1 rounded' : 'ml-auto text-[10px] font-bold bg-blue-600 text-white px-2 py-1 rounded'}>
                            {commonData.moneda_compra}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {commonData.moneda_compra === 'USD' ? (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Monto USD</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted font-mono text-sm">$</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  required
                                  value={currentItem.buyPriceUsd || ''}
                                  onChange={e => {
                                    const usd = parseFloat(e.target.value) || 0;
                                    const buyMxn = Math.round(usd * commonData.exchangeRate);
                                    const sellMxn = Math.round(buyMxn * (1 + (globalMarkup / 100)));
                                    updateItem(activeItemIndex, { 
                                      buyPriceUsd: usd,
                                      buyPriceMxn: buyMxn,
                                      sellPriceMxn: sellMxn
                                    });
                                  }}
                                  className="w-full pl-8 pr-4 py-3 border border-brand-border rounded-xl text-lg font-mono font-black outline-none focus:border-brand-ink bg-white shadow-inner"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          ) : null}
                          <div className={`space-y-2 ${commonData.moneda_compra === 'MXN' ? 'col-span-2' : ''}`}>
                            <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">
                              {commonData.moneda_compra === 'MXN' ? 'Monto en Pesos MXN' : 'Costo en MXN'}
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted font-mono text-sm">$</span>
                              <input 
                                type="number" 
                                step="0.01"
                                required
                                value={currentItem.buyPriceMxn || ''}
                                onChange={e => {
                                  const mxn = parseFloat(e.target.value) || 0;
                                  const sellMxn = Math.round(mxn * (1 + (globalMarkup / 100)));
                                  updateItem(activeItemIndex, { 
                                    buyPriceMxn: mxn,
                                    buyPriceUsd: commonData.moneda_compra === 'MXN' ? 0 : Math.round(mxn / commonData.exchangeRate * 100) / 100,
                                    sellPriceMxn: sellMxn
                                  });
                                }}
                                className="w-full pl-8 pr-4 py-3 border border-brand-border rounded-xl text-lg font-mono font-black outline-none focus:border-brand-ink bg-white shadow-inner"
                                placeholder="0.00"
                              />
                            </div>
                            {commonData.moneda_compra === 'USD' && (
                              <div className="text-[9px] font-bold opacity-30">T.C. {commonData.exchangeRate}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-brand-ink">
                          <CreditCard size={16} className="text-brand-accent" />
                          <h3 className="text-xs font-black uppercase tracking-wider">Precio Sugerido de Venta</h3>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest italic">
                            Venta Final ({commonData.moneda_compra === 'MXN' ? 'Sugerido en MXN' : 'Sugerido en MXN'})
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent font-mono text-sm">$</span>
                            <input 
                              type="number" 
                              value={currentItem.sellPriceMxn || ''}
                              onChange={e => updateItem(activeItemIndex, { sellPriceMxn: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                              className="w-full pl-8 pr-4 py-3 border-2 border-brand-accent/20 rounded-xl text-2xl font-mono font-black outline-none focus:border-brand-accent bg-brand-accent/5 transition-all text-brand-accent placeholder:text-brand-accent/20 shadow-md"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 group">
                              {currentItem.buyPriceMxn > 0 && (
                                <span className="text-[10px] font-black italic bg-brand-accent text-white px-2 py-0.5 rounded opacity-50 group-hover:opacity-100 transition-opacity">
                                  {Math.round(((currentItem.sellPriceMxn / currentItem.buyPriceMxn) - 1) * 100) || 0}% GANANCIA
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Utilidad Proyectada:</span>
                            <span className={cn(
                              "text-[10px] font-black font-mono",
                              ((currentItem.sellPriceMxn || 0) - (currentItem.buyPriceMxn || 0)) > 0 ? "text-green-600" : ((currentItem.sellPriceMxn || 0) - (currentItem.buyPriceMxn || 0)) < 0 ? "text-red-500" : "text-brand-muted"
                            )}>
                              ${((currentItem.sellPriceMxn || 0) - (currentItem.buyPriceMxn || 0)).toLocaleString()} MXN
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <footer className="w-full absolute bottom-0 left-0 bg-white/95 backdrop-blur-md border-t border-brand-border px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-50">
            <div className="flex items-center gap-4 text-brand-muted px-8">
               <div className="flex flex-col">
                 <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Total Consolidado</span>
                 <span className="text-15px font-bold text-brand-ink font-mono">
                   USD ${globalTotalUsd.toFixed(2)}
                 </span>
               </div>
               <div className="w-px h-6 bg-brand-border" />
               <div className="flex flex-col">
                 <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Inversión Final</span>
                 <span className="text-15px font-bold text-brand-accent font-mono">
                   MXN ${globalTotalMxn.toLocaleString()}
                 </span>
               </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto px-8">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                type="button" 
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold text-brand-muted hover:text-brand-ink text-sm transition-all border border-transparent hover:border-brand-border"
              >
                Cancelar
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                type="submit" 
                className="flex-1 md:flex-none px-10 py-3 rounded-xl font-bold bg-brand-ink text-white hover:bg-black transition-all text-sm shadow-xl shadow-black/10 flex items-center justify-center gap-2"
              >
                {product ? 'Actualizar Cambios' : `Registrar ${items.length} Artículos`}
                <span className="opacity-40"><ChevronRight size={16} /></span>
              </motion.button>
            </div>
          </footer>
        </form>

        <OCRModal
          imageUrl={modalImageUrl}
          ocrData={ocrModalData}
          isOpen={showOCRModal}
          onClose={() => setShowOCRModal(false)}
          onSave={handleOCRModalSave}
          itemIndex={activeItemIndex}
          totalItems={items.length}
        />

        {/* New Customer Modal */}
<AnimatePresence>
          {showNewCustomerModal && (
            <NewCustomerModal
              onClose={() => setShowNewCustomerModal(false)}
              onSave={(newCustomer) => {
                const updatedCustomers = [...customers, { ...newCustomer, id: newCustomer.id || `CUST-${Date.now()}` }];
                selectCustomer(updatedCustomers.find(c => c.id === newCustomer.id) || newCustomer);
                setShowNewCustomerModal(false);
                onRefresh && onRefresh();
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

interface NewCustomerModalProps {
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

function NewCustomerModal({ onClose, onSave }: NewCustomerModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    ig_handle: '',
    referido_por: '',
    notas: '',
    tipo_de_pago: 'Transferencia',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const idCliente = `CUST-${Date.now()}`;
      
      const payload = {
        id_cliente: idCliente,
        nombre: formData.name,
        telefono: formData.phone,
        email: formData.email,
        direccion: formData.address,
        ig_handle: formData.ig_handle,
        referido_por: formData.referido_por,
        notas: formData.notas,
        tipo_de_pago: formData.tipo_de_pago,
      };

      const response = await fetch('/api/clientes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          onSave({
            id: idCliente,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            ig_handle: formData.ig_handle,
            referido_por: formData.referido_por,
            notes: formData.notas,
            tipo_de_pago: formData.tipo_de_pago,
          } as Customer);
        }, 1000);
      } else {
        const err = await response.json();
        alert(`Error: ${err.error}`);
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-brand-surface border border-brand-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-brand-border flex items-center justify-between">
          <h2 className="text-lg font-black text-brand-ink uppercase tracking-tight">
            Nuevo Cliente
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-brand-muted hover:text-brand-ink hover:bg-brand-bg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-brand-bg border border-white/10 rounded-lg py-2.5 pl-11 pr-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm text-brand-ink"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                <input 
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-brand-bg border border-white/10 rounded-lg py-2.5 pl-11 pr-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm text-brand-ink"
                  placeholder="5512345678"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-brand-bg border border-white/10 rounded-lg py-2.5 pl-11 pr-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm text-brand-ink"
                  placeholder="juan@email.com"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2">Ciudad / Estado</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                <input 
                  type="text"
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-brand-bg border border-white/10 rounded-lg py-2.5 pl-11 pr-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm text-brand-ink"
                  placeholder="Ciudad de México, CDMX"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2">Instagram</label>
              <input 
                type="text"
                value={formData.ig_handle}
                onChange={e => setFormData({ ...formData, ig_handle: e.target.value })}
                className="w-full bg-brand-bg border border-white/10 rounded-lg py-2.5 px-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm text-brand-ink"
                placeholder="@usuario"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2">Referido Por</label>
              <input 
                type="text"
                value={formData.referido_por}
                onChange={e => setFormData({ ...formData, referido_por: e.target.value })}
                className="w-full bg-brand-bg border border-white/10 rounded-lg py-2.5 px-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm text-brand-ink"
                placeholder="Nombre"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2">Notas</label>
              <textarea 
                value={formData.notas}
                onChange={e => setFormData({ ...formData, notas: e.target.value })}
                rows={3}
                className="w-full bg-brand-bg border border-white/10 rounded-lg py-2.5 px-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm text-brand-ink resize-none"
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-bold text-sm border border-brand-border text-brand-muted hover:bg-brand-bg transition-colors"
            >
              Cancelar
            </button>
            <motion.button 
              type="submit"
              disabled={isSaving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex-1 py-3 rounded-lg font-bold text-sm tracking-tight flex items-center justify-center gap-2 transition-all",
                showSuccess 
                  ? "bg-green-500 text-white" 
                  : "bg-brand-ink text-brand-bg hover:opacity-90"
              )}
            >
              {showSuccess ? (
                <>Guardado <Check size={16} /></>
              ) : isSaving ? (
                <div className="w-5 h-5 border-2 border-brand-bg/30 border-t-brand-bg rounded-full animate-spin" />
              ) : (
                <>Guardar <Plus size={16} /></>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Check({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
