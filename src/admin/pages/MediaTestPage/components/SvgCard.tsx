import { useState } from 'react'
import { Card, Button, Space, Input, message, Typography } from 'antd'
import { FileCode } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'

const { Paragraph, Text } = Typography

const availableIcons = ['home', 'settings', 'user', 'bell']

export const SvgCard: React.FC = () => {
  const [iconName, setIconName] = useState('home')
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFetch = async () => {
    setLoading(true)
    try {
      const response = await apiClient.api.admin.icon[':name'].$get({
        param: { name: iconName },
      })
      const svg = await response.text()
      setSvgContent(svg)
      message.success('SVG 图标获取成功')
    } catch (error) {
      console.error('Failed to fetch SVG:', error)
      message.error('SVG 图标获取失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <FileCode size={20} />
          <span>SVG 测试 ($svg)</span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Paragraph>
          使用 <Text code>$svg()</Text> 方法获取 SVG 图标，返回{' '}
          <Text code>Promise&lt;string&gt;</Text>。
        </Paragraph>
        <Space wrap>
          {availableIcons.map(icon => (
            <Button
              key={icon}
              type={iconName === icon ? 'primary' : 'default'}
              onClick={() => setIconName(icon)}
            >
              {icon}
            </Button>
          ))}
        </Space>
        <Space>
          <Input
            placeholder="输入图标名称"
            value={iconName}
            onChange={e => setIconName(e.target.value)}
            style={{ width: 200 }}
          />
          <Button type="primary" onClick={handleFetch} loading={loading}>
            获取 SVG
          </Button>
        </Space>
        {svgContent && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">获取结果：</Text>
            <div
              style={{
                marginTop: 8,
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: svgContent }}
                style={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                  borderRadius: 8,
                  padding: 8,
                }}
              />
              <div
                style={{
                  flex: 1,
                  padding: 8,
                  background: '#fff',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  overflow: 'auto',
                  maxHeight: 100,
                }}
              >
                <code>{svgContent}</code>
              </div>
            </div>
          </div>
        )}
      </Space>
    </Card>
  )
}
