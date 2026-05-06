import { useState } from 'react'
import { Card, Button, Space, Input, message, Image, Typography } from 'antd'
import { ImageIcon } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'

const { Paragraph, Text } = Typography

export const AvatarCard: React.FC = () => {
  const [avatarId, setAvatarId] = useState('test-user')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFetch = async () => {
    setLoading(true)
    try {
      const response = await apiClient.api.admin.avatar[':id'].$get({
        param: { id: avatarId },
      })
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setAvatarUrl(url)
      message.success('头像获取成功')
    } catch (error) {
      console.error('Failed to fetch avatar:', error)
      message.error('头像获取失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <ImageIcon size={20} />
          <span>图片测试 ($image)</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Paragraph>
          使用 <Text code>$image()</Text> 方法获取图片，返回{' '}
          <Text code>Promise&lt;Blob&gt;</Text>。
        </Paragraph>
        <Space>
          <Input
            placeholder="输入头像 ID"
            value={avatarId}
            onChange={e => setAvatarId(e.target.value)}
            style={{ width: 200 }}
          />
          <Button type="primary" onClick={handleFetch} loading={loading}>
            获取头像
          </Button>
        </Space>
        {avatarUrl && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">获取结果：</Text>
            <div style={{ marginTop: 8 }}>
              <Image
                src={avatarUrl}
                alt="Avatar"
                width={128}
                height={128}
                style={{ borderRadius: '50%', border: '2px solid #1890ff' }}
              />
            </div>
          </div>
        )}
      </Space>
    </Card>
  )
}
