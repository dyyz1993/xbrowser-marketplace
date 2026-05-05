const now = new Date();

export const seedCategories = [
  {
    id: 'cat_search-engines',
    name: 'Search Engines',
    slug: 'search-engines',
    description: 'Search engine integration and data extraction plugins',
    icon: 'search',
    sortOrder: 1,
  },
  {
    id: 'cat_social-media',
    name: 'Social Media',
    slug: 'social-media',
    description: 'Social media platform automation and data plugins',
    icon: 'share-2',
    sortOrder: 2,
  },
  {
    id: 'cat_developer-tools',
    name: 'Developer Tools',
    slug: 'developer-tools',
    description: 'Developer productivity and platform management plugins',
    icon: 'code',
    sortOrder: 3,
  },
  {
    id: 'cat_web-automation',
    name: 'Web Automation',
    slug: 'web-automation',
    description: 'Generic web automation and scraping plugins',
    icon: 'bot',
    sortOrder: 4,
  },
  {
    id: 'cat_ecommerce',
    name: 'E-Commerce',
    slug: 'ecommerce',
    description: 'E-commerce platform integration and monitoring plugins',
    icon: 'shopping-cart',
    sortOrder: 5,
  },
  {
    id: 'cat_data-extraction',
    name: 'Data Extraction',
    slug: 'data-extraction',
    description: 'Data extraction and transformation plugins',
    icon: 'database',
    sortOrder: 6,
  },
];

