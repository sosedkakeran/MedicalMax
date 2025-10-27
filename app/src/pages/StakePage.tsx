import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useContracts, useTokenBalances } from '@/hooks/useContracts';
import { CONTRACT_ADDRESSES } from '@/constants/contracts';
import { useFHE } from '@/contexts/FHEContext';

export default function StakePage() {
  const { address, isConnected, status } = useAccount();
  const { stakeTokens, approveToken } = useContracts();
  const { cDogeBalance } = useTokenBalances(['cDoge']);
  const { isInitialized: fheInitialized, initFHE, error: fheError, isInitializing } = useFHE();
  
  console.log('🔍 StakePage render:', { 
    address, 
    isConnected, 
    status, 
    fheInitialized, 
    fheError,
    isInitializing
  });
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [message, setMessage] = useState('');

  const handleApprove = async () => {
    if (!stakeAmount || !address) return;
    
    if (!fheInitialized) {
      setMessage('Please initialize FHE before authorizing');
      return;
    }

    try {
      setIsApproving(true);
      setMessage('Authorizing...');
      
      // const amount = parseInt(stakeAmount);
      await approveToken(CONTRACT_ADDRESSES.CDOGE);
      
      setMessage('Authorization successful! You can now stake');
    } catch (error) {
      console.error('Approval failed:', error);
      setMessage('Authorization failed, please try again');
    } finally {
      setIsApproving(false);
    }
  };

  const handleStake = async () => {
    console.log('🎯 handleStake called');
    
    if (!stakeAmount || !address) {
      console.log('❌ Missing stakeAmount or address:', { stakeAmount, address });
      return;
    }
    
    if (!fheInitialized) {
      console.log('❌ FHE not initialized');
      setMessage('Please initialize FHE before staking');
      return;
    }

    console.log('✅ Starting stake process with amount:', stakeAmount);

    try {
      setIsStaking(true);
      setMessage('Staking...');
      
      const amount = parseInt(stakeAmount)*1000000;
      console.log('📊 Parsed amount:', amount);
      console.log('🔐 About to call stakeTokens function...');
      
      const result = await stakeTokens(amount);
      console.log('✅ stakeTokens result:', result);
      
      setMessage('Staking successful!');
      setStakeAmount('');
      console.log('✅ Staking completed successfully');
    } catch (error) {
      console.error('❌ Staking failed:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      setMessage(`Staking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStaking(false);
      console.log('🏁 handleStake completed');
    }
  };



  if (!isConnected) {
    return (
      <div className="card">
        <h2>Stake cDoge</h2>
        <p>Please connect your wallet to stake</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Debug Info Panel */}

      <div className="card">
        <h2>Stake cDoge</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Stake your cDoge tokens as collateral. After staking, you can borrow cUSDT on the lending page.
        </p>

        {/* FHE Not Initialized Warning */}
        {!fheInitialized && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ 
              width: '24px', 
              height: '24px', 
              backgroundColor: 'var(--color-warning)', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              flexShrink: 0,
              boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)'
            }}>
              !
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-warning)' }}>FHE Initialization Required</h4>
              <p style={{ margin: '0', color: 'rgba(245, 158, 11, 0.8)', fontSize: '0.875rem' }}>
                Please click the "Init FHE" button in the top right corner to initialize the encryption system before staking
              </p>
            </div>
            <button
              onClick={initFHE}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: 'var(--color-warning)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
              }}
            >
              Initialize Now
            </button>
          </div>
        )}

        <div className="input-group">
          <label htmlFor="stakeAmount">Stake Amount</label>
          <input
            id="stakeAmount"
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="Enter cDoge amount to stake"
            min="0"
          />
        </div>

        <div style={{ 
          background: 'var(--surface-secondary)', 
          padding: '1.25rem', 
          borderRadius: '12px',
          margin: '1rem 0',
          border: '1px solid rgba(71, 85, 105, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
            <span>Current cDoge Balance:</span>
            <span className="balance-encrypted">
              {cDogeBalance ? `${cDogeBalance.slice(0, 10)}...` : 'Loading...'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
            <span>Stake Amount:</span>
            <span>{stakeAmount || '0'} cDoge</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            className="btn"
            onClick={handleApprove}
            disabled={!stakeAmount || isApproving || !fheInitialized}
            title={!fheInitialized ? 'Please initialize FHE first' : undefined}
            style={{ flex: 1 }}
          >
            {isApproving ? 'SetOperator...' : '1. SetOperator'}
          </button>
          
          <button
            className="btn"
            onClick={handleStake}
            disabled={!stakeAmount || isStaking || !fheInitialized}
            title={!fheInitialized ? 'Please initialize FHE first' : undefined}
            style={{ flex: 1 }}
          >
            {isStaking ? 'Staking...' : '2. Stake'}
          </button>
        </div>


        {/* Test Encryption Button */}
        

        {message && (
          <div className={`${message.includes('failed') || message.includes('Failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

       
      </div>
    </div>
  );
}