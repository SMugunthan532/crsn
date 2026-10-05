import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
  'AIzaSyCP399klCj6K-kOP_wtSTL_WDHwD0WPExM';

let isConfigured = false;
let mapsPromise: Promise<typeof google.maps> | null = null;

/**
 * Configure and load the Google Maps API safely with library caching.
 * Ensures google.maps and the maps/marker libraries are fully instantiated before returning.
 */
export async function loadGoogleMaps(): Promise<typeof google.maps> {
  // If window.google.maps is already initialized with Map class, return it immediately
  if (typeof window !== 'undefined' && (window as any).google?.maps?.Map) {
    return (window as any).google.maps;
  }

  if (!mapsPromise) {
    mapsPromise = (async () => {
      if (!isConfigured) {
        setOptions({
          key: GOOGLE_MAPS_API_KEY,
          v: 'weekly'
        });
        isConfigured = true;
      }

      // Explicitly load maps and marker libraries
      const [mapsLib] = await Promise.all([
        importLibrary('maps'),
        importLibrary('marker')
      ]);

      const gMaps = (window as any).google?.maps || {};

      // If google.maps.Map is not directly set on gMaps, polyfill from the resolved maps library
      if (!gMaps.Map && (mapsLib as any)?.Map) {
        gMaps.Map = (mapsLib as any).Map;
      }
      if (!gMaps.InfoWindow && (mapsLib as any)?.InfoWindow) {
        gMaps.InfoWindow = (mapsLib as any).InfoWindow;
      }

      return gMaps as typeof google.maps;
    })();
  }

  return mapsPromise;
}
