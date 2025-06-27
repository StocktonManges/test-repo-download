import fs from 'fs';
import https from 'https';

export const generateRepoZipName = (repo: string, owner: string) => {
    return `OWNER=${owner}&REPO=${repo}`;
}

export const generateTimestampString = () => {
    return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
}

export const downloadFile = async (downloadUrl: string, destPath: string) => {
    const file = fs.createWriteStream(destPath);

    console.log(`Downloading file to ${destPath}`);

    // Download using the URL
    return await new Promise<void>((resolve, reject) => {
        https.get(downloadUrl, res => {
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('Download complete!');
                resolve();
            });
        }).on('error', err => {
            fs.unlink(destPath, () => { });
            console.error(`❌ Error downloading artifact:`, err);
            reject(err);
        });
    });
}

// FOR DEVELOPMENT PURPOSES ONLY.
export const DUMMY_DATA = {
    accounts: [
        {
            installationId: 72871235,
            owner: 'StocktonManges',
            repos: [
                {
                    name: 'test-repo-download',
                    ref: 'main',
                    ignoredContent: [],
                }
            ],
        }
    ]
}