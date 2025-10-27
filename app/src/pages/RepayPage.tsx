import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useTokenBalances, useLendingData, useContracts } from '@/hooks/useContracts';
import { decryptBalance, formatTokenAmount } from '@/utils/fhe';
import { CONTRACT_ADDRESSES } from '@/constants/contracts';

export default function RepayPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { cUSDTBalance } = useTokenBalances(['cUSDT']);
  const { borrowedAmount } = useLendingData(['borrowed']);
  const { repayTokens, approveToken } = useContracts();
  
  const [decryptedAmounts, setDecryptedAmounts] = useState<{
    borrowed?: string | null;
    balance?: string | null;
  }>({});
  
  const [decryptingAmounts, setDecryptingAmounts] = useState<{
    borrowed?: boolean;
    balance?: boolean;
  }>({});

  const [repayAmount, setRepayAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);
  const [message, setMessage] = useState('');

  const handleDecryptAmount = async (type: 'borrowed' | 'balance') => {
    if (!address || !walletClient) return;
    
    let ciphertext: string | undefined;
    let contractAddress: string;
    
    switch (type) {
      case 'borrowed':
        ciphertext = borrowedAmount;
        contractAddress = CONTRACT_ADDRESSES.ZAMA_LEND;
        break;
      case 'balance':
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
    } finally {
      setDecryptingAmounts(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleApprove = async () => {
    if (!repayAmount || !address) return;

    try {
      setIsApproving(true);
      setMessage('Approving...');
      
      // approveToken only needs tokenAddress and optional until timestamp
      await approveToken(CONTRACT_ADDRESSES.CUSDT);
      
      setMessage('Approval successful! You can now repay');
    } catch (error) {
      console.error('Approval failed:', error);
      setMessage('Approval failed, please try again');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRepay = async () => {
    if (!repayAmount || !address) return;

    try {
      setIsRepaying(true);
      setMessage('Repaying...');
      
      const amount = parseInt(repayAmount) * 1000000; // Convert to 6-decimal precision
      await repayTokens(amount);
      
      setMessage('Repayment successful!');
      setRepayAmount('');
    } catch (error) {
      console.error('Repayment failed:', error);
      setMessage('Repayment failed, please try again');
    } finally {
      setIsRepaying(false);
    }
  };

  const handleRepayAll = () => {
    if (decryptedAmounts.borrowed) {
      setRepayAmount(decryptedAmounts.borrowed);
    }
  };

  if (!isConnected) {
    return (
      <div className="card">
        <h2>Repay cUSDT</h2>
        <p>Please connect your wallet to repay</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <h2>Repay cUSDT</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2rem' }}>
          Repay your borrowed cUSDT to release staked cDoge
        </p>

        {/* Current Status */}
        <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '2rem' }}>
          <div className="stat-card">
            <h3>Borrowed cUSDT</h3>
            <div className="balance-encrypted">
              Encrypted: {borrowedAmount ? `${borrowedAmount.slice(0, 10)}...` : 'Loading...'}
            </div>
            {decryptedAmounts.borrowed !== undefined && (
              <div className="stat-value">
                {decryptedAmounts.borrowed || 'Decryption Failed'} cUSDT
              </div>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => handleDecryptAmount('borrowed')}
              disabled={!borrowedAmount || decryptingAmounts.borrowed}
              style={{ marginTop: '1rem' }}
            >
              {decryptingAmounts.borrowed ? 'Decrypting...' : 'Decrypt'}
            </button>
          </div>

          <div className="stat-card">
            <h3>cUSDT Balance</h3>
            <div className="balance-encrypted">
              Encrypted: {cUSDTBalance ? `${cUSDTBalance.slice(0, 10)}...` : 'Loading...'}
            </div>
            {decryptedAmounts.balance !== undefined && (
              <div className="stat-value">
                {decryptedAmounts.balance || 'Decryption Failed'} cUSDT
              </div>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => handleDecryptAmount('balance')}
              disabled={!cUSDTBalance || decryptingAmounts.balance}
              style={{ marginTop: '1rem' }}
            >
              {decryptingAmounts.balance ? 'Decrypting...' : 'Decrypt'}
            </button>
          </div>
        </div>

        {/* Repayment Form */}
        <div className="input-group">
          <label htmlFor="repayAmount">Repay Amount</label>
          <input
            id="repayAmount"
            type="number"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
            placeholder="Enter cUSDT amount to repay"
            min="0"
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleRepayAll}
            disabled={!decryptedAmounts.borrowed}
            style={{ flex: 1 }}
          >
            Repay All
          </button>
        </div>

        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '1rem', 
          borderRadius: '8px',
          margin: '1rem 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
            <span>Current Debt:</span>
            <span>{decryptedAmounts.borrowed || 'Please decrypt first'} cUSDT</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
            <span>Repay Amount:</span>
            <span>{repayAmount || '0'} cUSDT</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
            <span>Remaining Debt:</span>
            <span>
              {decryptedAmounts.borrowed && repayAmount 
                ? Math.max(0, parseFloat(decryptedAmounts.borrowed) - parseFloat(repayAmount)).toFixed(6).replace(/\.?0+$/, '')
                : 'Calculating...'} cUSDT
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            className="btn"
            onClick={handleApprove}
            disabled={!repayAmount || isApproving}
            style={{ flex: 1 }}
          >
            {isApproving ? 'SetOperator...' : '1. SetOperator'}
          </button>
          
          <button
            className="btn"
            onClick={handleRepay}
            disabled={!repayAmount || isRepaying}
            style={{ flex: 1 }}
          >
            {isRepaying ? 'Repaying...' : '2. Repay'}
          </button>
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