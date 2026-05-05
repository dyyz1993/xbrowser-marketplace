import { describe, it, expect, beforeEach } from 'vitest'
import { useCaptchaStore } from '../captchaStore'

describe('useCaptchaStore', () => {
  beforeEach(() => {
    useCaptchaStore.setState({
      isOpen: false,
      type: 'image',
      captchaUrl: '/api/captcha',
      resolveCaptcha: null,
    })
  })

  it('should have correct initial state', () => {
    const state = useCaptchaStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.type).toBe('image')
    expect(state.captchaUrl).toBe('/api/captcha')
    expect(state.resolveCaptcha).toBeNull()
  })

  it('should set isOpen and type on show', async () => {
    const promise = useCaptchaStore.getState().show({ type: 'iframe', captchaUrl: '/custom' })

    const state = useCaptchaStore.getState()
    expect(state.isOpen).toBe(true)
    expect(state.type).toBe('iframe')
    expect(state.captchaUrl).toBe('/custom')
    expect(state.resolveCaptcha).toBeInstanceOf(Function)

    useCaptchaStore.getState().resolve(true)
    const result = await promise
    expect(result).toBe(true)
  })

  it('should use defaults when options not provided', () => {
    useCaptchaStore.getState().show({})

    const state = useCaptchaStore.getState()
    expect(state.type).toBe('image')
    expect(state.captchaUrl).toBe('/api/captcha')
  })

  it('should reset state on close', async () => {
    const promise = useCaptchaStore.getState().show({ type: 'iframe' })
    expect(useCaptchaStore.getState().isOpen).toBe(true)

    useCaptchaStore.getState().close()

    const state = useCaptchaStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.resolveCaptcha).toBeNull()

    const result = await promise
    expect(result).toBe(false)
  })

  it('should resolve with success on resolve(true)', async () => {
    const promise = useCaptchaStore.getState().show({ type: 'image' })
    useCaptchaStore.getState().resolve(true)

    const result = await promise
    expect(result).toBe(true)
    expect(useCaptchaStore.getState().isOpen).toBe(false)
    expect(useCaptchaStore.getState().resolveCaptcha).toBeNull()
  })

  it('should resolve with false on resolve(false)', async () => {
    const promise = useCaptchaStore.getState().show({ type: 'image' })
    useCaptchaStore.getState().resolve(false)

    const result = await promise
    expect(result).toBe(false)
  })
})
