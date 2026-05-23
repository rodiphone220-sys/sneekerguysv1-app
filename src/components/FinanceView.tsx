import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Clock as ClockIcon,
  Package,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard
} from 'lucide-react';
import { Product } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

import { motion } from 'framer-motion';

interface FinanceViewProps {
  products: Product[];
  globalMarkup?: number;
  onUpdateMarkup?: (val: number) => void;
  personalExpenses?: any[];
}

export function FinanceView({ products, globalMarkup = 35, onUpdateMarkup, personalExpenses = [] }: FinanceViewProps) {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const pieRef = React.useRef<HTMLDivElement>(null);
  
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCard, setSelectedCard] = useState('TODAS');
  const [txPage, setTxPage] = useState(1);
  const [consolidatedView, setConsolidatedView] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const TX_PER_PAGE = 10;
  
  const CARD_FILTERS = ['TODAS', 'AMEX AZUL', 'AMEX ALEX', 'SANTANDER', 'INVEX', 'NU'];
  
  const getPresetRange = (preset: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    switch (preset) {
      case 'mes':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'mes-anterior':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'quincena':
        const day = now.getDate();
        if (day <= 15) {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 16);
        }
        break;
      case 'corte':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const baseFilteredProducts = React.useMemo(() => {
    if (!dateRange) return products;
    return products.filter(p => {
      const productDate = p.createdAt?.split('T')[0];
      if (!productDate) return false;
      return productDate >= dateRange.start && productDate <= dateRange.end;
    });
  }, [products, dateRange]);

  const stats = React.useMemo(() => {
    let filteredProducts = baseFilteredProducts;
    
    if (selectedCard !== 'TODAS') {
      filteredProducts = baseFilteredProducts.filter(p => p.payment_card === selectedCard);
    }
    
    const totalCostoUsd = filteredProducts.reduce((acc, p) => acc + (p.buyPriceUsd * (p.quantity || 1)), 0);
    const totalCostoMxn = filteredProducts.reduce((acc, p) => acc + (p.buyPriceMxn * (p.quantity || 1)), 0);
    const totalVentaMxn = filteredProducts.reduce((acc, p) => acc + ((p.sellPriceMxn || 0) * (p.quantity || 1)), 0);
    const totalUtilidad = filteredProducts.reduce((acc, p) => acc + ((p.profit || 0) * (p.quantity || 1)), 0);
    
    // Category Breakdown
    const categoryData: Record<string, { name: string, value: number }> = {};
    filteredProducts.forEach(p => {
      const cat = p.category || 'Otros';
      if (!categoryData[cat]) categoryData[cat] = { name: cat, value: 0 };
      categoryData[cat].value += (p.buyPriceMxn * (p.quantity || 1));
    });

    const categoryChartData = Object.values(categoryData).sort((a, b) => b.value - a.value);

    // Status Breakdown for Cash Flow
    const statusData = [
      { name: 'Comprado', value: filteredProducts.filter(p => p.currentStatus === 'COMPRADO').reduce((acc, p) => acc + (p.quantity || 0), 0) },
      { name: 'Tránsito', value: filteredProducts.filter(p => p.currentStatus === 'EN_RUTA').reduce((acc, p) => acc + (p.quantity || 0), 0) },
      { name: 'En Stock', value: filteredProducts.filter(p => p.currentStatus === 'EN_BODEGA').reduce((acc, p) => acc + (p.quantity || 0), 0) },
      { name: 'Entregado', value: filteredProducts.filter(p => p.currentStatus === 'ENTREGADO').reduce((acc, p) => acc + (p.quantity || 0), 0) },
    ];

    const totalUnits = statusData.reduce((acc, s) => acc + s.value, 0);

    return {
      totalCostoUsd,
      totalCostoMxn,
      totalVentaMxn,
      totalUtilidad,
      categoryChartData,
      statusData,
      totalUnits
    };
  }, [baseFilteredProducts, selectedCard]);

  const COLORS = ['#141414', '#5A5A40', '#F27D26', '#00FF00', '#FF4E00', '#5A5A40'];

  const hasCategoryData = stats.categoryChartData.length > 0;
  const hasStatusData = stats.statusData.some(s => s.value > 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-ink">Resumen Financiero</h2>
          <p className="text-sm text-brand-muted font-medium">Análisis detallado de inversión y rentabilidad</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Filter */}
          <div className="relative">
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-bold",
                dateRange 
                  ? "bg-brand-accent text-white border-brand-accent" 
                  : "bg-brand-bg text-brand-ink border-brand-border hover:border-brand-ink"
              )}
            >
              <Calendar size={16} />
              {dateRange ? `${dateRange.start} - ${dateRange.end}` : 'Filtrar por periodo'}
              <ChevronDown size={14} className={cn(showDatePicker && "rotate-180", "transition-transform")} />
            </button>
            
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-20 overflow-hidden">
                <div className="p-3 space-y-2">
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Periodos Rápidos</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => { setDateRange(getPresetRange('mes')); setShowDatePicker(false); setTxPage(1); }}
                      className="px-3 py-2 text-xs font-bold text-brand-ink bg-brand-bg rounded-lg hover:bg-brand-ink hover:text-white transition-all"
                    >
                      Este Mes
                    </button>
                    <button 
                      onClick={() => { setDateRange(getPresetRange('mes-anterior')); setShowDatePicker(false); setTxPage(1); }}
                      className="px-3 py-2 text-xs font-bold text-brand-ink bg-brand-bg rounded-lg hover:bg-brand-ink hover:text-white transition-all"
                    >
                      Mes Anterior
                    </button>
                    <button 
                      onClick={() => { setDateRange(getPresetRange('quincena')); setShowDatePicker(false); setTxPage(1); }}
                      className="px-3 py-2 text-xs font-bold text-brand-ink bg-brand-bg rounded-lg hover:bg-brand-ink hover:text-white transition-all"
                    >
                      Quincena
                    </button>
                    <button 
                      onClick={() => { setDateRange(getPresetRange('corte')); setShowDatePicker(false); setTxPage(1); }}
                      className="px-3 py-2 text-xs font-bold text-brand-ink bg-brand-bg rounded-lg hover:bg-brand-ink hover:text-white transition-all"
                    >
                      Corte Mes
                    </button>
                  </div>
                </div>
                
                <div className="p-3 border-t border-brand-border space-y-2">
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Personalizado</p>
                  <div className="space-y-2">
                    <input 
                      type="date"
                      value={dateRange?.start || ''}
                      onChange={(e) => setDateRange(prev => ({ ...prev!, start: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-brand-bg border border-brand-border rounded-lg outline-none focus:border-brand-ink"
                    />
                    <input 
                      type="date"
                      value={dateRange?.end || ''}
                      onChange={(e) => setDateRange(prev => ({ ...prev!, end: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-brand-bg border border-brand-border rounded-lg outline-none focus:border-brand-ink"
                    />
                  </div>
                </div>
                
                {dateRange && (
                  <button 
                    onClick={() => { setDateRange(null); setShowDatePicker(false); setTxPage(1); }}
                    className="w-full p-3 text-center text-xs font-bold text-red-500 border-t border-brand-border hover:bg-red-50 transition-colors"
                  >
                    Limpiar Filtro
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 bg-brand-bg px-4 py-2 rounded-xl border border-brand-border">
            <ClockIcon className="text-brand-muted" size={16} />
            <span className="text-xs font-bold text-brand-ink uppercase tracking-tight">Actualizado: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <FinanceCard 
          title="Inversión Total (USD)" 
          value={formatCurrency(stats.totalCostoUsd)}
          icon={<DollarSign className="text-brand-ink" size={20} />}
          trend={+2.4}
          color="bg-brand-surface"
          onClick={() => chartRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />
        <FinanceCard 
          title="Inversión Total (MXN)" 
          value={`$${Math.round(stats.totalCostoMxn).toLocaleString()}`}
          icon={<Wallet className="text-[#5A5A40]" size={20} />}
          trend={+1.2}
          color="bg-white"
          onClick={() => chartRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />
        <FinanceCard 
          title="Venta Proyectada" 
          value={`$${Math.round(stats.totalVentaMxn).toLocaleString()}`}
          icon={<TrendingUp className="text-[#F27D26]" size={20} />}
          trend={+5.8}
          color="bg-white"
          onClick={() => pieRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />
        <FinanceCard 
          title="Utilidad Estimada" 
          value={`$${Math.round(stats.totalUtilidad).toLocaleString()}`}
          icon={<Calculator className="text-green-600" size={20} />}
          trend={+12.4}
          color="bg-[#F0F2F1]"
          highlight
          onClick={() => {
            const pricingEl = document.getElementById('pricing-manager');
            pricingEl?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        {(() => {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          const monthTotal = personalExpenses
            .filter((e: any) => e.date >= monthStart)
            .reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
          return (
            <FinanceCard 
              title="Gasto Personal Mes" 
              value={`$${monthTotal.toLocaleString()}`}
              icon={<Wallet className="text-amber-500" size={20} />}
              trend={0}
              color="bg-amber-50/80 border-amber-200/50"
            />
          );
        })()}
      </div>

      {/* Pricing Management Section */}
      <div id="pricing-manager" className="bg-brand-ink text-white rounded-2xl p-6 lg:p-8 shadow-2xl shadow-brand-ink/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TrendingUp size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
              <Calculator size={24} className="text-brand-accent" />
              Gestión de Precios Sugeridos
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Define un margen de utilidad base que se aplicará automáticamente a todos los nuevos artículos ingresados. 
              Esto facilita la visualización inmediata del <b>Precio Venta Sugerido</b> para tus clientes en la vitrina.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row items-center gap-6 shrink-0">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Margen de Utilidad Base</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={globalMarkup}
                  onChange={(e) => onUpdateMarkup?.(parseFloat(e.target.value) || 0)}
                  className="w-24 bg-transparent text-3xl font-bold font-mono text-brand-accent outline-none border-b-2 border-brand-accent/30 focus:border-brand-accent transition-all text-center"
                />
                <span className="text-3xl font-bold text-brand-accent">%</span>
              </div>
            </div>
            
            <div className="h-px sm:h-12 w-12 sm:w-px bg-brand-border" />

            <div className="text-center sm:text-left">
              <span className="text-[10px] font-bold text-brand-label uppercase tracking-widest block mb-1">Ejemplo de Cálculo</span>
              <p className="text-xs text-brand-muted font-medium">
                Costo: $100 <br />
                Venta: <span className="text-brand-ink font-bold font-mono">${Math.round(100 * (1 + (globalMarkup / 100)))} MXN</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Filter Tabs */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-brand-muted" />
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Filtrar por Tarjeta</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CARD_FILTERS.map(card => {
            const cardTotal = card === 'TODAS'
              ? stats.totalCostoMxn
              : baseFilteredProducts
                  .filter(p => p.payment_card === card)
                  .reduce((acc, p) => acc + (p.buyPriceMxn * (p.quantity || 1)), 0);
            return (
              <button
                key={card}
                onClick={() => { setSelectedCard(card); setTxPage(1); }}
                className={cn(
                  "flex flex-col items-start px-4 py-3 rounded-xl border-2 transition-all text-left min-w-[120px]",
                  selectedCard === card
                    ? "bg-brand-ink text-white border-brand-ink shadow-lg"
                    : "bg-brand-bg text-brand-ink border-brand-border hover:border-brand-ink/40"
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">{card === 'TODAS' ? '💳 TODAS' : `💳 ${card}`}</span>
                <span className={cn(
                  "text-sm font-black font-mono mt-1",
                  selectedCard === card ? "text-white" : "text-brand-ink"
                )}>
                  ${Math.round(cardTotal).toLocaleString()}
                </span>
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-widest",
                  selectedCard === card ? "text-white/60" : "text-brand-muted"
                )}>MXN</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown Chart */}
        <div ref={chartRef} className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-brand-ink uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={16} /> Inversión por Categoría (MXN)
            </h3>
          </div>
          {hasCategoryData ? (
            <div className="h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="99%" height={300}>
                <BarChart data={stats.categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--brand-muted)' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--brand-muted)' }}
                    tickFormatter={(val) => `$${(val / 1000)}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'var(--brand-bg)' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid var(--brand-border)', 
                      backgroundColor: 'var(--brand-surface)',
                      color: 'var(--brand-ink)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                    }}
                    itemStyle={{ color: 'var(--brand-ink)', fontSize: '10px', fontWeight: 700 }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats.categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-brand-muted text-sm">
              No hay datos suficientes para mostrar el gráfico
            </div>
          )}
          
          {/* Investment Table by Category */}
          <div className="mt-6 border-t border-brand-border pt-6">
            <h4 className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-4">Desglose por Categoría</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left pb-2 font-bold text-brand-muted uppercase tracking-widest text-[9px]">Categoría</th>
                    <th className="text-right pb-2 font-bold text-brand-muted uppercase tracking-widest text-[9px]">Monto (MXN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/50">
                  {(() => {
                    const CATEGORY_LIST = [
                      'CALZADO DE DISEÑADOR - HOMBRE',
                      'CALZADO DE DISEÑADOR - MUJER',
                      'CALZADO DEPORTIVO - HOMBRE',
                      'CALZADO DEPORTIVO - MUJER',
                      'PLAYERAS - HOMBRE',
                      'PLAYERAS - MUJER',
                      'PANTALONES',
                      'CHAMARRAS Y HOODIES',
                      'ACCESORIOS',
                      'COLECCIONABLES',
                      'OTROS',
                    ];
                    const fmt = (val: number) => val.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
                    const filteredForTable = selectedCard === 'TODAS'
                      ? baseFilteredProducts
                      : baseFilteredProducts.filter(p => p.payment_card === selectedCard);
                    let total = 0;
                    return CATEGORY_LIST.map(cat => {
                      const amount = filteredForTable
                        .filter(p => p.category === cat)
                        .reduce((acc, p) => acc + (p.buyPriceMxn * (p.quantity || 1)), 0);
                      total += amount;
                      return (
                        <tr key={cat} className="hover:bg-brand-bg/50 transition-colors">
                          <td className="py-2.5 pr-4 font-bold text-brand-ink">{cat}</td>
                          <td className={cn(
                            "py-2.5 text-right font-mono font-bold",
                            amount > 0 ? "text-brand-ink" : "text-brand-muted/50"
                          )}>{fmt(amount)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-brand-ink">
                    <td className="pt-3 pr-4 font-black text-brand-ink uppercase tracking-wider text-[10px]">Total Consolidado</td>
                    <td className="pt-3 text-right font-black font-mono text-brand-ink">
                      {(() => {
                        const fmt = (val: number) => val.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
                        const total = (selectedCard === 'TODAS'
                          ? baseFilteredProducts
                          : baseFilteredProducts.filter(p => p.payment_card === selectedCard)
                        ).reduce((acc, p) => acc + (p.buyPriceMxn * (p.quantity || 1)), 0);
                        return fmt(total);
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Global Distribution */}
        <div ref={pieRef} className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm flex flex-col transition-colors duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-brand-ink uppercase tracking-widest flex items-center gap-2">
              <PieChartIcon size={16} /> Distribución de Stock
            </h3>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-ink text-brand-bg rounded-full">
              <Package size={10} />
              <span className="text-[10px] font-bold">{stats.totalUnits} <span className="opacity-60">UDS</span></span>
            </div>
          </div>
          {hasStatusData ? (
            <div className="h-[250px] w-full min-h-[250px]">
              <ResponsiveContainer width="99%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid var(--brand-border)', 
                      backgroundColor: 'var(--brand-surface)',
                      color: 'var(--brand-ink)',
                      fontSize: '10px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-brand-muted text-sm">
              No hay productos en inventario
            </div>
          )}
          <div className="space-y-3 mt-4">
            {stats.statusData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2 text-brand-muted">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  {item.name}
                </div>
                <span className="text-brand-ink">{item.value} unidades</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction Detail Table */}
        {(() => {
          const txProducts = selectedCard === 'TODAS'
            ? baseFilteredProducts
            : baseFilteredProducts.filter(p => p.payment_card === selectedCard);
          
          const totalPages = Math.max(1, Math.ceil(txProducts.length / TX_PER_PAGE));
          const safePage = Math.min(txPage, totalPages);
          const fmtMxn = (val: number) => val.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
          const fmtUsd = (val: number) => val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
          const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('es-MX') : '-';
          
          const getGroupKey = (p: any) => `${p.createdAt?.split('T')[0] || 'unknown'}_${p.payment_card || 'sin-tarjeta'}`;
          
          const groups = consolidatedView
            ? Object.entries(
                txProducts.reduce<Record<string, typeof txProducts>>((acc, p) => {
                  const key = getGroupKey(p);
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(p);
                  return acc;
                }, {})
              ).map(([key, items]) => ({
                key,
                date: items[0].createdAt,
                card: items[0].payment_card || '-',
                clientName: items[0].clientName || 'STOCK',
                totalUsd: items.reduce((s, i) => s + (i.buyPriceUsd * (i.quantity || 1)), 0),
                totalMxn: items.reduce((s, i) => s + (i.buyPriceMxn * (i.quantity || 1)), 0),
                count: items.length,
                items,
              }))
            : [];
          
          const toggleGroup = (key: string) => {
            setExpandedGroups(prev => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key); else next.add(key);
              return next;
            });
          };
          
          const pageGroups = consolidatedView
            ? groups.slice((safePage - 1) * TX_PER_PAGE, safePage * TX_PER_PAGE)
            : [];
          const pageProducts = consolidatedView ? [] : txProducts.slice((safePage - 1) * TX_PER_PAGE, safePage * TX_PER_PAGE);
          
          return (
            <div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-brand-ink uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={16} /> Desglose Total de Gastos
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-brand-muted">
                    {consolidatedView ? `${groups.length} compra(s)` : `${txProducts.length} registro(s)`}
                  </span>
                  <button
                    onClick={() => { setConsolidatedView(!consolidatedView); setTxPage(1); setExpandedGroups(new Set()); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all",
                      consolidatedView
                        ? "bg-brand-ink text-white border-brand-ink"
                        : "bg-brand-bg text-brand-muted border-brand-border hover:border-brand-ink"
                    )}
                  >
                    {consolidatedView ? 'Ver por Artículos' : 'Ver por Compras'}
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-brand-border">
                      {consolidatedView && <th className="w-8 pb-3" />}
                      <th className="text-left pb-3 font-bold text-brand-muted uppercase tracking-widest text-[9px]">Fecha / ID</th>
                      {!consolidatedView && <th className="text-left pb-3 font-bold text-brand-muted uppercase tracking-widest text-[9px]">Artículo</th>}
                      {!consolidatedView && <th className="text-left pb-3 font-bold text-brand-muted uppercase tracking-widest text-[9px]">Modelo</th>}
                      {!consolidatedView && <th className="text-left pb-3 font-bold text-brand-muted uppercase tracking-widest text-[9px]">Categoría</th>}
                      <th className="text-left pb-3 font-bold text-brand-muted uppercase tracking-widest text-[9px]">Tarjeta</th>
                      {consolidatedView && <th className="text-center pb-3 font-bold text-brand-muted uppercase tracking-widest text-[9px]">Arts.</th>}
                      <th className="text-right pb-3 font-bold text-brand-muted uppercase tracking-widest text-[9px]">USD</th>
                      <th className="text-right pb-3 font-bold text-brand-muted uppercase tracking-widest text-[9px]">MXN</th>
                      <th className="text-left pb-3 font-bold text-brand-muted uppercase tracking-widest text-[9px]">Cliente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40">
                    {consolidatedView ? (
                      pageGroups.length === 0 ? (
                        <tr><td colSpan={7} className="py-12 text-center text-brand-muted text-xs font-medium">No hay registros para este filtro</td></tr>
                      ) : (
                        pageGroups.map(g => (
                          <React.Fragment key={g.key}>
                            <tr className="bg-brand-ink/5 hover:bg-brand-ink/10 transition-colors cursor-pointer" onClick={() => toggleGroup(g.key)}>
                              <td className="py-3 pr-2">
                                <span className="text-[10px] font-mono text-brand-muted transition-transform inline-block" style={{ transform: expandedGroups.has(g.key) ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                  ▶
                                </span>
                              </td>
                              <td className="py-3 pr-4 whitespace-nowrap font-mono text-[10px] text-brand-muted">{fmtDate(g.date)}</td>
                              <td className="py-3 pr-4 font-mono text-[10px] font-bold text-brand-ink">{g.card}</td>
                              <td className="py-3 pr-4 text-center font-bold text-brand-ink">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-ink text-white text-[10px] font-black">{g.count}</span>
                              </td>
                              <td className="py-3 pr-4 text-right font-mono font-bold text-brand-ink">{fmtUsd(g.totalUsd)}</td>
                              <td className="py-3 pr-4 text-right font-mono font-bold text-brand-ink">{fmtMxn(g.totalMxn)}</td>
                              <td className="py-3 text-brand-muted font-medium">{g.clientName}</td>
                            </tr>
                            {expandedGroups.has(g.key) && g.items.map(p => (
                              <tr key={p.id} className="bg-brand-bg/30 hover:bg-brand-bg/60 transition-colors">
                                <td className="py-2 pr-2 border-l-2 border-brand-ink/20 pl-6" />
                                <td className="py-2 pr-4 whitespace-nowrap font-mono text-[9px] text-brand-muted">{p.sku || '-'}</td>
                                <td className="py-2 pr-4 font-bold text-brand-ink text-[10px]">{p.brand || '-'}</td>
                                <td className="py-2 pr-4 text-brand-ink text-[10px] max-w-[160px] truncate">{p.name || '-'}</td>
                                <td className="py-2 pr-4">
                                  <span className="px-1.5 py-0.5 rounded-full bg-brand-ink/5 border border-brand-ink/10 text-[8px] font-bold text-brand-muted whitespace-nowrap">{p.category || '-'}</span>
                                </td>
                                <td className="py-2 pr-4 text-right font-mono font-bold text-brand-ink text-[10px]">{fmtUsd(p.buyPriceUsd * (p.quantity || 1))}</td>
                                <td className="py-2 pr-4 text-right font-mono font-bold text-brand-ink text-[10px]">{fmtMxn(p.buyPriceMxn * (p.quantity || 1))}</td>
                                <td className="py-2 text-brand-muted font-medium text-[10px]">{p.clientName || 'STOCK'}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )
                    ) : (
                      pageProducts.length === 0 ? (
                        <tr><td colSpan={8} className="py-12 text-center text-brand-muted text-xs font-medium">No hay registros para este filtro</td></tr>
                      ) : (
                        pageProducts.map(p => (
                          <tr key={p.id} className="hover:bg-brand-bg/40 transition-colors">
                            <td className="py-3 pr-4 whitespace-nowrap font-mono text-[10px] text-brand-muted">{fmtDate(p.createdAt)}</td>
                            <td className="py-3 pr-4 font-bold text-brand-ink">{p.brand || '-'}</td>
                            <td className="py-3 pr-4 text-brand-ink max-w-[180px] truncate">{p.name || '-'}</td>
                            <td className="py-3 pr-4">
                              <span className="px-2 py-0.5 rounded-full bg-brand-ink/5 border border-brand-ink/10 text-[9px] font-bold text-brand-muted whitespace-nowrap">{p.category || '-'}</span>
                            </td>
                            <td className="py-3 pr-4 font-mono text-[10px] font-bold text-brand-ink">{p.payment_card || '-'}</td>
                            <td className="py-3 pr-4 text-right font-mono font-bold text-brand-ink">{fmtUsd(p.buyPriceUsd * (p.quantity || 1))}</td>
                            <td className="py-3 pr-4 text-right font-mono font-bold text-brand-ink">{fmtMxn(p.buyPriceMxn * (p.quantity || 1))}</td>
                            <td className="py-3 text-brand-muted font-medium">{p.clientName || 'STOCK'}</td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                  {txProducts.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-brand-ink">
                        <td colSpan={consolidatedView ? 3 : 5} className="pt-3 font-black text-brand-ink uppercase tracking-wider text-[10px]">Total</td>
                        <td className="pt-3 text-right font-black font-mono text-brand-ink">
                          {fmtUsd(txProducts.reduce((acc, p) => acc + (p.buyPriceUsd * (p.quantity || 1)), 0))}
                        </td>
                        <td className="pt-3 text-right font-black font-mono text-brand-ink">
                          {fmtMxn(txProducts.reduce((acc, p) => acc + (p.buyPriceMxn * (p.quantity || 1)), 0))}
                        </td>
                        <td className="pt-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-brand-border">
                  <span className="text-[10px] font-bold text-brand-muted">
                    Página {safePage} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTxPage(Math.max(1, safePage - 1))}
                      disabled={safePage <= 1}
                      className="p-2 rounded-lg border border-brand-border text-brand-muted hover:text-brand-ink hover:border-brand-ink disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setTxPage(Math.min(totalPages, safePage + 1))}
                      disabled={safePage >= totalPages}
                      className="p-2 rounded-lg border border-brand-border text-brand-muted hover:text-brand-ink hover:border-brand-ink disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}

function FinanceCard({ title, value, icon, trend, color, highlight, onClick }: { title: string, value: string, icon: React.ReactNode, trend: number, color: string, highlight?: boolean, onClick?: () => void }) {
  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-6 rounded-2xl border border-brand-border transition-all hover:shadow-xl hover:shadow-black/5 duration-300 cursor-pointer relative overflow-hidden group", 
        color,
        "shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 bg-brand-bg rounded-xl border border-brand-border group-hover:border-brand-ink/20 transition-colors">
          {icon}
        </div>
        <div className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full", trend > 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50")}>
          {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-brand-label uppercase tracking-widest leading-none">{title}</p>
        <h3 className={cn("text-2xl font-black font-mono tracking-tighter", highlight ? "text-brand-ink" : "text-brand-ink")}>{value}</h3>
      </div>
      
      {/* 3D Visual Accent */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-ink/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

function Clock({ className, size }: { className?: string, size?: number }) {
  return <ClockIcon className={className} size={size} />;
}
