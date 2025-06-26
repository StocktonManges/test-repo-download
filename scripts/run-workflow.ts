import { App } from 'octokit';
import fs from 'fs';
import { getAuthenticatedOctokitInstance } from './get-installation-id.js';

// Load env variables
const APP_ID = process.env.APP_ID;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;

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

const PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
const app = new App({ appId: APP_ID, privateKey: PRIVATE_KEY });

async function triggerWorkflow() {
    if (!OWNER) {
        console.log('❌ OWNER environment variable is not set');
        console.log('Please set it in your .env file or export it');
        process.exit(1);
    }

    if (!REPO) {
        console.log('❌ REPO environment variable is not set');
        console.log('Please set it in your .env file or export it');
        process.exit(1);
    }

    console.log('Getting installation ID...');

    // Get the authenticated octokit instance for the app
    const octokit = await getAuthenticatedOctokitInstance();

    console.log('Triggering workflow...');

    return await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
        owner: OWNER,
        repo: REPO,
        workflow_id: 'zip-and-upload.yml',
        ref: 'main',
        inputs: {
            zip_name: 'repo=' + REPO + '-' + 'owner=' + OWNER
        },
        headers: {
            accept: 'application/vnd.github+json'
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
