import type { VehicleCategory } from '@/config/services';
import { copy } from '@/copy/uk';

export const evacuatorVehicles = ['car', 'suv', 'van', 'truck', 'motorcycle'] as const;
export type EvacuatorVehicle = (typeof evacuatorVehicles)[number];

export const cargoKinds = ['furniture', 'appliances', 'building', 'parcel', 'other'] as const;
export type CargoKind = (typeof cargoKinds)[number];

export const movingWhats = ['apartment', 'office', 'items', 'other'] as const;
export type MovingWhat = (typeof movingWhats)[number];

export const movingVolumes = ['boxes', 'small', 'medium', 'large'] as const;
export type MovingVolume = (typeof movingVolumes)[number];

export const roadsideProblems = [
  'battery',
  'fuel',
  'tire',
  'keys',
  'winch',
  'other',
] as const;
export type RoadsideProblem = (typeof roadsideProblems)[number];

export const cargoClasses = ['van', 't15', 't35', 't5', 'truck'] as const;
export type CargoClass = (typeof cargoClasses)[number];

export const moverCounts = [2, 4] as const;
export type MoverCount = (typeof moverCounts)[number];

export const yesNo = ['yes', 'no'] as const;
export type YesNo = (typeof yesNo)[number];

export function toApiVehicle(kind: EvacuatorVehicle | null): VehicleCategory | undefined {
  if (!kind) {
    return undefined;
  }
  return kind;
}

export function evacuatorVehicleLabel(kind: EvacuatorVehicle): string {
  switch (kind) {
    case 'car':
      return copy.vehicleCar;
    case 'suv':
      return copy.vehicleSuv;
    case 'van':
      return copy.vehicleVan;
    case 'truck':
      return copy.vehicleTruck;
    case 'motorcycle':
      return copy.vehicleMotorcycle;
  }
}

export function cargoKindLabel(kind: CargoKind): string {
  switch (kind) {
    case 'furniture':
      return copy.cargoFurniture;
    case 'appliances':
      return copy.cargoAppliances;
    case 'building':
      return copy.cargoBuilding;
    case 'parcel':
      return copy.cargoParcel;
    case 'other':
      return copy.cargoOther;
  }
}

export function movingWhatLabel(kind: MovingWhat): string {
  switch (kind) {
    case 'apartment':
      return copy.movingApartment;
    case 'office':
      return copy.movingOffice;
    case 'items':
      return copy.movingItems;
    case 'other':
      return copy.movingOther;
  }
}

export function movingVolumeLabel(kind: MovingVolume): string {
  switch (kind) {
    case 'boxes':
      return copy.movingVolumeBoxes;
    case 'small':
      return copy.movingVolumeSmall;
    case 'medium':
      return copy.movingVolumeMedium;
    case 'large':
      return copy.movingVolumeLarge;
  }
}

export function roadsideProblemLabel(kind: RoadsideProblem): string {
  switch (kind) {
    case 'battery':
      return copy.roadBattery;
    case 'fuel':
      return copy.roadFuel;
    case 'tire':
      return copy.roadTire;
    case 'keys':
      return copy.roadKeys;
    case 'winch':
      return copy.roadWinch;
    case 'other':
      return copy.roadOther;
  }
}

export function cargoClassLabel(kind: CargoClass): string {
  switch (kind) {
    case 'van':
      return copy.cargoClassVan;
    case 't15':
      return copy.cargoClassT15;
    case 't35':
      return copy.cargoClassT35;
    case 't5':
      return copy.cargoClassT5;
    case 'truck':
      return copy.cargoClassTruck;
  }
}

export function moverCountLabel(count: MoverCount): string {
  return count === 2 ? copy.moversTwo : copy.moversFour;
}

export function yesNoLabel(value: YesNo): string {
  return value === 'yes' ? copy.yes : copy.no;
}
