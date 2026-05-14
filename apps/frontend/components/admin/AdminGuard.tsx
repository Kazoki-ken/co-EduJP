'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="page-container py-24 text-center">
        <ShieldAlert size={48} className="text-danger mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h2>
        <p className="text-text-muted">You need admin privileges to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
