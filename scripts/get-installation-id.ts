import { createAppAuth } from "@octokit/auth-app";
import { App } from 'octokit';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check for required environment variables
const APP_ID = process.env.APP_ID;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;
const OWNER = process.env.OWNER;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

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

export async function getAuthenticatedOctokitInstance() {
    try {
        if (!OWNER) {
            console.error('❌ OWNER environment variable is not set');
            console.error('Please set it in your .env file or export it');
            process.exit(1);
        }

        // Get the app's JWT token
        const auth = createAppAuth({
            appId: Number(APP_ID),
            privateKey: PRIVATE_KEY,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
        });
        const appAuthentication = await auth({ type: "app" });
        const jwt = appAuthentication.token;

        // Create an octokit instance with the JWT
        const octokit = app.octokit;

        // Get the installation for the specific user
        const response = await octokit.request('GET /users/{username}/installation', {
            username: OWNER,
            headers: {
                authorization: `Bearer ${jwt}`,
                accept: 'application/vnd.github+json'
            }
        });

        return await app.getInstallationOctokit(response.data.id);
    } catch (error: any) {
        if (error.status === 404) {
            console.error(`❌ No installation found for user: ${OWNER}`);
            console.error('Make sure the GitHub App is installed for this user.');
        } else {
            console.error('❌ Error getting installation ID:', error.message);
        }
        throw error;
    }
}