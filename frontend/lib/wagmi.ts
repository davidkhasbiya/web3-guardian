import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { bscTestnet, mainnet, sepolia } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, bscTestnet],
  connectors: [injected()],
  multiInjectedProviderDiscovery: true,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [bscTestnet.id]: http(),
  },
  ssr: true,
});
