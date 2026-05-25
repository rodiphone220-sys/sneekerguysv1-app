import React from 'react';
import { Product, DashboardStats, OrderStatus } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Package, AlertTriangle, DollarSign, ShoppingBag, Edit2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardProps {
  products: Product[];
  onNavigate: (tab: any) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Comprado en USA': '#3B82F6',
  'Comprado en México': '#22C55E',
  'En Ruta a Zafi': '#06B6D4',
  'Recibido en Zafi': '#F97316',
  'Enviado a México': '#8B5CF6',
  'Entregado': '#22C55E'
};

const STATUS_LABELS: Record<string, string> = {
  'Comprado en USA': '🇺🇸 Comprado USA',
  'Comprado en México': '🇲🇽 Comprado MX',
  'En Ruta a Zafi': '✈️ En Ruta',
  'Recibido en Zafi': '📍 En Zafi',
  'Enviado a México': '🚚 Enviado MX',
  'Entregado': '✅ Entregado'
};

export function Dashboard({ products, onNavigate }: DashboardProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const stats: DashboardStats = React.useMemo(() => {
    const s: DashboardStats = {
      totalItems: products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0),
      lowStockItems: products.filter(p => (Number(p.quantity) || 0) <= (Number(p.minStock) || 1) && (Number(p.quantity) || 0) > 0).length,
      totalValueUsd: products.reduce((acc, p) => acc + ((Number(p.buyPriceUsd) || 0) * (Number(p.quantity) || 1)), 0),
      totalValueMxn: products.reduce((acc, p) => acc + ((Number(p.buyPriceMxn) || 0) * (Number(p.quantity) || 1)), 0),
      statusCounts: {
        'Comprado en USA': 0,
        'Comprado en México': 0,
        'En Ruta a Zafi': 0,
        'Recibido en Zafi': 0,
        'Enviado a México': 0,
        'Entregado': 0
      } as Record<string, number>
    };
    
    products.forEach(p => {
      const status = p.currentStatus || '';
      const matchedStatus = Object.keys(s.statusCounts).find(
        key => key.toLowerCase() === status.toLowerCase()
      );
      if (matchedStatus) {
        (s.statusCounts as Record<string, number>)[matchedStatus] += (Number(p.quantity) || 1);
      }
    });
    
    return s;
  }, [products]);

  const statusData = Object.entries(stats.statusCounts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name: STATUS_LABELS[name] || name,
      value,
      color: STATUS_COLORS[name] || '#888'
    }));

  const totalStatus = statusData.reduce((acc, item) => acc + item.value, 0);

  const stockData = products
    .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
    .slice(0, 8)
    .map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      fullName: p.name,
      stock: p.quantity || 0,
      minStock: p.minStock || 1,
      brand: p.brand,
      id: p.id
    }));

  const lowStockProducts = products
    .filter(p => (p.quantity || 0) <= (p.minStock || 1) && (p.quantity || 0) > 0)
    .slice(0, 5);

  const hasData = products.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-brand-muted">
        <div className="w-24 h-24 mb-6 rounded-full bg-brand-bg flex items-center justify-center">
          <ShoppingBag size={48} className="opacity-30" />
        </div>
        <p className="text-lg font-bold text-brand-ink mb-2">Sin productos en inventario</p>
        <p className="text-sm mb-6">Agrega productos para ver las estadísticas del dashboard</p>
        <button
          onClick={() => onNavigate('all')}
          className="px-6 py-3 bg-brand-ink text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
        >
          Agregar Primer Producto
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="TOTAL ARTICULOS"
          value={products.length.toString()}
          icon={<Package size={20} className="text-brand-ink" />}
          color="text-brand-ink"
          delay={0.1}
          onClick={() => onNavigate('all')}
        />
        <StatCard 
          title="Unidades"
          value={stats.totalItems.toString()}
          icon={<Package size={20} className="text-blue-600" />}
          color="text-blue-600"
          delay={0.15}
          subtitle="artículos en inventario"
          onClick={() => onNavigate('stock')}
        />
        <StatCard 
          title="Stock Bajo"
          value={stats.lowStockItems.toString()}
          icon={<AlertTriangle size={20} className="text-orange-500" />}
          color="text-orange-500"
          delay={0.2}
          onClick={() => onNavigate('stock')}
          subtitle="requieren atención"
        />
        <StatCard 
          title="Valor Total"
          value={`$${Math.round(stats.totalValueMxn).toLocaleString()}`}
          icon={<DollarSign size={20} className="text-green-600" />}
          color="text-green-600"
          delay={0.25}
          subtitle="MXN inversión"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-800 text-sm">Distribución por Status</h3>
            <span className="text-xs text-gray-400 font-medium">Actualizado ahora</span>
          </div>
          
          {isMounted && statusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-48 h-48 relative flex-shrink-0">
                <ResponsiveContainer width="99%" height={180} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-gray-800">{totalStatus}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex-1 space-y-3">
                {statusData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-medium text-gray-600">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-800">{item.value}</span>
                      <span className="text-[10px] text-gray-400 ml-1">
                        ({Math.round((item.value / totalStatus) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              {isMounted ? 'Sin datos de status' : 'Cargando...'}
            </div>
          )}
        </div>

        {/* Inventory Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-800 text-sm">Top Inventario</h3>
            <button 
              onClick={() => onNavigate('stock')}
              className="text-xs text-brand-accent font-bold hover:underline"
            >
              Ver todos
            </button>
          </div>
          
          {isMounted && stockData.length > 0 ? (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="99%" height={180}>
                <BarChart 
                  data={stockData} 
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value, name, props): any => [
                      `${value || 0} unidades`, 
                      props?.payload?.brand || ''
                    ]}
                  />
                  <Bar 
                    dataKey="stock" 
                    fill="#1A1A1A" 
                    radius={[0, 4, 4, 0]} 
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Sin datos de inventario
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Table */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle size={16} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Punto de Reorden</h3>
                <p className="text-xs text-gray-400">Productos con stock bajo</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
              {lowStockProducts.length} productos
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mín.</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStockProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                          <Package size={14} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800 truncate max-w-[150px]">{product.name}</p>
                          <p className="text-[10px] text-gray-400">{product.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium text-gray-600">{product.category}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-6 bg-red-100 text-red-700 text-xs font-bold rounded">
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs text-gray-400">{product.minStock}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onNavigate('all')}
                          className="p-1.5 text-gray-400 hover:text-brand-ink hover:bg-gray-100 rounded transition-colors"
                          title="Ver producto"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => onNavigate('all')}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Reabastecer"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color = "text-brand-ink", delay, icon, subtitle, onClick }: { 
  title: string; 
  value: string; 
  color?: string; 
  delay: number; 
  icon?: React.ReactNode; 
  subtitle?: string; 
  onClick?: () => void 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ delay }}
      onClick={onClick}
      className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{title}</span>
        <div className="p-1.5 bg-gray-100 rounded-lg">{icon}</div>
      </div>
      <div className={cn("text-2xl font-black tracking-tight", color)}>
        {value}
      </div>
      {subtitle && (
        <p className="text-[10px] text-gray-400 mt-1 font-medium">{subtitle}</p>
      )}
    </motion.div>
  );
}