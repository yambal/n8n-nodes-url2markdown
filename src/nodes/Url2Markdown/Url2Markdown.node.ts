import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

export class Url2Markdown implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'URL to Markdown',
		name: 'url2Markdown',
		icon: 'file:url2markdown.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Convert webpage to Markdown',
		description: 'Fetch a URL and convert its content to Markdown using Readability and Turndown',
		defaults: {
			name: 'URL to Markdown',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://example.com/article',
				description: '変換するWebページのURL',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Timeout (seconds)',
						name: 'timeout',
						type: 'number',
						default: 30,
						description: 'リクエストのタイムアウト秒数',
					},
					{
						displayName: 'Include Links',
						name: 'includeLinks',
						type: 'boolean',
						default: true,
						description: 'Markdownにリンクを含めるか',
					},
					{
						displayName: 'Include Images',
						name: 'includeImages',
						type: 'boolean',
						default: true,
						description: 'Markdownに画像を含めるか',
					},
					{
						displayName: 'Heading Style',
						name: 'headingStyle',
						type: 'options',
						default: 'atx',
						options: [
							{ name: 'ATX (# Heading)', value: 'atx' },
							{ name: 'Setext (Underlined)', value: 'setext' },
						],
						description: '見出しのスタイル',
					},
					{
						displayName: 'Code Block Style',
						name: 'codeBlockStyle',
						type: 'options',
						default: 'fenced',
						options: [
							{ name: 'Fenced (```)', value: 'fenced' },
							{ name: 'Indented', value: 'indented' },
						],
						description: 'コードブロックのスタイル',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const url = this.getNodeParameter('url', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const timeout = (options.timeout as number) || 30;
				const includeLinks = options.includeLinks !== false;
				const includeImages = options.includeImages !== false;
				const headingStyle = (options.headingStyle as 'atx' | 'setext') || 'atx';
				const codeBlockStyle = (options.codeBlockStyle as 'fenced' | 'indented') || 'fenced';

				if (!url) {
					throw new NodeOperationError(this.getNode(), 'URL is required', { itemIndex: i });
				}

				// Fetch HTML
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

				let html: string;
				let finalUrl: string = url;

				try {
					const response = await fetch(url, {
						headers: {
							'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
							'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
							'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
						},
						signal: controller.signal,
						redirect: 'follow',
					});

					clearTimeout(timeoutId);

					if (!response.ok) {
						throw new NodeOperationError(
							this.getNode(),
							`Failed to fetch URL: ${response.status} ${response.statusText}`,
							{ itemIndex: i }
						);
					}

					html = await response.text();
					finalUrl = response.url;
				} catch (fetchError) {
					clearTimeout(timeoutId);
					if (fetchError instanceof Error && fetchError.name === 'AbortError') {
						throw new NodeOperationError(
							this.getNode(),
							`Request timed out after ${timeout} seconds`,
							{ itemIndex: i }
						);
					}
					throw fetchError;
				}

				// Parse with JSDOM and Readability
				const dom = new JSDOM(html, { url: finalUrl });
				const reader = new Readability(dom.window.document);
				const article = reader.parse();

				if (!article) {
					throw new NodeOperationError(
						this.getNode(),
						'Failed to parse article content from the page',
						{ itemIndex: i }
					);
				}

				// Convert to Markdown with Turndown
				const turndownService = new TurndownService({
					headingStyle: headingStyle,
					codeBlockStyle: codeBlockStyle,
				});

				// Configure link handling
				if (!includeLinks) {
					turndownService.addRule('removeLinks', {
						filter: 'a',
						replacement: (content) => content,
					});
				}

				// Configure image handling
				if (!includeImages) {
					turndownService.addRule('removeImages', {
						filter: 'img',
						replacement: () => '',
					});
				}

				const markdown = turndownService.turndown(article.content);

				returnData.push({
					json: {
						url: finalUrl,
						title: article.title,
						byline: article.byline,
						excerpt: article.excerpt,
						siteName: article.siteName,
						markdown,
						contentLength: markdown.length,
					} as IDataObject,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
