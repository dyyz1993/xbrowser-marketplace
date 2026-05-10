import { Card, Form, Input, Button, Switch, Divider, message, Spin } from 'antd'
import { useEffect, useState } from 'react'
import { apiClient } from '../services/apiClient'

interface SettingsFormValues {
  siteName?: string
  siteDescription?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

export const SettingsPage: React.FC = () => {
  const [form] = Form.useForm<SettingsFormValues>()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await apiClient.api.admin.settings.$get()
      const result = await response.json()
      if (result.success) {
        const map: Record<string, string> = {}
        for (const s of result.data) {
          map[s.key] = s.value
        }
        form.setFieldsValue({
          siteName: map.siteName || '',
          siteDescription: map.siteDescription || '',
          emailNotifications: map.emailNotifications !== 'false',
          pushNotifications: map.pushNotifications === 'true',
        })
      }
    } catch {
      message.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const response = await apiClient.api.admin.settings.$put({
        json: {
          items: [
            { key: 'siteName', value: values.siteName || '' },
            { key: 'siteDescription', value: values.siteDescription || '' },
            { key: 'emailNotifications', value: String(values.emailNotifications ?? true) },
            { key: 'pushNotifications', value: String(values.pushNotifications ?? false) },
          ],
        },
      })
      const result = await response.json()
      if (result.success) {
        message.success('Settings saved successfully!')
      } else {
        message.error('Failed to save settings')
      }
    } catch {
      message.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <Card title="General Settings" className="mb-6">
        <Form form={form} layout="vertical">
          <Form.Item label="Site Name" name="siteName">
            <Input placeholder="Enter site name" />
          </Form.Item>
          <Form.Item label="Site Description" name="siteDescription">
            <Input.TextArea rows={4} placeholder="Enter site description" />
          </Form.Item>
        </Form>
      </Card>

      <Card title="Notification Settings" className="mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-500">
                Receive email notifications for important updates
              </p>
            </div>
            <Form form={form} layout="vertical">
              <Form.Item name="emailNotifications" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </Form>
          </div>
          <Divider />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-gray-500">Receive push notifications in browser</p>
            </div>
            <Form form={form} layout="vertical">
              <Form.Item name="pushNotifications" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </Form>
          </div>
        </div>
      </Card>

      <Card title="Security Settings">
        <Form form={form} layout="vertical">
          <Form.Item label="Current Password" name="currentPassword">
            <Input.Password placeholder="Enter current password" />
          </Form.Item>
          <Form.Item label="New Password" name="newPassword">
            <Input.Password placeholder="Enter new password" />
          </Form.Item>
          <Form.Item label="Confirm New Password" name="confirmPassword">
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>
        </Form>
      </Card>

      <div className="mt-6">
        <Button type="primary" onClick={handleSave} loading={saving} size="large">
          Save Changes
        </Button>
      </div>
    </div>
  )
}
