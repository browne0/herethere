import React, { useState } from 'react';

import { ArrowRight, Sparkles, Map } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const PathSelection = ({ onPathSelect }) => {
  const [selectedPath, setSelectedPath] = useState(null);

  const handlePathSelect = path => {
    setSelectedPath(path);
    onPathSelect(path);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-center mb-8">How would you like to plan your trip?</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* AI Path */}
        <Card
          className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
            selectedPath === 'ai' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handlePathSelect('ai')}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">✨ Create a personalized plan for me</h3>
            <p className="text-muted-foreground">
              Let our AI create a custom itinerary based on your preferences, optimized for your
              schedule and interests.
            </p>
            <Button
              className="mt-4"
              onClick={e => {
                e.stopPropagation();
                handlePathSelect('ai');
              }}
            >
              Create AI Plan <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Manual Path */}
        <Card
          className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
            selectedPath === 'manual' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handlePathSelect('manual')}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Map className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">I'll build my own adventure</h3>
            <p className="text-muted-foreground">
              Take full control of your itinerary. Browse activities, create your schedule, and plan
              at your own pace.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={e => {
                e.stopPropagation();
                handlePathSelect('manual');
              }}
            >
              Plan Manually <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PathSelection;
