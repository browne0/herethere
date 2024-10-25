import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

import { prisma } from '@/lib/db';
import { UserPreferences } from '@/lib/types';

async function POST(req: Request) {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!CLERK_WEBHOOK_SECRET) {
    console.error('WEBHOOK_SECRET is not defined'); // Add this
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers'); // Add this
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  console.log('Webhook body:', body);

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const defaultPreferences: UserPreferences = {
      dietary: [],
      interests: [],
      budget: 'MEDIUM',
      travelStyle: [],
      accessibility: [],
      notifications: {
        email: true,
        push: true,
      },
    };

    try {
      const user = await prisma.user.upsert({
        where: { id: id as string },
        create: {
          id: id as string,
          email: email_addresses[0].email_address,
          firstName: first_name || null,
          lastName: last_name || null,
          profileImage: image_url,
          preferences: {},
        },
        update: {
          email: email_addresses[0].email_address,
          firstName: first_name || null,
          lastName: last_name || null,
          profileImage: image_url,
          // Don't update preferences here to prevent overwriting user settings
        },
      });

      console.log('User saved:', user);
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  if (eventType === 'user.deleted') {
    await prisma.user.delete({
      where: { id: id as string },
    });
  }

  return new Response('', { status: 200 });
}

export { POST };

// Disable body parsing, need raw body for Webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};
