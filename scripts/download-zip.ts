import { App } from 'octokit';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { getAuthenticatedOctokitInstance } from './get-installation-id.js';
import { generateRepoZipName } from '../utils.js';

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

async function downloadZipball() {
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

    console.log('Getting authenticated octokit instance...');

    // Get the authenticated octokit instance for the app
    const octokit = await getAuthenticatedOctokitInstance();

    console.log('Getting zipball URL...');

    // Get the zipball download URL
    const response = await octokit.request('GET /repos/{owner}/{repo}/zipball/{ref}', {
        owner: OWNER,
        repo: REPO,
        ref: 'main',
        headers: {
            accept: 'application/vnd.github+json'
        }
    });

    console.log('Zipball URL:', response.url);

    // Get the token from octokit auth
    const { token } = await (octokit.auth({ type: 'installation' }) as Promise<{ token: string }>);

    const zipballUrl = response.url;
    const destPath = path.resolve('/Users/stockton.manges/Downloads/', `${generateRepoZipName(REPO, OWNER)}.zip`);
    const file = fs.createWriteStream(destPath);

    console.log(`Downloading zipball to ${destPath}`);

    // Wrap the download in a Promise
    await new Promise<void>((resolve, reject) => {
        https.get(zipballUrl, { headers: { authorization: `token ${token}` } }, res => {
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Download complete: ${destPath}`);
                resolve();
            });
        }).on('error', err => {
            fs.unlink(destPath, () => { });
            console.error(`❌ Error downloading zipball:`, err);
            reject(err);
        });
    });
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
