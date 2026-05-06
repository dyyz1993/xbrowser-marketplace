import { Modal, Descriptions, Tag } from 'antd'
import type { PluginItem } from '../types'
import { statusColorMap, statusLabelMap } from '../types'

export const DetailModal: React.FC<{
  plugin: PluginItem | null
  onClose: () => void
}> = ({ plugin, onClose }) => (
  <Modal
    title={`Plugin Detail: ${plugin?.name || ''}`}
    open={!!plugin}
    onCancel={onClose}
    footer={null}
    width={700}
  >
    {plugin && (
      <Descriptions column={2} bordered>
        <Descriptions.Item label="Name">{plugin.name}</Descriptions.Item>
        <Descriptions.Item label="Slug">{plugin.slug}</Descriptions.Item>
        <Descriptions.Item label="Author">{plugin.authorName}</Descriptions.Item>
        <Descriptions.Item label="Version">{plugin.version}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={statusColorMap[plugin.status]}>
            {statusLabelMap[plugin.status]}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Downloads">{plugin.downloadCount}</Descriptions.Item>
        <Descriptions.Item label="Description" span={2}>
          {plugin.description}
        </Descriptions.Item>
        <Descriptions.Item label="Tags" span={2}>
          {plugin.tags.map(t => (
            <Tag key={t}>{t}</Tag>
          ))}
        </Descriptions.Item>
        <Descriptions.Item label="Commands" span={2}>
          {plugin.commands.map(c => (
            <Tag key={c} color="blue">{c}</Tag>
          ))}
        </Descriptions.Item>
        {plugin.readme && (
          <Descriptions.Item label="README" span={2}>
            <pre className="whitespace-pre-wrap text-xs max-h-64 overflow-auto">
              {plugin.readme}
            </pre>
          </Descriptions.Item>
        )}
      </Descriptions>
    )}
  </Modal>
)
