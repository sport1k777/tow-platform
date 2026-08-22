import { BrandLogo } from './BrandLogo';

/** @deprecated Use BrandLogo */
export function BrandMark({ size = 36 }: { size?: number }) {
  return <BrandLogo size={size} />;
}
