"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  idCode: string;
  nombre: string;
  email: string;
  rol: 'MASTER 1' | 'MASTER 2' | 'CONTABILIDAD' | 'VENTAS';
  permisos: string;
  activo: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  register: (data: { name: string; email: string; role: string; idCode?: string }) => Promise<void>;
  logout: () => void;
  checkUser: (email: string) => Promise<{ exists: boolean; redirectTo?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('sneaker_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const checkUser = async (email: string) => {
    try {
      const res = await fetch(`/api/auth?email=${encodeURIComponent(email)}`);
      return await res.json();
    } catch (error) {
      console.error('Error checking user:', error);
      return { exists: false };
    }
  };

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error en login');
      }
      
      if (data.exists && data.user) {
        setUser(data.user);
        localStorage.setItem('sneaker_user', JSON.stringify(data.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { name: string; email: string; role: string; idCode?: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'register', 
          ...data 
        })
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.error || 'Error en registro');
      }
      
      if (responseData.success && responseData.user) {
        setUser(responseData.user);
        localStorage.setItem('sneaker_user', JSON.stringify(responseData.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sneaker_user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, checkUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}