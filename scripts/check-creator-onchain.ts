import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import LinkABI from '../Link.json';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const contractAddress = '0xBEC44528332681132a856F79Bd7A5EC1Ad175C14';
const channelId = 'UCFMAzieriztdMf1aRkaSNwQ';

async function main() {
  console.log('Checking creator registration on-chain...');
  console.log('Contract:', contractAddress);
  console.log('Channel ID:', channelId);

  try {
    const creator = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: LinkABI.abi,
      functionName: 'creators',
      args: [channelId],
    });

    console.log('\nCreator data:', creator);
  } catch (error) {
    console.error('Error reading contract:', error);
  }
}

main();
