import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

interface TikTokEmbedProps {
  videoId: string;
  onVideoComplete?: () => void;
}

export interface TikTokEmbedRef {
  play: () => void;
}

export const TikTokEmbed = forwardRef<TikTokEmbedRef, TikTokEmbedProps>(
  ({ videoId, onVideoComplete }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useImperativeHandle(ref, () => ({
      play: () => {
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: 'play',
              'x-tiktok-player': true,
            },
            '*'
          );
        }
      },
    }));

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data['x-tiktok-player']) return;

        if (data.type === 'onStateChange') {
          if (data.value === 0 && onVideoComplete) {
            onVideoComplete();
          }
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [onVideoComplete]);

    return (
      <div className="w-[325px] h-[578px]">
        <iframe
          ref={iframeRef}
          src={`https://www.tiktok.com/player/v1/${videoId}`}
          className="w-full h-full"
          allow="fullscreen"
        />
      </div>
    );
  }
);

TikTokEmbed.displayName = 'TikTokEmbed';

export default TikTokEmbed;
