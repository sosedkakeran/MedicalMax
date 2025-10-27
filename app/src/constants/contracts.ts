export const CONTRACT_ADDRESSES = {
  ZAMA_LEND: "0x5a35a980Cb234EDFc9C5Cf014095821F76001bce",
  CDOGE: "0x6801691Ea6aBec08cFd7c5d0a93c1C82D87cd172",
  CUSDT: "0xf24C96059C72b188ac64f50333CaD306F3DCDcc5",
} as const;

export const SEPOLIA_CONFIG = {
  aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
  kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
  inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
  verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
  verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
  chainId: 11155111,
  gatewayChainId: 55815,
  network: "https://sepolia.infura.io/v3/18647f21ab6f4e3c9bfd7df4fe61644c",
  relayerUrl: "https://relayer.testnet.zama.cloud",
} as const;

export const CHAINS = {
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    nativeCurrency: {
      decimals: 18,
      name: 'Sepolia Ether',
      symbol: 'SEP',
    },
    rpcUrls: {
      public: { http: ['https://sepolia.infura.io/v3/18647f21ab6f4e3c9bfd7df4fe61644c'] },
      default: { http: ['https://sepolia.infura.io/v3/18647f21ab6f4e3c9bfd7df4fe61644c'] },
    },
    blockExplorers: {
      etherscan: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
      default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
    },
  },
} as const;