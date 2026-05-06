import { describe, it, expect } from 'vitest'
import {
  R2Storage,
  NpmMirrorStorage,
  parsePackageUrl,
  resolveDownloadUrl,
} from '../services/storage-service'

function createMockBucket() {
  const store = new Map<string, ArrayBuffer>()
  return {
    put: async (key: string, data: BodyInit) => {
      store.set(key, data instanceof ArrayBuffer ? data : await new Response(data).arrayBuffer())
    },
    get: async (key: string) => {
      const data = store.get(key)
      if (!data) return null
      return { arrayBuffer: async () => data }
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    _store: store,
  } as unknown as R2Bucket
}

describe('Storage Service', () => {
  describe('R2Storage', () => {
    it('should upload data and return r2:// key', async () => {
      const bucket = createMockBucket()
      const storage = new R2Storage(bucket)
      const result = await storage.upload('test/key.tar.gz', Buffer.from('hello'))
      expect(result).toBe('r2://test/key.tar.gz')
    })

    it('should download previously uploaded data', async () => {
      const bucket = createMockBucket()
      const storage = new R2Storage(bucket)
      await storage.upload('test/data.bin', Buffer.from('payload'))
      const data = await storage.download('test/data.bin')
      expect(data.toString()).toBe('payload')
    })

    it('should throw when downloading non-existent key', async () => {
      const bucket = createMockBucket()
      const storage = new R2Storage(bucket)
      await expect(storage.download('missing')).rejects.toThrow('R2 object not found')
    })

    it('should return r2:// URL via getUrl', () => {
      const bucket = createMockBucket()
      const storage = new R2Storage(bucket)
      expect(storage.getUrl('some/key')).toBe('r2://some/key')
    })

    it('should delete a key', async () => {
      const bucket = createMockBucket()
      const storage = new R2Storage(bucket)
      await storage.upload('to-delete', Buffer.from('x'))
      await storage.delete('to-delete')
      await expect(storage.download('to-delete')).rejects.toThrow()
    })

    it('should upload plugin tarball via static method', async () => {
      const bucket = createMockBucket()
      const result = await R2Storage.uploadPluginTarball(
        bucket,
        'my-plugin',
        '1.0.0',
        Buffer.from('tar')
      )
      expect(result).toBe('r2://plugins/my-plugin/1.0.0.tar.gz')
    })

    it('should generate correct plugin key', () => {
      expect(R2Storage.getPluginKey('slug', '2.0.0')).toBe('plugins/slug/2.0.0.tar.gz')
    })
  })

  describe('NpmMirrorStorage', () => {
    it('should throw on upload attempt', () => {
      const storage = new NpmMirrorStorage()
      expect(() => storage.upload('key', Buffer.from('x'))).toThrow(
        'does not support direct upload'
      )
    })

    it('should throw on delete attempt', async () => {
      const storage = new NpmMirrorStorage()
      await expect(storage.delete('key')).rejects.toThrow('Cannot delete npm packages')
    })

    it('should return key as URL via getUrl', () => {
      const storage = new NpmMirrorStorage()
      expect(storage.getUrl('npm://pkg@1.0.0')).toBe('npm://pkg@1.0.0')
    })

    it('should build correct npm key', () => {
      expect(NpmMirrorStorage.buildKey('mypackage', '1.2.3')).toBe('npm://mypackage@1.2.3')
    })

    it('should build correct tarball URL', () => {
      const url = NpmMirrorStorage.buildTarballUrl('mypackage', '1.0.0')
      expect(url).toBe('https://registry.npmjs.org/mypackage/-/mypackage-1.0.0.tgz')
    })

    it('should handle scoped package tarball URL', () => {
      const url = NpmMirrorStorage.buildTarballUrl('@scope/pkg', '2.0.0')
      expect(url).toContain(encodeURIComponent('@scope/pkg'))
    })
  })

  describe('parsePackageUrl', () => {
    it('should parse npm URL', () => {
      expect(parsePackageUrl('npm://pkg@1.0.0')).toEqual({ type: 'npm', key: 'npm://pkg@1.0.0' })
    })

    it('should parse r2 URL', () => {
      expect(parsePackageUrl('r2://some/key')).toEqual({ type: 'r2', key: 'r2://some/key' })
    })

    it('should return null for unknown scheme', () => {
      expect(parsePackageUrl('https://example.com')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(parsePackageUrl('')).toBeNull()
    })
  })

  describe('resolveDownloadUrl', () => {
    it('should resolve npm URL to tarball URL', () => {
      const url = resolveDownloadUrl('npm://mypackage@1.0.0')
      expect(url).toBe('https://registry.npmjs.org/mypackage/-/mypackage-1.0.0.tgz')
    })

    it('should return null for r2 URL', () => {
      expect(resolveDownloadUrl('r2://plugins/slug/1.0.0.tar.gz')).toBeNull()
    })

    it('should return null for unknown URL', () => {
      expect(resolveDownloadUrl('https://example.com/file.tgz')).toBeNull()
    })
  })
})
