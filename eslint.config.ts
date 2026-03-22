import { refinist } from '@refinist/eslint-config';
export default refinist(
  {},
  {
    ignores: ['tsconfig.json'],
    rules: {
      'no-console': 'off'
    }
  }
);
