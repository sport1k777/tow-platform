import { loadEnv } from '../config/env';
import { DevGeoProvider } from './dev-geo.provider';
import type { GeoProvider } from './geo.provider';
import { OsmGeoProvider } from './osm-geo.provider';

export function createGeoProvider(): GeoProvider {
  const env = loadEnv();

  switch (env.GEO_PROVIDER) {
    case 'dev':
      return new DevGeoProvider();
    case 'osm':
      return new OsmGeoProvider(env.NOMINATIM_URL, env.OSRM_URL, env.GEO_USER_AGENT);
    default: {
      const unsupported: never = env.GEO_PROVIDER;
      throw new Error(`Unsupported GEO_PROVIDER: ${String(unsupported)}`);
    }
  }
}
