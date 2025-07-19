import configuration from './configuration';

describe('Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment variables state
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment variables state
    process.env = originalEnv;
  });

  describe('Required variables', () => {
    it('should throw error when STRIPE_SECRET_KEY is not defined', () => {
      delete process.env.STRIPE_SECRET_KEY;
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';

      expect(() => configuration()).toThrow(
        'Missing required environment variables: STRIPE_SECRET_KEY',
      );
    });

    it('should throw error when DB_HOST is not defined', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      delete process.env.DB_HOST;
      process.env.DB_NAME = 'test_db';

      expect(() => configuration()).toThrow(
        'Missing required environment variables: DB_HOST',
      );
    });

    it('should throw error when DB_NAME is not defined', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.DB_HOST = 'localhost';
      delete process.env.DB_NAME;

      expect(() => configuration()).toThrow(
        'Missing required environment variables: DB_NAME',
      );
    });

    it('should throw error with multiple missing variables', () => {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.DB_HOST;
      process.env.DB_NAME = 'test_db';

      expect(() => configuration()).toThrow(
        'Missing required environment variables: STRIPE_SECRET_KEY, DB_HOST',
      );
    });

    it('should consider empty string as missing variable', () => {
      process.env.STRIPE_SECRET_KEY = '';
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';

      expect(() => configuration()).toThrow(
        'Missing required environment variables: STRIPE_SECRET_KEY',
      );
    });
  });

  describe('Default values configuration', () => {
    beforeEach(() => {
      // Set required variables
      process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_database';
    });

    it('should use default values when optional variables are not defined', () => {
      delete process.env.PORT;
      delete process.env.NODE_ENV;
      delete process.env.DB_PORT;
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_TTL;

      const config = configuration();

      expect(config).toEqual({
        port: 4000,
        environment: 'development',
        database: {
          port: 3306,
          host: 'localhost',
          name: 'test_database',
          pass: undefined,
          user: undefined,
        },
        redis: {
          host: 'localhost',
          port: 6379,
          ttl: 60,
        },
        stripe: {
          secretKey: 'sk_test_123456789',
        },
      });
    });

    it('should use custom values when provided', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'production';
      process.env.DB_PORT = '5432';
      process.env.DB_PASS = 'secret_password';
      process.env.DB_USER = 'admin';
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_TTL = '300';

      const config = configuration();

      expect(config).toEqual({
        port: 8080,
        environment: 'production',
        database: {
          port: 5432,
          host: 'localhost',
          name: 'test_database',
          pass: 'secret_password',
          user: 'admin',
        },
        redis: {
          host: 'redis.example.com',
          port: 6380,
          ttl: 300,
        },
        stripe: {
          secretKey: 'sk_test_123456789',
        },
      });
    });
  });

  describe('Type conversion', () => {
    beforeEach(() => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
    });

    it('should convert PORT to number', () => {
      process.env.PORT = '3000';

      const config = configuration();

      expect(config.port).toBe(3000);
      expect(typeof config.port).toBe('number');
    });

    it('should convert DB_PORT to number', () => {
      process.env.DB_PORT = '5432';

      const config = configuration();

      expect(config.database.port).toBe(5432);
      expect(typeof config.database.port).toBe('number');
    });

    it('should convert REDIS_PORT to number', () => {
      process.env.REDIS_PORT = '6380';

      const config = configuration();

      expect(config.redis.port).toBe(6380);
      expect(typeof config.redis.port).toBe('number');
    });

    it('should convert REDIS_TTL to number', () => {
      process.env.REDIS_TTL = '120';

      const config = configuration();

      expect(config.redis.ttl).toBe(120);
      expect(typeof config.redis.ttl).toBe('number');
    });

    it('should handle invalid values using defaults', () => {
      process.env.PORT = 'invalid';
      process.env.DB_PORT = '';
      process.env.REDIS_PORT = 'abc';

      const config = configuration();

      expect(config.port).toBe(4000); // default when parseInt fails
      expect(config.database.port).toBe(3306); // default
      expect(config.redis.port).toBe(6379); // default
    });
  });

  describe('Environment specific', () => {
    beforeEach(() => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
    });

    it('should configure for development environment', () => {
      process.env.NODE_ENV = 'development';

      const config = configuration();

      expect(config.environment).toBe('development');
    });

    it('should configure for production environment', () => {
      process.env.NODE_ENV = 'production';

      const config = configuration();

      expect(config.environment).toBe('production');
    });

    it('should use development as default when NODE_ENV is not defined', () => {
      delete process.env.NODE_ENV;

      const config = configuration();

      expect(config.environment).toBe('development');
    });
  });

  describe('Complete valid configuration', () => {
    it('should return complete configuration with all variables defined', () => {
      process.env.PORT = '3000';
      process.env.NODE_ENV = 'production';
      process.env.STRIPE_SECRET_KEY = 'sk_live_123456789';
      process.env.DB_HOST = 'prod-db.example.com';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'production_db';
      process.env.DB_PASS = 'super_secret_password';
      process.env.DB_USER = 'prod_user';
      process.env.REDIS_HOST = 'prod-redis.example.com';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_TTL = '300';

      const config = configuration();

      expect(config).toEqual({
        port: 3000,
        environment: 'production',
        database: {
          port: 5432,
          host: 'prod-db.example.com',
          name: 'production_db',
          pass: 'super_secret_password',
          user: 'prod_user',
        },
        redis: {
          host: 'prod-redis.example.com',
          port: 6380,
          ttl: 300,
        },
        stripe: {
          secretKey: 'sk_live_123456789',
        },
      });
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.DB_HOST = 'localhost';
      process.env.DB_NAME = 'test_db';
    });

    it('should handle zero values for ports', () => {
      process.env.PORT = '0';
      process.env.DB_PORT = '0';
      process.env.REDIS_PORT = '0';

      const config = configuration();

      expect(config.port).toBe(0);
      expect(config.database.port).toBe(0);
      expect(config.redis.port).toBe(0);
    });

    it('should handle whitespace in required variables', () => {
      process.env.STRIPE_SECRET_KEY = '   ';

      expect(() => configuration()).toThrow(
        'Missing required environment variables: STRIPE_SECRET_KEY',
      );
    });
  });
});
