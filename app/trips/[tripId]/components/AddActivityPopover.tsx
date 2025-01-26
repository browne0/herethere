import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useActivitiesStore, useActivityMutations } from '@/lib/stores/activitiesStore';
import { Loader2, Plus } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { ActivityStatus } from '../types';

interface AddActivityPopoverProps {
  date: Date;
}

interface ManualActivityForm {
  name: string;
  description: string;
  location: string;
  duration: string;
}

export default function AddActivityPopover({ date }: AddActivityPopoverProps) {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
    } catch (_error) {
      toast.error('Failed to update activity status');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;

    // try {
    //   await addActivity.mutateAsync({
    //     activity: {
    //       name: formData.name,
    //       description: formData.description,
    //       location: {
    //         address: formData.location,
    //         latitude: 0,
    //         longitude: 0,
    //         neighborhood: '',
    //         placeId: '',
    //       },
    //       duration: parseInt(formData.duration) || 60,
    //     },
    //     status: 'planned',
    //   });

    //   toast.success('Activity added successfully');
    //   setFormData({ name: '', description: '', location: '', duration: '' });
    //   setOpen(false);
    // } catch (_error) {
    //   toast.error('Failed to add activity');
    // }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          Add activity <Plus className="w-4 h-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start" side="right">
        <Tabs defaultValue="planned" className="w-full">
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
                unscheduledActivities.map(activity => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"
                  >
                    <span className="text-sm truncate mr-2">{activity.recommendation.name}</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        // Here you would add logic to schedule the activity
                        toast.success('Activity scheduled');
                        setOpen(false);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="interested" className="mt-2">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {interestedActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No interested activities</p>
              ) : (
                interestedActivities.map(activity => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-2 border rounded hover:bg-slate-50"
                  >
                    <span className="text-sm truncate mr-2">{activity.recommendation.name}</span>
                    <Button size="sm" onClick={() => handleStatusChange(activity.id, 'planned')}>
                      Add
                    </Button>
                  </div>
                ))
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
      </PopoverContent>
    </Popover>
  );
}
