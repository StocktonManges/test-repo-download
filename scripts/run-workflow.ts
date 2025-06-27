import fs from 'fs';
import { getAuthenticatedOctokitInstance } from './authenticate-octokit-instance.js';
import { generateRepoZipName, generateTimestampString, OWNER, REPO } from '../utils.js';

// Load env variables
const APP_ID = process.env.APP_ID;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;

if (!APP_ID) {
    console.error('❌ APP_ID environment variable is not set');
    console.error('Please set it in your .env file or export it');
    process.exit(1);
}

if (!PRIVATE_KEY_PATH) {
    console.error('❌ PRIVATE_KEY_PATH environment variable is not set');
    console.error('Please set it in your .env file or export it');
    process.exit(1);
}

// Check if the private key file exists
if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('Please check the private key path and make sure the file exists');
    process.exit(1);
}

async function triggerWorkflow() {
    console.log('Getting authenticated octokit instance...');

    // Get the authenticated octokit instance for the intstallation (GitHub account)
    const octokit = await getAuthenticatedOctokitInstance();

    console.log('Triggering workflow...');

    // Create the inputs for the workflow
    const inputs: Record<string, string> = {
        zip_name: generateRepoZipName(REPO, OWNER) + '-' + generateTimestampString(),
        // server_url: 'SERVER_URL',
        // server_path: 'SERVER_PATH',
        // server_token: 'SERVER_TOKEN',
    };

    const ignored_content: string[] = []; // It's recommended to use relative paths
    const trimmed_ignored_content = ignored_content.filter(c => c.trim() !== '');

    // If there is ignored content, add it to the inputs
    if (trimmed_ignored_content.length > 0) {
        inputs.ignored_content = trimmed_ignored_content.join(' ');
    }

    return await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
        owner: OWNER,
        repo: REPO,
        workflow_id: 'zip-and-upload.yml',
        ref: 'main',
        inputs,
        headers: {
            accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        }
    })
}

triggerWorkflow()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
