import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Package, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@client/stores/authStore'
import { apiClient } from '@client/services/apiClient'

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

interface FormState {
  name: string
  slug: string
  version: string
  description: string
  tags: string
  file: File | null
}

interface FormErrors {
  name?: string
  slug?: string
  version?: string
  description?: string
}

export const PublishPage: React.FC = () => {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>({
    name: '',
    slug: '',
    version: '1.0.0',
    description: '',
    tags: '',
    file: null,
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const updateField = useCallback((field: keyof FormState, value: string | File | null) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }, [])

  const handleNameChange = useCallback((value: string) => {
    setForm(prev => ({ ...prev, name: value }))
    setErrors(prev => ({ ...prev, name: undefined }))
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setForm(prev => ({ ...prev, slug }))
  }, [])

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.slug.trim()) newErrors.slug = 'Slug is required'
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      newErrors.slug = 'Slug must be lowercase with hyphens only'
    if (!form.version.trim()) newErrors.version = 'Version is required'
    else if (!/^\d+\.\d+\.\d+$/.test(form.version))
      newErrors.version = 'Version must be semver (x.y.z)'
    if (!form.description.trim()) newErrors.description = 'Description is required'
    else if (form.description.trim().length < 10)
      newErrors.description = 'Description must be at least 10 characters'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [form])

  const submitPublish = useCallback(async () => {
    const metadata = {
      name: form.name,
      slug: form.slug,
      version: form.version,
      description: form.description,
      tags: form.tags
        ? form.tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
        : [],
      sites: [] as string[],
      storageType: form.file ? ('r2' as const) : ('npm' as const),
    }

    const nativeForm = new window.FormData()
    nativeForm.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    )

    if (form.file) {
      nativeForm.append('files', form.file)
    }

    const res = await apiClient.api.plugins.publish.$post({
      form: nativeForm as unknown as Record<string, string | Blob>,
    })

    return await res.json()
  }, [form])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validate()) return

      setStatus('submitting')
      setErrorMessage('')

      try {
        const result = await submitPublish()

        if (result.success) {
          setStatus('success')
        } else {
          setStatus('error')
          setErrorMessage(result.error || 'Unknown error')
        }
      } catch (err) {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Failed to submit plugin')
      }
    },
    [validate, submitPublish]
  )

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
        <p className="text-gray-600 mb-6">You need to be logged in to publish plugins.</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Home
        </a>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div
        className="max-w-2xl mx-auto px-4 py-16 text-center"
        data-testid="publish-success-message"
      >
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Plugin Submitted!</h2>
        <p className="text-gray-600 mb-6">
          Your plugin &quot;{form.name}&quot; has been submitted for review. An admin will review
          and approve it soon.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setStatus('idle')
              setForm({
                name: '',
                slug: '',
                version: '1.0.0',
                description: '',
                tags: '',
                file: null,
              })
            }}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            data-testid="publish-another-button"
          >
            Publish Another
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="publish-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Publish Plugin</h1>
        <p className="text-gray-600 mt-2">Submit your plugin to the marketplace for review.</p>
      </div>

      {status === 'error' && (
        <div
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
          data-testid="publish-error-message"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Submission failed</p>
            <p className="text-red-600 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" data-testid="publish-form">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="plugin-name">
            Plugin Name <span className="text-red-500">*</span>
          </label>
          <input
            id="plugin-name"
            type="text"
            value={form.name}
            onChange={e => handleNameChange(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="My Awesome Plugin"
            data-testid="plugin-name-input"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="plugin-slug">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            id="plugin-slug"
            type="text"
            value={form.slug}
            onChange={e => updateField('slug', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.slug ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="my-awesome-plugin"
            data-testid="plugin-slug-input"
          />
          {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="plugin-version">
            Version <span className="text-red-500">*</span>
          </label>
          <input
            id="plugin-version"
            type="text"
            value={form.version}
            onChange={e => updateField('version', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.version ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="1.0.0"
            data-testid="plugin-version-input"
          />
          {errors.version && <p className="mt-1 text-sm text-red-600">{errors.version}</p>}
        </div>

        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1"
            htmlFor="plugin-description"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="plugin-description"
            value={form.description}
            onChange={e => updateField('description', e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Describe your plugin (minimum 10 characters)"
            rows={4}
            data-testid="plugin-description-input"
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="plugin-tags">
            Tags
          </label>
          <input
            id="plugin-tags"
            type="text"
            value={form.tags}
            onChange={e => updateField('tags', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="automation, scraping, testing (comma-separated)"
            data-testid="plugin-tags-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plugin Tarball (optional)
          </label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            data-testid="file-drop-zone"
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">
              {form.file ? form.file.name : 'Click to upload a tarball file'}
            </p>
            <p className="text-gray-400 text-sm mt-1">.tar.gz, .zip files supported</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tar.gz,.tgz,.zip"
              onChange={e => {
                const file = e.target.files?.[0] ?? null
                updateField('file', file)
              }}
              className="hidden"
              data-testid="file-input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          data-testid="publish-submit-button"
        >
          {status === 'submitting' ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Submitting...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Submit for Review
            </>
          )}
        </button>
      </form>
    </div>
  )
}
