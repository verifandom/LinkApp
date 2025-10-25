import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const verifierAddress = '0xF90085f5Fd1a3bEb8678623409b3811eCeC5f6A5';

// Proof with current data from recent attempt
const proof = {
  "claimInfo": {
    "provider": "http",
    "parameters": "{\"body\":\"\",\"headers\":{\"User-Agent\":\"reclaim/0.0.1\",\"accept\":\"application/json\"},\"method\":\"GET\",\"responseMatches\":[{\"type\":\"contains\",\"value\":\"UCFMAzieriztdMf1aRkaSNwQ\"}],\"responseRedactions\":[],\"url\":\"https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true\"}",
    "context": "{\"providerHash\":\"0xaff49f0d446ddc8e991deac06a8ca9dbbebe3d056d82ae8b18d22d4f12ce714c\"}"
  },
  "signedClaim": {
    "claim": {
      "epoch": 1,
      "identifier": "0xbde5d53b671618830e11a61330f245c9cbeb6e00cd8f5fbd409e5de2edc65d4d",
      "owner": "0x3c92072eab61390a055875485e4b9ce73804a2fc",
      "timestampS": 1761367766
    },
    "signatures": ["0x419f84b83fea2807304b1b14a7444799190ee6a281b33f2065bb76dc26a16e8f7201595b31a2e563ec8f413f83fab95354c8ce94e0fd967b243cc66857c9249a1c"]
  }
};

const verifierABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              { "name": "provider", "type": "string" },
              { "name": "parameters", "type": "string" },
              { "name": "context", "type": "string" }
            ],
            "name": "claimInfo",
            "type": "tuple"
          },
          {
            "components": [
              {
                "components": [
                  { "name": "identifier", "type": "bytes32" },
                  { "name": "owner", "type": "address" },
                  { "name": "timestampS", "type": "uint32" },
                  { "name": "epoch", "type": "uint32" }
                ],
                "name": "claim",
                "type": "tuple"
              },
              { "name": "signatures", "type": "bytes[]" }
            ],
            "name": "signedClaim",
            "type": "tuple"
          }
        ],
        "name": "proof",
        "type": "tuple"
      }
    ],
    "name": "verifyProof",
    "outputs": [{ "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  console.log('Testing proof verification...');
  console.log('Verifier address:', verifierAddress);
  console.log('Proof:', JSON.stringify(proof, null, 2));

  try {
    const isValid = await publicClient.readContract({
      address: verifierAddress as `0x${string}`,
      abi: verifierABI,
      functionName: 'verifyProof',
      args: [proof],
    });

    console.log('\n✅ Proof is valid:', isValid);
  } catch (error: any) {
    console.error('\n❌ Proof verification failed:');
    console.error(error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

main();
