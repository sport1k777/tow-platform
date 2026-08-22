export const market = {
  countryCode: 'UA',
  currency: 'UAH',
  locale: 'uk-UA',
  phoneCountry: 'UA',
  phonePrefix: '+380',
  timezone: 'Europe/Kyiv',
} as const;

export type Market = typeof market;

export const documentTypes = [
  'drivers_license',
  'identity',
  'vehicle_registration',
  'insurance',
] as const;

export type DocumentType = (typeof documentTypes)[number];

/** Required KYC documents for a market. Other jurisdictions can return a different list. */
export function requiredDocumentsForMarket(
  countryCode: string = market.countryCode,
): readonly DocumentType[] {
  switch (countryCode) {
    case 'UA':
      return documentTypes;
    default:
      return documentTypes;
  }
}
