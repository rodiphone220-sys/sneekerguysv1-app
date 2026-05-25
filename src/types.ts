export type OrderStatus = 'COMPRADO' | 'COMPRADO_MX' | 'EN_RUTA' | 'EN_BODEGA' | 'ENVIADO' | 'ENTREGADO';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  subcategories: string[];
  isActive?: boolean;
}

// ============================================
// MASTER_DATA - 35 Columnas (A a AI)
// ============================================
// A: ID_UNICO | B: FECHA_REGISTRO | C: NUMERO_PEDIDO | D: CLIENTE_NOMBRE
// E: CLIENTE_EMAIL | F: CLIENTE_TELEFONO | G: CIUDAD_ESTADO | H: CLIENTE_INSTAGRAM
// I: REFERIDO_POR | J: METODO_PAGO_CLIENTE | K: ARTICULO_MODELO | L: CATEGORIA
// M: SUBCATEGORIA | N: MARCA | O: BOUTIQUE_ORIGEN | P: LINK_IMAGENES
// Q: ORIGEN_ARTICULO | R: GENERO | S: TALLA | T: COLOR
// U: COSTO_USD | V: TIPO_CAMBIO | W: COSTO_MXN | X: PRECIO_VENTA_MXN
// Y: UTILIDAD_BRUTA | Z: STATUS_LOGISTICA | AA: UBICACION_DESTINO | AB: TARJETA_PAGO
// AC: COSTO_ENVIO_USA | AD: ESTADO_ENVIO_USA | AE: ESTADO_ENTREGA_USA | AF: UBICACION_ACTUAL
// AG: FECHA_INGRESO_ZAFIRO | AH: INCLUIDO_EN_CORTE_ZAFIRO | AI: ESTADO_ENTREGA_MX
// AJ: FECHA_ENTREGA_CLIENTE | AK: ANTICIPO_ABONADO | AL: TOTAL_PAGADO | AM: SALDO_PENDIENTE
// AN: ABONADO_AMEX | AO: UTILIDAD_TOMADA | AP: REVISADO_RODRIGO | AQ: OBSERVACIONES_NOTAS
// AR: ULTIMO_STATUS_NOTIFICADO | AS: TOTAL_COSTO_USD | AT: TOTAL_COSTO_MXN | AU: PUBLICAR_VITRINA
// AV: SKU_MANUAL | AW: MONEDA_COMPRA | AX: COSTO_COMPRA_NACIONAL | AY:Tags
// ============================================

export interface Product {
  // Identificación y Control
  id: string;
  sku: string;
  sku_manual?: string;
  numero_pedido?: string;
  fecha_registro?: string;
  
  // Cliente
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientIg?: string;
  ciudad_estado?: string;        // Campo nuevo
  referido_por?: string;
  referenciado_por?: string;
  metodo_pago_cliente?: string;
  
  // Producto
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  size?: string;
  gender?: 'HOMBRE' | 'MUJER' | 'UNISEX' | 'KIDS';
  color_description?: string;
  origen_articulo?: 'NACIONAL' | 'USA';
  moneda_compra?: 'USD' | 'MXN';
  
  // Boutique y Origen
  boutique?: string;
  card?: string;
  payment_card?: string;
  
  // Precios y Finanzas
  buyPriceUsd: number;
  exchangeRate: number;
  buyPriceMxn: number;
  totalBuyPriceUsd?: number;
  totalBuyPriceMxn?: number;
  sellPriceMxn?: number;
  profit?: number;
  utilidad_bruta?: number;
  anticipo_abonado?: number;
  total_pagado?: number;
  saldo_pendiente?: number;
  costo_compra_nacional?: number;
  
  // Logística
  costo_envio_usa?: number;
  estado_envio_usa?: string;
  estado_entrega_usa?: string;
  ubicacion_actual?: string;
  fecha_ingreso_zafiro?: string;
  incluido_en_corte_zafiro?: string;
  estado_entrega_mx?: string;
  fecha_entrega_cliente?: string;
  
  // Utilidades y Tracking
  abonado_amex?: number;
  utilidad_tomada?: number;
  revisado_rodrigo?: string;
  currentStatus: OrderStatus;
  destino?: 'EL PASO' | 'DALLAS' | 'MEXICO';
  isPaid?: boolean;
  isDelivered?: boolean;
  isReviewed?: boolean;
  fbPublished?: boolean;
  
  // Imágenes y Notas
  imageUrl?: string;
  notes?: string;
  internal_notes?: string;
  
  // Showroom
  isShowcase?: boolean;
  publicar_vitrina?: boolean;
  
  // Inventario
  quantity: number;
  minStock: number;
  
  // Metadata
  cantidad?: number;
  total_pedidos?: number;
  fechaActualizacion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  ciudad_estado?: string;
  ig_handle?: string;
  referido_por?: string;
  fecha_alta?: string;
  total_pedidos?: number;
  total_comprado?: number;
  notes?: string;
  tipo_de_pago?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CustomerOrder {
  id_cliente: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  ig_handle?: string;
  referido_por?: string;
  tipo_de_pago?: string;
  modelo_seleccionado: string;
  sku_referencia?: string;
  talla: string;
  cantidad: number;
  precio_unitario?: number;
  total_mxn?: number;
  notas: string;
  fecha_pedido: string;
  status: 'Pendiente' | 'Procesado' | 'Enviado' | 'Entregado';
  prioridad?: 'Normal' | 'Urgente' | 'Alta';
}

export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  totalValueUsd: number;
  totalValueMxn: number;
  statusCounts: Record<OrderStatus, number>;
}

export type ExpenseCategory = 'Comida' | 'Transporte' | 'Ropa' | 'Salud' | 'Ocio' | 'Servicios' | 'Viajes' | 'Otros';
export type PaymentCard = 'AMEX AZUL' | 'AMEX ALEX' | 'SANTANDER' | 'INVEX' | 'NU' | 'EFECTIVO';

export interface PersonalExpense {
  id: string;
  fecha: string;
  monto: number;
  concepto: string;
  categoria: ExpenseCategory;
  tarjeta_pago: PaymentCard;
  created_at: string;
}

export interface SystemSettings {
  isAiAssistantEnabled: boolean;
  isAiPrimaryResponder: boolean;
  aiPrimaryPrompt: string;
  aiGeneralPrompt: string;
  sneekyBotPrompt: string;
  aiProvider?: 'groq' | 'ollama' | 'gemini';
  aiModel?: string;
}
