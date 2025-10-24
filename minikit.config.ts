export const ROOT_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://link-app-two-tawny.vercel.app';

export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjEzNTQzOTEsInR5cGUiOiJhdXRoIiwia2V5IjoiMHg4NTFCODM4YkE3MjY2M2Q5Y0FFM2FENzU3MDI5YkM1YkM0ZDY4YTMxIn0",
    payload: "eyJkb21haW4iOiJsaW5rLWFwcC10d28tdGF3bnkudmVyY2VsLmFwcCJ9",
    signature: "C8iAlbvlsPLcIgaNOoBoXM7ljow8cxXfE/UsBiBiT4gewpL1o228ylfQuRv9KiJiowlH0b1kR82oN0sUsfcObRs="
  },
  miniapp: {
    version: '1',
    name: 'Link',
    subtitle: 'Connect creators with fans',
    description: 'Link',
    screenshotUrls: [`${ROOT_URL}/hero.png`],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: '#000000',
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: 'social' as const,
    tags: ['creator', 'fan', 'airdrop', 'zktls', 'web2'],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    tagline: 'Bridge web2 creators to web3',
    ogTitle: 'Link',
    ogDescription: 'Enable web2 creators to reward their fans through verified proofs and airdrops',
    ogImageUrl: `${ROOT_URL}/og-image.png`,
  }
} as const;
