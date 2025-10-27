import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = () => {
    connect({ connector: injected() });
  };

  return {
    address,
    isConnected,
    isConnecting,
    connect: connectWallet,
    disconnect,
  };
}