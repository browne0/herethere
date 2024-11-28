// app/trips/[tripId]/activities/[activityId]/ActivityDetail.tsx
'use client';

import { useState } from 'react';

import { ActivityRecommendation } from '@prisma/client';
import { MapPin, Clock, Star, Calendar, Phone, Globe, ExternalLink } from 'lucide-react';
import Image from 'next/image';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ViatorProduct } from '@/lib/viator';

interface ActivityDetailProps {
  // Google Places data
  activity: ActivityRecommendation;
  // Viator products if available
  viatorProducts?: ViatorProduct[];
}

export function ActivityDetail({ activity, viatorProducts }: ActivityDetailProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Main Image Grid */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        <div className="col-span-4 md:col-span-2 aspect-[4/3] relative rounded-lg overflow-hidden">
          <img src={activity.images.urls[0].url} alt={activity.name} className="object-cover" />
        </div>
        <div className="hidden md:grid grid-cols-2 col-span-2 gap-2">
          {activity.images.urls.slice(1, 5).map((url, i) => (
            <div key={i} className="aspect-[4/3] relative rounded-lg overflow-hidden">
              <img src={url.url} alt={`${activity.name} ${i + 1}`} className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Title & Basic Info */}
          <h1 className="text-3xl font-bold mb-4">{activity.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{activity.location.address}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>
                {activity.rating} ({activity.reviewCount} reviews)
              </span>
            </div>
            {activity.phoneNumber && (
              <div className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                <span>{activity.phoneNumber}</span>
              </div>
            )}
            {activity.website && (
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                <a
                  href={activity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Official Website
                  <ExternalLink className="w-3 h-3 inline ml-1" />
                </a>
              </div>
            )}
          </div>

          {/* Main Content */}
          <Accordion type="single" collapsible defaultValue="about" className="space-y-4">
            <AccordionItem value="about" className="border rounded-lg">
              <AccordionTrigger className="px-4">About</AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <p className="whitespace-pre-line">{activity.description}</p>
              </AccordionContent>
            </AccordionItem>

            {activity.openingHours && (
              <AccordionItem value="hours" className="border rounded-lg">
                <AccordionTrigger className="px-4">Opening Hours</AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <ul className="space-y-1">
                    {/* {activity.openingHours.weekdayText.map((text, i) => (
                      <li key={i}>{text}</li>
                    ))} */}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {/* Viator Tours Section */}
          {viatorProducts && viatorProducts.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Available Tours & Tickets</h2>
              <div className="space-y-4">
                {viatorProducts.map(product => (
                  <Card key={product.productCode} className="p-6">
                    <div className="flex justify-between gap-6">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{product.title}</h3>
                        <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {product.duration.value} {product.duration.unit}
                            </span>
                          </div>
                          {product.cancellationPolicy?.type === 'FREE_CANCELLATION' && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Calendar className="w-4 h-4" />
                              <span>Free cancellation</span>
                            </div>
                          )}
                        </div>

                        {product.highlights && (
                          <div className="mb-4">
                            <h4 className="font-semibold mb-2">Highlights</h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {product.highlights.map((highlight, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                  {highlight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">from</div>
                          {/* <div className="text-2xl font-bold">${product.price.fromPrice}</div> */}
                        </div>
                        <Button>View Details</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map & Add to Trip Panel */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6">
            <Button className="w-full mb-4">Add to Trip</Button>

            {/* Add map component here */}
            <div className="aspect-square rounded-lg bg-muted mb-4">Map placeholder</div>

            <div className="text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 inline mr-1" />
              {activity.location.address}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
