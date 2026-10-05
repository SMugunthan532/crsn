import React, { useEffect, useRef, useState } from 'react';
import { 
  MapPin, 
  X, 
  ExternalLink, 
  Navigation, 
  Clock, 
  User, 
  Star, 
  ShieldCheck, 
  Info,
  Layers,
  MessageSquare
} from 'lucide-react';
import { ItemDTO } from '../types';
import { CRSNSystem } from '../engine/CRSNSystem';
import { 
  getLocationForLocality, 
  calculateDistanceMiles, 
  formatDistance, 
  getDirectionsUrl,
  OBSIDIAN_MAP_STYLES
} from '../engine/util/locationData';
import { loadGoogleMaps } from '../engine/util/googleMapsLoader';

interface OwnerLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locality: string;
  ownerName: string;
  ownerId?: string;
  itemTitle?: string;
  onOpenChat?: (recordOrUserId: string, peerName: string) => void;
  onBorrowItem?: (item: ItemDTO) => void;
}

export const OwnerLocationModal: React.FC<OwnerLocationModalProps> = ({
  isOpen,
  onClose,
  locality,
  ownerName,
  ownerId,
  itemTitle,
  onOpenChat,
  onBorrowItem
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const system = CRSNSystem.getInstance();
  const currentUser = system.getCurrentUser();
  const locationInfo = getLocationForLocality(locality);

  // User's location coordinates
  const currentUserLoc = currentUser ? getLocationForLocality(currentUser.getLocality()) : null;
  const distanceMiles = currentUserLoc 
    ? calculateDistanceMiles(currentUserLoc.lat, currentUserLoc.lng, locationInfo.lat, locationInfo.lng)
    : 0;

  // Other items owned by this owner
  const ownerItems = system.itemService
    .getAllItems()
    .map(i => i.toDTO())
    .filter(i => (ownerId ? i.ownerId === ownerId : i.ownerName === ownerName));

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingMap(true);
    setMapError(null);

    loadGoogleMaps()
      .then((googleMaps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const map = new googleMaps.Map(mapContainerRef.current, {
          center: { lat: locationInfo.lat, lng: locationInfo.lng },
          zoom: 16,
          mapTypeId: mapType,
          styles: mapType === 'roadmap' ? OBSIDIAN_MAP_STYLES : undefined,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: true
        });

        mapInstanceRef.current = map;

        // Custom SVG Pin for Owner Location
        const svgIcon: google.maps.Icon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#f59e0b" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3" fill="#000000"></circle>
            </svg>
          `)}`,
          scaledSize: new googleMaps.Size(42, 42),
          anchor: new googleMaps.Point(21, 42)
        };

        const marker = new googleMaps.Marker({
          position: { lat: locationInfo.lat, lng: locationInfo.lng },
          map,
          title: `${ownerName}'s Residence & Pickup Station`,
          icon: svgIcon,
          animation: googleMaps.Animation.DROP
        });

        markerRef.current = marker;

        // Info Window on pin
        const infoWindow = new googleMaps.InfoWindow({
          content: `
            <div style="padding: 8px; color: #111827; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
              <strong style="font-size: 13px; color: #000;">${ownerName}'s Pickup Zone</strong><br/>
              <span style="color: #4b5563;">${locationInfo.address}</span><br/>
              <span style="color: #d97706; font-weight: 600;">${locality}</span>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        // Add circle representing the quiet residential neighborhood zone
        new googleMaps.Circle({
          strokeColor: '#f59e0b',
          strokeOpacity: 0.8,
          strokeWeight: 1.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.12,
          map,
          center: { lat: locationInfo.lat, lng: locationInfo.lng },
          radius: 120 // 120 meters
        });

        setIsLoadingMap(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error loading Google Map:', err);
        setMapError('Unable to load Google Map. Please verify network or Google Maps API key.');
        setIsLoadingMap(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, locality, ownerName, mapType]);

  const toggleMapType = () => {
    const nextType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(nextType);
    if (mapInstanceRef.current && window.google?.maps) {
      mapInstanceRef.current.setMapTypeId(nextType);
      mapInstanceRef.current.setOptions({
        styles: nextType === 'roadmap' ? OBSIDIAN_MAP_STYLES : undefined
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#151720] border border-[#2D3043] rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1B1D28] border-b border-[#242636] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white font-mono">Owner Pickup Location</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                  Google Maps Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {ownerName} • {locality}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMapType}
              className="px-2.5 py-1.5 rounded-lg bg-[#242738] hover:bg-[#2e3248] text-slate-300 text-xs font-mono flex items-center space-x-1.5 border border-[#34384e] transition"
              title="Toggle Satellite / Road Map"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="capitalize">{mapType === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#252838] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Google Map Display Container */}
          <div className="relative w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-[#2D3043] bg-[#111219]">
            <div ref={mapContainerRef} className="w-full h-full" />

            {isLoadingMap && (
              <div className="absolute inset-0 bg-[#12131C]/90 flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-300 font-mono">Loading Google Map location...</span>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 bg-[#161822] p-6 flex flex-col items-center justify-center text-center space-y-2">
                <Info className="w-8 h-8 text-amber-400" />
                <p className="text-white font-bold text-sm">Google Map Coordinates</p>
                <p className="text-slate-400 text-xs">{locationInfo.address}</p>
                <a
                  href={getDirectionsUrl(locationInfo.address, locationInfo.lat, locationInfo.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs"
                >
                  <span>Open directly in Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Distance badge overlay */}
            {currentUser && (
              <div className="absolute bottom-3 left-3 bg-[#141622]/95 backdrop-blur-md border border-[#2B2E42] px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs text-white shadow-lg font-mono">
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                <span>From you: <strong>{formatDistance(distanceMiles)}</strong></span>
              </div>
            )}
          </div>

          {/* Location & Pickup Details Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#191B26] border border-[#262838] space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400 flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
                  Address & Cross Streets
                </span>
              </div>
              <p className="text-white font-semibold text-xs font-mono leading-snug">
                {locationInfo.address}
              </p>
              <p className="text-slate-400 text-[11px]">
                {locationInfo.crossStreets}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#191B26] border border-[#262838] space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400 flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                  Pickup Instructions
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {locationInfo.pickupZoneNotes}
              </p>
            </div>
          </div>

          {/* Items Available at this Location */}
          {ownerItems.length > 0 && (
            <div className="p-4 rounded-xl bg-[#191B26] border border-[#262838] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white font-mono flex items-center space-x-2">
                  <span>Resources Available from {ownerName} ({ownerItems.length})</span>
                </h4>
                <span className="text-[11px] text-amber-400 font-mono">Same pickup station</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ownerItems.map((item) => (
                  <div
                    key={item.itemId}
                    className="p-2.5 rounded-lg bg-[#202230] border border-[#2D3043] flex items-center justify-between hover:border-amber-500/40 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-white font-semibold truncate font-mono text-[11px]">{item.title}</p>
                      <span className="text-[10px] text-slate-400">{item.category} • {item.borrowDurationDays}d loan</span>
                    </div>

                    {item.isAvailable ? (
                      onBorrowItem && (
                        <button
                          onClick={() => {
                            onClose();
                            onBorrowItem(item);
                          }}
                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] shrink-0 transition"
                        >
                          Borrow
                        </button>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 shrink-0">
                        Borrowed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#1A1C27] border-t border-[#242636] flex items-center justify-between">
          <a
            href={getDirectionsUrl(locationInfo.address, locationInfo.lat, locationInfo.lng)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 text-xs text-amber-400 hover:text-amber-300 font-bold px-3 py-2 rounded-xl bg-[#222434] border border-[#32364C] transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open in Google Maps App</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>

          <div className="flex items-center space-x-2">
            {onOpenChat && (
              <button
                onClick={() => {
                  onClose();
                  onOpenChat(ownerId || 'U101', ownerName);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#252838] hover:bg-[#2f3346] text-white text-xs font-semibold border border-[#383d54] transition"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Coordinate Pickup</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
