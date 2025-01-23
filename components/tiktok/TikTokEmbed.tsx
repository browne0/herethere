'use client';
import React, { useEffect, useRef, useState } from 'react';

interface TikTokEmbedProps {
  videoId: string;
}

export const TikTokEmbed: React.FC<TikTokEmbedProps> = ({ videoId }) => {
  const [isInView, setIsInView] = useState(false);
  const [hasBeenLoaded, setHasBeenLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setHasBeenLoaded(true);
          } else {
            setIsInView(false);
          }
        });
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '325px', height: '578px' }}>
      {isInView || hasBeenLoaded ? (
        <iframe
          src={`https://www.tiktok.com/player/v1/${videoId}`}
          style={{ width: '100%', height: '100%' }}
          allow="fullscreen"
        />
      ) : (
        <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg" />
      )}
    </div>
  );
};
