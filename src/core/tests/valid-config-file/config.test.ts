import { Config } from '../../config';

describe('Config (valid file)', () => {
  let config: Config;

  beforeEach(() => {
    config = new Config({ configSearchPath: __dirname });
  });

  it('loads static config', async () => {
    const vals: any = await config.loadStaticConfigSync();

    expect(vals.WARTHOG_GENERATED_FOLDER).toEqual('./foo');
    expect(vals.WARTHOG_MODELS_PATH).toEqual('./bar/baz');
    expect(vals.WARTHOG_RESOLVERS_PATH).toEqual('./r/e/s/o/l/v/e/r/s');
  });
});
