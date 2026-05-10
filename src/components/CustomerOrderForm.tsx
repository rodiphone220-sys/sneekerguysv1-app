import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, CustomerOrder, Category } from '../types';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Map, 
  ShoppingBag, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Navigation,
  Loader2,
  Plus,
  CreditCard,
  Hash,
  Info,
  Clock
} from 'lucide-react';
import { cn, formatCurrency, getProxyImageUrl } from '../lib/utils';

interface CustomerOrderFormProps {
  availableProducts: Product[];
  masterCategories?: Category[];
  globalMarkup?: number;
  onOrderSubmit: (order: CustomerOrder) => void;
  onClose?: () => void;
}

export function CustomerOrderForm({ availableProducts, masterCategories = [], globalMarkup = 35, onOrderSubmit, onClose }: CustomerOrderFormProps) {
  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    ig_handle: '',
    referido_por: '',
    tipo_de_pago: 'Transferencia/Efectivo',
    prioridad: 'Normal',
  });

  const [items, setItems] = React.useState<any[]>([
    {
      modelo_seleccionado: '',
      sku_referencia: '',
      talla: '',
      cantidad: 1,
      notas: ''
    }
  ]);
  const [activeItemIndex, setActiveItemIndex] = React.useState(0);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = React.useState<string | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const totalPrice = React.useMemo(() => {
    return items.reduce((sum, item) => {
      const p = availableProducts.find(prod => prod.sku === item.sku_referencia);
      const unitPrice = p ? ((p.sellPriceMxn && p.sellPriceMxn > 0) ? p.sellPriceMxn : Math.round((p.buyPriceMxn || 0) * (1 + (globalMarkup / 100)))) : 0;
      return sum + (unitPrice * item.cantidad);
    }, 0);
  }, [items, availableProducts, globalMarkup]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateItem = (index: number, fields: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...fields };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      modelo_seleccionado: '',
      sku_referencia: '',
      talla: '',
      cantidad: 1,
      notas: ''
    }]);
    setActiveItemIndex(items.length);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    setActiveItemIndex(Math.max(0, index - 1));
  };

  const handleProductSelect = (product: Product, index: number) => {
    const unitPrice = (product.sellPriceMxn && product.sellPriceMxn > 0) 
      ? product.sellPriceMxn 
      : Math.round((product.buyPriceMxn || 0) * (1 + (globalMarkup / 100)));

    updateItem(index, { 
      modelo_seleccionado: product.name,
      sku_referencia: product.sku,
      precio_unitario: unitPrice,
      talla: '' 
    });
  };

  const subcategoriesForSelected = React.useMemo(() => {
    if (!selectedCategory) return [];
    const cat = masterCategories.find(c => c.name === selectedCategory);
    return cat ? cat.subcategories : [];
  }, [selectedCategory, masterCategories]);

  const filteredDisplayProducts = React.useMemo(() => {
    const normalize = (s: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

    return availableProducts.filter(p => {
      const pCat = normalize(p.category);
      const sCat = normalize(selectedCategory || '');
      const pSub = normalize(p.subcategory || '');
      const sSub = normalize(selectedSubcategory || '');

      const matchesCat = !selectedCategory || pCat === sCat;
      const matchesSub = !selectedSubcategory || pSub === sSub;
      
      return matchesCat && matchesSub;
    });
  }, [availableProducts, selectedCategory, selectedSubcategory]);

  const scrollToCategory = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedSubcategory(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLocationRequest = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            direccion: `${prev.direccion} (GPS: ${position.coords.latitude}, ${position.coords.longitude})`.trim()
          }));
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // We send multiple orders if they are different items, or a combined structure.
    // The current api/orders takes ONE CustomerOrder. 
    // Usually these multi-item requests are better served as an array or a single payload with items.
    // I'll map them to the format the server expects.
    
    for (const item of items) {
      const order: CustomerOrder = {
        ...formData,
        ...item,
        prioridad: formData.prioridad as any,
        total_mxn: (item.precio_unitario || 0) * (item.cantidad || 1),
        id_cliente: `CUST-${Date.now()}`,
        fecha_pedido: new Date().toISOString(),
        status: 'Pendiente'
      };
      await onOrderSubmit(order);
    }
    
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  const currentItem = items[activeItemIndex];
  const selectedProduct = availableProducts.find(p => p.sku === currentItem.sku_referencia);
  const availableSizes = selectedProduct?.size ? [selectedProduct.size] : ['8 US', '8.5 US', '9 US', '9.5 US', '10 US', '10.5 US', '11 US'];

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl text-white">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500 border border-green-500/30">
            <CheckCircle2 size={48} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">¡Pedido Confirmado!</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Tu orden ha sido registrada exitosamente. Nos pondremos en contacto contigo pronto.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-white/90 transition-all border-b-4 border-gray-300"
          >
            Volver
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans overflow-y-auto overflow-x-hidden selection:bg-white selection:text-black scrollbar-hide">
      {/* Background Decals */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[100%] lg:w-[60%] h-[100%] lg:h-[60%] bg-blue-500/30 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-0 lg:-right-[10%] w-[100%] lg:w-[50%] h-[100%] lg:h-[50%] bg-purple-500/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative min-h-screen flex flex-col p-4 lg:p-6 pb-40 max-w-md mx-auto w-full">
        {/* Header */}
        <header className="flex justify-between items-start pt-4 mb-8 lg:mb-12">
          <div className="space-y-1">
            <h1 className="text-3xl lg:text-4xl font-black tracking-tighter italic uppercase leading-none">
              Sneeker<span className="text-white/40">Portal</span>
            </h1>
            <p className="text-[8px] lg:text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 italic">
              Order Official • {step} of 2
            </p>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2.5 lg:p-3 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </header>

        <form onSubmit={handleSubmit} className="flex-1 space-y-6 lg:space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-xl font-black uppercase italic tracking-tight">Registro de Cliente</h2>
                  <p className="text-white/40 text-[12px] font-medium uppercase tracking-wider">Tus datos para la entrega</p>
                </div>

                <div className="space-y-6">
                  {/* Name */}
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                      <User size={12} /> Nombre Completo
                    </label>
                    <input 
                      type="text"
                      name="nombre"
                      required
                      value={formData.nombre}
                      onChange={handleInputChange}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Instagram/Redes */}
                    <div className="group space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                        REDES SOCIALES
                      </label>
                      <input 
                        type="text"
                        name="ig_handle"
                        value={formData.ig_handle}
                        onChange={handleInputChange}
                        placeholder="@tu_usuario"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold placeholder:text-white/10 focus:outline-none focus:border-white transition-all backdrop-blur-md"
                      />
                    </div>
                    {/* Referido */}
                    <div className="group space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                        Referido Por
                      </label>
                      <input 
                        type="text"
                        name="referido_por"
                        value={formData.referido_por}
                        onChange={handleInputChange}
                        placeholder="Amigo, Ad, etc."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold placeholder:text-white/10 focus:outline-none focus:border-white transition-all backdrop-blur-md"
                      />
                    </div>
                  </div>

                  {/* Payment Preference */}
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                      <CreditCard size={12} /> PREFERENCIA DE PAGO
                    </label>
                    <select 
                      name="tipo_de_pago"
                      value={formData.tipo_de_pago}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md appearance-none"
                    >
                      <option value="Transferencia/Efectivo" className="bg-[#1A1A1A]">Transferencia / Efectivo</option>
                      <option value="Tarjeta de Crédito" className="bg-[#1A1A1A]">Tarjeta de Crédito / Débito</option>
                      <option value="Depósito OXXO" className="bg-[#1A1A1A]">Depósito OXXO</option>
                      <option value="Mercado Pago" className="bg-[#1A1A1A]">Mercado Pago</option>
                    </select>
                  </div>

                  {/* Priority Selector */}
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                      <Clock size={12} /> PRIORIDAD DEL PEDIDO
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Normal', 'Alta', 'Urgente'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, prioridad: p }))}
                          className={cn(
                            "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                            formData.prioridad === p 
                              ? p === 'Urgente' ? "bg-red-500 text-white border-red-500" :
                                p === 'Alta' ? "bg-orange-500 text-white border-orange-500" :
                                "bg-white text-black border-white shadow-lg shadow-white/10" 
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                      <Phone size={12} /> Teléfono
                    </label>
                    <input 
                      type="tel"
                      name="telefono"
                      required
                      value={formData.telefono}
                      onChange={handleInputChange}
                      placeholder="+52 000 000 000"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                  </div>

                  {/* Email */}
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                      <Mail size={12} /> Correo Electrónico
                    </label>
                    <input 
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="tu@email.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md"
                    />
                  </div>

                  {/* Address */}
                  <div className="group space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 group-focus-within:text-white transition-colors flex items-center gap-2">
                        <MapPin size={12} /> Dirección de Entrega
                      </label>
                      <button 
                        type="button"
                        onClick={handleLocationRequest}
                        disabled={isLocating}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {isLocating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                        {isLocating ? 'Ubicando...' : 'Obtener GPS'}
                      </button>
                    </div>
                    <textarea 
                      name="direccion"
                      required
                      value={formData.direccion}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Calle, Número, Colonia, Ciudad..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                <div className="space-y-10">
                  <div className="space-y-1 text-center py-4 relative">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <span className="inline-block text-[8px] font-black uppercase tracking-[0.6em] text-blue-400 mb-2">Curador de Tendencias</span>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">Vitrina de Productos</h2>
                    <p className="text-white/30 text-[10px] font-medium uppercase tracking-[0.2em]">Explora nuestro inventario predictivo de alta gama</p>
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>

                  {/* Category Selection Sidebar/Header */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/5" />
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Selección de Órbita</span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>
                    
                    <div className="flex items-center gap-6 overflow-x-auto pb-10 pt-4 scrollbar-hide -mx-6 px-10 relative">
                      {/* Hint Overlay for Scrollability */}
                      <div className="absolute right-0 top-0 bottom-10 w-20 bg-gradient-to-l from-black to-transparent pointer-events-none z-10" />
                      
                      <motion.button
                        type="button"
                        whileHover={{ y: -8 }}
                        onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
                        className={cn(
                          "flex flex-col items-center justify-center min-w-[110px] h-[140px] rounded-[2.5rem] border-2 transition-all duration-500 gap-3 relative overflow-hidden group",
                          !selectedCategory 
                            ? "bg-white border-white text-black shadow-[0_25px_50px_rgba(255,255,255,0.15)]" 
                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-1 shadow-inner transition-transform duration-500 group-hover:scale-110",
                          !selectedCategory ? "bg-black text-white" : "bg-white/10"
                        )}>
                          🔥
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Universal</span>
                        {!selectedCategory && (
                          <motion.div layoutId="orbit-glow" className="absolute inset-0 bg-white/10 pointer-events-none" />
                        )}
                      </motion.button>

                      {masterCategories.map(cat => {
                        const catName = cat.name;
                        const icon = cat.icon || (
                          catName?.toUpperCase().includes('CALZADO') ? '👟' : 
                          catName?.toUpperCase().includes('ROPA') ? '👕' : 
                          catName?.toUpperCase().includes('ELECTRONICA') ? '📱' : 
                          catName?.toUpperCase().includes('ACCESORIOS') ? '💎' : 
                          catName?.toUpperCase().includes('CUIDADO') ? '🧼' : '✨'
                        );

                        const isSelected = selectedCategory === catName;

                        return (
                          <motion.button
                            key={catName}
                            type="button"
                            whileHover={{ y: -10 }}
                            onClick={() => scrollToCategory(catName)}
                            className={cn(
                              "flex flex-col items-center justify-center min-w-[120px] h-[150px] rounded-[2.8rem] border-2 transition-all duration-700 gap-4 relative group",
                              isSelected 
                                ? "bg-[#1A1A1A] border-white text-white shadow-[0_35px_70px_rgba(0,0,0,0.4)] scale-105 z-10" 
                                : "bg-white/5 border-white/5 text-white/30 hover:border-white/10 hover:bg-white/10"
                            )}
                          >
                            <div className={cn(
                              "w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-3xl transition-all duration-700 shadow-2xl",
                              isSelected 
                                ? "bg-brand-accent text-black rotate-3 scale-110 shadow-brand-accent/20" 
                                : "bg-white/5 group-hover:rotate-6"
                            )}>
                              {icon}
                            </div>
                            <div className="text-center px-4">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-[0.15em] block leading-tight",
                                isSelected ? "text-white" : "text-white/40 group-hover:text-white/60"
                              )}>{catName}</span>
                              {isSelected && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 w-1 h-1 bg-brand-accent rounded-full mx-auto" />
                              )}
                            </div>
                            {isSelected && (
                              <motion.div layoutId="orbit-glow" className="absolute -inset-0.5 border-2 border-brand-accent/30 rounded-[2.8rem] blur-sm pointer-events-none" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    {selectedCategory && subcategoriesForSelected.length > 0 && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 border-b border-white/5"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSubcategory(null)}
                          className={cn(
                            "px-5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-[0.3em] transition-all",
                            !selectedSubcategory ? "bg-white/15 text-white" : "text-white/30 hover:text-white"
                          )}
                        >
                          Ver Todo
                        </button>
                        {subcategoriesForSelected.map(sub => {
                          const isSubSelected = selectedSubcategory === sub;
                          return (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => setSelectedSubcategory(sub)}
                              className={cn(
                                "px-5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-[0.3em] whitespace-nowrap transition-all",
                                isSubSelected ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-white/30 border border-white/5 hover:bg-white/10"
                              )}
                            >
                              {sub}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>

                  {/* Multi-Item Management Bar */}
                  <div className="p-6 bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.4em] text-white/30 relative z-10">
                      <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Tu Configuración ({items.length})
                      </span>
                      <button 
                        type="button"
                        onClick={addItem}
                        className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full text-blue-400 font-bold flex items-center gap-2 transition-all"
                      >
                        <Plus size={10} /> Añadir Nodo
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide mt-5 relative z-10">
                      {items.map((it, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveItemIndex(idx)}
                          className={cn(
                            "px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] border transition-all duration-500 whitespace-nowrap flex items-center gap-3",
                            activeItemIndex === idx 
                              ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-105" 
                              : "bg-white/5 text-white/30 border-white/5 hover:border-white/20"
                          )}
                        >
                          {it.modelo_seleccionado ? it.modelo_seleccionado : `Módulo ${idx + 1}`}
                          {items.length > 1 && idx === activeItemIndex && (
                            <X size={10} className="ml-2 hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); removeItem(idx); }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-20 pb-40">
                  {filteredDisplayProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-6 opacity-20">
                      <ShoppingBag size={64} strokeWidth={0.5} />
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-black uppercase tracking-[0.5em]">Órbita Vacía</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest">No hay nodos disponibles para esta selección</p>
                      </div>
                    </div>
                  ) : (
                    Array.from(new Set(filteredDisplayProducts.map(p => p.category))).sort().map(cat => (
                      <div key={cat} id={`cat-${cat}`} className="space-y-10 scroll-mt-32">
                        <div className="flex flex-col items-center gap-4">
                          <span className="text-[10px] font-black uppercase tracking-[1em] text-white/10 ml-[1em]">{cat}</span>
                          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-10">
                          {filteredDisplayProducts.filter(p => p.category === cat).map((p) => {
                            const isSelectedForActive = currentItem.sku_referencia === p.sku;
                            const isSelectedInAny = items.some(it => it.sku_referencia === p.sku);
                            
                            return (
                              <motion.div
                                key={p.id}
                                whileHover={{ y: -8 }}
                                onClick={() => handleProductSelect(p, activeItemIndex)}
                                className={cn(
                                  "group/card relative flex flex-col rounded-[3.5rem] border transition-all duration-700 cursor-pointer overflow-hidden",
                                  isSelectedForActive 
                                    ? "bg-white border-white ring-[1.5rem] ring-white/5" 
                                    : isSelectedInAny
                                      ? "bg-white/10 border-white/30"
                                      : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/[0.02]"
                                )}
                              >
                                <div className="aspect-[4/5] relative overflow-hidden bg-black">
                                  <img 
                                    src={getProxyImageUrl(p.imageUrl) || 'https://picsum.photos/seed/placeholder/600/800'} 
                                    alt={p.name} 
                                    className={cn(
                                      "w-full h-full object-cover transition-all duration-[1.5s] ease-out group-hover/card:scale-110",
                                      isSelectedForActive ? "opacity-90 blur-[2px]" : "opacity-80 group-hover/card:opacity-100"
                                    )}
                                    crossOrigin="anonymous"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className={cn(
                                    "absolute inset-0 bg-gradient-to-t transition-all duration-700",
                                    isSelectedForActive 
                                      ? "from-white via-white/80 to-transparent" 
                                      : "from-black via-black/20 to-transparent opacity-60 group-hover/card:opacity-40"
                                  )} />
                                  
                                  <div className="absolute top-8 left-8 right-8 z-10 flex justify-between items-start">
                                    <div className="space-y-2">
                                      <span className={cn(
                                        "block text-[8px] font-black uppercase tracking-[0.4em] mb-1 px-3 py-1 rounded-full backdrop-blur-md transition-colors",
                                        isSelectedForActive ? "text-black/50 bg-black/5" : "text-white/40 bg-white/5"
                                      )}>
                                        {p.brand}
                                      </span>
                                      <h4 className={cn(
                                        "text-4xl font-black uppercase italic tracking-tighter leading-[0.8] max-w-[200px] transition-colors", 
                                        isSelectedForActive ? "text-black" : "text-white"
                                      )}>
                                        {p.name}
                                      </h4>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 items-end">
                                      {p.isShowcase && (
                                        <div className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-2xl">
                                          PRIORITY
                                        </div>
                                      )}
                                      {isSelectedForActive && (
                                        <motion.div 
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className="w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-2xl shadow-black/40"
                                        >
                                          <CheckCircle2 size={24} className="text-white" />
                                        </motion.div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="absolute bottom-8 left-8 right-8 z-10 flex justify-between items-end">
                                    <div className="space-y-1">
                                      <span className={cn("text-[7px] font-black uppercase tracking-[0.4em] block", isSelectedForActive ? "text-black/40" : "text-white/30")}>Predictive Value</span>
                                      <div className={cn("text-4xl font-black tracking-tighter italic", isSelectedForActive ? "text-black" : "text-white")}>
                                        ${((p.sellPriceMxn && p.sellPriceMxn > 0) ? p.sellPriceMxn : Math.round((p.buyPriceMxn || 0) * (1 + (globalMarkup / 100)))).toLocaleString()}
                                      </div>
                                    </div>
                                    <div className={cn("text-right font-mono transition-colors", isSelectedForActive ? "text-black/60" : "text-white/40")}>
                                      <span className="text-[7px] font-black uppercase tracking-[0.3em] block mb-1">Global Ref</span>
                                      <span className="text-sm font-bold">{formatCurrency((p.buyPriceUsd || 0) * (1 + (globalMarkup / 100)))}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {p.notes && !isSelectedForActive && (
                                  <div className="p-8 bg-black/60 backdrop-blur-xl border-t border-white/5">
                                    <p className="text-[10px] leading-relaxed font-medium uppercase tracking-[0.1em] text-white/50 line-clamp-2">
                                      {p.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Decorative Glow on Hover */}
                                <div className="absolute inset-0 border border-blue-500/0 group-hover/card:border-blue-500/20 rounded-[3.5rem] transition-all duration-700 pointer-events-none" />
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Final Selection Details (Talla, Cantidad, Pago) */}
                {selectedProduct && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-10 pt-10 border-t border-white/10"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
                          Dimensión / Talla US
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-3 pb-2 -mx-4 px-4 scrollbar-hide">
                        {availableSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => updateItem(activeItemIndex, { talla: size })}
                            className={cn(
                              "px-8 py-5 rounded-[2rem] text-[15px] font-black min-w-[80px] border transition-all duration-500 shrink-0",
                              currentItem.talla === size 
                                ? "bg-white border-white text-black scale-110 shadow-[0_10px_30px_rgba(255,255,255,0.2)] z-10" 
                                : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20"
                            )}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Item #{activeItemIndex + 1} - Cantidad</label>
                        <div className="flex items-center gap-6">
                          <button 
                            type="button" 
                            onClick={() => updateItem(activeItemIndex, { cantidad: Math.max(1, currentItem.cantidad - 1) })}
                            className="w-14 h-14 bg-white border border-white/20 rounded-2xl flex items-center justify-center font-black text-2xl text-black hover:bg-white/90"
                          >
                            -
                          </button>
                          <span className="text-3xl font-black w-10 text-center italic">{currentItem.cantidad}</span>
                          <button 
                            type="button"
                            onClick={() => updateItem(activeItemIndex, { cantidad: currentItem.cantidad + 1 })}
                            className="w-14 h-14 bg-white border border-white/20 rounded-2xl flex items-center justify-center font-black text-2xl text-black hover:bg-white/90"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Notas</label>
                        <textarea 
                          name="notas"
                          value={currentItem.notas}
                          onChange={e => updateItem(activeItemIndex, { notas: e.target.value })}
                          placeholder="Instrucciones..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/10 focus:outline-none focus:border-white focus:bg-white/10 transition-all backdrop-blur-md resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Persistent Sticky Checkout Bar */}
        <div className="fixed bottom-0 left-0 w-full z-50">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-transparent h-40 -top-10 pointer-events-none" />
          <div className="relative max-w-md mx-auto p-8 bg-black/60 backdrop-blur-3xl border-t border-white/10 rounded-t-[3.5rem] shadow-[0_-30px_60px_-15px_rgba(0,0,0,0.8)]">
            <div className="flex flex-col gap-8">
              {/* Persistent Total Amount */}
              <div className="flex justify-between items-end px-2">
                <div className="space-y-1.5">
                  <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 block">Monto Operacional Total</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black italic tracking-tighter text-white">
                      ${totalPrice.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/10">MXN</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 block">Ref. USD</span>
                  <span className="text-sm font-black font-mono text-white/40 italic">${(totalPrice / 20).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-4">
                {step === 2 && (
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-18 px-8 bg-white/5 border border-white/10 rounded-[2.2rem] text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center group"
                    title="Volver al Registro"
                  >
                    <ChevronRight size={24} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                  </button>
                )}
                
                <button 
                  type="button"
                  onClick={step === 1 ? () => setStep(2) : handleSubmit}
                  disabled={isSubmitting || (step === 2 && !items.some(it => it.sku_referencia))}
                  className={cn(
                    "flex-1 h-18 rounded-[2.2rem] font-black uppercase tracking-[0.4em] text-[11px] flex items-center justify-center gap-3 transition-all duration-700 relative overflow-hidden group/btn",
                    isSubmitting || (step === 2 && !items.some(it => it.sku_referencia))
                      ? "bg-white/5 text-white/10 cursor-not-allowed"
                      : "bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(255,100,50,0.1)] border-b-2 border-transparent hover:border-white/20"
                  )}
                >
                  {isSubmitting ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                      <Loader2 size={20} className="animate-spin" />
                      Procesando Alpha...
                    </motion.div>
                  ) : (
                    <>
                      {step === 1 ? 'Iniciar Exploración' : `Confirmar Nodo (${items.length})`}
                      <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
