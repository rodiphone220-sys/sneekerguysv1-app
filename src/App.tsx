import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Menu, 
  X, 
  Settings,
  LogOut,
  Activity,
  Table as TableIcon,
  LayoutGrid,
  ListFilter,
  DollarSign,
  BrainCircuit,
  Download,
  Printer,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Building2,
  Trash2,
  Users,
  Smartphone,
  RefreshCcw,
  Check,
  Minus,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  AlertTriangle,
  MessageSquare,
  Sun,
  Moon,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, OrderStatus, CustomerOrder, Customer, Category } from './types';
import { INITIAL_PRODUCTS } from './data/mockData';
import { INITIAL_CATEGORIES } from './data/categories';
import { ProductCard } from './components/ProductCard';
import { ProductForm } from './components/ProductForm';
import { BulkUploadModal } from './components/BulkUploadModal';
import { CustomerOrderForm } from './components/CustomerOrderForm';
import { Dashboard } from './components/Dashboard';
import { FinanceView } from './components/FinanceView';
import { MessagingView } from './components/MessagingView';
import { InvestmentAdvisor } from './components/InvestmentAdvisor';
import { TrackingManager } from './components/TrackingManager';
import { TrackingView } from './components/TrackingView';
import { SystemSettings } from './components/SystemSettings';
import { SneekyBot } from './components/SneekyBot';
import { BuscadorSneaker } from './components/BuscadorSneaker';
import { ClientesPage } from './components/ClientesPage';
import { cn, formatCurrency, formatDate, exportToCSV } from './lib/utils';
import { SystemSettings as SettingsType } from './types';

type ActiveTab = 'dashboard' | 'all' | 'pending' | 'delivered' | 'stock' | 'zafi' | 'orders' | 'finances' | 'settings' | 'catalog' | 'messaging' | 'advisor' | 'search' | 'clientes' | 'estatus' | 'browser';

const STATUSES = [
  { id: 'COMPRADO', label: 'Comprado en USA', icon: '📦', color: '#3B82F6' },
  { id: 'EN_RUTA', label: 'En Ruta a Zafi', icon: '✈️', color: '#EAB308' },
  { id: 'EN_BODEGA', label: 'Recibido en Zafi', icon: '📍', color: '#F97316' },
  { id: 'ENVIADO', label: 'Enviado a México', icon: '🚚', color: '#A855F7' },
  { id: 'ENTREGADO', label: 'Entregado', icon: '✅', color: '#22C55E' },
] as const;

type ViewType = 'visual' | 'excel';

