import { z } from 'zod';

export const activityFormSchema = z
  .object({
    name: z.string().min(1, 'Activity name is required'),
    type: z.enum(['FOOD', 'SIGHTSEEING', 'ACCOMMODATION', 'TRANSPORTATION', 'OTHER'], {
      required_error: 'Please select an activity type',
    }),
    location: z.object({
      name: z.string().min(1, 'Location name is required'),
      address: z.string().min(1, 'Address is required'),
    }),
    startTime: z.string(), // Accept string instead of date
    endTime: z.string(), // Accept string instead of date
    notes: z.string().optional(),
  })
  .refine(data => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
