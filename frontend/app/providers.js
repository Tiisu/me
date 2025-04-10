'use client';

import { EcoConnectProvider } from '@/context/EcoConnect';

export function Providers({ children }) {
  return <EcoConnectProvider>{children}</EcoConnectProvider>;
}