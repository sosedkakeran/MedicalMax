import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './config/wagmi';
import { FHEProvider } from './contexts/FHEContext';

import Layout from './components/Layout';
import AssetsPage from './pages/AssetsPage';
import StakePage from './pages/StakePage';
import LendingPage from './pages/LendingPage';
import RepayPage from './pages/RepayPage';
import FaucetPage from './pages/FaucetPage';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function App() {
  // useEffect(() => {
  //   const initFHE = async () => {
  //     try {
  //       await initializeFHEVM();
  //       setFheInitialized(true);
  //       console.log('FHEVM initialized successfully');
  //     } catch (error) {
  //       console.error('Failed to initialize FHEVM:', error);
  //       setFheError(error instanceof Error ? error.message : 'Unknown error');
  //     }
  //   };

  //   initFHE();
  // }, []);


  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <FHEProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<AssetsPage />} />
                  <Route path="/assets" element={<AssetsPage />} />
                  <Route path="/stake" element={<StakePage />} />
                  <Route path="/lending" element={<LendingPage />} />
                  <Route path="/repay" element={<RepayPage />} />
                  <Route path="/faucet" element={<FaucetPage />} />
                </Routes>
              </Layout>
            </Router>
          </FHEProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;