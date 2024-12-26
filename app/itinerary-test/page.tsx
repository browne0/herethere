'use client';
import React, { useState } from 'react';

import {
  Clock,
  MapPin,
  Sun,
  Cloud,
  Coffee,
  Utensils,
  Camera,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const ItineraryView = () => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [expandedActivity, setExpandedActivity] = useState(null);

  // Example itinerary data
  const itinerary = {
    days: [
      {
        date: 'Monday, Dec 27',
        weather: 'sunny',
        activities: [
          {
            id: 1,
            time: '09:00 AM',
            duration: '1.5 hours',
            title: 'Breakfast at Le Pain Quotidien',
            type: 'food',
            location: 'Bryant Park',
            travelTime: '15 min walk to next',
            notes: 'Popular morning spot - might be busy',
            weatherSensitive: false,
          },
          {
            id: 2,
            time: '10:45 AM',
            duration: '2 hours',
            title: 'Metropolitan Museum of Art',
            type: 'culture',
            location: 'Upper East Side',
            travelTime: '20 min subway to next',
            notes: 'Highlights: Egyptian Wing, Modern Art',
            weatherSensitive: false,
          },
          {
            id: 3,
            time: '1:15 PM',
            duration: '1 hour',
            title: 'Lunch at Shake Shack',
            type: 'food',
            location: 'Madison Square Park',
            travelTime: '10 min walk to next',
            weatherSensitive: false,
          },
          {
            id: 4,
            time: '2:30 PM',
            duration: '2 hours',
            title: 'Central Park Walking Tour',
            type: 'outdoor',
            location: 'Central Park',
            travelTime: '25 min subway to next',
            notes: 'Weather dependent activity',
            weatherSensitive: true,
          },
        ],
      },
      // Additional days would follow the same pattern...
    ],
  };

  const getActivityIcon = type => {
    switch (type) {
      case 'food':
        return Utensils;
      case 'culture':
        return Camera;
      case 'outdoor':
        return Sun;
      default:
        return MapPin;
    }
  };

  const ActivityCard = ({ activity, isExpanded, onToggle }) => {
    const Icon = getActivityIcon(activity.type);

    return (
      <Card
        className={`mb-4 transition-all duration-300 ${
          activity.weatherSensitive ? 'border-l-4 border-l-yellow-400' : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4">
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-gray-500">{activity.time}</span>
                <div className="h-full w-px bg-gray-200 my-2" />
                <span className="text-sm text-gray-400">{activity.duration}</span>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <h3 className="font-medium">{activity.title}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {activity.location}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => onToggle(activity.id)}>
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t">
              {activity.notes && (
                <div className="flex items-start space-x-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-gray-500 mt-1" />
                  <p className="text-sm text-gray-600">{activity.notes}</p>
                </div>
              )}

              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Next: {activity.travelTime}</span>
              </div>

              <div className="flex space-x-2 mt-4">
                <Button variant="outline" size="sm">
                  Modify Time
                </Button>
                <Button variant="outline" size="sm">
                  View on Map
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Your Itinerary</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            Edit
          </Button>
          <Button variant="outline" size="sm">
            Share
          </Button>
        </div>
      </div>

      {/* Day Header */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">{itinerary.days[selectedDay].date}</h3>
              <p className="text-sm text-gray-500">4 activities planned</p>
            </div>
            <div className="flex items-center space-x-2">
              <Sun className="w-5 h-5 text-yellow-500" />
              <span className="text-sm">72°F</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Timeline */}
      <div className="space-y-2">
        {itinerary.days[selectedDay].activities.map(activity => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            isExpanded={expandedActivity === activity.id}
            onToggle={id => setExpandedActivity(expandedActivity === id ? null : id)}
          />
        ))}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:relative md:border-t-0 md:mt-6">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <Button variant="outline">Previous Day</Button>
          <div className="text-center">
            <p className="text-sm text-gray-500">Day 1 of 3</p>
          </div>
          <Button>Next Day</Button>
        </div>
      </div>
    </div>
  );
};

export default ItineraryView;
