import React, { useState, useMemo } from 'react';
import { Search, Plus, X, Send, User, Phone, MapPin, Mail, DollarSign, MessageSquare, Eye, EyeOff, CreditCard, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Customer, Product } from '../types';
import { cn, formatCurrency, getProxyImageUrl } from '../lib/utils';

interface ClientesPageProps {
  customers: Customer[];
  products?: Product[];
  onRefresh: () => void;
  isLoading?: boolean;
  onNavigateToProduct?: (productId: string) => void;
}

export function ClientesPage({ customers, products = [], onRefresh, isLoading, onNavigateToProduct }: ClientesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerProducts, setSelectedCustomerProducts] = useState<Product[]>([]);
  const [showProductCard, setShowProductCard] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query) ||
      c.id?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.address?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const getCustomerProducts = (customerName: string) => {
    return products.filter(p => 
      p.clientName?.toLowerCase() === customerName.toLowerCase()
    );
  };

  const getStatusBadge = (customer: Customer) => {
    const total = customer.total_pedidos || 0;
    if (total >= 10) return { label: 'VIP', color: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' };
    if (total >= 5) return { label: 'FRECUENTE', color: 'bg-green-500 text-white' };
    if (total >= 1) return { label: 'ACTIVO', color: 'bg-blue-500 text-white' };
    return { label: 'NUEVO', color: 'bg-gray-400 text-white' };
  };

  const getPaymentBadge = (tipoPago?: string) => {
    switch (tipoPago) {
      case 'Crédito':
        return { label: 'CRÉDITO', color: 'bg-amber-400 text-black' };
      case 'Adelanto (50%)':
        return { label: 'ADELANTO', color: 'bg-blue-400 text-white' };
      case 'Contado / Efectivo':
        return { label: 'CONTADO', color: 'bg-green-500 text-white' };
      case 'Transferencia':
        return { label: 'TRANSFER', color: 'bg-purple-500 text-white' };
      case 'Tarjeta':
        return { label: 'TARJETA', color: 'bg-pink-500 text-white' };
      default:
        return { label: '-', color: 'bg-gray-200 text-gray-500' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-brand-surface p-4 rounded-xl border border-brand-border">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-ink transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por Nombre, WhatsApp, ID o Email..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-brand-bg border border-white/10 rounded-lg py-2.5 pl-12 pr-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm text-brand-ink placeholder:text-brand-muted/50"
          />
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
          className="px-5 py-2.5 rounded-lg font-bold text-xs tracking-tight flex items-center gap-2 bg-gradient-to-r from-brand-ink to-brand-ink/80 text-brand-bg hover:opacity-90 transition-all shadow-lg shadow-black/10 whitespace-nowrap"
        >
          <Plus size={16} /> Nuevo Cliente
        </motion.button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Total Clientes</div>
          <div className="text-2xl font-black text-brand-ink">{customers.length}</div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Clientes VIP</div>
          <div className="text-2xl font-black text-amber-500">{customers.filter(c => (c.total_pedidos || 0) >= 10).length}</div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Pedidos Totales</div>
          <div className="text-2xl font-black text-brand-ink">{customers.reduce((acc, c) => acc + (c.total_pedidos || 0), 0)}</div>
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-1">Comprado Total</div>
          <div className="text-2xl font-black text-green-500">
            ${customers.reduce((acc, c) => acc + (c.total_comprado || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-brand-surface border border-brand-border rounded-xl shadow-sm overflow-hidden overflow-x-auto scrollbar-hide">
        <table className="w-full border-collapse text-[11px] lg:text-xs min-w-[800px]">
          <thead>
            <tr className="bg-brand-ink text-brand-bg">
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">WhatsApp</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Ciudad</th>
              <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Pedidos</th>
              <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Pago</th>
              <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right font-bold uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-brand-muted italic">
                  {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const badge = getStatusBadge(customer);
                const paymentBadge = getPaymentBadge(customer.tipo_de_pago);
                return (
                  <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-muted text-[10px]">{customer.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-brand-ink">{customer.name}</div>
                      {customer.ig_handle && (
                        <div className="text-[10px] text-brand-muted">@{customer.ig_handle}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-brand-ink">{customer.phone || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-muted">{customer.email || '-'}</td>
                    <td className="px-4 py-3 text-brand-ink">{customer.address || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-brand-ink">{customer.total_pedidos || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full font-bold uppercase text-[9px]", paymentBadge.color)}>
                        {paymentBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full font-bold uppercase text-[9px]", badge.color)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {customer.phone && (
                          <div className="relative">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                const phone = customer.phone?.replace(/\D/g, '') || '';
                                const link = `https://wa.me/52${phone}`;
                                window.open(link, '_blank');
                              }}
                              className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all"
                              title="Enviar WhatsApp"
                            >
                              <MessageSquare size={14} />
                            </motion.button>
                          </div>
                        )}
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { 
                            setEditingCustomer(customer); 
                            setSelectedCustomerProducts(getCustomerProducts(customer.name));
                            setShowProductCard(true);
                          }}
                          className="p-2 rounded-lg bg-brand-bg text-brand-muted hover:text-brand-ink transition-colors"
                        >
                          <Package size={14} />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }}
                          className="p-2 rounded-lg bg-brand-bg text-brand-muted hover:text-brand-ink transition-colors"
                        >
                          <Eye size={14} />
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <CustomerModal 
            customer={editingCustomer}
            onClose={() => { setIsModalOpen(false); setEditingCustomer(null); }}
            onSave={() => { setIsModalOpen(false); setEditingCustomer(null); onRefresh(); }}
          />
        )}
      </AnimatePresence>

      {/* Product Card Modal */}
      <AnimatePresence>
        {showProductCard && editingCustomer && (
          <CustomerProductCard 
            customer={editingCustomer}
            products={selectedCustomerProducts}
            onClose={() => { setShowProductCard(false); setEditingCustomer(null); }}
            onNavigate={(productId) => { setShowProductCard(false); if (onNavigateToProduct) onNavigateToProduct(productId); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface CustomerModalProps {
  customer: Customer | null;
  onClose: () => void;
  onSave: () => void;
}

function CustomerModal({ customer, onClose, onSave }: CustomerModalProps) {
  const [formData, setFormData] = useState({
    id: customer?.id || '',
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    ig_handle: customer?.ig_handle || '',
    referido_por: customer?.referido_por || '',
    notas: customer?.notes || '',
    tipo_de_pago: customer?.tipo_de_pago || 'Transferencia',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const idCliente = formData.id || `CUST-${Date.now()}`;
      
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

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onSave();
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
            {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
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

            <div>
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2">Preferencia de Pago</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                <select 
                  value={formData.tipo_de_pago}
                  onChange={e => setFormData({ ...formData, tipo_de_pago: e.target.value })}
                  className="w-full bg-brand-bg border border-white/10 rounded-lg py-2.5 pl-11 pr-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm text-brand-ink appearance-none"
                >
                  <option value="Crédito">Crédito</option>
                  <option value="Adelanto (50%)">Adelanto (50%)</option>
                  <option value="Contado / Efectivo">Contado / Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
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

interface CustomerProductCardProps {
  customer: Customer;
  products: Product[];
  onClose: () => void;
  onNavigate: (productId: string) => void;
}

function CustomerProductCard({ customer, products, onClose, onNavigate }: CustomerProductCardProps) {
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
        onClick={e => e.stopPropagation()}
        className="bg-brand-surface border border-brand-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-5 border-b border-brand-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-brand-ink uppercase tracking-tight">Detalles de Compra</h2>
            <p className="text-[10px] text-brand-muted">{customer.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-brand-muted hover:text-brand-ink hover:bg-brand-bg">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-8 text-brand-muted">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">No hay productos registrados</p>
              <p className="text-[10px] mt-1">Este cliente no tiene compras en el inventario</p>
            </div>
          ) : (
            products.slice(0, 5).map((product, idx) => (
              <div 
                key={idx} 
                onClick={() => onNavigate(product.id)}
                className="flex gap-4 p-4 bg-brand-bg rounded-xl border border-brand-border hover:bg-brand-surface hover:border-brand-ink/40 transition-all cursor-pointer"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-surface shrink-0">
                  {product.imageUrl ? (
                    <img src={getProxyImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={24} className="text-brand-muted" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand-ink truncate">{product.name || 'Sin nombre'}</p>
                  <p className="text-[10px] text-brand-muted">{product.brand}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-brand-accent/10 text-brand-accent">
                      {product.currentStatus}
                    </span>
                    <span className="text-xs font-bold text-green-500">{formatCurrency(product.sellPriceMxn || 0)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {products.length > 5 && (
            <p className="text-center text-[10px] text-brand-muted">+ {products.length - 5} productos más</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ClientesPage;