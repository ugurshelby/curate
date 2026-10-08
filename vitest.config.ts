import { configDefaults, defineConfig } from 'vitest/config';

// probe-apk is a separate package with its own dependencies; root tests do not cover it.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'probe-apk/**'],
  },
});
