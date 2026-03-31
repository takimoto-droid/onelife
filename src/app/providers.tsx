'use client';

import { ReactNode } from 'react';
import { LocationProvider } from '@/contexts/LocationContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      {children}
    </LocationProvider>
  );
}
