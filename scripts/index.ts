import { DUMMY_DATA } from "../utils.js";
import { getInstallationAuthenticatedOctokitInstance } from "./authenticate-octokit-instance.js";
import { downloadZipball } from "./download-zip.js";
import { triggerWorkflow } from "./run-workflow.js";

type ProcessOptions = 'workflow' | 'download';

const process: ProcessOptions = 'download';

const account = DUMMY_DATA.accounts[0];
const repo = account.repos[0];

console.log('Running process: ', process);

const octokit = await getInstallationAuthenticatedOctokitInstance(account.installationId);

if (process === 'workflow') {
    await triggerWorkflow(octokit, account.owner, repo.name, repo.ref);
} else if (process === 'download') {
    await downloadZipball(octokit, account.owner, repo.name, repo.ref);
}