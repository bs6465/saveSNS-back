import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/index.js', 'src/config/swagger.js'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
