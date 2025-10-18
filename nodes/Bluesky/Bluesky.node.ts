import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ICredentialDataDecryptedObject,
	NodeOperationError,
} from 'n8n-workflow';

export class Bluesky implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bluesky',
		name: 'bluesky',
		icon: 'file:bluesky.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with Bluesky API',
		defaults: {
			name: 'Bluesky',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'blueskyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Post',
						value: 'post',
						description: 'Create a new post',
						action: 'Create a post',
					},
					{
						name: 'Like',
						value: 'like',
						description: 'Like a post',
						action: 'Like a post',
					},
					{
						name: 'Repost',
						value: 'repost',
						description: 'Repost a post',
						action: 'Repost a post',
					},
					{
						name: 'Get Author Feed',
						value: 'getAuthorFeed',
						description: 'Get posts from an author',
						action: 'Get author feed',
					},
				],
				default: 'post',
			},
			// Post operation
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						operation: ['post'],
					},
				},
				default: '',
				required: true,
				description: 'The text content of the post',
			},
			// Like operation
			{
				displayName: 'Post URI',
				name: 'postUri',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['like', 'repost'],
					},
				},
				default: '',
				required: true,
				description: 'The AT URI of the post to like or repost',
			},
			{
				displayName: 'Post CID',
				name: 'postCid',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['like', 'repost'],
					},
				},
				default: '',
				required: true,
				description: 'The CID of the post to like or repost',
			},
			// Get Author Feed operation
			{
				displayName: 'Actor',
				name: 'actor',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getAuthorFeed'],
					},
				},
				default: '',
				required: true,
				description: 'The handle or DID of the author',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getAuthorFeed'],
					},
				},
				default: 50,
				description: 'Maximum number of posts to return',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		// Get credentials
		const credentials = await this.getCredentials('blueskyApi') as ICredentialDataDecryptedObject;
		const identifier = credentials.identifier as string;
		const password = credentials.password as string;

		// Create session
		const sessionResponse = await this.helpers.request({
			method: 'POST',
			url: 'https://bsky.social/xrpc/com.atproto.server.createSession',
			body: {
				identifier,
				password,
			},
			json: true,
		});

		const accessJwt = sessionResponse.accessJwt;
		const did = sessionResponse.did;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData;

				if (operation === 'post') {
					const text = this.getNodeParameter('text', i) as string;

					responseData = await this.helpers.request({
						method: 'POST',
						url: 'https://bsky.social/xrpc/com.atproto.repo.createRecord',
						headers: {
							Authorization: `Bearer ${accessJwt}`,
							'Content-Type': 'application/json',
						},
						body: {
							repo: did,
							collection: 'app.bsky.feed.post',
							record: {
								$type: 'app.bsky.feed.post',
								text,
								createdAt: new Date().toISOString(),
							},
						},
						json: true,
					});
				} else if (operation === 'like') {
					const postUri = this.getNodeParameter('postUri', i) as string;
					const postCid = this.getNodeParameter('postCid', i) as string;

					responseData = await this.helpers.request({
						method: 'POST',
						url: 'https://bsky.social/xrpc/com.atproto.repo.createRecord',
						headers: {
							Authorization: `Bearer ${accessJwt}`,
							'Content-Type': 'application/json',
						},
						body: {
							repo: did,
							collection: 'app.bsky.feed.like',
							record: {
								$type: 'app.bsky.feed.like',
								subject: {
									uri: postUri,
									cid: postCid,
								},
								createdAt: new Date().toISOString(),
							},
						},
						json: true,
					});
				} else if (operation === 'repost') {
					const postUri = this.getNodeParameter('postUri', i) as string;
					const postCid = this.getNodeParameter('postCid', i) as string;

					responseData = await this.helpers.request({
						method: 'POST',
						url: 'https://bsky.social/xrpc/com.atproto.repo.createRecord',
						headers: {
							Authorization: `Bearer ${accessJwt}`,
							'Content-Type': 'application/json',
						},
						body: {
							repo: did,
							collection: 'app.bsky.feed.repost',
							record: {
								$type: 'app.bsky.feed.repost',
								subject: {
									uri: postUri,
									cid: postCid,
								},
								createdAt: new Date().toISOString(),
							},
						},
						json: true,
					});
				} else if (operation === 'getAuthorFeed') {
					const actor = this.getNodeParameter('actor', i) as string;
					const limit = this.getNodeParameter('limit', i) as number;

					responseData = await this.helpers.request({
						method: 'GET',
						url: 'https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed',
						headers: {
							Authorization: `Bearer ${accessJwt}`,
						},
						qs: {
							actor,
							limit,
						},
						json: true,
					});
				}

				returnData.push({
					json: responseData as any,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
