export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  environment: process.env.ENVIRONMENT,
  database: {
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    host: process.env.DB_HOST,
    name: process.env.DV_NAME,
    pass: process.env.DB_PASS,
    user: process.env.DB_USER,
  },
});
