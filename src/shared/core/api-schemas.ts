/**
 * @framework-baseline 295608e4d0c3a8de
 *
 * 此文件属于框架层代码。如需修改，请添加以下说明：
 *
 * @framework-modify
 * @reason [必填] 修改原因
 * @impact [必填] 影响范围
 */

import { z } from '@hono/zod-openapi'

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: z.string(),
  })

export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
})

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  status: z.number().optional(),
  details: z.array(ApiErrorDetailSchema).optional(),
  timestamp: z.string().optional(),
})

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([ApiSuccessSchema(dataSchema), ApiErrorSchema])

export type ApiSuccess<T> = { success: true; data: T; timestamp: string }
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>
export type ApiResponse<T> = ApiSuccess<T> | ApiError
