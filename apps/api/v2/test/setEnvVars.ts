import type { Environment } from "@/env";

const env: Partial<Omit<Environment, "NODE_ENV">> = {
  API_PORT: "5555",
  DATABASE_READ_URL: "postgresql://postgres:@localhost:5450/calendso",
  DATABASE_WRITE_URL: "postgresql://postgres:@localhost:5450/calendso",
  NEXTAUTH_SECRET: "XF+Hws3A5g2eyWA5uGYYVJ74X+wrCWJ8oWo6kAfU6O8=",
  JWT_SECRET: "XF+Hws3A5g2eyWA5uGYYVJ74X+wrCWJ8oWo6kAfU6O8=",
  LOG_LEVEL: "trace",
  REDIS_URL: "redis://localhost:9199",
  STRIPE_API_KEY: "sk_test_51J4",
<<<<<<< HEAD
  STRIPE_WEBHOOK_SECRET: "whsec_51J4",
<<<<<<< HEAD
=======
=======
>>>>>>> 584d0c5f74 (Remove stripe webhook secret)
  IS_E2E: true,
  API_KEY_PREFIX: "cal_test_",
  GET_LICENSE_KEY_URL: " https://console.cal.com/api/license",
  CALCOM_LICENSE_KEY: "c4234812-12ab-42s6-a1e3-55bedd4a5bb7",
  RATE_LIMIT_DEFAULT_TTL_MS: 60000,
  // note(Lauris): setting high limit so that e2e tests themselves are not rate limited
  RATE_LIMIT_DEFAULT_LIMIT: 10000,
  RATE_LIMIT_DEFAULT_BLOCK_DURATION_MS: 60000,
>>>>>>> 79bd2d1104 (Remove global vars and dedicated js files)
};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
process.env = {
  ...env,
  ...process.env,
};