export const seedPlugins = [
  {
    plugin: {
      id: 'plugin_baidu',
      name: 'Baidu Search',
      slug: 'baidu',
      description:
        'Search Baidu, get hot search trends, auto-suggestions, and news headlines with structured data extraction.',
      readme: `# Baidu Search Plugin

## Commands

### search
Search Baidu and return structured results.

### hotsearch
Get current Baidu hot search trends.

### suggest
Get Baidu search auto-suggestions for a keyword.

### news
Fetch Baidu news headlines with filtering support.

## Sites
- baidu.com
`,
      authorId: 'author_dyyz1993',
      authorName: 'dyyz1993',
      repositoryUrl: 'https://github.com/dyyz1993/xbrowser-plugins',
      homepageUrl: null,
      npmPackage: null,
      license: 'MIT',
      version: '1.0.0',
      status: 'approved' as const,
      downloadCount: 256,
      viewCount: 1820,
      featured: true,
      screenshotUrl: null,
      siteUrls: JSON.stringify(['baidu.com']),
      tags: JSON.stringify(['search', 'chinese', 'news']),
      commands: JSON.stringify(['search', 'hotsearch', 'suggest', 'news']),
      createdAt: now,
      updatedAt: now,
    },
    versions: [
      {
        id: 'pver_baidu_1.0.0',
        pluginId: 'plugin_baidu',
        version: '1.0.0',
        changelog: 'Initial release with search, hotsearch, suggest, and news commands.',
        packageUrl: null,
        fileSize: null,
        checksum: null,
        status: 'approved' as const,
        publishedAt: now,
      },
    ],
    categoryIds: ['cat_search-engines'],
  },
  {
    plugin: {
      id: 'plugin_douyin',
      name: 'Douyin Data',
      slug: 'douyin',
      description:
        'Extract data from Douyin (TikTok China): video info, user profiles, AI summaries, comments, and more.',
      readme: `# Douyin Data Plugin

## Commands

### ai-summary
Get AI-generated summary of a Douyin video.

### user-info
Extract user profile information.

### video-info
Get detailed video information including stats.

### videos
List videos from a user or topic.

### profile
Extract full user profile with statistics.

### detail
Get detailed video data with all metadata.

### comments
Extract comments from a video.

## Sites
- douyin.com
`,
      authorId: 'author_dyyz1993',
      authorName: 'dyyz1993',
      repositoryUrl: 'https://github.com/dyyz1993/xbrowser-plugins',
      homepageUrl: null,
      npmPackage: null,
      license: 'MIT',
      version: '1.0.0',
      status: 'approved' as const,
      downloadCount: 189,
      viewCount: 1340,
      featured: true,
      screenshotUrl: null,
      siteUrls: JSON.stringify(['douyin.com']),
      tags: JSON.stringify(['social-media', 'video', 'data-extraction']),
      commands: JSON.stringify([
        'ai-summary',
        'user-info',
        'video-info',
        'videos',
        'profile',
        'detail',
        'comments',
      ]),
      createdAt: now,
      updatedAt: now,
    },
    versions: [
      {
        id: 'pver_douyin_1.0.0',
        pluginId: 'plugin_douyin',
        version: '1.0.0',
        changelog: 'Initial release with AI summary, user info, video info, and comments extraction.',
        packageUrl: null,
        fileSize: null,
        checksum: null,
        status: 'approved' as const,
        publishedAt: now,
      },
    ],
    categoryIds: ['cat_social-media', 'cat_data-extraction'],
  },
  {
    plugin: {
      id: 'plugin_github',
      name: 'GitHub SEO',
      slug: 'github-seo',
      description:
        'Automate GitHub profile management: update profile, add social links, create gists for SEO optimization.',
      readme: `# GitHub SEO Plugin

## Commands

### update-profile
Update GitHub profile information (bio, company, location, etc.).

### add-social-link
Add a social link to your GitHub profile.

### create-gist
Create a GitHub gist programmatically.

### get-profile
Get GitHub user profile data.

## Sites
- github.com
`,
      authorId: 'author_dyyz1993',
      authorName: 'dyyz1993',
      repositoryUrl: 'https://github.com/dyyz1993/xbrowser-plugins',
      homepageUrl: null,
      npmPackage: null,
      license: 'MIT',
      version: '1.0.0',
      status: 'approved' as const,
      downloadCount: 142,
      viewCount: 980,
      featured: false,
      screenshotUrl: null,
      siteUrls: JSON.stringify(['github.com']),
      tags: JSON.stringify(['developer-tools', 'seo', 'profile']),
      commands: JSON.stringify(['update-profile', 'add-social-link', 'create-gist', 'get-profile']),
      createdAt: now,
      updatedAt: now,
    },
    versions: [
      {
        id: 'pver_github_1.0.0',
        pluginId: 'plugin_github',
        version: '1.0.0',
        changelog: 'Initial release with profile management and gist creation.',
        packageUrl: null,
        fileSize: null,
        checksum: null,
        status: 'approved' as const,
        publishedAt: now,
      },
    ],
    categoryIds: ['cat_developer-tools'],
  },
  {
    plugin: {
      id: 'plugin_web-automation',
      name: 'Web Automation',
      slug: 'web-automation',
      description:
        'Generic web automation toolkit: data extraction, pagination, form filling, and screenshot capture for any website.',
      readme: `# Web Automation Plugin

## Commands

### extract
Extract structured data from any webpage using CSS selectors.

### paginate
Automatically navigate through paginated content and collect data.

### fill-and-submit
Fill out and submit web forms programmatically.

### screenshot
Capture screenshots of webpages or specific elements.

## Sites
- Generic (works with any website)
`,
      authorId: 'author_dyyz1993',
      authorName: 'dyyz1993',
      repositoryUrl: 'https://github.com/dyyz1993/xbrowser-plugins',
      homepageUrl: null,
      npmPackage: null,
      license: 'MIT',
      version: '1.0.0',
      status: 'approved' as const,
      downloadCount: 310,
      viewCount: 2450,
      featured: true,
      screenshotUrl: null,
      siteUrls: JSON.stringify(['*']),
      tags: JSON.stringify(['automation', 'scraping', 'forms']),
      commands: JSON.stringify(['extract', 'paginate', 'fill-and-submit', 'screenshot']),
      createdAt: now,
      updatedAt: now,
    },
    versions: [
      {
        id: 'pver_web-automation_1.0.0',
        pluginId: 'plugin_web-automation',
        version: '1.0.0',
        changelog: 'Initial release with extract, paginate, fill-and-submit, and screenshot commands.',
        packageUrl: null,
        fileSize: null,
        checksum: null,
        status: 'approved' as const,
        publishedAt: now,
      },
    ],
    categoryIds: ['cat_web-automation'],
  },
];

export function buildSeedData() {
  const allPlugins = seedPlugins.map((s) => s.plugin);
  const allVersions = seedPlugins.flatMap((s) => s.versions);
  const allCategoryMappings = seedPlugins.flatMap((s) =>
    s.categoryIds.map((categoryId) => ({
      pluginId: s.plugin.id,
      categoryId,
    }))
  );

  return {
    categories: seedCategories,
    plugins: allPlugins,
    versions: allVersions,
    categoryMappings: allCategoryMappings,
  };
}
