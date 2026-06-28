const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const deploymentsFile = path.join(repoRoot, 'DEPLOYMENTS.md');
const args = process.argv.slice(2);

const noteIndex = args.indexOf('--note');
const allowDirty = args.includes('--allow-dirty');
const note = noteIndex !== -1 ? String(args[noteIndex + 1] || '').trim() : '';

function runGit(commandArgs) {
    return execFileSync('git', commandArgs, {
        cwd: repoRoot,
        encoding: 'utf8'
    }).trim();
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}${minutes}`;
}

function ensureCleanTree() {
    const status = runGit(['status', '--porcelain']);
    if (status && !allowDirty) {
        throw new Error('Working tree is dirty. Commit or stash changes first, or rerun with --allow-dirty.');
    }
}

function updateDeploymentsFile(dateText, tagName, commitHash, noteText) {
    const header = '# SecureAnno Release Record';
    const current = fs.readFileSync(deploymentsFile, 'utf8');
    const nextEntry = [
        `| ${dateText} | \`${tagName}\` | \`${commitHash}\` | Live | ${noteText} |`,
        ''
    ].join('\n');

    const marker = '## History';
    if (!current.includes(marker)) {
        throw new Error('DEPLOYMENTS.md is missing the history section.');
    }

    const updated = current.replace(
        /## History\s+\n\n\| Date \| Tag \| Commit \| Status \| Note \|\n\| --- \| --- \| --- \| --- \| --- \|\n/,
        `## History\n\n| Date | Tag | Commit | Status | Note |\n| --- | --- | --- | --- | --- |\n${nextEntry}`
    );

    if (updated === current) {
        throw new Error('Unable to update DEPLOYMENTS.md. The expected history table was not found.');
    }

    fs.writeFileSync(deploymentsFile, updated, 'utf8');
}

function main() {
    ensureCleanTree();

    const now = new Date();
    const dateText = formatDate(now);
    const timeText = formatTime(now);
    const tagName = `live-${dateText}-${timeText}`;
    const commitHash = runGit(['rev-parse', '--short', 'HEAD']);
    const releaseNote = note || `Snapshot taken on ${dateText}`;

    updateDeploymentsFile(dateText, tagName, commitHash, releaseNote);

    runGit(['tag', '-a', tagName, '-m', releaseNote]);

    console.log(`Created snapshot tag: ${tagName}`);
    console.log(`Recorded commit: ${commitHash}`);
    console.log(`Updated: ${path.relative(repoRoot, deploymentsFile)}`);
    console.log('');
    console.log('Next steps:');
    console.log('  git add DEPLOYMENTS.md');
    console.log(`  git commit -m "Record snapshot ${tagName}"`);
    console.log('  git push origin main --tags');
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
