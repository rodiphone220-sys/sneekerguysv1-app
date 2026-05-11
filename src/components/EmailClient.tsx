import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Inbox, Send, FileText, Star, Trash2, Search, 
  Paperclip, Clock, CheckCircle, Package, Truck, MapPin,
  ChevronLeft, ChevronRight, MoreVertical, Reply, Forward,
  ExternalLink, Copy, Archive, AlertCircle, Loader2, X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Email {
  id: string;
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  hasAttachments: boolean;
  attachments?: { name: string; type: string; url: string }[];
  folder: 'inbox' | 'sent' | 'drafts' | 'archive';
  priority?: 'high' | 'normal' | 'low';
  orderId?: string;
  orderStatus?: string;
}

interface Order {
  id: string;
  customerName: string;
  status: 'New' | 'In Route' | 'Delivered' | 'Processing';
  items: string;
  total: number;
  date: string;
}

const MOCK_EMAILS: Email[] = [
  {
    id: '1',
    from: 'Cliente - Juan Pérez',
    fromEmail: 'juan.perez@email.com',
    to: 'The Sneaker Guys',
    toEmail: 'contact@thesneakerguys.com',
    subject: 'Consulta sobre disponibilidad Jordan 1 Retro High',
    body: 'Hola, me interesa saber si tienen disponible el Jordan 1 Retro High en talla 10. ¿Cuánto cuesta con envío a México?',
    date: '2024-01-15T10:30:00',
    read: false,
    starred: false,
    hasAttachments: false,
    folder: 'inbox',
    priority: 'high',
    orderId: 'ORD-001'
  },
  {
    id: '2',
    from: 'Proveedor - Nike Outlet',
    fromEmail: 'orders@nike-outlet.com',
    to: 'The Sneaker Guys',
    toEmail: 'contact@thesneakerguys.com',
    subject: 'Confirmación de pedido #NC-2024-156',
    body: 'Su pedido ha sido confirmado. Los artículos serán enviados en los próximos 3-5 días hábiles.\n\nPedido: #NC-2024-156\nItems: 5 pares\nTotal: $1,250 USD',
    date: '2024-01-15T09:15:00',
    read: true,
    starred: true,
    hasAttachments: true,
    attachments: [{ name: 'invoice_nc2024156.pdf', type: 'pdf', url: '#' }],
    folder: 'inbox',
    orderId: 'ORD-002'
  },
  {
    id: '3',
    from: 'The Sneaker Guys',
    fromEmail: 'contact@thesneakerguys.com',
    to: 'María González',
    toEmail: 'maria.gonzalez@email.com',
    subject: 'Re: Pedido confirmado - #TSG-2024-089',
    body: 'Hola María,\n\nTu pedido ha sido confirmado y está en proceso de envío. Te mantendremos informada sobre el estado de tu pedido.\n\nGracias por confiar en The Sneaker Guys!',
    date: '2024-01-14T16:45:00',
    read: true,
    starred: false,
    hasAttachments: false,
    folder: 'sent',
    orderId: 'ORD-089'
  }
];

const MOCK_ORDERS: Order[] = [
  { id: 'ORD-001', customerName: 'Juan Pérez', status: 'New', items: 'Jordan 1 Retro High x1', total: 8500, date: '2024-01-15' },
  { id: 'ORD-002', customerName: 'Nike Outlet', status: 'In Route', items: 'Air Max 90 x3, Dunk Low x2', total: 18000, date: '2024-01-14' },
  { id: 'ORD-089', customerName: 'María González', status: 'Delivered', items: 'Yeezy 350 V2 x1', total: 7200, date: '2024-01-10' },
  { id: 'ORD-045', customerName: 'Carlos Rivera', status: 'Processing', items: 'New Balance 550 x2', total: 9600, date: '2024-01-12' },
];

type EmailAccount = 'namecheap' | 'gmail';
type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'archive';