export default function App() {
  const router = useRouter();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Todos los hooks deben llamarse SIEMPRE en el mismo orden
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [autoExport, setAutoExport] = useState(false);
  const [globalMarkup, setGlobalMarkup] = useState(35);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [systemSettings, setSystemSettings] = useState<SettingsType>(() => {
    const saved = localStorage.getItem('stockmaster_settings');
    if (saved) return JSON.parse(saved);
    return {
      isAiAssistantEnabled: true,
      isAiPrimaryResponder: true,
      aiPrimaryPrompt: "Eres un asistente experto en logística para The Sneacker Guys - Sales & Stock Manager. Eres profesional, conciso y directo. Responde siempre de manera corta y precisa. Si no conoces la respuesta, indica que conectarás con un humano.",
      aiGeneralPrompt: "Asistente inteligente de soporte interno para el equipo técnico de The Sneacker Guys - Sales & Stock Manager.",
      sneekyBotPrompt: "Eres Sneeky, el bot simpático de The Sneacker Guys - Sales & Stock Manager. Tu estilo es amigable y servicial."
    };
  });
  const [viewType, setViewType] = useState<ViewType>('visual');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [connectionStatus, setConnectionStatus] = useState<{status: 'idle' | 'testing' | 'ok' | 'error', message: string}>({status: 'idle', message: ''});
  const [justSynced, setJustSynced] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategories, setNewSubcategories] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [trackingProduct, setTrackingProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const verifyUser = async () => {
      const storedUser = localStorage.getItem('sneaker_user');
      
      if (!storedUser) {
        router.push('/login');
        setIsAuthLoading(false);
        return;
      }
      
      const userData = JSON.parse(storedUser);
      
      try {
        const res = await fetch(`/api/auth?email=${encodeURIComponent(userData.email)}`);
        const data = await res.json();
        
        if (!data.exists) {
          localStorage.removeItem('sneaker_user');
          router.push('/registro');
        } else {
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        setUser(userData);
        setIsAuthenticated(true);
      }
      
      setIsAuthLoading(false);
    };
    
    verifyUser();
  }, [router]);

  React.useEffect(() => {
    localStorage.setItem('stockmaster_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const toggleAutoExport = async () => {
    const newState = !autoExport;
    setAutoExport(newState);
    try {
      await fetch('/api/settings/auto-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });
    } catch (e) {
      console.error('Failed to sync auto-export setting');
    }
  };

  // Check for tracking URL param
  const trackingId = new URLSearchParams(window.location.search).get('tracking');
  const publicTrackingProduct = React.useMemo(() => {
    if (!trackingId) return null;
    return products.find(p => p.id === trackingId);
  }, [trackingId, products]);

  const handleAddCategory = () => {
    if (!newCategoryName) return;
    const subcats = newSubcategories.split(',').map(s => s.trim()).filter(Boolean);
    
    if (editingCategory) {
      setCategories(categories.map(c => c.id === editingCategory.id ? {
        ...editingCategory,
        name: newCategoryName,
        subcategories: subcats
      } : c));
      setEditingCategory(null);
    } else {
      const newCat: Category = {
        id: Math.random().toString(36).substr(2, 9),
        name: newCategoryName,
        subcategories: subcats,
        isActive: true
      };
      setCategories([...categories, newCat]);
    }
    
    setIsAddingCategory(false);
    setNewCategoryName('');
    setNewSubcategories('');
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setNewSubcategories(cat.subcategories.join(', '));
    setIsAddingCategory(true);
    
    // Scroll to form
    const el = document.getElementById('master-categories-config');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleCategoryStatus = (id: string) => {
    setCategories(categories.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const handleRemoveCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
    setCategoryToDelete(null);
  };

  // Load Data from API
  // Logic to calculate suggested retail price if not explicitly set
  const getSuggestedPriceMxn = (product: Product) => {
    if (product.sellPriceMxn && product.sellPriceMxn > 0) {
      return product.sellPriceMxn;
    }
    // Fallback to auto-calculated markup from cost
    const costMxn = product.buyPriceMxn || 0;
    return Math.round(costMxn * (1 + (globalMarkup / 100)));
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/customers')
      ]);

      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data);
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2000);
      }
      
      if (custRes.ok) {
        const data = await custRes.json();
        setCustomers(data);
      }

      setConnectionStatus({ status: 'ok', message: 'Conectado a Google Sheets' });
    } catch (error) {
      console.error('Error fetching products:', error);
      setConnectionStatus({ status: 'error', message: 'Error de servidor frontend-backend' });
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnection = async () => {
    setConnectionStatus({ status: 'testing', message: 'Probando conexión...' });
    try {
      const response = await fetch('/api/health-check');
      const data = await response.json();
      if (data.status === 'ok') {
        setConnectionStatus({ status: 'ok', message: `Conectado: ${data.title}` });
      } else {
        setConnectionStatus({ status: 'error', message: data.message });
      }
    } catch (error) {
      setConnectionStatus({ status: 'error', message: 'Sin respuesta del servidor backend' });
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = React.useMemo(() => {
    let filtered = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.subcategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           p.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || p.currentStatus === statusFilter;
      const matchesEstatus = !selectedStatus || p.currentStatus === selectedStatus;
      return matchesSearch && matchesStatus && matchesEstatus;
    });

    switch (activeTab) {
      case 'pending':
        return filtered.filter(p => p.currentStatus !== 'ENTREGADO');
      case 'delivered':
        return filtered.filter(p => p.currentStatus === 'ENTREGADO');
      case 'stock':
        return filtered.filter(p => !p.clientName || p.clientName.trim() === '');
      case 'zafi':
        return filtered.filter(p => p.destino === 'EL PASO' || (p.currentStatus as string).includes('ZAFI'));
      default:
        return filtered;
    }
  }, [products, searchQuery, statusFilter, activeTab]);

  const stats = React.useMemo(() => ({
    total: products.length,
    pending: products.filter(p => p.currentStatus !== 'ENTREGADO').length,
    lowStock: products.filter(p => p.quantity <= p.minStock && p.quantity > 0).length,
  }), [products]);

  const groupedProducts = React.useMemo<Record<string, Product[]>>(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      const cat = p.category || 'Sin Categoría';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleSaveProduct = async (data: Partial<Product> | Partial<Product>[]) => {
    setIsLoading(true);
    try {
      if (editingProduct && !Array.isArray(data)) {
        // Build the full product state for update
        const updatedProduct = { ...editingProduct, ...data, updatedAt: new Date().toISOString() };
        
        const response = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProduct),
        });

        if (response.ok) {
          setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct as Product : p));
        } else {
          const err = await response.json();
          alert(`Error al actualizar en Google Sheets: ${err.error}`);
        }
      } else {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          // Result is bulk, easiest is to reload all data to get fresh IDs
          await loadData();
          const amount = Array.isArray(data) ? data.reduce((s, p) => s + (p.buyPriceMxn || 0) * (p.quantity || 1), 0) : (data.buyPriceMxn || 0) * (data.quantity || 1);
          setToast({ message: `¡Registro Exitoso! Dashboard actualizado con +$${Math.round(amount).toLocaleString()} MXN`, type: 'success' });
          setTimeout(() => setToast(null), 4000);
        } else {
          const err = await response.json();
          alert(`Error al guardar en Google Sheets: ${err.error}`);
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Error de conexión al sincronizar con Google Sheets');
    } finally {
      setIsLoading(false);
      setIsFormOpen(false);
      setEditingProduct(undefined);
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este artículo?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleStatusChange = (id: string, status: OrderStatus) => {
    setProducts(products.map(p => p.id === id ? { ...p, currentStatus: status, updatedAt: new Date().toISOString() } : p));
  };

  const handleExport = () => {
    const exportData = filteredProducts.map(p => ({
      PEDIDO: p.sku,
      FECHA: formatDate(p.createdAt),
      BOUTIQUE: p.boutique || '',
      DESTINO: p.destino || '',
      CATEGORIA: p.category || '',
      SUBCATEGORIA: p.subcategory || '',
      ARTICULO: p.name,
      MARCA: p.brand,
      TALLA: p.size || '',
      'COSTO USD': p.buyPriceUsd,
      'COSTO MXN': p.buyPriceMxn,
      CLIENTE: p.clientName || 'STOCK',
      STATUS: p.currentStatus,
      NOTAS: p.notes || ''
    }));
    exportToCSV(exportData, `The Sneacker Guys - Sales & Stock Manager_${activeTab}_${new Date().toISOString().split('T')[0]}`);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-accent" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (publicTrackingProduct) {
    return <TrackingView product={publicTrackingProduct} />;
  }

  return (
    <div className="flex h-screen bg-brand-bg text-brand-ink font-sans selection:bg-brand-accent selection:text-brand-bg overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 240 : 0, 
          x: isSidebarOpen ? 0 : -240,
          opacity: 1 // Keep opacity 1 for smooth x transition
        }}
        className={cn(
          "h-full bg-brand-surface border-r border-brand-border overflow-y-auto scrollbar-hide fixed lg:relative z-50 flex flex-col transition-all duration-300 ease-in-out",
          !isSidebarOpen && "pointer-events-none lg:pointer-events-auto"
        )}
      >
        <div className="p-8 px-6 min-w-[240px]">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-6 h-6 bg-brand-ink rounded flex items-center justify-center">
              <Package size={14} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-brand-ink">The Sneacker Guys - Sales & Stock Manager</span>
          </div>

          <nav className="space-y-1">
            <NavItem 
              active={activeTab === 'dashboard'} 
              onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<LayoutDashboard size={18} />} 
              label="Pipeline Dashboard" 
            />
            <NavItem 
              active={activeTab === 'advisor'} 
              onClick={() => { setActiveTab('advisor'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<BrainCircuit size={18} />} 
              label="Asesor de Inversión" 
            />
            <NavItem 
              active={activeTab === 'finances'} 
              onClick={() => { setActiveTab('finances'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<DollarSign size={18} />} 
              label="Finanzas" 
            />
            <div className="pt-4 pb-2">
              <span className="px-4 text-[10px] font-bold text-brand-label uppercase tracking-widest">Estatus</span>
            </div>
            
            {/* Status Flow - Accordion Style */}
            <div className="px-2 py-2 space-y-1">
              {STATUSES.map((status, idx) => {
                const isActive = selectedStatus === status.id;
                const count = products.filter(p => p.currentStatus === status.id).length;
                return (
                  <button
                    key={status.id}
                    onClick={() => {
                      setSelectedStatus(isActive ? null : status.id);
                      setActiveTab('all');
                      if(window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                      ${isActive ? 'bg-white/10 border-l-2' : 'hover:bg-white/5 border-l-2 border-transparent'}
                    `}
                    style={{ 
                      borderColor: isActive ? status.color : 'transparent',
                      marginLeft: `${idx * 8}px`
                    }}
                    aria-pressed={isActive}
                  >
                    <span className="text-lg">{status.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {status.label}
                      </div>
                      <div className="text-[10px]" style={{ color: status.color }}>
                        {count} items
                      </div>
                    </div>
                    {isActive && (
                      <div 
                        className="w-2 h-2 rounded-full animate-pulse" 
                        style={{ backgroundColor: status.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="pt-4 pb-2">
              <span className="px-4 text-[10px] font-bold text-brand-label uppercase tracking-widest">Vistas de Control</span>
            </div>
            <NavItem 
              active={activeTab === 'all'} 
              onClick={() => { setActiveTab('all'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<Package size={18} />} 
              label="Todos los Pedidos" 
              badge={stats.total}
            />
            <NavItem 
              active={activeTab === 'pending'} 
              onClick={() => { setActiveTab('pending'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<Clock size={18} />} 
              label="Pendientes" 
              badge={stats.pending}
            />
            <NavItem 
              active={activeTab === 'delivered'} 
              onClick={() => { setActiveTab('delivered'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<CheckCircle2 size={18} />} 
              label="Entregados" 
            />
            <NavItem 
              active={activeTab === 'stock'} 
              onClick={() => { setActiveTab('stock'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<FileSpreadsheet size={18} />} 
              label="Stock Disponible" 
            />
            <NavItem 
              active={activeTab === 'zafi'} 
              onClick={() => { setActiveTab('zafi'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<Building2 size={18} />} 
              label="Filtro Zafi (USA)" 
            />
            <NavItem 
              active={activeTab === 'search'} 
              onClick={() => { setActiveTab('search'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<Search size={18} />} 
              label="Buscador Sneeker" 
            />
            <NavItem 
              active={activeTab === 'clientes'} 
              onClick={() => { setActiveTab('clientes'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<Users size={18} />} 
              label="Gestión de Clientes" 
            />
            <NavItem 
              active={activeTab === 'orders'} 
              onClick={() => { setActiveTab('orders'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<ShoppingCart size={18} />} 
              label="Órdenes de Clientes" 
              badge={customerOrders.length}
            />
            <NavItem 
              active={activeTab === 'catalog'} 
              onClick={() => { setActiveTab('catalog'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<ListFilter size={18} />} 
              label="Configurar Catálogo" 
            />
            <NavItem 
              active={activeTab === 'messaging'} 
              onClick={() => { setActiveTab('messaging'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              icon={<MessageSquare size={18} />} 
              label="Mensajería" 
            />
            <div className="mt-6 pt-6 border-t border-brand-border">
              <button 
                onClick={() => { setIsCustomerPortalOpen(true); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
                className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white font-black uppercase italic tracking-tighter text-xs shadow-lg shadow-black/20 hover:scale-[1.02] transition-all"
              >
                <Smartphone size={16} />
                Portal Clientes
              </button>
              <NavItem 
                active={activeTab === 'settings'} 
                onClick={() => { setActiveTab('settings'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
                icon={<Settings size={18} />} 
                label="Ajustes Sistema" 
              />
            </div>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-brand-border min-w-[240px]">
          <button 
            onClick={() => {
              localStorage.removeItem('sneaker_user');
              setIsAuthenticated(false);
              setUser(null);
              router.push('/login');
            }}
            className="flex items-center gap-2 text-sm font-medium text-brand-muted hover:text-brand-ink transition-colors"
          >
            <LogOut size={16} /> Salir Sesión
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden flex flex-col">
        {/* Header */}
        <header className="px-4 lg:px-10 py-4 lg:min-h-24 flex flex-col lg:flex-row lg:items-center justify-between border-b border-brand-border bg-brand-surface sticky top-0 z-30 gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] lg:text-[12px] uppercase tracking-widest text-brand-label font-bold mb-1">
                {activeTab === 'all' ? 'Inventario Total' : activeTab === 'orders' ? 'Clientes' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </span>
              <div className="flex items-center gap-3 lg:gap-4 overflow-x-auto scrollbar-hide">
                <h1 className="text-20px lg:text-28px font-bold tracking-tight text-brand-ink whitespace-nowrap">
                   {activeTab === 'all' ? 'Stock Maestro' : activeTab === 'orders' ? 'Órdenes de Cliente' : activeTab === 'finances' ? 'Panel Financiero' : activeTab === 'catalog' ? 'Categorías Globales' : 'Panel de Logística'}
                </h1>

                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadData}
                  disabled={isLoading}
                  className={cn(
                    "w-8 h-8 rounded-lg border transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center ml-2",
                    justSynced ? "bg-green-500 border-green-500 text-white" : "bg-brand-bg border-brand-border text-brand-muted hover:text-brand-ink"
                  )}
                  title="Sincronizar con Google Sheets"
                >
                  {justSynced ? <Check size={14} /> : <Activity size={14} className={cn(isLoading && "animate-spin")} />}
                </motion.button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'orders' && (
                <div className="flex bg-brand-bg p-1 rounded-lg border border-brand-border flex-shrink-0">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setViewType('visual')}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] lg:text-[11px] font-bold transition-all",
                      viewType === 'visual' ? "bg-brand-surface text-brand-ink shadow-sm" : "text-brand-muted hover:text-brand-ink"
                    )}
                  >
                    <LayoutGrid size={12} />
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setViewType('excel')}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] lg:text-[11px] font-bold transition-all",
                      viewType === 'excel' ? "bg-brand-surface text-brand-ink shadow-sm" : "text-brand-muted hover:text-brand-ink"
                    )}
                  >
                    <TableIcon size={12} />
                  </motion.button>
                </div>
              )}

              <div className="flex items-center gap-2 lg:gap-3 overflow-x-auto py-1 scrollbar-hide">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg border border-brand-border rounded-lg mr-2 shrink-0">
                  <button 
                    onClick={toggleTheme}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-ink transition-colors"
                  >
                    {theme === 'light' ? <Moon size={12} /> : <Sun size={12} />}
                    <span>{theme === 'light' ? 'OBSCURO' : 'CLARO'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg border border-brand-border rounded-lg mr-2 shrink-0">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest transition-colors hidden sm:inline", autoExport ? "text-brand-muted" : "text-brand-accent")}>{autoExport ? "ON" : "OFF"}</span>
                  <button 
                    type="button"
                    onClick={toggleAutoExport}
                    className={cn(
                      "w-8 h-4 rounded-full relative transition-all duration-300",
                      autoExport ? "bg-brand-ink" : "bg-brand-border"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 rounded-full bg-white dark:bg-brand-bg transition-all duration-300 shadow-sm",
                      autoExport ? "left-4.5" : "left-0.5"
                    )} />
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted hidden lg:inline">Exportación Automática</span>
                </div>

                {activeTab !== 'dashboard' && activeTab !== 'settings' && (
                  <>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={handleExport}
                      className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs font-bold bg-brand-bg text-brand-muted border border-brand-border hover:bg-brand-bg/80 transition-all whitespace-nowrap"
                    >
                      <Download size={14} /> <span className="hidden lg:inline">CSV Export</span>
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs font-bold bg-brand-bg text-brand-muted border border-brand-border hover:bg-brand-bg/80 transition-all whitespace-nowrap"
                    >
                      <Printer size={14} /> <span className="hidden lg:inline">Imprimir</span>
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={loadData}
                      disabled={isLoading}
                      className={cn(
                        "flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border disabled:opacity-50",
                        justSynced ? "bg-green-500 border-green-500 text-white" : "bg-brand-bg border-brand-border text-brand-muted hover:bg-brand-bg/80"
                      )}
                      title="Sincronizar con Google Sheets"
                    >
                      {justSynced ? <Check size={14} /> : <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />}
                      <span className="hidden lg:inline">{justSynced ? 'Sincronizado' : 'Sincronizar'}</span>
                    </motion.button>
                  </>
                )}
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsBulkUploadOpen(true)}
                  className="px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold text-xs lg:text-sm tracking-tight flex items-center gap-2 bg-brand-surface text-brand-ink border border-brand-border hover:bg-brand-bg transition-all shadow-sm whitespace-nowrap"
                >
                  <FileSpreadsheet size={16} /> <span>Subir Masivo</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setEditingProduct(undefined); setIsFormOpen(true); }}
                  className="bg-brand-ink text-brand-bg px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-bold text-xs lg:text-sm tracking-tight flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-black/5 whitespace-nowrap"
                >
                  <Plus size={16} /> <span>Nuevo</span>
                </motion.button>
              </div>
            </div>
        </header>

        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 lg:space-y-8 flex-1">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-8 h-8 border-4 border-brand-ink/10 border-t-brand-ink rounded-full animate-spin" />
              <p className="text-xs font-bold text-brand-muted uppercase tracking-widest">Sincronizando con Google Sheets...</p>
            </div>
          )}
          
          {!isLoading && activeTab === 'dashboard' && <Dashboard products={products} onNavigate={setActiveTab} />}
          {!isLoading && activeTab === 'advisor' && <InvestmentAdvisor products={products} />}
          {!isLoading && activeTab === 'messaging' && <MessagingView settings={systemSettings} />}
          {!isLoading && activeTab === 'settings' && <SystemSettings settings={systemSettings} onUpdateSettings={setSystemSettings} user={user} />}
          {!isLoading && activeTab === 'finances' && (
            <FinanceView 
              products={products} 
              globalMarkup={globalMarkup} 
              onUpdateMarkup={setGlobalMarkup} 
            />
          )}

          {!isLoading && activeTab === 'browser' && (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
              <p className="text-gray-500">Sección en construcción</p>
            </div>
          )}

          {!isLoading && activeTab === 'clientes' && (
            <ClientesPage 
              customers={customers} 
              products={products}
              onRefresh={() => {}}
              isLoading={isLoading}
              onNavigateToProduct={(productId) => {
                setEditingProduct(products.find(p => p.id === productId));
                setIsFormOpen(true);
              }}
            />
          )}

          {!isLoading && activeTab === 'search' && (
            <BuscadorSneaker onNavigate={(tab) => setActiveTab(tab as ActiveTab)} />
          )}

          <Toast toast={toast} onClose={() => setToast(null)} />

          {!isLoading && activeTab === 'orders' && (
            <div className="bg-brand-surface border border-brand-border rounded-xl shadow-sm overflow-hidden overflow-x-auto scrollbar-hide">
              <table className="w-full border-collapse text-[11px] lg:text-xs min-w-[600px]">
                    <thead>
                      <tr className="bg-brand-ink text-brand-bg">
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Prioridad</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">ID Cliente</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Nombre</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Modelo</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Talla</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Cant.</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Precio</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right font-bold uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                <tbody className="divide-y divide-brand-border">
                    {filteredProducts.filter(p => p.clientName && p.clientName.trim() !== '').length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-brand-muted italic">No hay órdenes de clientes registradas</td>
                      </tr>
                    ) : (
                      filteredProducts.filter(p => p.clientName && p.clientName.trim() !== '').map((o, idx) => (
                        <tr key={o.id} className={cn(
                          "hover:bg-brand-bg/50 transition-colors border-l-4",
                          o.total_pedidos && o.total_pedidos > 5 ? 'border-l-brand-accent bg-orange-50/10' : 'border-l-transparent'
                        )}>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest leading-none bg-gray-100 text-gray-400">
                                NORMAL
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-brand-muted">{o.sku.substring(0, 8)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3 font-bold text-brand-ink">{o.clientName}</td>
                        <td className="px-4 py-3 text-brand-ink">
                          <div className="font-bold">{o.name}</div>
                          <div className="text-[10px] text-brand-muted">{o.brand}</div>
                        </td>
                        <td className="px-4 py-3 font-bold">{o.size}</td>
                        <td className="px-4 py-3">{o.quantity}</td>
                        <td className="px-4 py-3 font-bold text-brand-ink">
                          ${(o.sellPriceMxn || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full font-bold uppercase text-[9px]",
                            o.currentStatus === 'ENTREGADO' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                          )}>
                            {o.currentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => setTrackingProduct(o)}
                               className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-[9px] font-black uppercase tracking-tighter hover:scale-105 transition-transform"
                             >
                               <Smartphone size={10} /> Rastreo
                             </button>
                             <button 
                               onClick={() => handleDeleteProduct(o.id)}
                               className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                             >
                               <Trash2 size={14} />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && (activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'orders' && activeTab !== 'finances') && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row items-center gap-4 bg-brand-surface p-4 rounded-xl border border-brand-border">
                <div className="relative flex-1 group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-ink transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscador inteligente (SKU, Cliente, Marca, Modelo)..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-brand-bg border-none rounded-lg py-2.5 pl-12 pr-4 focus:ring-1 focus:ring-brand-ink transition-all outline-none text-sm text-brand-ink"
                  />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto h-full flex-wrap justify-end">
                  {activeTab === 'catalog' && (
                    <a 
                      href="#master-categories-config" 
                      className="flex items-center gap-2 px-4 py-2 bg-brand-accent/5 text-brand-accent rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent/10 transition-all border border-brand-accent/20 h-10"
                    >
                      <ArrowDown size={14} /> Gestionar Categorías
                    </a>
                  )}
                  <div className="flex items-center gap-2 bg-brand-bg rounded-lg px-4 h-10 border border-transparent focus-within:border-brand-ink/20 transition-all">
                    <Filter size={16} className="text-brand-muted" />
                    <select 
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as any)}
                      className="bg-transparent border-none outline-none font-bold text-sm min-w-[160px] text-brand-ink"
                    >
                      <option value="ALL">Todos los Status</option>
                      <option value="COMPRADO">📦 Comprado en USA</option>
                      <option value="EN_RUTA">✈️ En Ruta a Zafi</option>
                      <option value="EN_BODEGA">📍 Recibido en Zafi</option>
                      <option value="ENVIADO">🚚 Enviado a México</option>
                      <option value="ENTREGADO">✅ Entregado</option>
                    </select>
                  </div>
                </div>
              </div>

              {viewType === 'visual' ? (
                /* Grid View with Collapsible Grouping for Catalog */
                activeTab === 'catalog' ? (
                  <div className="space-y-8">
                    {Object.keys(groupedProducts).length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="bg-[#F8FAF9] w-20 h-20 rounded-full flex items-center justify-center mx-auto text-brand-border">
                          <Search size={40} />
                        </div>
                        <h3 className="font-bold text-brand-muted">No se encontraron artículos</h3>
                      </div>
                    ) : (
                      (Object.entries(groupedProducts) as [string, Product[]][]).map(([category, items]) => (
                        <div key={category} className="space-y-4">
                          <button 
                            onClick={() => toggleCategoryCollapse(category)}
                            className="flex items-center justify-between w-full p-4 bg-brand-surface rounded-2xl border border-brand-border hover:border-brand-ink/20 transition-all group shadow-sm hover:shadow-md"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-brand-ink text-brand-bg rounded-xl flex items-center justify-center font-black text-xs shadow-lg group-hover:scale-110 transition-transform">
                                {items.length}
                              </div>
                              <div className="text-left">
                                <h4 className="font-black text-sm uppercase tracking-widest text-brand-ink">{category}</h4>
                                <p className="text-[9px] font-bold text-brand-muted uppercase tracking-[0.2em]">{collapsedCategories[category] ? 'Click para expandir' : 'Click para contraer'}</p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-muted group-hover:text-brand-ink transition-colors border border-brand-border group-hover:border-brand-ink/20">
                              {collapsedCategories[category] ? <Plus size={14} /> : <Minus size={14} />}
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {!collapsedCategories[category] && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-2 pb-6 px-1">
                                  {items.map((product) => (
                                    <motion.div
                                      key={product.id}
                                      layout
                                      initial={{ opacity: 0, scale: 0.98 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.98 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <ProductCard 
                                        product={product} 
                                        globalMarkup={globalMarkup}
                                        onEdit={(p) => { setEditingProduct(p); setIsFormOpen(true); }}
                                        onStatusChange={handleStatusChange}
                                        onDelete={handleDeleteProduct}
                                      />
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    <AnimatePresence mode="popLayout">
                      {filteredProducts.map((product) => (
                        <motion.div
                          key={product.id}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ProductCard 
                            product={product} 
                            globalMarkup={globalMarkup}
                            onEdit={(p) => { setEditingProduct(p); setIsFormOpen(true); }}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteProduct}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )
              ) : (
                /* Excel View */
                <div className="bg-white border border-brand-border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-brand-ink text-white">
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">SKU/Pedido</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Imagen</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Categoría</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Subcategoría</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Boutique</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Destino</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Tarjeta</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Artículo</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Marca</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Talla</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Costo USD</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Total USD</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Total MXN</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Venta</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Cliente</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#F8FAF9] transition-colors group">
                          <td className="px-4 py-3 font-mono font-bold text-brand-ink">{p.sku}</td>
                          <td className="px-4 py-3">
                            <div className="w-10 h-10 rounded-md border border-brand-border bg-white overflow-hidden flex items-center justify-center">
                              {(() => {
                                  const isValidUrl = p.imageUrl && (p.imageUrl.startsWith('http') || p.imageUrl.startsWith('data:'));
                                  return isValidUrl ? (
                                    <img 
                                      src={p.imageUrl} 
                                      alt={p.name} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/err/40/40'; }}
                                    />
                                  ) : (
                                    <div className="text-[8px] font-bold text-brand-muted uppercase text-center leading-none">Sin<br/>Foto</div>
                                  );
                                })()}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-brand-ink/5 border border-brand-ink/10 text-[9px] font-black uppercase text-brand-muted tracking-widest whitespace-nowrap">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-brand-muted font-medium whitespace-nowrap">{p.subcategory || '-'}</td>
                          <td className="px-4 py-3 text-brand-muted whitespace-nowrap">{formatDate(p.createdAt)}</td>
                          <td className="px-4 py-3 text-brand-ink font-medium">{p.boutique || '-'}</td>
                          <td className="px-4 py-3 font-bold text-brand-label">{p.destino || 'EL PASO'}</td>
                          <td className="px-4 py-3">
                            <div className="px-2 py-0.5 rounded bg-brand-accent/10 border border-brand-accent/20 inline-block">
                              <span className="text-[10px] font-bold text-brand-accent uppercase">{p.card || '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-brand-ink font-bold">{p.name}</td>
                          <td className="px-4 py-3 text-brand-muted">{p.brand}</td>
                          <td className="px-4 py-3 text-brand-ink">{p.size || '-'}</td>
                          <td className="px-4 py-3 font-mono text-brand-ink">{formatCurrency(p.buyPriceUsd)}</td>
                          <td className="px-4 py-3 font-mono text-brand-ink font-bold">
                            {formatCurrency(p.totalBuyPriceUsd || (p.quantity * p.buyPriceUsd))}
                          </td>
                          <td className="px-4 py-3 font-mono text-brand-muted">
                            ${Math.round(p.totalBuyPriceMxn || (p.quantity * p.buyPriceMxn)).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-brand-ink text-right">
                            ${getSuggestedPriceMxn(p).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              value={p.currentStatus}
                              onChange={(e) => handleStatusChange(p.id, e.target.value as OrderStatus)}
                              className="bg-transparent border-none p-0 text-xs font-bold text-brand-ink outline-none cursor-pointer hover:underline"
                            >
                              <option value="COMPRADO">📦 Comprado</option>
                              <option value="EN_RUTA">✈️ En Ruta</option>
                              <option value="EN_BODEGA">📍 En Zafi</option>
                              <option value="ENVIADO">🚚 Enviado</option>
                              <option value="ENTREGADO">✅ Entregado</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-brand-ink font-medium">{p.clientName || 'STOCK'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => { setEditingProduct(p); setIsFormOpen(true); }}
                                className="p-1.5 rounded bg-white border border-brand-border text-brand-muted hover:text-brand-ink transition-colors"
                              >
                                <LayoutDashboard size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 rounded bg-white border border-brand-border text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredProducts.length === 0 && (
                <div className="py-20 text-center space-y-4">
                  <div className="bg-[#F8FAF9] w-20 h-20 rounded-full flex items-center justify-center mx-auto text-brand-border">
                    <Search size={40} />
                  </div>
                  <h3 className="font-bold text-brand-muted">No se encontraron artículos en esta vista</h3>
                  <button 
                    onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setActiveTab('all'); }}
                    className="text-brand-ink font-bold text-sm hover:underline"
                  >
                    Ver todo el inventario
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="flex-1 p-6 lg:p-10 space-y-10 overflow-y-auto scroll-smooth">
               <div id="master-categories-config" className="bg-white p-8 rounded-2xl border border-brand-border shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-brand-ink uppercase tracking-tight">Gestionar Categorías</h3>
                    <p className="text-sm text-brand-muted">Configuración del Catálogo Maestro para SneekerPortal</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-accent/10 border border-brand-accent/20 px-4 py-2 rounded-xl text-brand-accent">
                      <span className="text-[10px] font-black uppercase tracking-widest">{categories.filter(c => c.isActive).length} Activas / {categories.length} Total</span>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingCategory(null);
                        setNewCategoryName('');
                        setNewSubcategories('');
                        setIsAddingCategory(true);
                      }}
                      className="bg-brand-ink text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-black/5"
                    >
                      <Plus size={14} /> {editingCategory ? 'Editando...' : 'Añadir Categoría'}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isAddingCategory && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0, scale: 0.95 }}
                      animate={{ height: 'auto', opacity: 1, scale: 1 }}
                      exit={{ height: 0, opacity: 0, scale: 0.95 }}
                      className="overflow-hidden mb-12"
                    >
                      <div className="p-8 bg-[#1A1A1A] text-white rounded-2xl border-l-4 border-l-brand-accent shadow-2xl relative">
                        <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Modo Editor Pro</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-brand-accent uppercase tracking-widest block">Nombre Estratégico</label>
                            <input 
                              type="text"
                              value={newCategoryName}
                              onChange={e => setNewCategoryName(e.target.value)}
                              placeholder="Ej: Fitness, Fotografía..."
                              className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-brand-accent text-sm font-bold text-white transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-brand-accent uppercase tracking-widest block">Subcategorías (separadas por coma)</label>
                            <input 
                              type="text"
                              value={newSubcategories}
                              onChange={e => setNewSubcategories(e.target.value)}
                              placeholder="Sub 1, Sub 2, Sub 3..."
                              className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-brand-accent text-sm text-white transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end items-center gap-4 border-t border-white/5 pt-6">
                          <button 
                            onClick={() => {
                              setIsAddingCategory(false);
                              setEditingCategory(null);
                            }}
                            className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                          >
                            Descartar
                          </button>
                          <button 
                            onClick={handleAddCategory}
                            className="px-10 py-3 bg-brand-accent text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-accent/20 hover:scale-105 transition-all"
                          >
                            {editingCategory ? 'Actualizar Master Entry' : 'Publicar Nueva Categoría'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {categories.map((cat) => (
                    <motion.div 
                      key={cat.id} 
                      layout
                      whileHover={{ 
                        y: -12,
                        transition: { duration: 0.3, ease: 'easeOut' }
                      }}
                      onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                      className={cn(
                        "relative p-8 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer group",
                        cat.isActive 
                          ? (selectedCategoryId === cat.id 
                              ? "bg-[#1A1A1A] border-brand-ink text-white shadow-[0_40px_80px_rgba(0,0,0,0.3)]" 
                              : "bg-white border-brand-border hover:shadow-[0_40px_80px_rgba(0,0,0,0.12)] hover:border-brand-ink/20 shadow-[0_10px_30px_rgba(0,0,0,0.02)]") 
                          : "bg-[#F3F4F6] border-transparent opacity-60 grayscale scale-[0.98]"
                      )}
                    >
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all duration-700 shadow-inner",
                            cat.isActive 
                              ? (selectedCategoryId === cat.id 
                                  ? "bg-brand-accent text-black scale-110 rotate-3" 
                                  : "bg-brand-ink text-white shadow-[0_12px_24px_rgba(0,0,0,0.2)] group-hover:rotate-6") 
                              : "bg-gray-200 text-gray-400"
                          )}>
                             {cat.name.toUpperCase().includes('CALZADO') ? '👟' : 
                              cat.name.toUpperCase().includes('ROPA') ? '👕' : 
                              cat.name.toUpperCase().includes('ELECTR') ? '⚡' : 
                              cat.name.toUpperCase().includes('ACCES') ? '💎' : '📦'}
                          </div>
                          <div>
                            <span className={cn(
                              "font-black text-lg block leading-none transition-colors",
                              selectedCategoryId === cat.id ? "text-white" : "text-brand-ink"
                            )}>{cat.name}</span>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-[0.15em] mt-2 block",
                              selectedCategoryId === cat.id ? "text-brand-accent" : "text-brand-muted"
                            )}>
                              {cat.subcategories.length} Estilos Maestros
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3" onClick={e => e.stopPropagation()}>
                          {/* Switch toggle */}
                          <button 
                            onClick={() => toggleCategoryStatus(cat.id)}
                            className={cn(
                              "w-12 h-6 rounded-full relative transition-all duration-500 shadow-inner overflow-hidden",
                              cat.isActive ? "bg-brand-accent shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" : "bg-gray-300"
                            )}
                          >
                            <motion.div 
                              animate={{ x: cat.isActive ? 24 : 4 }}
                              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md" 
                            />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex flex-wrap gap-2 h-[72px] overflow-hidden content-start">
                          {cat.subcategories.slice(0, 6).map(sub => (
                            <span key={sub} className={cn(
                              "px-3 py-1.5 text-[10px] font-bold border rounded-xl transition-all duration-300",
                              selectedCategoryId === cat.id 
                                ? "bg-white/10 border-white/10 text-white/80 hover:bg-white/20" 
                                : "bg-[#F8FAF9] border-brand-border text-brand-muted hover:border-brand-ink/20"
                            )}>
                              {sub}
                            </span>
                          ))}
                          {cat.subcategories.length > 6 && (
                            <span className={cn(
                              "px-3 py-1.5 text-[10px] font-black border rounded-xl",
                              selectedCategoryId === cat.id 
                                ? "bg-brand-accent/20 border-brand-accent/20 text-brand-accent" 
                                : "bg-brand-accent/10 border-brand-accent/20 text-brand-accent"
                            )}>
                              +{cat.subcategories.length - 6}
                            </span>
                          )}
                        </div>

                        <div className={cn(
                          "flex items-center gap-3 pt-6 border-t mt-auto",
                          selectedCategoryId === cat.id ? "border-white/10" : "border-brand-border"
                        )} onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => handleEditCategory(cat)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                              selectedCategoryId === cat.id
                                ? "bg-white text-black hover:bg-brand-accent hover:scale-[1.02]"
                                : "bg-[#F8FAF9] text-brand-muted border border-brand-border hover:bg-brand-ink hover:text-white hover:shadow-lg"
                            )}
                          >
                             Editar Master
                          </button>
                          <button 
                            onClick={() => setCategoryToDelete(cat.id)}
                            className={cn(
                              "w-12 h-12 flex items-center justify-center rounded-xl border transition-all",
                              selectedCategoryId === cat.id
                                ? "border-white/10 text-white/40 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-sm"
                                : "border-brand-border text-brand-muted hover:bg-red-50 hover:text-red-500 hover:border-red-100 shadow-sm"
                            )}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Warning Modal for Delete */}
              <AnimatePresence>
                {categoryToDelete && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white max-w-md w-full rounded-2xl p-8 shadow-2xl space-y-6"
                    >
                      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle size={32} />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-brand-ink">¿Eliminar Categoría Maestra?</h3>
                        <p className="text-sm text-brand-muted leading-relaxed">
                          Esta acción eliminará la categorización del catálogo. Los productos existentes no se perderán, pero perderán su vínculo de filtro inteligente.
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setCategoryToDelete(null)}
                          className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-muted hover:text-brand-ink transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => handleRemoveCategory(categoryToDelete)}
                          className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all"
                        >
                          Sí, Eliminar Permanentemente
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto py-12">
              <div className="bg-white p-12 rounded-xl border border-brand-border shadow-xl text-center space-y-6">
                <div className="w-20 h-20 bg-[#F8FAF9] rounded-full flex items-center justify-center mx-auto text-brand-border">
                  <Settings size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Ajustes The Sneacker Guys - Sales & Stock Manager Pro</h3>
                  <p className="text-brand-muted max-w-xs mx-auto text-sm leading-relaxed">
                    Personaliza reglas de logística, tipo de cambio y gestión de bases de datos.
                  </p>
                </div>
              <div className="grid grid-cols-1 gap-4 text-left">
                <SettingsRow title="Costo Logístico Promedio" value="$12.00 USD" />
                <SettingsRow title="Tipo de Cambio Base" value="18.50" />
                <SettingsRow title="Modo Hoja de Cálculo" value="Excel Compatible" />
                <SettingsRow title="Exportación Automática" value="Desactivada" />

                <div className="pt-4 space-y-3">
                  <button 
                    onClick={checkConnection}
                    disabled={connectionStatus.status === 'testing'}
                    className={cn(
                      "w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2",
                      connectionStatus.status === 'ok' ? "bg-green-50 text-green-700 border border-green-200" :
                      connectionStatus.status === 'error' ? "bg-red-50 text-red-700 border border-red-200" :
                      "bg-brand-ink text-white hover:bg-black"
                    )}
                  >
                    {connectionStatus.status === 'testing' ? <Activity size={14} className="animate-spin" /> : <Activity size={14} />}
                    {connectionStatus.status === 'idle' ? 'Probar Conexión con Sheets' : 
                     connectionStatus.status === 'testing' ? 'Verificando...' : 
                     'Re-verificar Conexión'}
                  </button>
                  {connectionStatus.message && (
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      connectionStatus.status === 'ok' ? "text-green-600" : "text-red-500"
                    )}>
                      {connectionStatus.message}
                    </p>
                  )}
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {trackingProduct && (
          <TrackingManager 
            product={trackingProduct} 
            onClose={() => setTrackingProduct(null)} 
          />
        )}
        {isFormOpen && (
<ProductForm 
            product={editingProduct} 
            customers={customers}
            boutiques={Array.from(new Set(products.map(p => p.boutique).filter(Boolean))) as string[]}
            masterCategories={categories}
            globalMarkup={globalMarkup}
            onSave={handleSaveProduct} 
            onClose={() => { setIsFormOpen(false); setEditingProduct(undefined); }}
            onRefresh={() => fetch('/api/customers').then(r => r.json()).then(data => setCustomers(data)).catch(console.error)}
          />
        )}
        {isBulkUploadOpen && (
          <BulkUploadModal 
            onUpload={handleSaveProduct}
            onClose={() => setIsBulkUploadOpen(false)}
          />
        )}
        {isCustomerPortalOpen && (
          <CustomerOrderForm 
            availableProducts={products.filter(p => p.isShowcase)}
            masterCategories={categories}
            globalMarkup={globalMarkup}
            onOrderSubmit={async (order) => {
              try {
                const response = await fetch('/api/orders', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(order),
                });
                if (response.ok) {
                  const data = await response.json();
                  setCustomerOrders([order, ...customerOrders]);
                  // In a real email this link would be included. Showing it now as part of the success message.
                  const prodId = order.sku_referencia || 'new';
                  const tLink = `${window.location.origin}${window.location.pathname}?tracking=${prodId}`;
                  alert(`¡Pedido registrado con éxito!\n\nSe ha enviado un email con tu link de seguimiento:\n${tLink}`);
                } else {
                  const err = await response.json();
                  alert(`Error: ${err.error || 'No se pudo sincronizar con Sheets'}`);
                }
              } catch (error) {
                console.error('Order sync error:', error);
                // Fallback to local
                setCustomerOrders([order, ...customerOrders]);
              }
            }}
            onClose={() => setIsCustomerPortalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Footer Status */}
      <div className="fixed bottom-8 left-8 z-50 pointer-events-none">
         <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="pointer-events-auto w-12 h-12 rounded-lg bg-brand-ink text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      <div className="fixed bottom-8 right-8 pointer-events-none">
        <div className={cn(
          "flex items-center gap-2 bg-brand-surface/80 backdrop-blur-md px-4 py-2 rounded-lg border shadow-sm text-[10px] uppercase tracking-widest font-bold transition-all",
          connectionStatus.status === 'ok' ? "text-green-600 border-green-200" : 
          connectionStatus.status === 'error' ? "text-red-500 border-red-200" :
          "text-brand-muted border-brand-border"
        )}>
          {connectionStatus.status === 'testing' ? (
            <Activity size={12} className="animate-spin text-brand-ink" />
          ) : (
            <Activity size={12} className={cn(connectionStatus.status === 'ok' ? "text-green-500 animate-pulse" : "text-brand-muted")} />
          )}
          {connectionStatus.status === 'ok' ? 'Conectado a Google Sheets' : 
           connectionStatus.status === 'testing' ? 'Verificando...' :
           connectionStatus.status === 'error' ? 'Error de Conexión' :
           'Estado: Offline'}
        </div>
      </div>

      <SneekyBot settings={systemSettings} />
    </div>
  );
}

function NavItem({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <motion.button 
      whileTap={{ x: 4, scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all font-bold text-sm",
        active 
          ? "bg-brand-bg text-brand-ink shadow-sm" 
          : "text-brand-muted hover:bg-brand-bg/50 hover:text-brand-ink"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("transition-colors", active ? "text-brand-ink" : "text-brand-muted")}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          active ? "bg-brand-surface text-brand-ink" : "bg-brand-border text-brand-muted"
        )}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

function SettingsRow({ title, value }: { title: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-brand-bg rounded-lg border border-brand-border">
      <span className="text-xs font-bold text-brand-muted">{title}</span>
      <span className="text-xs font-mono font-bold text-brand-ink">{value}</span>
    </div>
  );
}

function Toast({ toast, onClose }: { toast: { message: string; type: 'success' | 'error' } | null, onClose: () => void }) {
  React.useEffect(() => {
    if (toast) {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-50 font-bold text-sm",
        toast.type === "success" 
          ? "bg-[#00FF85] text-black" 
          : "bg-red-500 text-white"
      )}
    >
      {toast.message}
    </motion.div>
  );
}
