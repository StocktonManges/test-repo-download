import dotenv from 'dotenv'
import fs from 'fs'
import http from 'http'
import { Octokit, App } from 'octokit'
import { createNodeMiddleware } from '@octokit/webhooks'

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

// Subscribe to the "pull_request.opened" webhook event
app.webhooks.on('workflow_run.completed', async ({ payload }) => {
    console.log('Conclusion: ', payload.workflow_run.conclusion);
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