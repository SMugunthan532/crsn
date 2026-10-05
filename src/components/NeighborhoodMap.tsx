import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MapPin, 
  Search, 
  Layers, 
  Compass, 
  Navigation, 
  SlidersHorizontal, 
  ExternalLink,
  Info,
  Clock,
  User,
  Star,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  X
} from 'lucide-react';
import { ItemDTO, ItemCategory, CATEGORY_RULES } from '../types';
import { CRSNSystem } from '../engine/CRSNSystem';
import { 
  getLocationForLocality, 
  calculateDistanceMiles, 
  formatDistance, 
  getDirectionsUrl,
  OBSIDIAN_MAP_STYLES,
  DEFAULT_MAP_CENTER,
  NEIGHBORHOOD_LOCALITIES
} from '../engine/util/locationData';
import { loadGoogleMaps } from '../engine/util/googleMapsLoader';

interface NeighborhoodMapProps {
  items: ItemDTO[];
  onBorrowItem: (item: ItemDTO) => void;
  onOpenChat: (recordOrUserId: string, peerName: string) => void;
  onViewOwnerDetails?: (locality: string, ownerName: string, ownerId: string) => void;
}

export const NeighborhoodMap: React.FC<NeighborhoodMapProps> = ({
  items,
  onBorrowItem,
  onOpenChat,
  onViewOwnerDetails
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLocality, setSelectedLocality] = useState<string>('ALL');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemDTO | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const system = CRSNSystem.getInstance();
  const currentUser = system.getCurrentUser();
  const currentUserLoc = currentUser ? getLocationForLocality(currentUser.getLocality()) : null;

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (selectedLocality !== 'ALL' && item.locality !== selectedLocality) return false;
      if (availableOnly && !item.isAvailable) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchOwner = item.ownerName.toLowerCase().includes(q);
        const matchLoc = item.locality.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        if (!matchTitle && !matchOwner && !matchLoc && !matchDesc) return false;
      }
      return true;
    });
  }, [items, selectedCategory, selectedLocality, availableOnly, searchQuery]);

  // Group filtered items by locality
  const itemsByLocality = useMemo(() => {
    const map = new Map<string, ItemDTO[]>();
    filteredItems.forEach((item) => {
      const loc = item.locality;
      if (!map.has(loc)) {
        map.set(loc, []);
      }
      map.get(loc)!.push(item);
    });
    return map;
  }, [filteredItems]);

  // Initialize Google Map
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setMapError(null);

    loadGoogleMaps()
      .then((googleMaps) => {
        if (!isMounted || !mapRef.current) return;

        const center = currentUserLoc
          ? { lat: currentUserLoc.lat, lng: currentUserLoc.lng }
          : { lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng };

        const map = new googleMaps.Map(mapRef.current, {
          center,
          zoom: 13.5,
          mapTypeId: mapType,
          styles: mapType === 'roadmap' ? OBSIDIAN_MAP_STYLES : undefined,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: true
        });

        googleMapRef.current = map;

        // Add circle representing the acting user's home location if available
        if (currentUser && currentUserLoc) {
          const userIcon: google.maps.Icon = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#3b82f6" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" fill="#2563eb" fill-opacity="0.85"></circle>
                <circle cx="12" cy="12" r="4" fill="#ffffff"></circle>
              </svg>
            `)}`,
            scaledSize: new googleMaps.Size(32, 32),
            anchor: new googleMaps.Point(16, 16)
          };

          const userMarker = new googleMaps.Marker({
            position: { lat: currentUserLoc.lat, lng: currentUserLoc.lng },
            map,
            title: `Your Location (${currentUser.getName()})`,
            icon: userIcon,
            zIndex: 999
          });

          const userInfoWindow = new googleMaps.InfoWindow({
            content: `
              <div style="padding: 6px; font-family: sans-serif; font-size: 12px; color: #1e293b;">
                <strong style="color: #2563eb;">You are here (${currentUser.getName()})</strong><br/>
                <span>${currentUserLoc.address}</span>
              </div>
            `
          });

          userMarker.addListener('click', () => {
            userInfoWindow.open(map, userMarker);
          });

          userMarkerRef.current = userMarker;
        }

        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Google Map initialization error:', err);
        setMapError('Failed to load Google Maps. Please check your API key.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update Markers whenever filteredItems or map changes
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !window.google?.maps) return;

    // Clear existing item markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Create marker for each locality with count and details
    itemsByLocality.forEach((locItems, locality) => {
      const locInfo = getLocationForLocality(locality);
      const availableCount = locItems.filter((i) => i.isAvailable).length;

      // Pin Color: Amber if available items exist, Slate if all borrowed
      const pinColor = availableCount > 0 ? '#f59e0b' : '#64748b';
      const labelText = String(locItems.length);

      const customSvgIcon: google.maps.Icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56">
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.5"/>
              </filter>
            </defs>
            <path d="M24 0C10.745 0 0 10.745 0 24c0 18 24 32 24 32s24-14 24-32C48 10.745 37.255 0 24 0z" fill="${pinColor}" filter="url(#shadow)"/>
            <circle cx="24" cy="22" r="16" fill="#121319" stroke="#ffffff" stroke-width="1.5"/>
            <text x="24" y="27" font-size="14" font-weight="bold" font-family="monospace" fill="#ffffff" text-anchor="middle">${labelText}</text>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(42, 49),
        anchor: new window.google.maps.Point(21, 49)
      };

      const marker = new window.google.maps.Marker({
        position: { lat: locInfo.lat, lng: locInfo.lng },
        map,
        title: `${locInfo.name} (${locItems.length} resources)`,
        icon: customSvgIcon,
        animation: window.google.maps.Animation.DROP
      });

      marker.addListener('click', () => {
        // Center smoothly
        map.panTo({ lat: locInfo.lat, lng: locInfo.lng });
        map.setZoom(15);

        // Select the first available item in this locality for sidebar inspection
        setSelectedItem(locItems[0] || null);

        // Build InfoWindow HTML
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
        }

        const distanceText = currentUserLoc
          ? formatDistance(calculateDistanceMiles(currentUserLoc.lat, currentUserLoc.lng, locInfo.lat, locInfo.lng))
          : '';

        const contentString = `
          <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 260px; padding: 4px; color: #0f172a;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <strong style="font-size: 13px; color: #020617; font-family: monospace;">${locality}</strong>
              <span style="font-size: 10px; background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 9999px; font-weight: 600;">
                ${availableCount} available
              </span>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
              ${locInfo.address}
            </div>
            ${distanceText ? `<div style="font-size: 11px; color: #d97706; font-weight: 600; margin-bottom: 8px;">📍 ${distanceText}</div>` : ''}
            <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 11px;">
              <span style="color: #64748b;">Top item:</span> <strong>${locItems[0]?.title || 'Multiple Items'}</strong>
            </div>
          </div>
        `;

        const infoWindow = new window.google.maps.InfoWindow({
          content: contentString
        });

        infoWindow.open(map, marker);
        activeInfoWindowRef.current = infoWindow;
      });

      markersRef.current.push(marker);
    });
  }, [itemsByLocality, currentUserLoc]);

  // Center map on user location
  const handleCenterOnUser = () => {
    if (googleMapRef.current && currentUserLoc) {
      googleMapRef.current.panTo({ lat: currentUserLoc.lat, lng: currentUserLoc.lng });
      googleMapRef.current.setZoom(15);
    }
  };

  // Toggle satellite mode
  const handleToggleMapType = () => {
    const nextType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(nextType);
    if (googleMapRef.current && window.google?.maps) {
      googleMapRef.current.setMapTypeId(nextType);
      googleMapRef.current.setOptions({
        styles: nextType === 'roadmap' ? OBSIDIAN_MAP_STYLES : undefined
      });
    }
  };

  // Pan to a specific item
  const handleFocusItem = (item: ItemDTO) => {
    setSelectedItem(item);
    const locInfo = getLocationForLocality(item.locality);
    if (googleMapRef.current) {
      googleMapRef.current.panTo({ lat: locInfo.lat, lng: locInfo.lng });
      googleMapRef.current.setZoom(15.5);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Filter Bar */}
      <div className="bg-[#151720] border border-[#242636] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Header Title with verified map status */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-mono">
                  Neighborhood Owner & Resource Map
                </h2>
                <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Google Maps Live</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Explore where neighbors are offering resources, pickup lockers, and calculate walking or driving distances.
              </p>
            </div>
          </div>

          {/* Map Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            {currentUser && (
              <button
                id="map-center-home-btn"
                onClick={handleCenterOnUser}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#1E202D] hover:bg-[#282B3D] text-slate-300 text-xs font-semibold border border-[#2E3246] transition"
                title="Pan to your neighborhood"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                <span>My Home</span>
              </button>
            )}

            <button
              onClick={handleToggleMapType}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#1E202D] hover:bg-[#282B3D] text-slate-300 text-xs font-semibold border border-[#2E3246] transition"
              title="Toggle Roadmap and Satellite View"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="capitalize">{mapType === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
            </button>

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#1E202D] hover:bg-[#282B3D] text-slate-300 text-xs font-semibold border border-[#2E3246] transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>{showSidebar ? 'Hide List' : 'Show List'}</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[#222434] text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items or owner..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1B1D28] border border-[#2C2F40] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#1B1D28] border border-[#2C2F40] text-white focus:outline-none focus:border-amber-500 text-xs"
            >
              <option value="ALL">All Categories ({items.length})</option>
              <option value="Tool">Tools & Hardware</option>
              <option value="Book">Books & Learning</option>
              <option value="MedicalEquipment">Medical & Mobility</option>
              <option value="Electronics">Electronics & Media</option>
            </select>
          </div>

          {/* Locality Dropdown */}
          <div>
            <select
              value={selectedLocality}
              onChange={(e) => setSelectedLocality(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#1B1D28] border border-[#2C2F40] text-white focus:outline-none focus:border-amber-500 text-xs"
            >
              <option value="ALL">All Localities (4 Neighborhoods)</option>
              {Object.keys(NEIGHBORHOOD_LOCALITIES).map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Available Only Toggle */}
          <label className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-[#1B1D28] border border-[#2C2F40] text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="rounded text-amber-500 bg-[#141520] border-[#2C2F40] focus:ring-0"
            />
            <span className="text-xs">Ready for Pickup Only</span>
          </label>
        </div>
      </div>

      {/* Main Map Workspace: Interactive Google Map + Side Rail */}
      <div className="relative rounded-2xl overflow-hidden border border-[#242636] bg-[#111219] shadow-2xl flex flex-col lg:flex-row h-[620px]">
        {/* The Google Map Container */}
        <div className="relative flex-1 h-full min-h-[350px]">
          <div ref={mapRef} className="w-full h-full" />

          {/* Map Loading State */}
          {isLoading && (
            <div className="absolute inset-0 bg-[#0E1017]/85 backdrop-blur-xs flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-300">Rendering Google Map tiles...</p>
            </div>
          )}

          {/* Map Error Fallback */}
          {mapError && (
            <div className="absolute inset-0 bg-[#12141F] p-8 flex flex-col items-center justify-center text-center space-y-3">
              <Info className="w-10 h-10 text-amber-400" />
              <h3 className="text-base font-bold text-white font-mono">Google Map Loading Notice</h3>
              <p className="text-xs text-slate-400 max-w-md">{mapError}</p>
              <p className="text-xs text-slate-500">
                You can still browse owner addresses and coordinate pickup through the side list.
              </p>
            </div>
          )}

          {/* Map Legend Overlay */}
          <div className="absolute top-3 left-3 bg-[#141622]/90 backdrop-blur-md border border-[#2B2E42] rounded-xl p-2.5 text-[11px] text-slate-300 shadow-xl pointer-events-auto space-y-1.5 hidden sm:block">
            <div className="font-bold text-white font-mono text-[10px] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
              <MapPin className="w-3 h-3 text-amber-400" />
              <span>Map Markers</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-black shrink-0" />
              <span>Available Hub ({filteredItems.filter((i) => i.isAvailable).length})</span>
            </div>
            {currentUser && (
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 border border-white shrink-0" />
                <span>Your Location ({currentUser.getName().split(' ')[0]})</span>
              </div>
            )}
          </div>

          {/* Selected Item Floating Card on Map */}
          {selectedItem && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-[#151722]/95 backdrop-blur-md border border-[#2D3044] rounded-2xl p-4 shadow-2xl space-y-2.5 z-20">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    {selectedItem.category}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5 line-clamp-1">
                    {selectedItem.title}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Owner and distance */}
              <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-[#25283A]">
                <div className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Owner: <strong className="text-white">{selectedItem.ownerName}</strong></span>
                </div>
                {currentUserLoc && (
                  <span className="text-amber-400 font-mono text-[11px]">
                    {formatDistance(
                      calculateDistanceMiles(
                        currentUserLoc.lat,
                        currentUserLoc.lng,
                        getLocationForLocality(selectedItem.locality).lat,
                        getLocationForLocality(selectedItem.locality).lng
                      )
                    )}
                  </span>
                )}
              </div>

              {/* Address */}
              <p className="text-[11px] text-slate-400 font-mono flex items-center">
                <MapPin className="w-3 h-3 text-slate-500 mr-1 shrink-0" />
                {getLocationForLocality(selectedItem.locality).address}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-1">
                {selectedItem.isAvailable ? (
                  <button
                    onClick={() => onBorrowItem(selectedItem)}
                    className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-sm transition"
                  >
                    Borrow Resource
                  </button>
                ) : (
                  <span className="flex-1 py-1.5 rounded-lg bg-[#202230] text-slate-400 text-center text-xs font-semibold">
                    Currently In Use
                  </span>
                )}

                <button
                  onClick={() => onOpenChat(selectedItem.ownerId, selectedItem.ownerName)}
                  className="px-3 py-1.5 rounded-lg bg-[#222434] hover:bg-[#2c3044] text-white text-xs font-semibold border border-[#33374d] transition"
                  title="Chat with owner"
                >
                  Chat
                </button>

                <a
                  href={getDirectionsUrl(
                    getLocationForLocality(selectedItem.locality).address,
                    getLocationForLocality(selectedItem.locality).lat,
                    getLocationForLocality(selectedItem.locality).lng
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-[#222434] hover:bg-[#2c3044] text-amber-400 border border-[#33374d]"
                  title="Open Google Maps Directions"
                >
                  <Navigation className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Side List of Resources & Owners */}
        {showSidebar && (
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#242636] bg-[#151720] flex flex-col h-72 lg:h-full">
            {/* Sidebar header */}
            <div className="p-3.5 bg-[#1A1C28] border-b border-[#242636] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Neighborhood Stations ({filteredItems.length})
                </h3>
                <p className="text-[10px] text-slate-400">Click any resource to locate on map</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#242738] text-[10px] text-slate-300 font-mono">
                {itemsByLocality.size} Localities
              </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                  <MapPin className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-slate-300 font-mono">No matching resources in this zone.</p>
                  <p className="text-[11px] text-slate-500">Try adjusting your filters above.</p>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const locInfo = getLocationForLocality(item.locality);
                  const isSelected = selectedItem?.itemId === item.itemId;
                  const dist = currentUserLoc
                    ? calculateDistanceMiles(currentUserLoc.lat, currentUserLoc.lng, locInfo.lat, locInfo.lng)
                    : 0;

                  return (
                    <div
                      key={item.itemId}
                      onClick={() => handleFocusItem(item)}
                      className={`p-3 rounded-xl border transition cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                          : 'bg-[#191B26] border-[#252838] hover:border-[#35394E]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                            {item.category}
                          </span>
                          <h4 className="text-xs font-bold text-white font-mono leading-tight mt-0.5">
                            {item.title}
                          </h4>
                        </div>
                        {item.isAvailable ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                            Ready
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#242738] text-slate-400 shrink-0">
                            Borrowed
                          </span>
                        )}
                      </div>

                      {/* Owner & locality */}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-200">{item.ownerName}</span>
                        </div>
                        <span className="text-slate-400 flex items-center">
                          <MapPin className="w-3 h-3 mr-0.5 text-amber-400" />
                          {item.locality}
                        </span>
                      </div>

                      {/* Distance & Address */}
                      <div className="mt-2 pt-2 border-t border-[#232637] flex items-center justify-between text-[10px]">
                        <span className="text-amber-300 font-mono">
                          {currentUserLoc ? formatDistance(dist) : locInfo.address}
                        </span>

                        <div className="flex items-center space-x-1">
                          {item.isAvailable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onBorrowItem(item);
                              }}
                              className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold"
                            >
                              Borrow
                            </button>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Neighborhood Pickup Guidelines Banner */}
      <div className="bg-[#151720] border border-[#242636] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white font-mono">
              Safe Neighborhood Porch & Lockbox Guidelines
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Always coordinate your exact pickup window with the owner via direct messaging before heading over. Respect private gates and driveways.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400 shrink-0 font-mono">
          <span className="text-amber-400 font-bold">4 Verified Localities</span>
          <span>•</span>
          <span>Zero Middleman Fees</span>
        </div>
      </div>
    </div>
  );
};
