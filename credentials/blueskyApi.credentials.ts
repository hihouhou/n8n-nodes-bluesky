import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BlueskyApi implements ICredentialType {
	name = 'blueskyApi';
	displayName = 'Bluesky API';
	properties: INodeProperties[] = [
		{
			displayName: 'Identifier',
			name: 'identifier',
			type: 'string',
			default: '',
			placeholder: 'votre-handle.bsky.social',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
