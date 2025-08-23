export default () => {
  const requiredVars = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    // add other required env virables
  };

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return {
    port: parseInt(process.env.PORT ?? '4000', 10),
    environment: process.env.NODE_ENV || 'development',
    database: {
      port: parseInt(process.env.DB_PORT ?? '3306', 10),
      host: process.env.DB_HOST,
      name: process.env.DB_NAME,
      pass: process.env.DB_PASS,
      user: process.env.DB_USER,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      ttl: parseInt(process.env.REDIS_TTL ?? '60', 10),
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookKey: process.env.STRIPE_WEBHOOK_SECRET,
      prices: {
        pro: {
          monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
          yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
        },
        // other plan prices comes here
        // e.g.
        // premium: {...}
      },
    },
  };
};
