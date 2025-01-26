import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { debounce } from 'lodash';
import { Pen } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ItineraryNoteSectionProps {
  activityId: string;
  initialNote: string;
  onSave: (note: string) => Promise<void>;
}

const ItineraryNoteSection = ({ initialNote, onSave }: ItineraryNoteSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(initialNote);
  const [isSaving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const CHARACTER_LIMIT = 130;
  const firstNewLineIndex = note.indexOf('\n');
  const truncateIndex =
    firstNewLineIndex !== -1 ? Math.min(firstNewLineIndex, CHARACTER_LIMIT) : CHARACTER_LIMIT;

  const shouldTruncate = note.length > truncateIndex;
  const truncatedText = shouldTruncate ? `${note.slice(0, truncateIndex)}...` : note;

  const debouncedSaveNote = useCallback(
    debounce(async (content: string) => {
      if (content === initialNote) return;
      setSaving(true);
      try {
        await onSave(content);
      } finally {
        setSaving(false);
      }
    }, 1000),
    [onSave, initialNote]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNote = e.target.value;
    setNote(newNote);
    debouncedSaveNote(newNote);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        isEditing
      ) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const hasContent = note.trim().length > 0;

  return (
    <div ref={containerRef} className="space-y-2">
      <Button
        onClick={() => setIsEditing(!isEditing)}
        variant="ghost"
        className="h-auto p-0 text-sm text-muted-foreground hover:text-blue-600 hover:bg-transparent transition-colors justify-start font-normal"
      >
        <Pen className={`h-4 w-4`} />
        {hasContent ? 'Edit notes' : 'Add notes'}
        {isSaving && <span className="ml-2 text-xs text-gray-400 animate-pulse">(Saving...)</span>}
      </Button>

      <div
        className={`transition-all duration-200 overflow-hidden ${
          isEditing ? 'max-h-[200px] opacity-100' : 'max-h-0 hidden opacity-0'
        }`}
      >
        <Textarea
          ref={textareaRef}
          value={note}
          onChange={handleChange}
          placeholder="Add notes about this activity..."
          className="w-full resize-none bg-gray-50 focus:bg-white transition-colors"
          rows={4}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setIsEditing(false);
            }
          }}
        />
      </div>

      {!isEditing && hasContent && (
        <div className="text-sm text-gray-600">
          {isExpanded ? (
            <>
              <div className="whitespace-pre-wrap pl-6">{note}</div>
              <Button
                onClick={() => setIsExpanded(false)}
                variant="ghost"
                className="text-blue-600 hover:text-blue-700 h-auto p-0 pl-6 mt-1 hover:bg-transparent"
              >
                Show less
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsExpanded(true)}
              variant="ghost"
              className="text-left h-auto p-0 pl-6 font-normal hover:bg-transparent hover:text-muted-foreground"
            >
              <div className="flex items-center">
                <span className="whitespace-pre-wrap">
                  {truncatedText}

                  {shouldTruncate && (
                    <span className="text-blue-600 group-hover:text-blue-700">more</span>
                  )}
                </span>
              </div>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ItineraryNoteSection;
