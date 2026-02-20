const REQUIRED_VARS = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'JWT_SECRET_KEY'];

const OPTIONAL_DEFAULTS: Record<string, string> = {
  PORT: '3000',
  NODE_ENV: 'development',
  STORAGE_TYPE: 'local',
};

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    console.error('See .env.example for required configuration');
    process.exit(1);
  }

  for (const [key, defaultValue] of Object.entries(OPTIONAL_DEFAULTS)) {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  }
}
