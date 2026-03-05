'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/lib/auth/store';

function SessionLoader({ children }: { children: ReactNode }) {
  const loadSession = useAuthStore((s) => s.loadSession);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSession();
    setLoaded(true);
  }, [loadSession]);

  if (!loaded) return null;
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionLoader>{children}</SessionLoader>
      </TooltipProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
