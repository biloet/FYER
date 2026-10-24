// Robinhood Chain network config. Verify values against
// https://docs.robinhood.com/chain/connecting before going live.
window.FYER_CONFIG = {
  defaultNetwork: "testnet",
  networks: {
    testnet: {
      chainId: 46630,
      chainName: "Robinhood Chain Testnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://rpc.testnet.chain.robinhood.com"],
      blockExplorerUrls: ["https://explorer.testnet.chain.robinhood.com"],
    },
    // Mainnet RPC is unverified — confirm in the official docs.
    mainnet: {
      chainId: 4663,
      chainName: "Robinhood Chain",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://rpc.chain.robinhood.com"],
      blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
    },
  },
  // Set once the FYER shielded pool contract is deployed.
  poolAddress: null,
  fees: { shield: 0.3, transfer: 0, withdraw: 0.3 },
  links: { x: "https://x.com/", docs: "#docs", app: "#app" },
};
