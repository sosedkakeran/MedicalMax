import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { CHAINS } from '@/constants/contracts';

console.log('📋 Wagmi config loading, chains:', CHAINS);

export const config = getDefaultConfig({
  appName: 'ZamaLend',
  projectId: 'zamalend-demo-project', // Generic project ID for demo
  chains: [CHAINS.sepolia],
  ssr: false,
});

console.log('✅ Wagmi config loaded successfully');