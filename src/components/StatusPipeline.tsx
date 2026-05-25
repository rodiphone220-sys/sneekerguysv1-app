import React from 'react';
import { OrderStatus } from '../types';
import { cn } from '../lib/utils';
import { Package, Truck, Warehouse, Send, CheckCircle2 } from 'lucide-react';

interface StatusPipelineProps {
  currentStatus: OrderStatus;
  className?: string;
}

const steps: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'COMPRADO', label: 'Comprado USA', icon: <Package size={16} /> },
  { key: 'COMPRADO_MX', label: 'Comprado MX', icon: <Package size={16} /> },
  { key: 'EN_RUTA', label: 'En Ruta', icon: <Truck size={16} /> },
  { key: 'EN_BODEGA', label: 'Bodega', icon: <Warehouse size={16} /> },
  { key: 'ENVIADO', label: 'Enviado', icon: <Send size={16} /> },
  { key: 'ENTREGADO', label: 'Entregado', icon: <CheckCircle2 size={16} /> },
];

export function StatusPipeline({ currentStatus, className }: StatusPipelineProps) {
  const currentIndex = steps.findIndex((step) => step.key === currentStatus);

  return (
    <div className={cn("flex items-center w-full justify-between relative", className)}>
      {/* Background line */}
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-brand-border -translate-y-1/2 z-0" />
      
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        
        return (
          <div key={step.key} className="relative z-10 flex flex-col items-center group">
            <div
              className={cn(
                "w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center border transition-all duration-300",
                isActive 
                  ? "bg-brand-ink text-brand-bg border-brand-ink shadow-md" 
                  : isCompleted 
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-transparent" 
                    : "bg-brand-surface text-brand-label border-brand-border"
              )}
            >
              <div className="scale-75 lg:scale-100">{step.icon}</div>
            </div>
            <span 
              className={cn(
                "text-[8px] lg:text-[10px] uppercase tracking-wider font-bold mt-2 px-1 rounded-sm transition-all text-center",
                isActive ? "text-brand-ink" : "text-brand-label"
              )}
            >
              {step.label}
            </span>
            
            {/* Tooltip visible on hover */}
            <div className="absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {step.key}
            </div>
          </div>
        );
      })}
    </div>
  );
}