export function EmailClient() {
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount>('namecheap');
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
  const [emails, setEmails] = useState<Email[]>(MOCK_EMAILS);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(true);
  const [orders] = useState<Order[]>(MOCK_ORDERS);

  const filteredEmails = emails.filter(email => {
    const matchesFolder = email.folder === selectedFolder;
    const matchesSearch = !searchQuery || 
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const unreadCount = emails.filter(e => !e.read && e.folder === 'inbox').length;
  const starredCount = emails.filter(e => e.starred).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return date.toLocaleDateString('es-MX', { weekday: 'short' });
    }
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  };

  const toggleStar = (emailId: string) => {
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, starred: !e.starred } : e
    ));
  };

  const markAsRead = (emailId: string) => {
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, read: true } : e
    ));
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-green-500';
      case 'In Route': return 'bg-blue-500';
      case 'Delivered': return 'bg-gray-400';
      case 'Processing': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case 'New': return 'Nuevo';
      case 'In Route': return 'En Ruta';
      case 'Delivered': return 'Entregado';
      case 'Processing': return 'Procesando';
      default: return status;
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Header Banner */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-accent via-brand-ink to-brand-accent" />

      {/* Left Sidebar - Account & Folders */}
      <div className="w-64 bg-[#0f0f0f]/80 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0">
        {/* Account Selector */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={14} className="text-brand-accent" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cuentas</span>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => setSelectedAccount('namecheap')}
              className={cn(
                "w-full p-3 rounded-xl flex items-center gap-3 transition-all",
                selectedAccount === 'namecheap' 
                  ? "bg-brand-ink text-white shadow-lg shadow-brand-ink/20" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-[10px] font-black text-white">N</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold">contact@thesneakerguys.com</p>
                <p className="text-[9px] text-gray-400">Namecheap</p>
              </div>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-brand-accent text-white text-[10px] font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectedAccount('gmail')}
              className={cn(
                "w-full p-3 rounded-xl flex items-center gap-3 transition-all",
                selectedAccount === 'gmail' 
                  ? "bg-brand-ink text-white shadow-lg shadow-brand-ink/20" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <span className="text-[10px] font-black text-white">G</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold">sneakerguys.mx@gmail.com</p>
                <p className="text-[9px] text-gray-400">Gmail</p>
              </div>
            </button>
          </div>
        </div>

        {/* Folders */}
        <div className="p-4 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <FolderIcon size={14} className="text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Carpetas</span>
          </div>

          <div className="space-y-1">
            <FolderButton 
              icon={<Inbox size={16} />}
              label="Bandeja de Entrada"
              count={unreadCount}
              active={selectedFolder === 'inbox'}
              onClick={() => setSelectedFolder('inbox')}
            />
            <FolderButton 
              icon={<Send size={16} />}
              label="Enviados"
              active={selectedFolder === 'sent'}
              onClick={() => setSelectedFolder('sent')}
            />
            <FolderButton 
              icon={<FileText size={16} />}
              label="Borradores"
              active={selectedFolder === 'drafts'}
              onClick={() => setSelectedFolder('drafts')}
            />
            <FolderButton 
              icon={<Archive size={16} />}
              label="Archivados"
              active={selectedFolder === 'archive'}
              onClick={() => setSelectedFolder('archive')}
            />
          </div>

          {/* Sneaker Orders Section */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Package size={14} className="text-brand-accent" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pedidos</span>
            </div>
            <div className="space-y-1">
              <button className="w-full p-2 rounded-lg flex items-center gap-2 text-xs text-green-500 bg-green-500/10 hover:bg-green-500/20 transition-colors">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Nuevo ({orders.filter(o => o.status === 'New').length})
              </button>
              <button className="w-full p-2 rounded-lg flex items-center gap-2 text-xs text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                En Ruta ({orders.filter(o => o.status === 'In Route').length})
              </button>
              <button className="w-full p-2 rounded-lg flex items-center gap-2 text-xs text-gray-400 bg-gray-500/10 hover:bg-gray-500/20 transition-colors">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                Entregado ({orders.filter(o => o.status === 'Delivered').length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Center - Email List */}
      <div className="w-96 bg-[#121212]/50 border-r border-white/5 flex flex-col shrink-0">
        {/* Search Bar */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text"
              placeholder="Buscar correos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:bg-white/10 transition-all"
            />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                <Inbox size={20} className="text-gray-500" />
              </div>
              <p className="text-xs text-gray-500">No hay correos en esta carpeta</p>
            </div>
          ) : (
            filteredEmails.map(email => (
              <button
                key={email.id}
                onClick={() => {
                  setSelectedEmail(email);
                  if (!email.read) markAsRead(email.id);
                }}
                className={cn(
                  "w-full p-4 border-b border-white/5 text-left transition-all hover:bg-white/5",
                  selectedEmail?.id === email.id && "bg-white/10",
                  !email.read && "bg-white/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0",
                    !email.read ? "bg-brand-accent text-white" : "bg-white/10 text-gray-400"
                  )}>
                    {email.from.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={cn(
                        "text-xs font-bold truncate",
                        !email.read ? "text-white" : "text-gray-300"
                      )}>
                        {email.from}
                      </span>
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {formatDate(email.date)}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs truncate mb-1",
                      !email.read ? "text-white font-medium" : "text-gray-400"
                    )}>
                      {email.subject}
                    </p>
                    <div className="flex items-center gap-2">
                      {email.starred && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
                      {email.hasAttachments && <Paperclip size={10} className="text-gray-500" />}
                      {email.orderId && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-brand-accent/20 text-brand-accent rounded">
                          {email.orderId}
                        </span>
                      )}
                      {email.priority === 'high' && (
                        <AlertCircle size={10} className="text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right - Email Preview & Order Tracking */}
      <div className="flex-1 bg-[#0a0a0a] flex flex-col min-w-0">
        {!selectedEmail ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-accent/20 to-brand-ink/20 flex items-center justify-center mb-6 border border-white/10">
              <Mail size={32} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Selecciona un correo</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Elige un correo de la lista para ver su contenido y seguimiento de pedido.
            </p>
          </div>
        ) : (
          <>
            {/* Email Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white mb-1">{selectedEmail.subject}</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>De: {selectedEmail.fromEmail}</span>
                    <span>•</span>
                    <span>{formatDate(selectedEmail.date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => toggleStar(selectedEmail.id)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <Star 
                      size={18} 
                      className={cn(
                        selectedEmail.starred ? "text-yellow-500 fill-yellow-500" : "text-gray-400"
                      )} 
                    />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Reply size={18} className="text-gray-400" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Forward size={18} className="text-gray-400" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <MoreVertical size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Attachments */}
              {selectedEmail.hasAttachments && selectedEmail.attachments && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-white/5 rounded-xl">
                  <Paperclip size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-400">Adjuntos:</span>
                  {selectedEmail.attachments.map((att, idx) => (
                    <button key={idx} className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg text-xs text-white hover:bg-white/20 transition-colors">
                      <FileText size={12} className="text-brand-accent" />
                      {att.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                  {selectedEmail.body}
                </p>
              </div>
            </div>

            {/* Order Tracking Panel */}
            {selectedEmail.orderId && (
              <div className="p-6 border-t border-white/5 bg-[#0f0f0f]/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-brand-accent" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Seguimiento de Pedido</span>
                  </div>
                  <button 
                    onClick={() => setShowOrderPanel(!showOrderPanel)}
                    className="text-xs text-brand-accent hover:underline"
                  >
                    {showOrderPanel ? 'Ocultar' : 'Ver más'}
                  </button>
                </div>

                <AnimatePresence>
                  {showOrderPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white/5 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-bold text-white">{selectedEmail.orderId}</p>
                            <p className="text-[10px] text-gray-400">Pedido del cliente</p>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                            getOrderStatusColor(selectedEmail.orderStatus || 'New'),
                            "text-white"
                          )}>
                            {getOrderStatusLabel(selectedEmail.orderStatus || 'New')}
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="relative">
                          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-700" />
                          <div className="space-y-4">
                            <TimelineItem 
                              icon={<CheckCircle size={14} />}
                              label="Pedido Confirmado"
                              date="14 ene 2024"
                              isActive
                            />
                            <TimelineItem 
                              icon={<Package size={14} />}
                              label="En Procesamiento"
                              date="15 ene 2024"
                              isActive
                            />
                            <TimelineItem 
                              icon={<Truck size={14} />}
                              label="En Ruta"
                              date="16 ene 2024"
                              isActive={selectedEmail.orderStatus === 'In Route' || selectedEmail.orderStatus === 'Delivered'}
                            />
                            <TimelineItem 
                              icon={<MapPin size={14} />}
                              label="Entregado"
                              date={selectedEmail.orderStatus === 'Delivered' ? '18 ene 2024' : 'Pendiente'}
                              isActive={selectedEmail.orderStatus === 'Delivered'}
                              isLast
                            />
                          </div>
                        </div>

                        <button className="w-full mt-4 py-2 bg-brand-accent text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                          <ExternalLink size={12} />
                          Ver Detalles Completos
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FolderButton({ icon, label, count, active, onClick }: { 
  icon: React.ReactNode; 
  label: string; 
  count?: number;
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-2.5 rounded-lg flex items-center justify-between transition-all",
        active 
          ? "bg-white/10 text-white" 
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="px-1.5 py-0.5 bg-brand-accent text-white text-[9px] font-bold rounded-full">
          {count}
        </span>
      )}
    </button>
  );
}

function FolderIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TimelineItem({ icon, label, date, isActive, isLast }: { 
  icon: React.ReactNode; 
  label: string; 
  date: string;
  isActive: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 relative">
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10",
        isActive ? "bg-brand-accent text-white" : "bg-gray-700 text-gray-500"
      )}>
        {icon}
      </div>
      <div className="flex-1 pt-0.5">
        <p className={cn(
          "text-xs font-medium",
          isActive ? "text-white" : "text-gray-500"
        )}>
          {label}
        </p>
        <p className="text-[10px] text-gray-600">{date}</p>
      </div>
    </div>
  );
}