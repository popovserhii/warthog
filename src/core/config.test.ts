import { Config } from './config';

describe('Config', () => {
  describe('Production', () => {
    it('throws if required values are not specified', async () => {
      process.env.NODE_ENV = 'production';

      const config = new Config({ configSearchPath: __dirname });

      // TODO: get more specific here. Good to know that it throws an error but can do better
      expect(config.loadSync).toThrow();
    });
  });

  describe('Development', () => {
    it('uses correct defaults', async () => {
      process.env.NODE_ENV = 'development';

      const config = new Config({ configSearchPath: __dirname });
      const vals = config.loadSync();

      expect(vals.WARTHOG_DB_HOST).toEqual('localhost');
    });
  });
});
