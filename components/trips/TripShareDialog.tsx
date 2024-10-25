'use client';

import { useState } from 'react';

import { Share2, Plus, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface TripShareDialogProps {
  tripId: string;
  isPublic: boolean;
  sharedWith: {
    userId: string;
    role: string;
    userEmail?: string;
  }[];
}

export function TripShareDialog({ tripId, isPublic, sharedWith }: TripShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [isPublicLocal, setIsPublicLocal] = useState(isPublic);
  const [localSharedWith, setLocalSharedWith] = useState(sharedWith);
  const { toast } = useToast();

  const handleUpdatePublicStatus = async (newStatus: boolean) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/trips/${tripId}/share/public`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update sharing status');

      setIsPublicLocal(newStatus);
      toast({
        title: 'Sharing status updated',
        description: newStatus ? 'Trip is now public' : 'Trip is now private',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update sharing status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!email) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/trips/${tripId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });

      if (!response.ok) throw new Error('Failed to share trip');

      const data = await response.json();
      setLocalSharedWith([...localSharedWith, data]);
      setEmail('');
      toast({
        title: 'Trip shared',
        description: `Trip has been shared with ${email}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to share trip. Please verify the email address.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/trips/${tripId}/share/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove share');

      setLocalSharedWith(localSharedWith.filter(share => share.userId !== userId));
      toast({
        title: 'Share removed',
        description: 'User no longer has access to this trip',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove share',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/trips/${tripId}/share/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      setLocalSharedWith(
        localSharedWith.map(share =>
          share.userId === userId ? { ...share, role: newRole } : share
        )
      );
      toast({
        title: 'Role updated',
        description: 'User role has been updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
          <DialogDescription>Share your trip with others or make it public.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="public">Make trip public</Label>
            <Switch
              id="public"
              checked={isPublicLocal}
              onCheckedChange={handleUpdatePublicStatus}
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <Label>Share with specific people</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
              />
              <Select value={role} onValueChange={setRole} disabled={isLoading}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                </SelectContent>
              </Select>
              <Button size="icon" onClick={handleShare} disabled={isLoading || !email}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {localSharedWith.length > 0 && (
            <div className="grid gap-2">
              <Label>Shared with</Label>
              <div className="grid gap-2">
                {localSharedWith.map(share => (
                  <div
                    key={share.userId}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <span className="text-sm truncate">{share.userEmail}</span>
                    <div className="flex items-center gap-2">
                      <Select
                        value={share.role}
                        onValueChange={newRole => handleUpdateRole(share.userId, newRole)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-8 w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                          <SelectItem value="EDITOR">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleRemoveShare(share.userId)}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
