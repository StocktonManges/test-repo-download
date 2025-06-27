import { App } from 'octokit';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const APP_ID = process.env.APP_ID;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;

/** This is used to get an authenticated octokit instance for a specific installation. */
export async function getInstallationAuthenticatedOctokitInstance(installationId: number) {
    try {
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

        return await app.getInstallationOctokit(installationId);
    } catch (error: any) {
        console.error('❌ Error getting installation ID:', error.message);
        throw error;
    }
}