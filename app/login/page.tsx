"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function LoginForm() {
  const [clientIdConfigured, setClientIdConfigured] = useState(false);

  useEffect(() => {
    // Verificar si el Client ID está configurado correctamente
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      setClientIdConfigured(true);
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('sneaker_user');
    if (storedUser) {
      router.push('/');
    }
  }, [router]);

  const verifyAndLogin = async (email: string, name?: string) => {
    setIsLoading(true);
    setAuthStatus({ type: 'loading', message: 'Verificando credenciales...' });

    try {
      // Verificación SILENCIOSA contra el Data Sheet ANTES de navegar
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'login', 
          email: email.toLowerCase()
        })
      });

      const data = await res.json();

      if (res.ok && data.exists && data.user) {
        // USUARIO EXISTE: Login directo al Dashboard
        localStorage.setItem('sneaker_user', JSON.stringify(data.user));
        setAuthStatus({ type: 'success', message: '¡Bienvenido! Redirigiendo...' });
        setTimeout(() => router.push('/'), 500);
      } else if (res.status === 403) {
        // Usuario inactivo
        setAuthStatus({ type: 'error', message: 'Usuario inactivo. Contacta al administrador.' });
        setIsLoading(false);
      } else {
        // USUARIO NO EXISTE: Redirigir a registro con email de Google
        setAuthStatus({ type: 'loading', message: 'Usuario nuevo. Redirigiendo a registro...' });
        const params = new URLSearchParams();
        params.set('email', email.toLowerCase());
        if (name) params.set('name', name);
        router.push(`/registro?${params.toString()}`);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthStatus({ type: 'error', message: 'Error de conexión. Intenta de nuevo.' });
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    // 1. Extraer email directamente del token de Google (SIN inputs manuales)
    const decoded: any = jwtDecode(credentialResponse.credential);
    const userEmail = decoded.email;
    const userName = decoded.name;

    // 2. Verificación SILENCIOSA contra el Data Sheet
    await verifyAndLogin(userEmail, userName);
  };

  const handleGoogleError = () => {
    setAuthStatus({ type: 'error', message: 'Error con Google. Intenta de nuevo.' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#111] border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Logo y Título */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-accent to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-accent/30">
              <span className="text-4xl">👟</span>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">
              The Sneaker Guys
            </h1>
            <p className="text-white/50 text-sm mt-2 font-medium">
              Sales & Stock Manager
            </p>
          </div>

          {/* Estado de autenticación */}
          {authStatus && (
            <div className={`
              mb-6 p-4 rounded-xl flex items-center gap-3
              ${authStatus.type === 'success' ? 'bg-green-500/10 border border-green-500/20' : ''}
              ${authStatus.type === 'error' ? 'bg-red-500/10 border border-red-500/20' : ''}
              ${authStatus.type === 'loading' ? 'bg-brand-accent/10 border border-brand-accent/20' : ''}
            `}>
              {authStatus.type === 'loading' && <Loader2 className="animate-spin text-brand-accent" size={20} />}
              {authStatus.type === 'success' && <CheckCircle2 className="text-green-400" size={20} />}
              {authStatus.type === 'error' && <XCircle className="text-red-400" size={20} />}
              <span className={`
                text-sm font-medium
                ${authStatus.type === 'success' ? 'text-green-400' : ''}
                ${authStatus.type === 'error' ? 'text-red-400' : ''}
                ${authStatus.type === 'loading' ? 'text-brand-accent' : ''}
              `}>
                {authStatus.message}
              </span>
            </div>
          )}

          {/* Botón Google OAuth - Flujo 100% automático */}
          <div className="space-y-4">
            {!clientIdConfigured ? (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-400 text-sm text-center font-medium">
                  ⚠️ Configura NEXT_PUBLIC_GOOGLE_CLIENT_ID en .env
                </p>
                <p className="text-white/50 text-xs text-center mt-2">
                  Obtén tu Client ID en Google Cloud Console
                </p>
              </div>
            ) : (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  auto_select={false}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>
            )}

            {/* Información */}
            <div className="mt-8 p-4 bg-brand-accent/10 border border-brand-accent/20 rounded-xl">
              <p className="text-white/70 text-sm text-center">
                🔐 <span className="font-bold">Solo usuarios registrados</span><br/>
                <span className="text-white/50 text-xs">Un clic y adentro</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/20 text-xs">
              Sistema de Gestión de Inventario
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}