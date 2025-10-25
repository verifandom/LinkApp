import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import LinkABI from '../Link.json';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const contractAddress = '0x5eF83EFA0F4A3e123f815C83f086C75797aF50AB';

async function main() {
  console.log('Checking verifier address...');

  try {
    const verifier = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: LinkABI.abi,
      functionName: 'verifier',
    });

    console.log('Verifier address:', verifier);
    console.log('\nExpected Reclaim Verifier on Base Sepolia: 0x4366eF31aCb37bD74C1f7aE195deFe0c4bE83510');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
