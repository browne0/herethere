'use client';

import React, { useState } from 'react';

import { DialogTitle } from '@radix-ui/react-dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useActivitiesStore, useActivityMutations } from '@/lib/stores/activitiesStore';
import { ActivityStatus } from '../types';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ManualActivityForm {
  name: string;
  description: string;
  location: string;
  duration: string;
}

export default function AddActivityModal({ isOpen, onClose }: AddActivityModalProps) {
  const { trip } = useActivitiesStore();
  const { addActivity, updateActivity } = useActivityMutations();
  const [formData, setFormData] = useState<ManualActivityForm>({
    name: '',
    description: '',
    location: '',
    duration: '',
  });

  const unscheduledActivities =
    trip?.activities.filter(act => act.status === 'planned' && !act.startTime && !act.endTime) ??
    [];
  const interestedActivities = trip?.activities.filter(act => act.status === 'interested') ?? [];

  const handleStatusChange = async (activityId: string, newStatus: ActivityStatus) => {
    try {
      await updateActivity.mutateAsync({
        activityId,
        updates: { status: newStatus },
      });
      toast.success('Activity status updated');
    } catch (_error) {
      toast.error('Failed to update activity status');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;

    try {
      // You'll need to implement the actual API endpoint and types for manual activity creation
      await addActivity.mutateAsync({
        // @ts-expect-error will fix later
        activity: {
          name: formData.name,
          description: formData.description,
          location: {
            address: formData.location,
            // You'll need to add proper location handling
            latitude: 0,
            longitude: 0,
            neighborhood: '',
            placeId: '',
          },
          duration: parseInt(formData.duration) || 60, // Default to 60 minutes
          // Add other required fields based on your ActivityRecommendation type
        },
        status: 'planned',
      });

      toast.success('Activity added successfully');
      setFormData({ name: '', description: '', location: '', duration: '' });
      onClose();
    } catch (_error) {
      toast.error('Failed to add activity');
    }
  };

  if (!trip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Activities</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Activities</TabsTrigger>
            <TabsTrigger value="manual">Add Manually</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="mt-4">
            <Accordion type="single" collapsible className="w-full" defaultValue="planned">
              <AccordionItem value="planned">
                <AccordionTrigger disabled={unscheduledActivities.length === 0}>
                  Unscheduled ({unscheduledActivities.length})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {unscheduledActivities.map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span>{activity.recommendation.name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(activity.id, 'interested')}
                        >
                          Move to Interested
                        </Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="interested">
                <AccordionTrigger disabled={interestedActivities.length === 0}>
                  Interested ({interestedActivities.length})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {interestedActivities.map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span>{activity.recommendation.name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(activity.id, 'planned')}
                        >
                          Move to Planned
                        </Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Activity Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={e => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={addActivity.isPending}>
                {addActivity.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Activity
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
