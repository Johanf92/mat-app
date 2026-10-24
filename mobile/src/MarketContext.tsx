import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { DEFAULT_MARKET, type Market } from './catalog';
const MarketContext = createContext<{ market: Market; setMarket: (market: Market) => void } | null>(null);
// Root-level state survives navigation. Disk persistence is intentionally deferred.
export function MarketProvider({ children }: PropsWithChildren) {
  const [market, setMarket] = useState<Market>(DEFAULT_MARKET);
  return <MarketContext.Provider value={{ market, setMarket }}>{children}</MarketContext.Provider>;
}
export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useMarket must be used inside MarketProvider');
  return context;
}
