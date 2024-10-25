import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: { tripId: string; shareId: string } }
) {
  try {
    const { shareId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { role } = body;

    // Update share
    const share = await prisma.tripShare.update({
      where: {
        id: shareId,
        trip: {
          userId,
        },
      },
      data: {
        role,
      },
    });

    return NextResponse.json(share);
  } catch (error) {
    console.error('Error updating share:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { tripId: string; shareId: string } }
) {
  try {
    const { shareId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Delete share
    await prisma.tripShare.delete({
      where: {
        id: shareId,
        trip: {
          userId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting share:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
