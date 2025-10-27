import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { initializeFHEVM } from '@/utils/fhe';
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle';

interface FHEContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  instance: FhevmInstance | null;
  initFHE: () => Promise<void>;
  resetError: () => void;
}

const FHEContext = createContext<FHEContextType | undefined>(undefined);

interface FHEProviderProps {
  children: ReactNode;
}

export function FHEProvider({ children }: FHEProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<FhevmInstance | null>(null);

  const initFHE = useCallback(async () => {
    if (isInitialized || isInitializing) {
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      console.log('开始初始化FHE...');
      const fhevmInstance = await initializeFHEVM();
      setInstance(fhevmInstance);
      setIsInitialized(true);
      console.log('FHE初始化成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('FHE初始化失败:', errorMessage);
      setError(errorMessage);
      setInstance(null);
      setIsInitialized(false);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitialized, isInitializing]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const value: FHEContextType = {
    isInitialized,
    isInitializing,
    error,
    instance,
    initFHE,
    resetError,
  };

  return (
    <FHEContext.Provider value={value}>
      {children}
    </FHEContext.Provider>
  );
}

export function useFHE() {
  const context = useContext(FHEContext);
  if (context === undefined) {
    throw new Error('useFHE must be used within a FHEProvider');
  }
  return context;
}

// Hook to get FHE instance (throws if not initialized)
export function useFHEInstance() {
  const { isInitialized, instance } = useFHE();
  
  if (!isInitialized || !instance) {
    throw new Error('FHE not initialized. Please initialize FHE first.');
  }
  
  return instance;
}