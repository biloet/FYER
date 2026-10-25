// Robinhood Chain mainnet config.
// Reference: https://docs.robinhood.com/chain/connecting
window.FYER_CONFIG = {
  network: {
    chainId: 4663,
    chainName: "Robinhood Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
    blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
  },
  // Official $FYR token on Robinhood Chain.
  token: {
    symbol: "FYR",
    address: "0xaf307ad6e63c824b65dcc90421eb40c62a888ffb",
    image: "assets/social/fyer-x-avatar-400.png",
  },
  // Set once the FYER shielded pool contract is deployed.
  poolAddress: null,
  fees: { shield: 0.3, transfer: 0, withdraw: 0.3 },
  links: { x: "https://x.com/fyerdotsite", docs: "#docs", app: "#app" },
};
