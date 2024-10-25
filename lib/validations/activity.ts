import * as z from 'zod';

export const activityFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['OTHER', 'DINING', 'SIGHTSEEING', 'ACCOMMODATION', 'TRANSPORTATION'], {
      required_error: 'Please select an activity type',
    }),
    address: z.string().min(1, 'Address is required'),
    startDate: z.date({
      required_error: 'Start date is required',
    }),
    startTime: z.string({
      required_error: 'Start time is required',
    }),
    endDate: z.date({
      required_error: 'End date is required',
    }),
    endTime: z.string({
      required_error: 'End time is required',
    }),
    notes: z.string().optional(),
  })
  .refine(
    data => {
      const startDateTime = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

      const endDateTime = new Date(data.endDate);
      const [endHours, endMinutes] = data.endTime.split(':');
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

      return endDateTime > startDateTime;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'], // Show error on end time field
    }
  );

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
