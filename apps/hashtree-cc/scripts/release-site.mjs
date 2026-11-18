import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cloneValues,
  createDefaultRunner,
  createReleasePlan as createSharedReleasePlan,
  runReleasePlan,
  usesBuiltInWorker,
} from '@iris/release-tools';
import { resolveHtreeCommand } from './hashtreePaths.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const defaultWorkerCompatibilityDate = '2026-03-19';
const wranglerVersion = '4';
const defaultRunner = createDefaultRunner();

export { parsePublishOutput } from '@iris/release-tools';

export const releaseProfile = {
  appName: 'hashtree.cc',
  distDir: 'dist',
  treeName: 'hashtree-cc-site',
  nativeReleaseGate: true,
  defaultWorkerName: 'hashtree-cc',
  defaultRoutes: ['hashtree.cc/*'],
  workerScript: 'scripts/https-static-assets-worker.mjs',
  workerNameEnv: 'CF_WORKER_NAME_HASHTREE_CC',
  pagesProjectEnv: 'CF_PAGES_PROJECT_HASHTREE_CC',
  buildCommand: ['pnpm', 'run', 'build'],
  testCommands: [
    ['node', './scripts/verify-htree-cli.mjs'],
    ['node', '--test', 'tests/portable-build.test.mjs'],
    ['node', './scripts/portable-smoke.mjs'],
  ],
};

export function parseArgs(argv, env = process.env) {
  const args = [...argv].filter((arg, index) => !(arg === '--' && index === 0));
  let pagesProject;
  let workerName;
  let treeName;
  let branch;
  let dryRun = false;
  let skipCloudflare = false;
  let pagesOnly = false;
  const routes = [];
  const domains = [];
  let workerCompatibilityDate;

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '-h' || arg === '--help') {
      return { help: true };
    }
    if (arg === '--') {
      continue;
    }
    if (arg === '--pages-project') {
      pagesProject = args.shift();
      continue;
    }
    if (arg === '--worker-name') {
      workerName = args.shift();
      continue;
    }
    if (arg === '--tree') {
      treeName = args.shift();
      continue;
    }
    if (arg === '--route') {
      routes.push(args.shift());
      continue;
    }
    if (arg === '--domain') {
      domains.push(args.shift());
      continue;
    }
    if (arg === '--branch') {
      branch = args.shift();
      continue;
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--compatibility-date') {
      workerCompatibilityDate = args.shift();
      continue;
    }
    if (arg === '--skip-cloudflare' || arg === '--skip-pages') {
      skipCloudflare = true;
      continue;
    }
    if (arg === '--pages-only') {
      pagesOnly = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (pagesOnly && workerName) {
    throw new Error('--pages-only is not compatible with --worker-name');
  }
  if (pagesOnly && (routes.length > 0 || domains.length > 0)) {
    throw new Error('--pages-only is not compatible with --route/--domain');
  }

  const resolvedWorkerName = pagesOnly
    ? undefined
    : workerName ?? env[releaseProfile.workerNameEnv] ?? releaseProfile.defaultWorkerName;
  const defaultRoutes = usesBuiltInWorker(releaseProfile, resolvedWorkerName)
    ? cloneValues(releaseProfile.defaultRoutes)
    : [];
  const defaultDomains = usesBuiltInWorker(releaseProfile, resolvedWorkerName)
    ? cloneValues(releaseProfile.defaultDomains)
    : [];

  return {
    dryRun,
    skipCloudflare,
    pagesOnly,
    branch,
    treeName: treeName ?? releaseProfile.treeName,
    workerName: resolvedWorkerName,
    pagesProject: pagesProject ?? env[releaseProfile.pagesProjectEnv],
    routes: routes.length > 0 ? routes : defaultRoutes,
    domains: domains.length > 0 ? domains : defaultDomains,
    workerCompatibilityDate:
      workerCompatibilityDate ?? env.CF_WORKER_COMPATIBILITY_DATE ?? defaultWorkerCompatibilityDate,
  };
}

export function createReleasePlan(options) {
  return createSharedReleasePlan({
    appDir,
    options,
    profile: releaseProfile,
    resolveHtreeCommand,
    wranglerVersion,
  });
}

export async function runRelease(options, runner = defaultRunner, hooks = {}) {
  return runReleasePlan(options, createReleasePlan(options), runner, hooks);
}

export function usage() {
  return `Usage: node ./scripts/release-site.mjs [options]

Build and test once, verify and promote the build through native Iris Drive,
then deploy the same output to the configured Cloudflare target.

Options:
  --worker-name <name>    Cloudflare Worker service name for static assets
  --pages-project <name>  Cloudflare Pages project name
  --tree <name>           hashtree mutable tree name override
  --route <pattern>       Worker route, for example hashtree.cc/*
  --domain <hostname>     Worker custom domain, for example hashtree.cc
  --branch <name>         Pages branch/preview deployment target
  --pages-only            disable the built-in/default Worker target and use Pages
  --compatibility-date    Worker compatibility date override
  --skip-cloudflare       publish to hashtree only
  --skip-pages            alias for --skip-cloudflare
  --dry-run               print planned steps without running them

Environment:
  IRIS_NATIVE_RELEASE_GATE  Absolute path to the approved Iris Sites release runner
  ${releaseProfile.workerNameEnv}   Default Worker name for hashtree.cc
  ${releaseProfile.pagesProjectEnv}   Default Pages project for hashtree.cc
  CF_WORKER_COMPATIBILITY_DATE   Default compatibility date for Worker deployments
  HTREE_BIN   Use the immutable public htree 0.2.142 binary instead of PATH lookup
`;
}

function printSummary(result) {
  const { treeName, publish, pagesProject, pagesUrl, workerName, routes, domains } = result;
  console.log(`\n${releaseProfile.appName} release complete.`);
  console.log(`Hashtree immutable URL: htree://${publish.nhash}/index.html`);
  console.log(`Hashtree mutable URL: htree://${publish.publishedRef}`);
  console.log(`Hashtree owner URL: htree://${publish.publishedRef}`);
  if (workerName) {
    console.log(`Worker service: ${workerName}`);
  }
  for (const route of routes ?? []) {
    console.log(`Worker route: ${route}`);
  }
  for (const domain of domains ?? []) {
    console.log(`Worker custom domain: ${domain}`);
  }
  if (pagesProject) {
    console.log(`Pages project: ${pagesProject}`);
  }
  if (pagesUrl) {
    console.log(`Pages deployment: ${pagesUrl}`);
  }
  console.log(`Tree name: ${treeName}`);
}

function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }
  return path.resolve(process.argv[1]) === __filename;
}

if (isMainModule()) {
  const main = async () => {
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed.help) {
      console.log(usage());
      process.exit(0);
    }

    const result = await runRelease(parsed);
    if (result.dryRun) {
      console.log(usage());
      for (const step of result.steps) {
        console.log(`${step.label}: ${step.command.join(' ')} (cwd: ${step.cwd})`);
      }
      process.exit(0);
    }
    printSummary(result);
  };

  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
