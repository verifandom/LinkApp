export const ROOT_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const minikitConfig = {
  accountAssociation: {
    header: process.env.ACCOUNT_ASSOCIATION_HEADER || '',
    payload: process.env.ACCOUNT_ASSOCIATION_PAYLOAD || '',
    signature: process.env.ACCOUNT_ASSOCIATION_SIGNATURE || '',
  },
  miniapp: {
    version: '1',
    name: 'Link',
    subtitle: 'Connect creators with fans',
    description: 'Link enables web2 creators to connect with their fans through zk-TLS proofs and airdrops. Fans can submit proofs to participate in creator airdrops.',
    screenshotUrls: [],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: '#000000',
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: 'social',
    tags: ['creator', 'fan', 'airdrop', 'zk-tls', 'web2', 'social'],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    tagline: 'Bridge web2 creators to web3',
    ogTitle: 'Link - Connect Creators with Fans',
    ogDescription: 'Enable web2 creators to reward their fans through verified proofs and airdrops.',
    ogImageUrl: `${ROOT_URL}/og-image.png`,
  }
} as const;
