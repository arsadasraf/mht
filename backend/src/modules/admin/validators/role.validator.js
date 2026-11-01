import { z } from 'zod';

export const createRoleSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Please enter a role name.' })
      .trim()
      .min(2, 'Role name must be at least 2 characters.'),
    slug: z
      .string({ required_error: 'Please enter a unique role slug.' })
      .trim()
      .min(2, 'Role slug must be at least 2 characters.')
      .transform((val) => val.toLowerCase().replace(/[^a-z0-9_-]/g, '-')),
    description: z.string().trim().optional().default(''),
    allowedRoutes: z.array(z.string().trim()).optional().default([])
  })
});

export const updateRolePermissionsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID format.')
  }),
  body: z.object({
    allowedRoutes: z.array(z.string().trim()).optional(),
    description: z.string().trim().optional()
  })
});
