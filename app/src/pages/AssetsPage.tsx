import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useLendingData, useContracts, useTokenBalances } from '@/hooks/useContracts';
import { decryptBalance, formatTokenAmount } from '@/utils/fhe';
import { CONTRACT_ADDRESSES } from '@/constants/contracts';
import { useFHE } from '@/contexts/FHEContext';

export default function AssetsPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isInitialized: fheInitialized, initFHE } = useFHE();
  const { stakedAmount, borrowedAmount, availableToBorrow } = useLendingData(['staked', 'borrowed', 'available']);
  const { cDogeBalance, cUSDTBalance, isLoading, errors } = useTokenBalances(['cDoge', 'cUSDT']);
  const { withdrawTokens } = useContracts();
  
  const [decryptedAmounts, setDecryptedAmounts] = useState<{
    staked?: string | null;
    borrowed?: string | null;
    available?: string | null;
    cDoge?: string | null;
    cUSDT?: string | null;
  }>({});
  
  const [decryptingAmounts, setDecryptingAmounts] = useState<{
    staked?: boolean;
    borrowed?: boolean;
    available?: boolean;
    cDoge?: boolean;
    cUSDT?: boolean;
  }>({});

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [message, setMessage] = useState('');

  const handleDecryptAmount = async (type: 'staked' | 'borrowed' | 'available' | 'cDoge' | 'cUSDT') => {
    if (!address || !walletClient) return;
    
    if (!fheInitialized) {
      alert('Please initialize FHE before decryption');
      return;
    }
    
    let ciphertext: string | undefined;
    let contractAddress: string;
    
    switch (type) {
      case 'staked':
        ciphertext = stakedAmount;
        contractAddress = CONTRACT_ADDRESSES.ZAMA_LEND;
        break;
      case 'borrowed':
        ciphertext = borrowedAmount;
        contractAddress = CONTRACT_ADDRESSES.ZAMA_LEND;
        break;
      case 'available':
        ciphertext = availableToBorrow;
        contractAddress = CONTRACT_ADDRESSES.ZAMA_LEND;
        break;
      case 'cDoge':
        ciphertext = cDogeBalance;
        contractAddress = CONTRACT_ADDRESSES.CDOGE;
        break;
      case 'cUSDT':
        ciphertext = cUSDTBalance;
        contractAddress = CONTRACT_ADDRESSES.CUSDT;
        break;
    }
    
    if (!ciphertext) return;

    setDecryptingAmounts(prev => ({ ...prev, [type]: true }));
    
    try {
      const decrypted = await decryptBalance(ciphertext, contractAddress, address, walletClient);
      const formatted = formatTokenAmount(decrypted, 6);
      setDecryptedAmounts(prev => ({ ...prev, [type]: formatted }));
    } catch (error) {
      console.error(`Failed to decrypt ${type} amount:`, error);
      alert(`Failed to decrypt ${type} balance, please ensure FHE is correctly initialized`);
    } finally {
      setDecryptingAmounts(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !address) return;

    try {
      setIsWithdrawing(true);
      setMessage('Withdrawing...');
      
      const amount = parseInt(withdrawAmount);
      await withdrawTokens(amount);
      
      setMessage('Withdrawal successful!');
      setWithdrawAmount('');
    } catch (error) {
      console.error('Withdrawal failed:', error);
      setMessage('Withdrawal failed, please try again');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2>My Assets</h2>
        <p>Please connect your wallet to view assets and wallet balance</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Left Column - Wallet Balance */}
        <div style={{ flex: '1', minWidth: '400px' }}>
          <div className="card" style={{ height: 'fit-content', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#4ade80' }}>💰 Wallet Balance</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              Your encrypted token balances, click decrypt to view plaintext
            </p>
        
            {/* FHE Not Initialized Warning */}
            {!fheInitialized && (
              <div style={{
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '4px',
                padding: '0.5rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  backgroundColor: '#fbbf24', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  !
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#fbbf24', fontSize: '0.8rem' }}>FHE Initialization Required</h4>
                  <p style={{ margin: '0', color: 'rgba(251, 191, 36, 0.8)', fontSize: '0.7rem' }}>
                    Please initialize the encryption system first, then decrypt to view balance plaintext
                  </p>
                </div>
                <button
                  onClick={initFHE}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.7rem',
                    backgroundColor: '#fbbf24',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  Initialize
                </button>
              </div>
            )}
        
            {/* Show loading state */}
            {isLoading && (
              <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                <p>Loading balances...</p>
              </div>
            )}

            {/* Show errors if any */}
            {(errors.cDoge || errors.cUSDT) && (
              <div style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#ff4444', fontSize: '0.8rem' }}>Loading Error</h4>
                {errors.cDoge && <p style={{ margin: '0.125rem 0', color: '#ff8888', fontSize: '0.7rem' }}>cDoge: {errors.cDoge.message}</p>}
                {errors.cUSDT && <p style={{ margin: '0.125rem 0', color: '#ff8888', fontSize: '0.7rem' }}>cUSDT: {errors.cUSDT.message}</p>}
              </div>
            )}

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {/* cDoge Balance */}
              <div className="balance-item" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: '#fbbf24' }}>🟡 cDoge</h3>
                  <div className="balance-encrypted" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {cDogeBalance 
                      ? `${cDogeBalance.slice(0, 10)}...` 
                      : isLoading 
                        ? 'Loading...' 
                        : errors.cDoge 
                          ? 'Load Failed' 
                          : 'No Balance'
                    }
                  </div>
                  {decryptedAmounts.cDoge !== undefined && (
                    <div className="balance-decrypted" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4ade80', marginTop: '0.25rem' }}>
                      💰 {decryptedAmounts.cDoge || 'Decryption Failed'} cDoge
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDecryptAmount('cDoge')}
                  disabled={!cDogeBalance || decryptingAmounts.cDoge || isLoading || !fheInitialized}
                  title={!fheInitialized ? 'Please initialize FHE first' : undefined}
                  style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', minWidth: '60px' }}
                >
                  {decryptingAmounts.cDoge ? '...' : 'Decrypt'}
                </button>
              </div>

              {/* cUSDT Balance */}
              <div className="balance-item" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: '#22d3ee' }}>🔵 cUSDT</h3>
                  <div className="balance-encrypted" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {cUSDTBalance 
                      ? `${cUSDTBalance.slice(0, 10)}...` 
                      : isLoading 
                        ? 'Loading...' 
                        : errors.cUSDT 
                          ? 'Load Failed' 
                          : 'No Balance'
                    }
                  </div>
                  {decryptedAmounts.cUSDT !== undefined && (
                    <div className="balance-decrypted" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4ade80', marginTop: '0.25rem' }}>
                      💰 {decryptedAmounts.cUSDT || 'Decryption Failed'} cUSDT
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDecryptAmount('cUSDT')}
                  disabled={!cUSDTBalance || decryptingAmounts.cUSDT || isLoading || !fheInitialized}
                  title={!fheInitialized ? 'Please initialize FHE first' : undefined}
                  style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', minWidth: '60px' }}
                >
                  {decryptingAmounts.cUSDT ? '...' : 'Decrypt'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Assets Overview */}
        <div style={{ flex: '1', minWidth: '400px' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#a78bfa' }}>📊 Assets Overview</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              Staking, lending, and available credit
            </p>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {/* Staked Amount */}
              <div className="stat-card" style={{ 
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem 0', color: '#fbbf24' }}>🔒 Staked cDoge</h3>
                  <div className="balance-encrypted" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {stakedAmount ? `${stakedAmount.slice(0, 10)}...` : 'Loading...'}
                  </div>
                  {decryptedAmounts.staked !== undefined && (
                    <div className="stat-value" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4ade80', marginTop: '0.25rem' }}>
                      📈 {decryptedAmounts.staked || 'Decryption Failed'} cDoge
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDecryptAmount('staked')}
                  disabled={!stakedAmount || decryptingAmounts.staked}
                  style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', minWidth: '60px' }}
                >
                  {decryptingAmounts.staked ? '...' : 'Decrypt'}
                </button>
              </div>

              {/* Borrowed Amount */}
              <div className="stat-card" style={{ 
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem 0', color: '#ef4444' }}>💳 Borrowed cUSDT</h3>
                  <div className="balance-encrypted" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {borrowedAmount ? `${borrowedAmount.slice(0, 10)}...` : 'Loading...'}
                  </div>
                  {decryptedAmounts.borrowed !== undefined && (
                    <div className="stat-value" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4ade80', marginTop: '0.25rem' }}>
                      📉 {decryptedAmounts.borrowed || 'Decryption Failed'} cUSDT
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDecryptAmount('borrowed')}
                  disabled={!borrowedAmount || decryptingAmounts.borrowed}
                  style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', minWidth: '60px' }}
                >
                  {decryptingAmounts.borrowed ? '...' : 'Decrypt'}
                </button>
              </div>

              {/* Available to Borrow */}
              {/* <div className="stat-card" style={{ 
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem 0', color: '#22d3ee' }}>💎 可借贷额度</h3>
                  <div className="balance-encrypted" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {availableToBorrow ? `${availableToBorrow.slice(0, 10)}...` : '加载中...'}
                  </div>
                  {decryptedAmounts.available !== undefined && (
                    <div className="stat-value" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4ade80', marginTop: '0.25rem' }}>
                      🎯 {decryptedAmounts.available || '解密失败'} cUSDT
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDecryptAmount('available')}
                  disabled={!availableToBorrow || decryptingAmounts.available}
                  style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', minWidth: '60px' }}
                >
                  {decryptingAmounts.available ? '...' : '解密'}
                </button>
              </div> */}
            </div>

            {/* Withdrawal Section */}
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem',
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.2)',
              borderRadius: '8px'
            }}>
              <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#22d3ee' }}>💸 Withdraw cDoge</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                Withdraw tokens from staking
              </p>

              <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                <input
                  id="withdrawAmount"
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter withdrawal amount"
                  min="0"
                  style={{ 
                    padding: '0.5rem',
                    fontSize: '0.85rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white'
                  }}
                />
              </div>

              <button
                className="btn"
                onClick={handleWithdraw}
                disabled={!withdrawAmount || isWithdrawing}
                style={{ 
                  width: '100%', 
                  fontSize: '0.85rem',
                  padding: '0.6rem',
                  backgroundColor: '#22d3ee',
                  color: '#0f172a'
                }}
              >
                {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>

              {message && (
                <div className={`${message.includes('failed') || message.includes('Failed') ? 'error' : 'success'}`} style={{ 
                  marginTop: '0.5rem',
                  fontSize: '0.8rem'
                }}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Info Panel */}
      <div style={{ 
        marginTop: '1.5rem', 
        padding: '1rem', 
        background: 'rgba(255, 255, 255, 0.03)', 
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ fontSize: '0.9rem', color: '#a78bfa', marginBottom: '0.5rem' }}>ℹ️ Feature Description</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '0.75rem',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          <div>• <strong>Wallet Balance</strong>: Your encrypted cDoge and cUSDT balances</div>
          <div>• <strong>Staked Assets</strong>: Amount of cDoge staked in the protocol</div>
          <div>• <strong>Borrowed Amount</strong>: Current amount of borrowed cUSDT</div>
          <div>• <strong>Available Credit</strong>: Remaining borrowing capacity based on staked assets</div>
          <div>• <strong>Safety Rules</strong>: Ensure borrowing ratio doesn't exceed 50% when withdrawing</div>
          <div>• <strong>Privacy Protection</strong>: All amounts are stored encrypted</div>
        </div>
      </div>
    </div>
  );
}