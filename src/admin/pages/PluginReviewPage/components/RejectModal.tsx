import { Modal, Input } from 'antd'

export const RejectModal: React.FC<{
  target: { slug: string; name: string } | null
  reason: string
  onReasonChange: (val: string) => void
  onOk: () => void
  onCancel: () => void
  loading: boolean
}> = ({ target, reason, onReasonChange, onOk, onCancel, loading }) => (
  <Modal
    title={`Reject: ${target?.name || ''}`}
    open={!!target}
    onOk={onOk}
    onCancel={onCancel}
    confirmLoading={loading}
    okText="Reject"
    okButtonProps={{ danger: true, 'data-testid': 'confirm-reject-button' }}
    data-testid="reject-reason-dialog"
  >
    <Input.TextArea
      value={reason}
      onChange={e => onReasonChange(e.target.value)}
      placeholder="Rejection reason (optional)"
      rows={3}
      data-testid="reject-reason-input"
    />
  </Modal>
)
