'use client';

import { useEffect, useState } from 'react';

import { Trip } from '@prisma/client';
import { format } from 'date-fns';
import { Share2, Mail, MessageCircle, Copy, Loader2, CalendarDays, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface TripShareDialogProps {
  trip: Trip;
  activityCount: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function TripShareDialog({
  trip,
  activityCount,
  open,
  onOpenChange,
  trigger,
}: TripShareDialogProps) {
  // Use internal state only if open prop is not provided
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(trip.isPublic);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const { toast } = useToast();

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

  useEffect(() => {
    setShareUrl(`${window.location.origin}/trips/${trip.id}/public`);
  }, [trip.id]);

  const shareText = `Check out my trip to ${trip.title} on WanderAI!`;
  const encodedShareText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const tripDuration = Math.ceil(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const handlePublicToggle = async (newStatus: boolean) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/trips/${trip.id}/share/public`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update sharing status');

      setIsPublic(newStatus);
      toast({
        title: newStatus ? 'Trip made public' : 'Trip made private',
        description: newStatus
          ? 'Anyone with the link can now view this trip'
          : 'The trip is now private',
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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied',
        description: 'Trip link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const socialShareLinks = {
    email: `mailto:?subject=${encodedShareText}&body=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedShareText}%20${encodedUrl}`,
    messages: `sms:?&body=${encodedShareText}%20${encodedUrl}`,
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !isControlled && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <Share2 className="h-4 w-4" />
            <span>Share Trip</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
          <DialogDescription>Share your trip itinerary with friends and family</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h3 className="font-medium text-lg">{trip.title}</h3>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-1" />
            {trip.destination}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 mr-1" />
            {format(new Date(trip.startDate), 'MMM d')} -{' '}
            {format(new Date(trip.endDate), 'MMM d, yyyy')}
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center space-x-2">
          <Switch
            id="public"
            checked={isPublic}
            onCheckedChange={handlePublicToggle}
            disabled={isLoading}
          />
          <Label htmlFor="public" className="flex-grow">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Make trip public'}
          </Label>
        </div>

        {isPublic ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" onClick={copyToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(socialShareLinks.email, '_blank')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(socialShareLinks.whatsapp, '_blank')}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(socialShareLinks.messages)}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Messages
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(socialShareLinks.twitter, '_blank')}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
                Twitter
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Note: Anyone with the link can now view this trip
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Make the trip public to get a shareable link
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
