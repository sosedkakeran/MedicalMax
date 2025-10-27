export interface EncryptedBalance {
  encrypted: string;
  decrypted?: string | null;
  isDecrypting?: boolean;
}

export interface UserStats {
  stakedCDoge: EncryptedBalance;
  borrowedCUSDT: EncryptedBalance;
  availableToBorrow: EncryptedBalance;
  cDogeWalletBalance: EncryptedBalance;
  cUSDTWalletBalance: EncryptedBalance;
}

export interface FhevmInstance {
  createEncryptedInput: (contractAddress: string, userAddress: string) => any;
  generateKeypair: () => { privateKey: string; publicKey: string };
  createEIP712: (publicKey: string, contractAddresses: string[], startTimeStamp: string, durationDays: string) => any;
  userDecrypt: (
    handleContractPairs: Array<{ handle: string; contractAddress: string }>,
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimeStamp: string,
    durationDays: string
  ) => Promise<Record<string, any>>;
}

export interface EncryptedInputBuffer {
  add64: (value: bigint) => void;
  add32: (value: number) => void;
  add16: (value: number) => void;
  add8: (value: number) => void;
  addBool: (value: boolean) => void;
  addAddress: (address: string) => void;
  encrypt: () => Promise<{ handles: string[]; inputProof: string }>;
}