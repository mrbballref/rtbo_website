import { execFileSync } from 'node:child_process';

const expectedRepository = 'mrbballref/rtbo_website';
const acceptedRemoteUrls = new Set([
  `https://github.com/${expectedRepository}.git`,
  `git@github.com:${expectedRepository}.git`,
]);

function readGitValue(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const originFetchUrl = readGitValue(['remote', 'get-url', 'origin']);
const originPushUrl = readGitValue(['remote', 'get-url', '--push', 'origin']) || originFetchUrl;

if (!acceptedRemoteUrls.has(originFetchUrl) || !acceptedRemoteUrls.has(originPushUrl)) {
  console.error(`RTBO push blocked: origin must point to ${expectedRepository}.`);
  console.error(`Current fetch URL: ${originFetchUrl || '(missing)'}`);
  console.error(`Current push URL: ${originPushUrl || '(missing)'}`);
  process.exit(1);
}

console.log(`RTBO GitHub remote verified: ${expectedRepository}`);
