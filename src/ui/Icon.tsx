import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/theme';

export const iconNames = {
  user: 'account-outline',
  profile: 'account-circle-outline',
  driver: 'steering',
  phone: 'phone-outline',
  message: 'message-text-outline',
  location: 'map-marker-outline',
  clock: 'clock-outline',
  orders: 'clipboard-text-outline',
  settings: 'cog-outline',
  payment: 'credit-card-outline',
  help: 'help-circle-outline',
  logout: 'logout',
  share: 'share-variant-outline',
  info: 'information-outline',
  home: 'home-variant-outline',
  chevron: 'chevron-right',
  back: 'chevron-left',
  star: 'star',
  check: 'check',
  close: 'close',
  tow: 'tow-truck',
  roadside: 'car-wrench',
  moving: 'truck-outline',
  cargo: 'truck-cargo-container',
  vehicle: 'car-outline',
  online: 'circle',
  earnings: 'cash',
  verification: 'shield-check-outline',
  documents: 'file-document-outline',
  insurance: 'shield-outline',
  search: 'magnify',
  camera: 'camera-outline',
  gallery: 'image-outline',
  trash: 'delete-outline',
  upload: 'upload-outline',
  license: 'card-account-details-outline',
  identity: 'badge-account-horizontal-outline',
  file: 'file-document-outline',
  alert: 'alert-circle-outline',
  refresh: 'refresh',
} as const;

export type IconName = keyof typeof iconNames;

export function Icon({
  name,
  size = 22,
  color = colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialCommunityIcons name={iconNames[name]} size={size} color={color} />;
}

export function serviceIcon(key: string): IconName {
  switch (key) {
    case 'tow':
      return 'tow';
    case 'roadside':
      return 'roadside';
    case 'moving':
      return 'moving';
    case 'cargo':
      return 'cargo';
    default:
      return 'tow';
  }
}
