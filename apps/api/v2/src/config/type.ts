export type AppConfig = {
  env: {
    type: "production" | "development";
  };
  api: {
    port: number;
    path: string;
    url: string;
  };
  db: {
    readUrl: string;
    writeUrl: string;
    redisUrl: string;
  };
  next: {
    authSecret: string;
  };
<<<<<<< HEAD
  stripe: {
    apiKey: string;
    webhookSecret: string;
<<<<<<< HEAD
=======
    teamMonthlyPriceId: string;
>>>>>>> c2bc804973 (Remove usage from booking service)
  };
=======
>>>>>>> eb7546b337 (Remove remaining billing mentions)
  app: {
    baseUrl: string;
  };
};
