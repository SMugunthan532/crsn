/**
 * Neighborhood Geographic & Coordinate Data for CRSN
 * Real coordinates centered around a neighborhood district with verified addresses,
 * pickup guidelines, and distance calculation utilities.
 */

export interface NeighborhoodLocation {
  locality: string;
  name: string;
  address: string;
  crossStreets: string;
  lat: number;
  lng: number;
  pickupZoneNotes: string;
}

export const NEIGHBORHOOD_LOCALITIES: Record<string, NeighborhoodLocation> = {
  'Maple Heights': {
    locality: 'Maple Heights',
    name: 'Maple Heights North',
    address: '842 Maple Heights Blvd, Seattle, WA 98105',
    crossStreets: 'Between 8th Ave & Pine Crest Rd',
    lat: 47.6587,
    lng: -122.3132,
    pickupZoneNotes: 'Covered front porch with labeled weatherproof pickup locker. Ring doorbell if needed.'
  },
  'Oakridge District': {
    locality: 'Oakridge District',
    name: 'Oakridge Historic District',
    address: '1420 Oakridge Way, Seattle, WA 98112',
    crossStreets: 'Corner of 14th St & Sycamore Ave',
    lat: 47.6285,
    lng: -122.2985,
    pickupZoneNotes: 'Side driveway access; items placed on sheltered workbench near garden trellis.'
  },
  'Sunnyvale Community': {
    locality: 'Sunnyvale Community',
    name: 'Sunnyvale Terrace Commons',
    address: '518 Sunnyvale Terrace, Seattle, WA 98103',
    crossStreets: 'Off Greenlake Dr & 5th Ave',
    lat: 47.6740,
    lng: -122.3325,
    pickupZoneNotes: 'First floor courtyard entrance, locker box #3. Wheelchair accessible ramp available.'
  },
  'Riverside Green': {
    locality: 'Riverside Green',
    name: 'Riverside Green Parkside',
    address: '220 Riverside Green Way, Seattle, WA 98102',
    crossStreets: 'Adjacent to Riverside Community Garden & 2nd St',
    lat: 47.6415,
    lng: -122.3218,
    pickupZoneNotes: 'Front gate has keypad latch. Community tool rack under the cedar pergola.'
  }
};

// Default center for the neighborhood map
export const DEFAULT_MAP_CENTER = {
  lat: 47.6510,
  lng: -122.3160,
  zoom: 13
};

/**
 * Calculate straight-line distance in miles between two coordinates using Haversine formula
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Format distance into a human-readable badge text
 */
export function formatDistance(miles: number): string {
  if (miles <= 0.1) return 'Same Block (< 0.1 mi)';
  if (miles < 1.0) {
    const minWalk = Math.max(2, Math.round(miles * 20));
    return `${miles.toFixed(1)} mi • ~${minWalk} min walk`;
  }
  const minDrive = Math.max(3, Math.round(miles * 3.5));
  return `${miles.toFixed(1)} mi • ~${minDrive} min drive`;
}

/**
 * Resolve location info by locality string
 */
export function getLocationForLocality(locality: string): NeighborhoodLocation {
  return (
    NEIGHBORHOOD_LOCALITIES[locality] || {
      locality: locality || 'Maple Heights',
      name: locality || 'Maple Heights',
      address: `${locality}, Seattle, WA`,
      crossStreets: 'Neighborhood Community Zone',
      lat: 47.6587,
      lng: -122.3132,
      pickupZoneNotes: 'Contact owner directly for porch or lockbox pickup coordination.'
    }
  );
}

/**
 * Generate Google Maps navigation URL for directions
 */
export function getDirectionsUrl(address: string, lat?: number, lng?: number): string {
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

/**
 * Dark Obsidian Map Styling for Google Maps to seamlessly match CRSN dark palette
 */
export const OBSIDIAN_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#161822' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#161822' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8892b0' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d1d5db' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1a2723' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#52b788' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#272a3b' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1c1e2b' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3d425c' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2b2f42' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#222536' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f59e0b' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0d131f' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0d131f' }]
  }
];
