import * as z from 'zod';

export const activityFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['OTHER', 'DINING', 'SIGHTSEEING', 'ACCOMMODATION', 'TRANSPORTATION']),
    address: z.string().min(1, 'Location is required'),
    latitude: z.number(),
    longitude: z.number(),
    placeId: z.string().optional(),
    startDate: z.date({
      required_error: 'Start date is required',
    }),
    endDate: z.date({
      required_error: 'End date is required',
    }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    notes: z.string(),
  })
  .refine(
    data => {
      const startDateTime = new Date(data.startDate);
      const endDateTime = new Date(data.endDate);
      const [startHours, startMinutes] = data.startTime.split(':');
      const [endHours, endMinutes] = data.endTime.split(':');

      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

      return endDateTime > startDateTime;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
