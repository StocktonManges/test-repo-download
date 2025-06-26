export const generateRepoZipName = (repo: string, owner: string) => {
    return `OWNER=${owner}&REPO=${repo}.zip`;
}