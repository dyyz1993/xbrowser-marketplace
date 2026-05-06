import { Card, Space, Divider, Typography } from 'antd'
import { AvatarCard } from './components/AvatarCard'
import { SvgCard } from './components/SvgCard'
import { DownloadCard } from './components/DownloadCard'

const { Title, Paragraph, Text } = Typography

export const MediaTestPage: React.FC = () => (
  <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
    <Title level={2}>媒体类型测试</Title>
    <Paragraph>
      此页面演示如何使用 <Text code>$image()</Text>、<Text code>$svg()</Text> 和流式下载方法。
    </Paragraph>

    <Divider />

    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <AvatarCard />
      <SvgCard />
      <DownloadCard />

      <Card title="代码示例">
        <pre
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          {`// 获取图片 (返回 Blob)
const blob = await apiClient.api.admin.avatar[':id'].$image({
  param: { id: 'test-user' },
})
const imageUrl = URL.createObjectURL(blob)

// 获取 SVG (返回 string)
const svgString = await apiClient.api.admin.icon[':name'].$svg({
  param: { name: 'home' },
})

// 流式下载 - 使用 File System Access API (浏览器原生进度)
const handle = await window.showSaveFilePicker({
  suggestedName: 'todos.csv',
  types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }],
})
const writable = await handle.createWritable()

const response = await apiClient.api.admin.todos.export.stream.$get()
const reader = response.body?.getReader()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  await writable.write(value)  // 流式写入，浏览器显示进度
}

await writable.close()`}
        </pre>
      </Card>
    </Space>
  </div>
)
