import { configDefaults, defineConfig } from 'vitest/config';

// probe-apk ayrı pakettir (kendi bağımlılıkları); kök testlerin kapsamı dışında kalır.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'probe-apk/**'],
  },
});
