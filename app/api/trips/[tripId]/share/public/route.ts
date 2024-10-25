import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

// app/api/trips/[tripId]/share/public/route.ts
export async function PATCH(req: Request, { params }: { params: { tripId: string } }) {
    try {
      const { userId } = await auth();
      const { tripId } = await params;
      if (!userId) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
  
      const body = await req.json();
      const { isPublic } = body;
  
      // Update trip
      const trip = await prisma.trip.update({
        where: {
          id: tripId,
          userId,
        },
        data: {
          isPublic,
        },
      });
  
      return NextResponse.json(trip);
    } catch (error) {
      console.error('Error updating trip sharing status:', error);
      return new NextResponse('Internal error', { status: 500 });
    }
  }