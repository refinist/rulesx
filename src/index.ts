import { add } from './add.js';

function usage(): never {
  console.error(`Usage: rulesx add <source> [--rule '<pattern>']

Source formats:
  owner/repo                        GitHub shorthand
  https://github.com/owner/repo     Full GitHub URL
  https://gitlab.com/org/repo       GitLab URL
  git@github.com:owner/repo.git     SSH URL
  https://host.com/org/repo.git     Any git URL
  ./local-path                      Local directory

Examples:
  rulesx add vercel-labs/my-rules
  rulesx add https://github.com/org/repo
  rulesx add https://github.com/org/repo --rule '*'
  rulesx add ./my-local-rules --rule 'foo'
  rulesx add git@github.com:org/repo.git --rule 'react-*'`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] !== 'add') {
    usage();
  }

  const gitUrl = args[1];
  if (!gitUrl || gitUrl.startsWith('--')) {
    console.error('Error: missing git URL\n');
    usage();
  }

  const ruleIdx = args.indexOf('--rule');
  const rulePattern = ruleIdx !== -1 ? args[ruleIdx + 1] : undefined;

  await add(gitUrl, rulePattern);
}

main().catch((err: Error) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
