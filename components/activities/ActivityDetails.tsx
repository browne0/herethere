'use client';
import React from 'react';

import { type Activity } from '@prisma/client';
import { format } from 'date-fns';
import { ArrowLeft, Clock, MapPin, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityDetailsProps {
  activity: Activity;
  tripId: string;
}

const ActivityDetails: React.FC<ActivityDetailsProps> = ({ activity, tripId }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/activities/${activity.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Redirect to trip details page after successful deletion
        window.location.href = `/trips/${tripId}`;
      }
    } catch (error) {
      console.error('Failed to delete activity:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <Link
          href={`/trips/${tripId}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Trip
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>{activity.name}</span>
            <div className="space-x-2">
              <Link href={`/trips/${tripId}/activities/${activity.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>
              {format(new Date(activity.startTime), 'MMM d, yyyy h:mm a')} -
              {format(new Date(activity.endTime), 'h:mm a')}
            </span>
          </div>

          {activity.address && (
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{activity.address}</span>
            </div>
          )}
          {activity.notes && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{activity.notes}</p>
            </div>
          )}

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Activity Type</h3>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100">
              {activity.type}
            </span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActivityDetails;
