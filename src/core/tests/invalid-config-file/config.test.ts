import { Config } from '../../config';

describe.only('Config (invalid file)', () => {
  it('does not allow invalid config keys', async done => {
    const config = new Config({ configSearchPath: __dirname });

    expect.assertions(2);
    try {
      config.loadStaticConfigSync();
    } catch (error) {
      expect(error.message).toContain('invalid keys');
      expect(error.message).toContain('badkey1');
    }

    done();
  });
});
