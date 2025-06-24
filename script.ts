import cron from 'node-cron';
import { App } from 'octokit';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { getInstallationId } from './get-installation-id.js';

// Load env variables
const APP_ID = process.env.APP_ID!;
const PRIVATE_KEY = fs.readFileSync(process.env.PRIVATE_KEY_PATH!, 'utf8');
const OWNER = process.env.REPO_OWNER!;
const REPO = process.env.REPO_NAME!;

const app = new App({ appId: APP_ID, privateKey: PRIVATE_KEY });

async function downloadTarball() {
    const installation_id = await getInstallationId();

    const octokit = await app.getInstallationOctokit(installation_id);

    // Get the tarball download URL
    const response = await octokit.request('GET /repos/{owner}/{repo}/tarball', {
        owner: OWNER,
        repo: REPO,
        headers: { accept: 'application/vnd.github+json' }
    });

    const tarballUrl = response.url;
    const destPath = path.resolve(__dirname, `${REPO}.tar.gz`);
    const file = fs.createWriteStream(destPath);

    console.log(`[${new Date().toISOString()}] Downloading tarball from ${tarballUrl}`);

    https.get(tarballUrl, { headers: { authorization: `token ${octokit.auth.token}` } }, res => {
        res.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`✅ Download complete: ${destPath}`);
        });
    }).on('error', err => {
        fs.unlink(destPath, () => { });
        console.error(`❌ Error downloading tarball:`, err);
    });
}

// Run every day at 2:00 AM
cron.schedule('0 2 * * *', downloadTarball);

console.log('⏰ Cron job scheduled...');
