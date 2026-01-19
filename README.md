# n8n-nodes-url2markdown

n8n custom node to convert URL to Markdown using [Jina Reader API](https://jina.ai/reader/).

## Features

- Convert any webpage URL to clean Markdown
- Uses Jina Reader API (free, no API key required)
- Supports timeout configuration
- Japanese language support

## Installation

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes** in n8n
2. Search for `n8n-nodes-url2markdown`
3. Click **Install**

### Manual Installation

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-url2markdown
```

## Usage

1. Add the **URL to Markdown** node to your workflow
2. Enter the URL you want to convert
3. (Optional) Configure timeout in Options
4. Execute the node

### Output

```json
{
  "url": "https://example.com/article",
  "markdown": "# Article Title\n\nArticle content...",
  "contentLength": 1234
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| URL | string | - | URL to convert (required) |
| Timeout | number | 30 | Request timeout in seconds |

## License

MIT
