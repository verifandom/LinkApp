import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle Base Mini App webhook events
    console.log('Webhook received:', body);
    
    // Process different event types
    switch (body.type) {
      case 'miniapp_install':
        // Handle mini app installation
        console.log('Mini app installed by user:', body.user);
        break;
      case 'miniapp_uninstall':
        // Handle mini app uninstallation
        console.log('Mini app uninstalled by user:', body.user);
        break;
      default:
        console.log('Unknown webhook event type:', body.type);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint is active' });
}