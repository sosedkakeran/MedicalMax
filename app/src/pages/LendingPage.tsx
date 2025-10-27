import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useContracts, useLendingData } from '@/hooks/useContracts';
import { useFHE } from '@/contexts/FHEContext';
import { decryptBalance, formatTokenAmount } from '@/utils/fhe';
import { CONTRACT_ADDRESSES } from '@/constants/contracts';

export default function LendingPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { borrowTokens } = useContracts();
  const { availableToBorrow } = useLendingData(['available']);
  const { isInitialized: fheInitialized, initFHE } = useFHE();
  
  const [borrowAmount, setBorrowAmount] = useState('');
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [message, setMessage] = useState('');
  const [decryptedAvailable, setDecryptedAvailable] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecryptAvailable = async () => {
    if (!address || !walletClient || !availableToBorrow) return;
    
    if (!fheInitialized) {
      alert('Please initialize FHE before decryption');
      return;
    }
    
    setIsDecrypting(true);
    
    try {
      const decrypted = await decryptBalance(availableToBorrow, CONTRACT_ADDRESSES.ZAMA_LEND, address, walletClient);
      if (decrypted) {
        // 这里是 staked cDoge 的数量，需要计算可借贷 cUSDT 数量
        // 可借贷 cUSDT = staked cDoge × price × 50% (LTV)
        // price = 0.21 USDT per cDoge
        const stakedCDoge = parseFloat(formatTokenAmount(decrypted, 6));
        const availableCUSDT = stakedCDoge * 0.21 * 0.5; // 50% LTV
        setDecryptedAvailable(availableCUSDT.toFixed(6).replace(/\.?0+$/, ''));
      } else {
        setDecryptedAvailable('Decryption Failed');
      }
    } catch (error) {
      console.error('Failed to decrypt available amount:', error);
      setDecryptedAvailable('Decryption Failed');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleBorrow = async () => {
    if (!borrowAmount || !address) return;
    
    if (!fheInitialized) {
      setMessage('Please initialize FHE before borrowing');
      return;
    }

    try {
      setIsBorrowing(true);
      setMessage('Borrowing...');
      
      const amount = parseInt(borrowAmount) * 1000000;
      await borrowTokens(amount);
      
      setMessage(`Successfully borrowed ${borrowAmount} cUSDT!`);
      setBorrowAmount('');
    } catch (error) {
      console.error('Borrowing failed:', error);
      setMessage(`Borrowing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsBorrowing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2>Borrow cUSDT</h2>
        <p>Please connect your wallet to borrow</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <h2>Borrow cUSDT</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2rem' }}>
          Borrow cUSDT based on your staked assets, up to 50% of staked value
        </p>

        {/* FHE Not Initialized Warning */}
        {!fheInitialized && (
          <div style={{
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              backgroundColor: '#fbbf24', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              !
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#fbbf24' }}>FHE Initialization Required</h4>
              <p style={{ margin: '0', color: 'rgba(251, 191, 36, 0.8)', fontSize: '0.875rem' }}>
                Please click the "Init FHE" button in the top right corner to initialize the encryption system before borrowing
              </p>
            </div>
            <button
              onClick={initFHE}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: '#fbbf24',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              Initialize Now
            </button>
          </div>
        )}

        {/* Available to Borrow Display */}
        <div style={{ 
          background: 'rgba(34, 197, 94, 0.1)', 
          border: '1px solid rgba(34, 197, 94, 0.3)',
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: '0', color: '#22c55e' }}>Available Credit</h3>
            <button
              onClick={handleDecryptAvailable}
              disabled={!availableToBorrow || isDecrypting || !fheInitialized}
              title={!fheInitialized ? 'Please initialize FHE first' : undefined}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                minWidth: '60px'
              }}
            >
              {isDecrypting ? '...' : 'Decrypt'}
            </button>
          </div>
          
          <div className="balance-encrypted" style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem' }}>
            Encrypted balance: {availableToBorrow ? `${availableToBorrow.slice(0, 10)}...` : 'Loading...'}
          </div>
          
          {decryptedAvailable !== null && (
            <div style={{ 
              color: '#4ade80', 
              fontWeight: '600',
              fontSize: '1.1rem',
              marginBottom: '0.5rem'
            }}>
              💰 {decryptedAvailable !== 'Decryption Failed' ? `${decryptedAvailable} cUSDT` : 'Decryption Failed'}
            </div>
          )}
          
          <p style={{ margin: '0', fontSize: '0.875rem', color: 'rgba(34, 197, 94, 0.8)' }}>
            💡 Based on staked value × 50% 
          </p>
        </div>

        <div className="input-group">
          <label htmlFor="borrowAmount">Borrow Amount</label>
          <input
            id="borrowAmount"
            type="number"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            placeholder="Enter cUSDT amount to borrow"
            min="0"
          />
        </div>

        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '1rem', 
          borderRadius: '8px',
          margin: '1rem 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
            <span>Borrow Amount:</span>
            <span>{borrowAmount || '0'} cUSDT</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
            <span>Interest Rate:</span>
            <span style={{ color: '#22c55e' }}>0% (Beta)</span>
          </div>
        </div>

        <button
          className="btn"
          onClick={handleBorrow}
          disabled={!borrowAmount || isBorrowing || !fheInitialized}
          title={!fheInitialized ? 'Please initialize FHE first' : undefined}
          style={{ width: '100%', marginTop: '2rem' }}
        >
          {isBorrowing ? 'Borrowing...' : 'Borrow cUSDT'}
        </button>

        {message && (
          <div className={`${message.includes('failed') || message.includes('Failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

       
      </div>
    </div>
  );
}