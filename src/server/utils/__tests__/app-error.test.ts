import { describe, it, expect } from 'vitest'
import {
  AppError,
  ErrorCode,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessError,
  RateLimitError,
  SystemError,
  toAppError,
  tryCatch,
} from '../app-error'

describe('AppError', () => {
  it('should create with correct properties', () => {
    const err = new AppError({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'test',
      statusCode: 400,
    })
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR)
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('test')
    expect(err.name).toBe('AppError')
    expect(err.logLevel).toBe('warn')
    expect(err.timestamp).toBeTruthy()
  })

  it('should return correct toJSON shape', () => {
    const err = new ValidationError('bad input', [{ field: 'name', message: 'required' }])
    const json = err.toJSON()
    expect(json).toMatchObject({
      success: false,
      error: 'bad input',
      code: ErrorCode.VALIDATION_ERROR,
      status: 400,
      details: [{ field: 'name', message: 'required' }],
    })
  })

  it('isAppError should detect AppError instances', () => {
    const appErr = new ValidationError('test')
    expect(AppError.isAppError(appErr)).toBe(true)
    expect(AppError.isAppError(new Error('plain'))).toBe(false)
    expect(AppError.isAppError('string')).toBe(false)
  })
})

describe('Error subclasses', () => {
  it('ValidationError should have statusCode 400', () => {
    const err = new ValidationError('invalid')
    expect(err.statusCode).toBe(400)
    expect(err.name).toBe('ValidationError')
  })

  it('AuthenticationError should have statusCode 401', () => {
    expect(new AuthenticationError().statusCode).toBe(401)
    expect(AuthenticationError.tokenExpired().code).toBe(ErrorCode.TOKEN_EXPIRED)
    expect(AuthenticationError.tokenInvalid().code).toBe(ErrorCode.TOKEN_INVALID)
    expect(AuthenticationError.tokenMissing().code).toBe(ErrorCode.TOKEN_MISSING)
  })

  it('AuthorizationError should have statusCode 403', () => {
    expect(new AuthorizationError().statusCode).toBe(403)
    const perm = AuthorizationError.permissionDenied('admin:delete')
    expect(perm.message).toContain('admin:delete')
    expect(perm.details).toHaveLength(1)
  })

  it('NotFoundError should have statusCode 404', () => {
    expect(new NotFoundError('User', '123').statusCode).toBe(404)
    expect(new NotFoundError('User', '123').message).toBe('User not found: 123')
    expect(new NotFoundError('User').message).toBe('User not found')
    expect(NotFoundError.user('u1').message).toContain('User')
  })

  it('ConflictError should have statusCode 409', () => {
    const dup = ConflictError.duplicateEntry('email', 'a@b.com')
    expect(dup.statusCode).toBe(409)
    expect(dup.details?.[0]?.field).toBe('email')
  })

  it('BusinessError should have statusCode 422', () => {
    expect(new BusinessError('invalid state').statusCode).toBe(422)
    const state = BusinessError.invalidState('pending', ['active'])
    expect(state.message).toContain('Invalid state transition')
    expect(state.code).toBe(ErrorCode.INVALID_STATE)
  })

  it('RateLimitError should have statusCode 429', () => {
    expect(new RateLimitError().statusCode).toBe(429)
    expect(new RateLimitError('slow down', 60).retryAfter).toBe(60)
  })

  it('SystemError should have statusCode 500', () => {
    expect(new SystemError().statusCode).toBe(500)
    const dbErr = SystemError.databaseError(new Error('connection lost'))
    expect(dbErr.cause).toBeInstanceOf(Error)
    expect(SystemError.serviceUnavailable('redis').message).toContain('redis')
  })
})

describe('toAppError', () => {
  it('should return same AppError if already one', () => {
    const original = new ValidationError('test')
    expect(toAppError(original)).toBe(original)
  })

  it('should wrap generic Error into SystemError', () => {
    const result = toAppError(new Error('boom'))
    expect(result).toBeInstanceOf(SystemError)
    expect(result.message).toBe('boom')
  })

  it('should wrap non-Error into SystemError', () => {
    const result = toAppError('string error')
    expect(result).toBeInstanceOf(SystemError)
    expect(result.message).toBe('string error')
  })
})

describe('tryCatch', () => {
  it('should return result on success', async () => {
    const result = await tryCatch(() => Promise.resolve(42))
    expect(result).toBe(42)
  })

  it('should convert error with default mapper', async () => {
    await expect(tryCatch(() => Promise.reject(new Error('fail')))).rejects.toBeInstanceOf(SystemError)
  })

  it('should use custom error mapper', async () => {
    await expect(
      tryCatch(() => Promise.reject('custom'), () => new ValidationError('mapped'))
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
