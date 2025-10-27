import { createInstance, initSDK } from '@zama-fhe/relayer-sdk/bundle';
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle';
import { SEPOLIA_CONFIG } from '@/constants/contracts';

// declare global {
//   interface Window {
//     fhevm: {
//       initSDK: () => Promise<void>;
//       createInstance: (config: any) => Promise<FhevmInstance>;
//     };
//   }
// }

let fhevmInstance: FhevmInstance | null = null;

export async function initializeFHEVM(): Promise<FhevmInstance> {
  if (fhevmInstance) {
    console.log("FHEVM already initialized, returning existing instance");
    return fhevmInstance;
  }

  console.log("Initializing FHEVM SDK...");

  try {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to use this application.');
    }

    console.log("Loading TFHE WASM...");
    await initSDK();
    console.log("TFHE WASM loaded successfully");

    const config = {
      ...SEPOLIA_CONFIG,
      network: window.ethereum,
    };

    console.log("Creating FHEVM instance with config:", config);
    fhevmInstance = await createInstance(config);
    console.log("FHEVM initialized successfully");

    return fhevmInstance;
  } catch (error) {
    console.error('Failed to initialize FHEVM:', error);

    // Reset instance so we can retry
    fhevmInstance = null;

    if (error instanceof Error) {
      throw new Error(`FHEVM initialization failed: ${error.message}`);
    } else {
      throw new Error('FHEVM initialization failed with unknown error');
    }
  }
}

export function getFHEVMInstance(): FhevmInstance {
  if (!fhevmInstance) {
    throw new Error('FHEVM not initialized. Call initializeFHEVM() first.');
  }
  return fhevmInstance;
}

export async function encryptValue(value: number | bigint, contractAddress: string, userAddress: string) {
  console.log('🔓 encryptValue called with:', { value, contractAddress, userAddress });

  try {
    const instance = getFHEVMInstance();
    console.log('✅ Got FHEVM instance:', !!instance);

    const input = instance.createEncryptedInput(contractAddress, userAddress);
    console.log('✅ Created encrypted input');

    input.add64(value);

    console.log('🔐 About to encrypt input...');
    const result = await input.encrypt();
    console.log('✅ Encryption completed:', {
      hasHandles: !!result.handles,
      handlesLength: result.handles?.length,
      hasInputProof: !!result.inputProof,
    });

    return result;
  } catch (error) {
    console.error('❌ encryptValue failed:', error);
    throw error;
  }
}
//  await decryptBalance(ciphertext, contractAddress, address, walletClient);
export async function decryptBalance(
  ciphertext: string,
  contractAddress: string,
  userAddress: string,
  walletClient: any
): Promise<string | null> {
  try {
    console.log("decryptBalance:", ciphertext, contractAddress, userAddress, walletClient);

    const instance = getFHEVMInstance();
    const keypair = instance.generateKeypair();

    const handleContractPairs = [{
      handle: ciphertext,
      contractAddress: contractAddress,
    }];

    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    const contractAddresses = [contractAddress];

    const eip712 = instance.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    );
    const signature = await walletClient.signTypedData({
      domain: eip712.domain,
      types: {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
      },
      primaryType: 'UserDecryptRequestVerification',
      message: eip712.message,
    });

    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      userAddress,
      startTimeStamp,
      durationDays
    );

    const decryptedValue = result[ciphertext];
    return decryptedValue?.toString() || null;
  } catch (error) {
    console.error('Failed to decrypt balance:', error);
    return null;
  }
}

export function formatTokenAmount(rawAmount: string | null, decimals: number = 6): string {
  if (!rawAmount) return '0';
  
  try {
    const amount = BigInt(rawAmount);
    const divisor = BigInt(10 ** decimals);
    const formattedAmount = Number(amount) / Number(divisor);
    return formattedAmount.toFixed(6).replace(/\.?0+$/, '');
  } catch (error) {
    console.error('Failed to format token amount:', error);
    return rawAmount;
  }
}