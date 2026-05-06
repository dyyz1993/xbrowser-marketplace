import { useState } from 'react'
import { Card, Button, Space, message, Typography, Progress } from 'antd'
import { Download } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'
import {
  TOTAL_LINES,
  supportsFileSystemAccess,
  readStreamToLines,
  readStreamToFileSystem,
  readStreamToBlob,
  saveBlobAsFile,
} from '../utils/stream-download'

const { Paragraph, Text } = Typography

export const DownloadCard: React.FC = () => {
  const [streamProgress, setStreamProgress] = useState(0)
  const [streamLines, setStreamLines] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isDirectDownloading, setIsDirectDownloading] = useState(false)
  const [directProgress, setDirectProgress] = useState(0)
  const [directSpeed, setDirectSpeed] = useState('')

  const handleStreamDownload = async () => {
    setIsStreaming(true)
    setStreamProgress(0)
    setStreamLines([])

    try {
      const response = await apiClient.api.admin.todos.export.stream.$get()
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      await readStreamToLines(reader, (lineCount, line) => {
        setStreamLines(prev => [...prev, line])
        setStreamProgress(Math.round((lineCount / TOTAL_LINES) * 100))
      })

      message.success('流式导出完成！')
    } catch (error) {
      console.error('Failed to stream download:', error)
      message.error('流式导出失败')
    } finally {
      setIsStreaming(false)
    }
  }

  const handleBrowserStreamDownload = async () => {
    try {
      const win = window as unknown as {
        showSaveFilePicker: (options: {
          suggestedName: string
          types: Array<{ description: string; accept: Record<string, string[]> }>
        }) => Promise<{
          createWritable: () => Promise<{
            write: (data: Uint8Array) => Promise<void>
            close: () => Promise<void>
          }>
        }>
      }
      const handle = await win.showSaveFilePicker({
        suggestedName: 'todos-stream.csv',
        types: [
          {
            description: 'CSV File',
            accept: { 'text/csv': ['.csv'] },
          },
        ],
      })

      const writable = await handle.createWritable()
      setIsStreaming(true)
      setStreamProgress(0)
      setStreamLines([])

      const response = await apiClient.api.admin.todos.export.stream.$get()
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      await readStreamToFileSystem(reader, writable, {
        onLine: line => setStreamLines(prev => [...prev, line]),
        onProgress: progress => setStreamProgress(progress),
      })

      message.success('流式导出完成！请在浏览器下载管理器中查看进度')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        message.info('用户取消了保存')
      } else {
        console.error('Failed to stream download:', error)
        message.error('流式导出失败')
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const handleDirectDownload = async () => {
    setIsDirectDownloading(true)
    setDirectProgress(0)
    setDirectSpeed('')

    try {
      const response = await apiClient.api.admin.todos.export.$get()
      const contentLength = parseInt(response.headers.get('Content-Length') || '0')
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const blob = await readStreamToBlob(reader, contentLength, {
        onProgress: progress => setDirectProgress(progress),
        onSpeed: speed => setDirectSpeed(speed),
      })

      saveBlobAsFile(blob, 'todos.csv')
      message.success('文件下载成功')
    } catch (error) {
      console.error('Failed to download:', error)
      message.error('文件下载失败')
    } finally {
      setIsDirectDownloading(false)
    }
  }

  const handleBrowserNativeDownload = async () => {
    try {
      const response = await apiClient.api.admin.todos.export.token.$post()
      const data = await response.json()

      if (!data.success || !data.data) {
        throw new Error('Failed to get download token')
      }

      const { downloadUrl } = data.data
      window.open(downloadUrl, '_blank')
      message.success('下载已开始，请在浏览器下载管理器中查看进度。关闭此页面不会中断下载！')
    } catch (error) {
      console.error('Failed to start download:', error)
      message.error('启动下载失败')
    }
  }

  return (
    <Card
      title={
        <Space>
          <Download size={20} />
          <span>文件下载测试</span>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Paragraph>对比三种下载方式：</Paragraph>

        <Space wrap>
          <Button
            type="primary"
            icon={<Download size={16} />}
            onClick={handleDirectDownload}
            loading={isDirectDownloading}
          >
            直接下载 (页面内进度)
          </Button>
          <Button
            type="default"
            icon={<Download size={16} />}
            onClick={handleBrowserNativeDownload}
          >
            浏览器原生下载 (关闭页面继续)
          </Button>
          {supportsFileSystemAccess ? (
            <Button
              type="default"
              icon={<Download size={16} />}
              onClick={handleBrowserStreamDownload}
              loading={isStreaming}
            >
              流式下载 (选择保存位置)
            </Button>
          ) : (
            <Button
              type="default"
              icon={<Download size={16} />}
              onClick={handleStreamDownload}
              loading={isStreaming}
            >
              流式下载 (页面内进度)
            </Button>
          )}
        </Space>

        {isDirectDownloading && (
          <div style={{ marginTop: 16 }}>
            <Progress percent={directProgress} status="active" />
            <Text type="secondary">下载速度: {directSpeed || '计算中...'}</Text>
          </div>
        )}

        {isStreaming && (
          <div style={{ marginTop: 16 }}>
            <Progress percent={streamProgress} status="active" />
            <Text type="secondary">
              正在接收数据... {streamLines.length}/{TOTAL_LINES} 行
            </Text>
          </div>
        )}

        {streamLines.length > 0 && !isStreaming && !supportsFileSystemAccess && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">接收到的数据 ({streamLines.length} 行)：</Text>
            <div
              style={{
                marginTop: 8,
                padding: 12,
                background: '#f5f5f5',
                borderRadius: 8,
                fontFamily: 'monospace',
                fontSize: 12,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {streamLines.map((line, i) => (
                <div key={i} style={{ padding: '2px 0' }}>
                  <Text type="secondary">{i + 1}:</Text> {line}
                </div>
              ))}
            </div>
            <Button
              type="link"
              onClick={() => {
                const csv = streamLines.join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                saveBlobAsFile(blob, 'todos-stream.csv')
              }}
            >
              保存为文件
            </Button>
          </div>
        )}

        {supportsFileSystemAccess && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              💡 流式下载使用 File System Access API，会在浏览器下载管理器中显示实时进度
            </Text>
          </div>
        )}
      </Space>
    </Card>
  )
}
