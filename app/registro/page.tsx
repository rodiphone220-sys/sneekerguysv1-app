"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Chrome, Mail, User, Key, ArrowLeft, Check, ArrowRight, Loader2 } from 'lucide-react';

const ROLES = [
  { id: 'MASTER 1', label: 'MASTER 1', desc: 'Propietario / Creador de organización', emoji: '👑' },
  { id: 'MASTER 2', label: 'MASTER 2', desc: 'Co-propietario (mismos privilegios)', emoji: '💎' },
  { id: 'CONTABILIDAD', label: 'CONTABILIDAD', desc: 'Acceso a reportes financieros', emoji: '📊' },
  { id: 'VENTAS', label: 'VENTAS', desc: 'Gestión de pedidos y clientes', emoji: '🛒' },
];

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [idCode, setIdCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const nameParam = searchParams.get('name');
    if (emailParam) setEmail(emailParam);
    if (nameParam) setName(nameParam);
  }, [searchParams]);

  const needsIdCode = role && role !== 'MASTER 1';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !role) {
      setError('Todos los campos son requeridos');
      return;
    }

    if (needsIdCode && !idCode) {
      setError('ID_CODE es obligatorio para este rol');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // PRIMERO: Verificar si el usuario ya existe en la base de datos
      const checkRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'login', 
          email
        })
      });
      
      const checkData = await checkRes.json();
      
      // SI EL USUARIO YA EXISTE: autenticarlo directamente
      if (checkData.exists && checkData.user) {
        localStorage.setItem('sneaker_user', JSON.stringify(checkData.user));
        router.push('/');
        return;
      }

      // SI NO EXISTE: proceder con el registro
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'register', 
          name, 
          email, 
          role, 
          idCode: needsIdCode ? idCode : undefined 
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error en registro');
      }
      
      if (data.success && data.user) {
        localStorage.setItem('sneaker_user', JSON.stringify(data.user));
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Nombre Completo</label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 outline-none focus:border-brand-accent transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Email</label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 outline-none focus:border-brand-accent transition-all"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Selecciona tu Rol</label>
        <div className="grid grid-cols-1 gap-3">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { setRole(r.id); setIdCode(''); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                role === r.id ? 'border-brand-accent bg-brand-accent/10' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.emoji}</span>
                <div>
                  <p className="text-white font-bold">{r.label}</p>
                  <p className="text-white/40 text-xs">{r.desc}</p>
                </div>
                {role === r.id && <Check size={20} className="ml-auto text-brand-accent" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {needsIdCode && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
          <label className="text-xs font-bold text-brand-accent uppercase tracking-widest flex items-center gap-2">
            <Key size={14} /> ID_CODE de tu Organización
          </label>
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent" size={18} />
            <input
              type="text"
              value={idCode}
              onChange={(e) => setIdCode(e.target.value.toUpperCase())}
              placeholder="TSG-XXXXXX"
              className="w-full pl-12 pr-4 py-4 bg-brand-accent/10 border border-brand-accent/30 rounded-xl text-white placeholder-white/30 outline-none focus:border-brand-accent transition-all font-mono"
            />
          </div>
        </motion.div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !role}
        className="w-full py-4 bg-brand-accent text-black rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-brand-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><span>Crear Cuenta</span><ArrowRight size={18} /></>}
      </button>
    </form>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <button onClick={() => router.push('/login')} className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} /> <span className="text-sm font-medium">Volver</span>
        </button>

        <div className="bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Chrome size={16} className="text-black" />
            </div>
            <span className="text-white/60 text-sm">Sesión de Google</span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Crear Cuenta</h1>
            <p className="text-white/50 text-sm mt-2 font-medium">Regístrate para acceder al sistema</p>
          </div>

          <Suspense fallback={<div className="text-white text-center py-8">Cargando...</div>}>
            <RegisterForm />
          </Suspense>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-white/40 text-xs">Al registrarte aceptas los términos del sistema</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}