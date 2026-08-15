export const serviceKeys = ['tow', 'moving', 'cargo', 'roadside'] as const;

export type ServiceKey = (typeof serviceKeys)[number];

export type DestinationPolicy = 'required' | 'optional';

export const serviceDestinationPolicy: Record<ServiceKey, DestinationPolicy> = {
  tow: 'required',
  moving: 'required',
  cargo: 'required',
  roadside: 'optional',
};

export function isServiceKey(value: string | undefined): value is ServiceKey {
  return serviceKeys.includes(value as ServiceKey);
}
