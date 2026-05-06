export interface PluginItem {
  id: string
  name: string
  slug: string
  description: string
  authorId: string
  authorName: string
  version: string
  status: string
  downloadCount: number
  viewCount: number
  featured: boolean
  screenshotUrl: string | null
  tags: string[]
  siteUrls: string[]
  commands: string[]
  readme: string | null
  createdAt: number
  updatedAt: number
}

export const statusColorMap: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
}

export const statusLabelMap: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}
