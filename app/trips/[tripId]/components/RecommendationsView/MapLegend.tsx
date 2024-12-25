import React, { useState } from 'react';
import { Bookmark, Check, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LegendItemProps {
  icon: React.ReactNode;
  label: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ icon, label }) => (
  <div className="flex items-center gap-2 text-sm">
    {icon}
    <span>{label}</span>
  </div>
);

export const MapLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute left-2 top-2 z-10">
      {isExpanded ? (
        <Card className="w-48">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Legend</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
            <LegendItem
              icon={
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                  <Check className="h-4 w-4 text-white" />
                </div>
              }
              label="Planned"
            />
            <LegendItem
              icon={
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <Bookmark
                    className="h-4 w-4 text-yellow-500 fill-yellow-500"
                    stroke="black"
                    strokeWidth={2}
                  />
                </div>
              }
              label="Interested"
            />
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1 bg-white hover:bg-white shadow-sm border border-border"
        >
          Show Legend
        </Button>
      )}
    </div>
  );
};
