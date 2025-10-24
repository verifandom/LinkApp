import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Get the API key and API secret from environment variables
    const apiKey = process.env.CDP_API_KEY;
    const apiSecret = process.env.CDP_API_SECRET;

    console.log('CDP Credentials check:', {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      apiKeyLength: apiKey?.length,
      apiSecretLength: apiSecret?.length
    });

    if (!apiKey || !apiSecret) {
      console.error('Missing CDP API credentials');
      return NextResponse.json(
        { error: 'Onramp service not configured' },
        { status: 500 }
      );
    }

    // Create Basic Auth header (API Key:API Secret)
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    // Create the session token request using Coinbase's CDP API (REST format)
    const response = await fetch('https://api.cdp.coinbase.com/onramp/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create session token:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json(
        { error: `Failed to create session token: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.error) {
      console.error('Session token API error:', data.error);
      return NextResponse.json(
        { error: data.error.message || 'Failed to create session token' },
        { status: 400 }
      );
    }

    // Extract session token from REST response
    const sessionToken = data.session_token || data.sessionToken || data.token;

    if (!sessionToken) {
      console.error('No session token in response:', data);
      return NextResponse.json(
        { error: 'Session token not found in response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionToken: sessionToken
    });

  } catch (error) {
    console.error('Error creating session token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}