import { z } from 'zod';

export const tripFormSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    destination: z.string().min(1, 'Destination is required'),
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine(data => data.endDate >= data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type TripFormValues = z.infer<typeof tripFormSchema>;
