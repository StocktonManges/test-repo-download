import dotenv from 'dotenv'
import fs from 'fs'
import http from 'http'
import { Octokit, App } from 'octokit'
import { createNodeMiddleware } from '@octokit/webhooks'
import { getAuthenticatedOctokitInstance } from './scripts/get-installation-id.js'
import { generateRepoZipName } from './utils.js'

// Load environment variables from .env file
dotenv.config();

// Set configured values
const APP_ID = process.env.APP_ID;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
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

// Optional: Get & log the authenticated app's name
const { data } = await app.octokit.request('/app');

// Read more about custom logging: https://github.com/octokit/core.js#logging
app.octokit.log.debug(`Authenticated as '${data.name}'`);

// Subscribe to the "workflow_run" webhook event
app.webhooks.on('workflow_run', async ({ payload, octokit }) => {
    const workflowName = payload.workflow?.name;

    if (!workflowName) {
        console.log('No workflow name found');
        return;
    } else if (workflowName === 'Zip and Upload Repository') {
        if (payload.action === 'requested') {
            console.log('Workflow run requested');
            console.log('run id: ', payload.workflow_run.id);
            console.log('workflow name: ', payload.workflow_run.name);
            console.log('repo name: ', payload.repository.name);
            console.log('requester name: ', payload.sender.login)
            console.log('Processing...');
        }
        if (payload.action === 'completed') {
            console.log(payload.workflow_run.conclusion);

            if (payload.workflow_run.conclusion === 'success') {
                // Download the zip file from the artifact
                const { data: { artifacts } } = await octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts', {
                    owner: payload.repository.owner.login,
                    repo: payload.repository.name,
                    run_id: payload.workflow_run.id,
                    headers: {
                        accept: 'application/vnd.github+json',
                    }
                });

                const repoZip = artifacts.find(a => a.name.includes(generateRepoZipName(payload.repository.name, payload.repository.owner.login)));

                if (!repoZip) {
                    console.log('No repo zip found');
                    return;
                }

                console.log('Download URL: ', repoZip.archive_download_url);
                return;

            } else {
                console.log('Workflow run conclusion: ', payload.workflow_run.conclusion);
                console.log('Workflow run was not successful. Downloading logs...');

                // TODO: Download the logs file

                return;
            }
        }
    } else {
        console.log('Workflow name: ', workflowName);
        return;
    }
});

// Optional: Handle errors
app.webhooks.onError((error) => {
    console.log(error);
})

// Launch a web server to listen for GitHub webhooks
const port = process.env.PORT || 3000;
const path = '/api/webhook';
const localWebhookUrl = `http://localhost:${port}${path}`;

// See https://github.com/octokit/webhooks.js/#createnodemiddleware for all options
const middleware = createNodeMiddleware(app.webhooks, { path });

http.createServer(middleware).listen(port, () => {
    console.log(`Server is listening for events at: ${localWebhookUrl}`);
    console.log('Press Ctrl + C to quit.');
});