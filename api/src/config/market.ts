export const market = {
  countryCode: 'UA',
  currency: 'UAH',
  locale: 'uk-UA',
  phoneCountry: 'UA',
  phonePrefix: '+380',
  timezone: 'Europe/Kyiv',
} as const;

export type Market = typeof market;
