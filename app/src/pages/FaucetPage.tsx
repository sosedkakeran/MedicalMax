import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useContracts } from '@/hooks/useContracts';
import { CONTRACT_ADDRESSES } from '@/constants/contracts';

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { mintCDoge, mintCUSDT } = useContracts();
  
  const [mintingCDoge, setMintingCDoge] = useState(false);
  const [mintingCUSDT, setMintingCUSDT] = useState(false);
  const [message, setMessage] = useState('');

  const handleMintCDoge = async () => {
    if (!address) return;
    
    try {
      setMintingCDoge(true);
      setMessage('Minting cDoge tokens...');
      
      // Mint 1000 cDoge tokens (1000 * 1e6 for 6 decimals)
      await mintCDoge(1000 * 1000000);
      
      setMessage('Successfully minted 1000 cDoge tokens!');
    } catch (error) {
      console.error('Mint cDoge failed:', error);
      setMessage(`Mint cDoge failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMintingCDoge(false);
    }
  };

  const handleMintCUSDT = async () => {
    if (!address) return;
    
    try {
      setMintingCUSDT(true);
      setMessage('Minting cUSDT tokens...');
      
      // Mint 1000 cUSDT tokens (1000 * 1e6 for 6 decimals)
      await mintCUSDT(1000 * 1000000);
      
      setMessage('Successfully minted 1000 cUSDT tokens!');
    } catch (error) {
      console.error('Mint cUSDT failed:', error);
      setMessage(`Mint cUSDT failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMintingCUSDT(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2>Token Faucet</h2>
        <p>Please connect your wallet to get test tokens</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <h2>Token Faucet</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Get free test tokens to use in the ZamaLend protocol. Each mint gives you 1000 tokens.
        </p>

        {/* Token Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* cDoge Token */}
          <div style={{
            background: 'var(--surface-secondary)',
            border: '1px solid rgba(71, 85, 105, 0.2)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                color: 'white',
                boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
              }}>
                🐕
              </div>
              <div>
                <h3 style={{ margin: '0', color: 'var(--text-primary)' }}>Confidential Doge (cDoge)</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Collateral token for lending
                </p>
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(255, 107, 53, 0.1)', 
              padding: '1rem', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Mint Amount:</span>
                <span style={{ fontWeight: '600' }}>1,000 cDoge</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Contract:</span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {CONTRACT_ADDRESSES.CDOGE.slice(0, 8)}...
                </span>
              </div>
            </div>

            <button
              className="btn"
              onClick={handleMintCDoge}
              disabled={mintingCDoge}
              style={{ 
                width: '100%',
                background: mintingCDoge ? 'var(--text-secondary)' : 'linear-gradient(135deg, #ff6b35, #f7931e)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
              }}
            >
              {mintingCDoge ? 'Minting cDoge...' : 'Mint 1,000 cDoge'}
            </button>
          </div>

          {/* cUSDT Token */}
          <div style={{
            background: 'var(--surface-secondary)',
            border: '1px solid rgba(71, 85, 105, 0.2)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #26a17b, #2dd4aa)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                color: 'white',
                boxShadow: '0 4px 12px rgba(38, 161, 123, 0.3)'
              }}>
                💰
              </div>
              <div>
                <h3 style={{ margin: '0', color: 'var(--text-primary)' }}>Confidential USDT (cUSDT)</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Borrowable stablecoin
                </p>
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(38, 161, 123, 0.1)', 
              padding: '1rem', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Mint Amount:</span>
                <span style={{ fontWeight: '600' }}>1,000 cUSDT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Destination:</span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  ZamaLend Contract
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Contract:</span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {CONTRACT_ADDRESSES.CUSDT.slice(0, 8)}...
                </span>
              </div>
            </div>

            <button
              className="btn"
              onClick={handleMintCUSDT}
              disabled={mintingCUSDT}
              style={{ 
                width: '100%',
                background: mintingCUSDT ? 'var(--text-secondary)' : 'linear-gradient(135deg, #26a17b, #2dd4aa)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(38, 161, 123, 0.3)'
              }}
            >
              {mintingCUSDT ? 'Minting cUSDT...' : 'Mint 1,000 cUSDT to ZamaLend'}
            </button>
          </div>
        </div>

        {/* Info Panel */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginTop: '2rem',
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-primary)' }}>How to use the tokens:</h4>
          <ol style={{ margin: '0', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
            <li>Mint cDoge tokens first</li>
            <li>Go to the Stake page to stake your cDoge as collateral</li>
            <li>Mint cUSDT tokens (these go directly to the ZamaLend contract)</li>
            <li>Go to the Lend page to borrow cUSDT against your staked cDoge</li>
          </ol>
        </div>

        {message && (
          <div className={`${message.includes('failed') || message.includes('Failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}