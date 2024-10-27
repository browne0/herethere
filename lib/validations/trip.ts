import { z } from 'zod';

const cityBoundsSchema = z.object({
  ne: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  sw: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export const tripFormSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    destination: z.string().min(1, 'Destination is required'),
    startDate: z.date({
      required_error: 'Start date is required',
      invalid_type_error: 'Start date must be a valid date',
    }),
    endDate: z.date({
      required_error: 'End date is required',
      invalid_type_error: 'End date must be a valid date',
    }),
    // These fields will be added after form validation, so they should be optional in the schema
    cityBounds: cityBoundsSchema.optional(),
    placeId: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .refine(
    data => {
      if (!data.startDate || !data.endDate) return false;
      return data.startDate <= data.endDate;
    },
    {
      message: 'End date cannot be before start date',
      path: ['endDate'],
    }
  );

export type TripFormData = z.infer<typeof tripFormSchema>;
