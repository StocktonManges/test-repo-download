import { Octokit } from 'octokit';
import { generateRepoZipName, generateTimestampString } from '../utils.js';
import dotenv from 'dotenv';

dotenv.config();

const WORKFLOW_NAME = process.env.WORKFLOW_NAME;
const GITHUB_API_VERSION = process.env.GITHUB_API_VERSION;

export async function triggerWorkflow(octokit: Octokit, owner: string, repo: string, ref: string) {
    if (!WORKFLOW_NAME) {
        console.error('WORKFLOW_NAME environment variable is not set');
        console.error('Please set it in your .env file or export it');
        process.exit(1);
    }

    if (!GITHUB_API_VERSION) {
        console.error('GITHUB_API_VERSION environment variable is not set');
        console.error('Please set it in your .env file or export it');
        process.exit(1);
    }

    console.log('Triggering workflow...');

    // Create the inputs for the workflow
    const inputs: Record<string, string> = {
        zip_name: generateRepoZipName(repo, owner) + '-' + generateTimestampString(),
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
        owner,
        repo,
        workflow_id: WORKFLOW_NAME,
        ref,
        inputs,
        headers: {
            accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': GITHUB_API_VERSION,
        }
    })
}
