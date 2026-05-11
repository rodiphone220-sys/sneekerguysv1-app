"use client";

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && !user && mounted) {
      if (BYPASS_AUTH) {
        const devUser = {
          id: 'dev-001',
          idCode: 'DEV',
          nombre: 'Developer Bypass',
          email: 'dev@localhost',
          rol: 'MASTER 1' as const,
          permisos: 'ALL',
          activo: true
        };
        localStorage.setItem('sneaker_user', JSON.stringify(devUser));
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router, mounted]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-accent" size={40} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}