export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  environment: process.env.ENVIRONMENT,
  database: {
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    host: process.env.DB_HOST,
    name: process.env.DB_NAME,
    pass: process.env.DB_PASS,
    user: process.env.DB_USER,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    ttl: parseInt(process.env.REDIS_TTL ?? '60', 10),
  },
});
