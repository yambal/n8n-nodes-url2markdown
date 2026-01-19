import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class Url2Markdown implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'URL to Markdown',
		name: 'url2Markdown',
		icon: 'file:url2markdown.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Convert webpage to Markdown',
		description: 'Fetch a URL and convert its content to Markdown using Jina Reader API',
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

				if (!url) {
					throw new NodeOperationError(this.getNode(), 'URL is required', { itemIndex: i });
				}

				// Jina Reader API を使用
				const jinaUrl = `https://r.jina.ai/${url}`;

				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

				try {
					const response = await fetch(jinaUrl, {
						headers: {
							'Accept': 'text/markdown',
						},
						signal: controller.signal,
					});

					clearTimeout(timeoutId);

					if (!response.ok) {
						throw new NodeOperationError(
							this.getNode(),
							`Failed to fetch URL: ${response.status} ${response.statusText}`,
							{ itemIndex: i }
						);
					}

					const markdown = await response.text();

					returnData.push({
						json: {
							url,
							markdown,
							contentLength: markdown.length,
						} as IDataObject,
					});
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
