import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse, errorResponse, success, created } from '../../utils/route-helpers'
import { LoginSchema, RegisterSchema, DeveloperProfileSchema } from '../auth.types'
import { TokenResponseSchema } from '@shared/modules/plugins'
import * as authService from '../services/auth-service'
import { authMiddleware } from '../../middleware/auth'

const registerRoute = createRoute({
  method: 'post',
  path: '/auth/register',
  tags: ['auth'],
  request: {
    body: { content: { 'application/json': { schema: RegisterSchema } } },
  },
  responses: {
    201: successResponse(DeveloperProfileSchema, 'Developer registered'),
    409: errorResponse('Email or username already exists'),
  },
})

const loginRoute = createRoute({
  method: 'post',
  path: '/auth/login',
  tags: ['auth'],
  request: {
    body: { content: { 'application/json': { schema: LoginSchema } } },
  },
  responses: {
    200: successResponse(TokenResponseSchema, 'Login successful'),
    401: errorResponse('Invalid credentials'),
  },
})

const verifyRoute = createRoute({
  method: 'get',
  path: '/auth/verify',
  tags: ['auth'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  responses: {
    200: successResponse(DeveloperProfileSchema, 'Token valid'),
    401: errorResponse('Invalid token'),
  },
})

export const authRoutes = new OpenAPIHono()
  .openapi(registerRoute, async c => {
    const data = c.req.valid('json')
    const profile = await authService.registerDeveloper(data)
    return c.json(created(profile), 201)
  })
  .openapi(loginRoute, async c => {
    const data = c.req.valid('json')
    const result = await authService.loginDeveloper(data)
    return c.json(success(result), 200)
  })
  .openapi(verifyRoute, async c => {
    const user = c.get('authUser')
    return c.json(
      success({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: Date.now(),
      }),
      200
    )
  })
