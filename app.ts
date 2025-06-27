/** This is the main app that runs the GitHub webhook server. */

import dotenv from 'dotenv'
import fs from 'fs'
import http from 'http'
import path from 'path';
import { Octokit, App } from 'octokit'
import { createNodeMiddleware } from '@octokit/webhooks'
import { downloadFile, generateRepoZipName, generateTimestampString } from './utils.js'

// Load environment variables from .env file
dotenv.config();

// Set configured values
const APP_ID = process.env.APP_ID;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const GITHUB_API_VERSION = process.env.GITHUB_API_VERSION;
const enterpriseHostname = process.env.ENTERPRISE_HOSTNAME;

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

if (!WEBHOOK_SECRET) {
    console.error('❌ WEBHOOK_SECRET environment variable is not set');
    console.error('Please set it in your .env file or export it');
    process.exit(1);
}

if (!GITHUB_API_VERSION) {
    console.error('❌ GITHUB_API_VERSION environment variable is not set');
    console.error('Please set it in your .env file or export it');
    process.exit(1);
}

const PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

// Create an authenticated Octokit client authenticated as a GitHub App
const app = new App({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
    webhooks: {
        secret: WEBHOOK_SECRET
    },
    ...(enterpriseHostname && {
        Octokit: Octokit.defaults({
            baseUrl: `https://${enterpriseHostname}/api/v3`
        })
    })
});

// Subscribe to the "installation_repositories" webhook event. This is used to store data about the installation and 
// the repositories that are added to the installation.
app.webhooks.on('installation_repositories', async ({ payload }) => {
    const isAdding = payload.action === 'added';
    console.log(`Installation repositories event received: ${isAdding ? 'addition' : 'removal'}`);

    if (isAdding) {
        // All of this should be stored in a database.
        console.log('Installation ID: ', payload.installation.id);
        console.log('Account Owner: ', payload.sender.login);
        console.log('Repositories added: ', payload.repositories_added.length);
        payload.repositories_added.forEach(repo => {
            console.log('- Repository Name: ', repo.name);
            console.log('  Repository ID: ', repo.id);
        });
    } else {
        console.log('Repositories removed: ', payload.repositories_removed.length);
        payload.repositories_removed.forEach(repo => {
            console.log('- Repository Name: ', repo.name);
            console.log('  Repository ID: ', repo.id);
        });
    }
});

// Subscribe to the "workflow_run" webhook event
app.webhooks.on('workflow_run', async ({ payload, octokit }) => {
    const workflowName = payload.workflow?.name;

    if (!workflowName) {
        console.log('No workflow name found');
        return;
    } else if (workflowName === 'Zip and Upload Repository') {
        const repoName = payload.repository.name;
        const repoOwner = payload.repository.owner.login;
        const runId = payload.workflow_run.id;
        const runAttempt = payload.workflow_run.run_attempt;

        if (payload.action === 'requested') {
            console.log('Workflow run requested');
            console.log('run id: ', payload.workflow_run.id);
            console.log('workflow name: ', payload.workflow_run.name);
            console.log('repo name: ', repoName);
            console.log('repo owner: ', repoOwner);
            console.log('requester name: ', payload.sender.login)
            console.log('Processing...');
        }
        if (payload.action === 'completed') {
            console.log(payload.workflow_run.conclusion);

            if (payload.workflow_run.conclusion === 'success') {
                // Get all artifacts for the workflow run (should only have one)
                const { data: { artifacts } } = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts', {
                    owner: payload.repository.owner.login,
                    repo: repoName,
                    run_id: payload.workflow_run.id,
                    headers: {
                        accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': GITHUB_API_VERSION,
                    }
                });

                // Find the artifact with the correct naming convention (there is a timestamp added to the end of the name)
                const artifact = artifacts.find(a => a.name.includes(generateRepoZipName(repoName, repoOwner)));
                const artifact_id = artifact?.id;

                if (!artifact_id) {
                    console.log('No artifact found with the name: ', generateRepoZipName(repoName, repoOwner));
                    return;
                }

                // Download the zip file from the artifact
                const downloadResponse = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}', {
                    owner: repoOwner,
                    repo: repoName,
                    artifact_id,
                    archive_format: 'zip',
                    headers: {
                        accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': GITHUB_API_VERSION,
                    }
                });

                const downloadUrl = downloadResponse.url;
                const destPath = path.resolve('/Users/stockton.manges/Downloads/', generateRepoZipName(repoName, repoOwner) + '.zip');

                return await downloadFile(downloadUrl, destPath);
            } else {
                console.log('Workflow run conclusion: ', payload.workflow_run.conclusion);
                console.log('Workflow run was not successful. Downloading logs...');

                const logResponse = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs', {
                    owner: repoOwner,
                    repo: repoName,
                    run_id: runId,
                    attempt_number: runAttempt,
                    headers: {
                        accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': GITHUB_API_VERSION,
                    }
                })

                const logUrl = logResponse.url;
                const destPath = path.resolve('/Users/stockton.manges/Downloads/', 'WORKFLOW-LOGS-' + generateRepoZipName(repoName, repoOwner) + '-' + generateTimestampString() + '.zip');

                return await downloadFile(logUrl, destPath);
            }
        }
    } else {
        console.log(`Workflow with name ${workflowName} is not supported.`);
        return;
    }
});

// Optional: Handle errors
app.webhooks.onError((error) => {
    console.log(error);
})

// Launch a web server to listen for GitHub webhooks
const port = process.env.PORT || 3000;
const localPath = '/api/webhook';
const localWebhookUrl = `http://localhost:${port}${localPath}`;

// See https://github.com/octokit/webhooks.js/#createnodemiddleware for all options
const middleware = createNodeMiddleware(app.webhooks, { path: localPath });

http.createServer(middleware).listen(port, () => {
    console.log(`Server is listening for events at: ${localWebhookUrl}`);
    console.log('Press Ctrl + C to quit.');
});