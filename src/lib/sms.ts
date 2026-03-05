const SMS_PROVIDER = process.env.SMS_PROVIDER;

export async function sendSMS(phone: string, message: string): Promise<void> {
  if (!SMS_PROVIDER || SMS_PROVIDER === 'mock') {
    console.log(`[SMS MOCK] To: ${phone}\nMessage: ${message}`);
    return;
  }

  if (SMS_PROVIDER === 'twilio') {
    await sendViaTwilio(phone, message);
    return;
  }

  if (SMS_PROVIDER === 'vonage') {
    await sendViaVonage(phone, message);
    return;
  }

  console.warn(`[SMS] Unknown provider "${SMS_PROVIDER}", falling back to mock.`);
  console.log(`[SMS MOCK] To: ${phone}\nMessage: ${message}`);
}

async function sendViaTwilio(phone: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio env vars not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)');
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, From: from, Body: message }).toString(),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio error ${res.status}: ${err}`);
  }
}

async function sendViaVonage(phone: string, message: string): Promise<void> {
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const from = process.env.VONAGE_FROM_NUMBER ?? 'Clinic';

  if (!apiKey || !apiSecret) {
    throw new Error('Vonage env vars not configured (VONAGE_API_KEY, VONAGE_API_SECRET)');
  }

  const res = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      api_secret: apiSecret,
      to: phone.replace(/^\+/, ''),
      from,
      text: message,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vonage error ${res.status}: ${err}`);
  }
}
