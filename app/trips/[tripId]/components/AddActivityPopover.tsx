import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useActivitiesStore, useActivityMutations } from '@/lib/stores/activitiesStore';
import { Loader2, Plus, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { ActivityStatus, ParsedItineraryActivity } from '../types';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ActivityDetailSheet } from './ActivityDetailSheet';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';

interface AddActivityProps {
  date: Date;
}

interface ManualActivityForm {
  name: string;
  description: string;
  location: string;
  duration: string;
}

function ActivityTabs({ onComplete, isDesktop }: { onComplete: () => void; isDesktop: boolean }) {
  const { trip } = useActivitiesStore();
  const { updateActivity, addActivity } = useActivityMutations();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
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

  const defaultTab =
    unscheduledActivities.length > 0
      ? 'planned'
      : interestedActivities.length > 0
        ? 'interested'
        : 'manual';

  const handleStatusChange = async (activityId: string, newStatus: ActivityStatus) => {
    try {
      await updateActivity.mutateAsync({
        activityId,
        updates: { status: newStatus },
      });
      toast.success('Activity status updated');
      onComplete();
    } catch (_error) {
      toast.error('Failed to update activity status');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;

    try {
      // await addActivity.mutateAsync({
      //   activity: {
      //     name: formData.name,
      //     description: formData.description,
      //     location: {
      //       address: formData.location,
      //       latitude: 0,
      //       longitude: 0,
      //       neighborhood: '',
      //       placeId: '',
      //     },
      //     duration: parseInt(formData.duration) || 60,
      //   },
      //   status: 'planned',
      // });

      toast.success('Activity added successfully');
      setFormData({ name: '', description: '', location: '', duration: '' });
      onComplete();
    } catch (_error) {
      toast.error('Failed to add activity');
    }
  };

  const renderActivityItem = (activity: ParsedItineraryActivity, isPlanned: boolean) => (
    <div
      key={activity.id}
      className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"
    >
      {isDesktop ? (
        <Sheet
          modal={false}
          open={selectedActivityId === activity.id}
          onOpenChange={open => {
            setSelectedActivityId(open ? activity.id : null);
          }}
        >
          <SheetTrigger asChild>
            <div className="text-sm truncate mr-2 text-left hover:text-primary cursor-pointer">
              {activity.recommendation.name}
            </div>
          </SheetTrigger>
          <ActivityDetailSheet
            type="itinerary"
            activity={activity}
            isOpen={selectedActivityId === activity.id}
          />
        </Sheet>
      ) : (
        <button
          className="text-sm truncate mr-2 text-left hover:text-primary"
          onClick={() => {
            // onComplete();
            // Small delay to allow drawer to close
            setTimeout(() => {
              setSelectedActivityId(activity.id);
            }, 100);
          }}
        >
          {activity.recommendation.name}
        </button>
      )}
      <Button
        size="sm"
        onClick={() => {
          if (isPlanned) {
            toast.success('Activity scheduled');
            onComplete();
          } else {
            handleStatusChange(activity.id, 'planned');
          }
        }}
      >
        Add
      </Button>
    </div>
  );

  return (
    <>
      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="border-b">
          <TabsList className="h-10 grid grid-cols-3 bg-transparent p-0">
            <TabsTrigger
              value="planned"
              className="h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
            >
              Planned
            </TabsTrigger>
            <TabsTrigger
              value="interested"
              className="h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
            >
              Interested
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
            >
              Add manually
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="planned" className="mt-2">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {unscheduledActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">No unscheduled activities</p>
            ) : (
              unscheduledActivities.map(activity => renderActivityItem(activity, true))
            )}
          </div>
        </TabsContent>

        <TabsContent value="interested" className="mt-2">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {interestedActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">No interested activities</p>
            ) : (
              interestedActivities.map(activity => renderActivityItem(activity, false))
            )}
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-2">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
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
                className="h-20"
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

      {/* Mobile Activity Detail Sheet */}
      {!isDesktop && selectedActivityId && (
        <Sheet
          open={selectedActivityId !== null}
          onOpenChange={open => !open && setSelectedActivityId(null)}
        >
          <ActivityDetailSheet
            type="itinerary"
            activity={trip?.activities.find(a => a.id === selectedActivityId)!}
            isOpen={true}
          />
        </Sheet>
      )}
    </>
  );
}

export default function AddActivityPopover({ date }: AddActivityProps) {
  const [open, setOpen] = useState(false);
  const { trip } = useActivitiesStore();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (!trip) return null;

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">
            Add activity <Plus className="w-4 h-4 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end" side="bottom">
          <ActivityTabs onComplete={() => setOpen(false)} isDesktop={true} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">
          Add activity <Plus className="w-4 h-4 ml-2" />
        </Button>
      </DrawerTrigger>
      <DrawerDescription className="sr-only">Activities for {trip.title}</DrawerDescription>
      <DrawerContent className="h-[90vh]" onInteractOutside={e => e.preventDefault()}>
        <DrawerHeader className="text-left">
          <DrawerTitle>Add Activity</DrawerTitle>
          <DrawerClose className="absolute right-2 top-2">
            <div className="p-1 rounded-md hover:bg-gray-100">
              <X className="h-4 w-4" />
            </div>
          </DrawerClose>
        </DrawerHeader>
        <div className="px-4">
          <ActivityTabs onComplete={() => setOpen(false)} isDesktop={false} />
        </div>
        <DrawerFooter className="pt-2" />
      </DrawerContent>
    </Drawer>
  );
}
