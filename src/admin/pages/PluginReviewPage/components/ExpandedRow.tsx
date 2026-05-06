import { Tag, Typography, Descriptions } from 'antd'
import type { PluginItem } from '../types'

export const ExpandedRow: React.FC<{ record: PluginItem }> = ({ record }) => (
  <Descriptions size="small" column={2} bordered>
    <Descriptions.Item label="Description" span={2}>
      {record.description}
    </Descriptions.Item>
    <Descriptions.Item label="Tags">
      {record.tags.map(t => (
        <Tag key={t}>{t}</Tag>
      ))}
    </Descriptions.Item>
    <Descriptions.Item label="Commands">
      {record.commands.map(c => (
        <Tag key={c} color="blue">{c}</Tag>
      ))}
    </Descriptions.Item>
    <Descriptions.Item label="Site URLs" span={2}>
      {record.siteUrls.map(s => (
        <Tag key={s} color="geekblue">{s}</Tag>
      ))}
    </Descriptions.Item>
    {record.readme && (
      <Descriptions.Item label="README" span={2}>
        <Typography.Paragraph
          ellipsis={{ rows: 6, expandable: true, symbol: 'more' }}
          className="mb-0"
        >
          <pre className="whitespace-pre-wrap text-xs">{record.readme}</pre>
        </Typography.Paragraph>
      </Descriptions.Item>
    )}
  </Descriptions>
)
