'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { LocationProvider } from '@/contexts/LocationContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LocationProvider>
        {children}
      </LocationProvider>
    </SessionProvider>
  );
}
