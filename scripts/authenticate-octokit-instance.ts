import { App } from 'octokit';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check for required environment variables
const APP_ID = process.env.APP_ID;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;
const OWNER = process.env.OWNER;

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

// Authenticate at the app level and create an App instance in order to get the JWT token.
// The JWT token and username of the owner of the installation (i.e. GitHub account) are then used to 
// get an installation ID (unique to each installation/GitHub account) and authenticate at the installation level
// to execute API queries for the specific installation.
const PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
const app = new App({ appId: APP_ID, privateKey: PRIVATE_KEY });
const octokit = app.octokit;

export async function getAuthenticatedOctokitInstance() {
    try {
        // THIS SHOULD NOT BE SET AS AN ENVIRONMENT VARIABLE.
        // IT WILL BE DYNAMICALLY SET TO THE USER'S GITHUB USERNAME.
        if (!OWNER) {
            console.error('❌ OWNER environment variable is not set');
            console.error('Please set it in your .env file or export it');
            process.exit(1);
        }

        // Extract the JWT token from the app-level authenticated instance.
        const appAuth = await octokit.auth({ type: "app" }) as { token: string }; // TypeScript doesn't pick up the dynamic type of the token.
        const jwt = appAuth.token;

        // Get the installation ID for the specific user through the user's username
        const { data: { id: installationId } } = await octokit.request('GET /users/{username}/installation', {
            // THIS WILL NEED TO BE DYNAMICALLY CHANGED TO THE USER'S GITHUB USERNAME
            username: OWNER,
            headers: {
                authorization: `Bearer ${jwt}`,
                accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            }
        });

        return await app.getInstallationOctokit(installationId);
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