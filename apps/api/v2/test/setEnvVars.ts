import type { Environment } from "@/env";

const env: Partial<Omit<Environment, "NODE_ENV">> = {
  API_URL: "http://localhost",
  API_PORT: "5555",
  DATABASE_URL: "postgresql://postgres:@localhost:5450/calendso",
  DATABASE_READ_URL: "postgresql://postgres:@localhost:5450/calendso",
  DATABASE_WRITE_URL: "postgresql://postgres:@localhost:5450/calendso",
  NEXTAUTH_SECRET: "XF+Hws3A5g2eyWA5uGYYVJ74X+wrCWJ8oWo6kAfU6O8=",
  JWT_SECRET: "XF+Hws3A5g2eyWA5uGYYVJ74X+wrCWJ8oWo6kAfU6O8=",
  LOG_LEVEL: "trace",
  REDIS_URL: "redis://localhost:6379",
  IS_E2E: true,
  API_KEY_PREFIX: "cal_test_",
  GET_LICENSE_KEY_URL: " https://console.cal.com/api/license",
  RATE_LIMIT_DEFAULT_TTL_MS: 60000,
  // note(Lauris): setting high limit so that e2e tests themselves are not rate limited
  RATE_LIMIT_DEFAULT_LIMIT: 10000,
  RATE_LIMIT_DEFAULT_BLOCK_DURATION_MS: 60000,
};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
process.env = {
  ...env,
  ...process.env,
  // fake keys for testing
  NEXT_PUBLIC_VAPID_PUBLIC_KEY:
    "BIds0AQJ96xGBjTSMHTOqLBLutQE7Lu32KKdgSdy7A2cS4mKI2cgb3iGkhDJa5Siy-stezyuPm8qpbhmNxdNHMw",
  VAPID_PRIVATE_KEY: "6cJtkASCar5sZWguIAW7OjvyixpBw9p8zL8WDDwk9Jk",
  CALENDSO_ENCRYPTION_KEY: "22gfxhWUlcKliUeXcu8xNah2+HP/29ZX",
};
