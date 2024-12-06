import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }

  try {
    switch (evt.type) {
      case 'user.created':
        await prisma.user.create({
          data: {
            id: evt.data.id,
            email: evt.data.email_addresses[0]?.email_address,
            onboardingCompleted: false,
          },
        });
        console.log('Created user:', evt.data.id);
        break;

      case 'user.updated':
        await prisma.user.update({
          where: { id: evt.data.id },
          data: {
            email: evt.data.email_addresses[0]?.email_address,
            // Add any other fields you want to sync from Clerk
          },
        });
        console.log('Updated user:', evt.data.id);
        break;

      case 'user.deleted':
        await prisma.user.delete({
          where: { id: evt.data.id },
        });
        console.log('Deleted user:', evt.data.id);
        break;

      default:
        console.log('Unhandled webhook type:', evt.type);
    }

    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error(`Error processing ${evt.type}:`, error);
    return new Response('Error processing webhook', { status: 500 });
  }
}
