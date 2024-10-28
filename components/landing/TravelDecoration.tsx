import React from 'react';

import { ArrowRight } from 'lucide-react';

const TravelDecoration = () => {
  return (
    <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
      {/* Left side travel card - positioned lower */}
      <div className="absolute -left-4 bottom-20 w-56 transform -rotate-12">
        <div className="bg-white rounded-lg shadow-xl p-3">
          <div className="aspect-[4/3] rounded-md mb-2 bg-gradient-to-br from-blue-100 to-blue-200 overflow-hidden">
            <img
              src="/api/placeholder/400/300"
              alt="Travel destination"
              className="w-full h-full object-cover opacity-90"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200"></div>
            <div className="flex-1">
              <div className="h-2.5 w-3/4 rounded bg-gradient-to-br from-gray-100 to-gray-200"></div>
              <div className="h-2 w-1/2 rounded bg-gradient-to-br from-gray-100 to-gray-200 mt-1"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Center arrow - positioned lower */}
      <div className="absolute left-1/2 bottom-32 transform -translate-x-1/2">
        <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
          <ArrowRight className="w-6 h-6 text-indigo-600" />
        </div>
      </div>

      {/* Right side travel card - positioned lower */}
      <div className="absolute -right-4 bottom-24 w-56 transform rotate-12">
        <div className="bg-white rounded-lg shadow-xl p-3">
          <div className="aspect-[4/3] rounded-md mb-2 bg-gradient-to-br from-purple-100 to-purple-200 overflow-hidden">
            <img
              src="/api/placeholder/400/300"
              alt="Travel destination"
              className="w-full h-full object-cover opacity-90"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-100 to-purple-200"></div>
            <div className="flex-1">
              <div className="h-2.5 w-3/4 rounded bg-gradient-to-br from-gray-100 to-gray-200"></div>
              <div className="h-2 w-1/2 rounded bg-gradient-to-br from-gray-100 to-gray-200 mt-1"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle background gradient */}
      <div className="absolute bottom-0 inset-x-0 h-96 bg-gradient-to-t from-indigo-50/30 to-transparent"></div>

      {/* Decorative dots pattern - moved lower */}
      <div className="absolute inset-0">
        <div className="absolute bottom-48 left-1/4 w-2 h-2 rounded-full bg-indigo-200/50"></div>
        <div className="absolute bottom-36 right-1/3 w-2 h-2 rounded-full bg-purple-200/50"></div>
        <div className="absolute bottom-32 left-1/3 w-2 h-2 rounded-full bg-indigo-200/50"></div>
        <div className="absolute bottom-40 right-1/4 w-2 h-2 rounded-full bg-purple-200/50"></div>
      </div>
    </div>
  );
};

export default TravelDecoration;
