import { z } from 'zod';

const departmentEnum = z.enum([
  'ADMIN',
  'MARKETING_SALES',
  'PROJECT_SETUP',
  'DESIGN_ENGINEERING',
  'PURCHASE_PROCUREMENT',
  'INCOMING_QUALITY',
  'STORES_WAREHOUSE',
  'PRODUCTION_ASSEMBLY',
  'DISPATCH_LOGISTICS',
  'AFTER_SALES'
]);

const authMethodEnum = z.enum(['GOOGLE_ONLY', 'PASSWORD_ONLY', 'BOTH']);
const userStatusEnum = z.enum(['ACTIVE', 'DEACTIVATED']);

export const createUserSchema = z.object({
  body: z.object({
    firstName: z
      .string({ required_error: 'Please enter a first name.' })
      .trim()
      .min(1, 'Please enter a first name.'),
    lastName: z
      .string({ required_error: 'Please enter a last name.' })
      .trim()
      .min(1, 'Please enter a last name.'),
    email: z
      .string({ required_error: 'Please enter a corporate email address.' })
      .trim()
      .email('Please enter a valid corporate email address.')
      .transform((val) => val.toLowerCase()),
    password: z.string().optional(),
    role: z
      .string({ required_error: 'Please select a role for this user.' })
      .uuid('Please select a valid role.'),
    department: departmentEnum,
    plantLocation: z.string().trim().default('Main Works - Unit 1 (Bengaluru)'),
    authMethod: authMethodEnum.default('BOTH'),
    refreshTokenExpiry: z.string().trim().default('7d'),
    isIpRestricted: z.boolean().default(false),
    whitelistedIps: z
      .union([z.array(z.string().trim()), z.string().trim()])
      .optional()
      .transform((val) => {
        if (!val) return [];
        return Array.isArray(val) ? val.filter(Boolean) : [val].filter(Boolean);
      }),
    allowedRoutes: z.array(z.string().trim()).optional().default([])
  })
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format.')
  }),
  body: z.object({
    firstName: z.string().trim().min(1, 'First name cannot be empty.').optional(),
    lastName: z.string().trim().min(1, 'Last name cannot be empty.').optional(),
    role: z.string().uuid('Please select a valid role.').optional(),
    department: departmentEnum.optional(),
    plantLocation: z.string().trim().optional(),
    authMethod: authMethodEnum.optional(),
    password: z.string().optional(),
    refreshTokenExpiry: z.string().trim().optional(),
    isIpRestricted: z.boolean().optional(),
    whitelistedIps: z
      .union([z.array(z.string().trim()), z.string().trim()])
      .optional()
      .transform((val) => {
        if (val === undefined) return undefined;
        return Array.isArray(val) ? val.filter(Boolean) : [val].filter(Boolean);
      }),
    allowedRoutes: z.array(z.string().trim()).optional()
  })
});

export const toggleUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format.')
  }),
  body: z.object({
    status: userStatusEnum.optional()
  })
});
