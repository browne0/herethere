import { createClerkClient } from '@clerk/backend';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

export async function POST(req: Request, { params }: { params: { tripId: string } }) {
  try {
    const { tripId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { email, role } = body;

    // Find user by email using Clerk
    const userList = await clerkClient.users.getUserList({
      emailAddress: [email],
    });

    if (userList.data.length === 0) {
      return new NextResponse('User not found', { status: 404 });
    }

    const userToShare = userList.data[0];

    // Check if trip exists and belongs to current user
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
    });

    if (!trip) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    // Check if already shared with this user
    const existingShare = await prisma.tripShare.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId: userToShare.id,
        },
      },
    });

    if (existingShare) {
      return new NextResponse('Trip already shared with this user', { status: 400 });
    }

    // Create share
    const share = await prisma.tripShare.create({
      data: {
        tripId,
        userId: userToShare.id,
        role,
      },
    });

    return NextResponse.json({
      userId: userToShare.id,
      role: share.role,
      userEmail: email,
    });
  } catch (error) {
    console.error('Error sharing trip:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
