import { z } from '@hono/zod-openapi'

export const LoginSchema = z
  .object({
    account: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(6),
  })
  .refine(data => data.account || data.email, {
    message: 'account or email is required',
  })

export const RegisterSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
})

export const DeveloperProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.number(),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type DeveloperProfile = z.infer<typeof DeveloperProfileSchema>
