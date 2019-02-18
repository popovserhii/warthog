import { ObjectUtil } from './object';

describe('ObjectUtil', () => {
  describe('prefixKeys', () => {
    it('prefixes correctly', async () => {
      const original = {
        one: 1,
        two: 2
      };

      expect(ObjectUtil.prefixKeys(original, 'PREFIX_')).toEqual({
        PREFIX_one: 1,
        PREFIX_two: 2
      });
    });
  });

  describe('constantizeKeys', () => {
    it('constantizes correctly', async () => {
      const original = {
        fourFive: 45,
        oneTwoThree: 123
      };

      expect(ObjectUtil.constantizeKeys(original)).toEqual({
        FOUR_FIVE: 45,
        ONE_TWO_THREE: 123
      });
    });
  });
});
