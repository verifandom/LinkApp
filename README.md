# Link - Base Mini App

A Base Mini App that connects web2 creators with their fans through zk-TLS proofs and airdrops.

Here is the smart contract : **0x4A136963f05BAf35F8f87b4E8BF21F3cacC14c05**

## 🚀 Features

- **Creator Dashboard**: Manage claim periods and distribute airdrops
- **Fan Interface**: Search creators and submit zk-TLS proofs
- **Coinbase Integration**: Add funds via Coinbase onramp
- **Social Connections**: Connect YouTube, Instagram, and X accounts
- **Beautiful UI**: Glassmorphism design with animated halftone background

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Animations**: Motion (Framer Motion)
- **Platform**: Base Mini Apps

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_APP_URL=https://your-app-url.vercel.app

# Account Association (get from https://www.base.dev/preview)
ACCOUNT_ASSOCIATION_HEADER=
ACCOUNT_ASSOCIATION_PAYLOAD=
ACCOUNT_ASSOCIATION_SIGNATURE=
```

### Required Assets

Place these images in the `public/` directory:

- `icon.png` - App icon (192x192px)
- `splash.png` - Splash screen image
- `hero.png` - Hero image for app listing
- `og-image.png` - Open Graph image (1200x630px)

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Account Association

1. Deploy your app to Vercel
2. Visit [Base Build Preview Tool](https://www.base.dev/preview)
3. Generate account association credentials
4. Add credentials to Vercel environment variables
5. Redeploy

### Publish to Base

1. Ensure app is live and accessible
2. Test manifest: `https://your-app.vercel.app/.well-known/farcaster.json`
3. Post your app URL in the Base app

## 📱 Base Mini App Configuration

Configuration is in `minikit.config.ts`:

- App metadata (name, description, icons)
- Account association settings
- Webhook configuration
- Categories and tags

## 🧪 Testing

```bash
# Run build
npm run build

# Test manifest endpoint
curl https://your-app.vercel.app/.well-known/farcaster.json
```

## 📄 License

MIT
