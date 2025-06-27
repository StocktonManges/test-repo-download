import { downloadFile, generateRepoZipName } from '../utils.js';
import path from 'path';
import { Octokit } from 'octokit';
import dotenv from 'dotenv';

dotenv.config();

const GITHUB_API_VERSION = process.env.GITHUB_API_VERSION;

export async function downloadZipball(octokit: Octokit, owner: string, repo: string, ref: string) {
    if (!GITHUB_API_VERSION) {
        console.error('❌ GITHUB_API_VERSION environment variable is not set');
        console.error('Please set it in your .env file or export it');
        process.exit(1);
    }

    console.log('Getting zipball URL...');

    // Get the zipball download URL
    const response = await octokit.request('GET /repos/{owner}/{repo}/zipball/{ref}', {
        owner,
        repo,
        ref,
        headers: {
            accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': GITHUB_API_VERSION,
        }
    });

    const zipballUrl = response.url;
    const destPath = path.resolve('/Users/stockton.manges/Downloads/', `${generateRepoZipName(repo, owner)}.zip`);

    return await downloadFile(zipballUrl, destPath);
}
