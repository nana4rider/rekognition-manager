export default {
  '*.{js,cjs,mjs,ts,tsx}': 'eslint --fix',
  '*': 'prettier --write --ignore-unknown',
  '{apps/bff/src/http/**,packages/contracts/src/**,apps/bff/package.json}': () =>
    'npm run openapi:check',
};
