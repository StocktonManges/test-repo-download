import fs from 'fs';
import { getAuthenticatedOctokitInstance } from './authenticate-octokit-instance.js';
import { downloadFile, generateRepoZipName, OWNER, REPO } from '../utils.js';
import path from 'path';

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

async function downloadZipball() {
    console.log('Getting authenticated octokit instance...');

    // Get the authenticated octokit instance for the installation (GitHub account)
    const octokit = await getAuthenticatedOctokitInstance();

    console.log('Getting zipball URL...');

    // Get the zipball download URL
    const response = await octokit.request('GET /repos/{owner}/{repo}/zipball/{ref}', {
        owner: OWNER,
        repo: REPO,
        ref: 'main',
        headers: {
            accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        }
    });

    const zipballUrl = response.url;
    const destPath = path.resolve('/Users/stockton.manges/Downloads/', `${generateRepoZipName(REPO, OWNER)}.zip`);

    return await downloadFile(zipballUrl, destPath);
}

downloadZipball()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
