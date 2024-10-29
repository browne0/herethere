import React, { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
}

const loadingQuips = [
  'Planning your perfect itinerary...',
  'Finding hidden gems...',
  'Checking local favorites...',
  'Optimizing your daily schedule...',
  'Finding spots with low tourists...',
  'Matching activities to your style...',
  'Finalizing every detail...',
  'Creating your personalized journey...',
  'Mapping the best routes...',
  'Checking opening hours...',
];

const LoadingOverlay = ({ isLoading }: LoadingOverlayProps) => {
  const [currentQuip, setCurrentQuip] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentQuip(prev => (prev + 1) % loadingQuips.length);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <>
          {/* White overlay that wipes in from left to right */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            style={{ originX: 0 }}
            className="fixed inset-0 bg-white z-50"
          />

          {/* Loading content that fades in after the wipe */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-50"
          >
            <div className="text-center px-4">
              <Loader2 className="w-12 h-12 text-indigo-600" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuip}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-8" // Fixed height to prevent layout shift
                >
                  <p className="text-xl text-gray-800 font-medium">{loadingQuips[currentQuip]}</p>
                </motion.div>
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-4 text-sm text-gray-500"
              >
                This may take a minute
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
