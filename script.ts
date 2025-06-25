import cron from 'node-cron';
import { App, Octokit } from 'octokit';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { getInstallationId } from './get-installation-id.js';

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
    console.error(`❌ Private key file not found at: ${PRIVATE_KEY_PATH}`);
    console.error('Please check the path and make sure the file exists');
    process.exit(1);
}

const PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
const app = new App({ appId: APP_ID, privateKey: PRIVATE_KEY });

async function downloadTarball() {
    if (!OWNER) {
        console.error('❌ OWNER environment variable is not set');
        console.error('Please set it in your .env file or export it');
        process.exit(1);
    }

    if (!REPO) {
        console.error('❌ REPO environment variable is not set');
        console.error('Please set it in your .env file or export it');
        process.exit(1);
    }

    // Get the authenticated octokit instance for the app
    const installation_id = await getInstallationId();
    const octokit = await app.getInstallationOctokit(installation_id);

    console.log('Requesting tarball...');

    // Get the tarball download URL
    const response = await octokit.request('GET /repos/{owner}/{repo}/tarball/{ref}', {
        owner: OWNER,
        repo: REPO,
        ref: 'main',
        headers: {
            accept: 'application/vnd.github+json'
        }
    });

    console.log('Tarball URL:', response.url);

    // Get the token from octokit auth
    const { token } = await (octokit.auth({ type: 'installation' }) as Promise<{ token: string }>);

    const tarballUrl = response.url;
    const destPath = path.resolve('/Users/stockton.manges/Downloads/', `${REPO}.tar.gz`);
    const file = fs.createWriteStream(destPath);

    console.log(`[${new Date().toISOString()}] Downloading tarball from ${tarballUrl}`);

    // Wrap the download in a Promise
    await new Promise<void>((resolve, reject) => {
        https.get(tarballUrl, { headers: { authorization: `token ${token}` } }, res => {
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`✅ Download complete: ${destPath}`);
                resolve();
            });
        }).on('error', err => {
            fs.unlink(destPath, () => { });
            console.error(`❌ Error downloading tarball:`, err);
            reject(err);
        });
    });
}

downloadTarball()
    .then(() => {
        console.log('🎉 Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });

// Run every day at 2:00 AM
// cron.schedule('0 2 * * *', downloadTarball);

// console.log('⏰ Cron job scheduled...');
