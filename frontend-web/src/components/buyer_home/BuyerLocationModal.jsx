'use client';

import { useState, useEffect, useRef } from 'react';
import API_BASE from '@/utils/config';

export default function BuyerLocationModal({ isOpen, onClose, onLocationSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [detectingGps, setDetectingGps] = useState(false);
  const searchInputRef = useRef(null);
  const debounceTimer = useRef(null);

  // Load existing location from localStorage on mount/open
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('emahu_buyer_location');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.address) {
            setSelectedLoc(parsed);
          }
        } else {
          const coordsStr = localStorage.getItem('emahu_buyer_coordinates');
          const cityStr = localStorage.getItem('emahu_buyer_city');
          if (coordsStr) {
            const coords = JSON.parse(coordsStr);
            setSelectedLoc({
              address: cityStr || 'Ahmedabad, Gujarat',
              latitude: coords.latitude,
              longitude: coords.longitude
            });
          }
        }
      } catch (err) {
        console.error('Failed to load buyer location:', err);
      }
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setSuggestions([]);
      setErrorMsg('');
    }
  }, [isOpen]);

  // Debounced search via Google Places API (New) backend endpoint
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const res = await fetch(`${API_BASE}/api/location/search?query=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setSuggestions(data.data);
          if (data.data.length === 0) {
            setErrorMsg('Unable to find this location. Try another search term.');
          }
        } else {
          setErrorMsg(data.error || 'Unable to find this location.');
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Places search failed:', err);
        setErrorMsg('Unable to find this location right now.');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  const handleSelectSuggestion = async (item) => {
    try {
      setLoading(true);
      setErrorMsg('');

      let locData = {
        address: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        city: item.city || '',
        state: item.state || ''
      };

      // If item does not contain exact coordinates, fetch details
      if (locData.latitude === undefined || locData.longitude === undefined) {
        const res = await fetch(`${API_BASE}/api/location/details?placeId=${encodeURIComponent(item.placeId)}`);
        const data = await res.json();
        if (data.success && data.data) {
          locData = data.data;
        } else {
          throw new Error(data.error || 'Could not fetch place coordinates');
        }
      }

      saveAndNotifyLocation(locData);
    } catch (err) {
      console.error('Error getting location details:', err);
      setErrorMsg('Failed to select location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveAndNotifyLocation = (loc) => {
    if (!loc || loc.latitude === undefined || loc.longitude === undefined) {
      setErrorMsg('Please select a valid location with coordinates.');
      return;
    }

    setSelectedLoc(loc);
    localStorage.setItem('emahu_buyer_location', JSON.stringify(loc));
    localStorage.setItem('emahu_buyer_coordinates', JSON.stringify({
      latitude: loc.latitude,
      longitude: loc.longitude
    }));

    if (loc.city || loc.address) {
      const displayCity = loc.city || loc.address.split(',')[0].trim();
      localStorage.setItem('emahu_buyer_city', displayCity);
    }

    // Dispatch global events for instant reactive distance updates across open pages
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('emahu_location_changed', { detail: loc }));

    if (onLocationSelect) {
      onLocationSelect(loc);
    }

    onClose();
  };

  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          // Resolve reverse address via Backend / Google Geocoding / OSM
          let addressName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          let cityName = 'Current Location';
          let stateName = 'Gujarat';

          try {
            const res = await fetch(`${API_BASE}/api/location/reverse?lat=${lat}&lon=${lon}`);
            const data = await res.json();
            if (data.success && data.data) {
              addressName = data.data.address || addressName;
              cityName = data.data.city || cityName;
              stateName = data.data.state || stateName;
            }
          } catch (e) {
            console.warn('Backend reverse geocoding fallback:', e);
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
              const data = await res.json();
              if (data && data.display_name) {
                addressName = data.display_name;
                cityName = data.address?.city || data.address?.town || data.address?.suburb || data.address?.state_district || 'Current Location';
                stateName = data.address?.state || 'Gujarat';
              }
            } catch (_) {}
          }

          const locObj = {
            address: addressName,
            latitude: lat,
            longitude: lon,
            city: cityName,
            state: stateName
          };

          saveAndNotifyLocation(locObj);
        } catch (err) {
          console.error(err);
          setErrorMsg('Unable to determine location from GPS.');
        } finally {
          setDetectingGps(false);
        }
      },
      (geoErr) => {
        console.warn('GPS permission denied/failed:', geoErr);
        setDetectingGps(false);
        setErrorMsg('Location permission denied. Please search your address above.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes modalSlideIn {
            from { opacity: 0; transform: scale(0.96) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .loc-sugg-item:hover {
            background-color: #f1f5f9;
          }
        `}</style>

        {/* Modal Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(65, 105, 225, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              📍
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Select Location</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Search address for accurate road distances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* Currently Selected Location Badge */}
          {selectedLoc && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>Selected Location</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                  {selectedLoc.address || `${selectedLoc.latitude?.toFixed(4)}, ${selectedLoc.longitude?.toFixed(4)}`}
                </div>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#4169e1',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                Change Location
              </button>
            </div>
          )}

          {/* Search Input */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search address, area, or pincode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '46px',
                padding: '0 40px 0 42px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.9rem',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4169e1'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', fontSize: '1rem', lineHeight: 1 }}
              >
                ×
              </button>
            )}
          </div>

          {/* Optional Current GPS Location Button */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={detectingGps}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: detectingGps ? 'wait' : 'pointer',
              marginBottom: '16px',
              transition: 'background 0.15s ease'
            }}
          >
            {detectingGps ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeOpacity="0.3" /><path d="M21 12a9 9 0 0 0-9-9" /></svg>
                Detecting GPS Location...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4169e1" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polygon points="12 8 12 12 14 14" /></svg>
                Use Current GPS Location
              </>
            )}
          </button>

          {/* Loading Indicator */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #cbd5e1', borderTopColor: '#4169e1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Searching Google Places...
            </div>
          )}

          {/* Error Message */}
          {errorMsg && !loading && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', fontSize: '0.82rem', marginBottom: '12px' }}>
              {errorMsg}
            </div>
          )}

          {/* Suggestions List */}
          {suggestions.length > 0 && (
            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#ffffff' }}>
              {suggestions.map((item, idx) => (
                <div
                  key={item.placeId || idx}
                  className="loc-sugg-item"
                  onClick={() => handleSelectSuggestion(item)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: idx < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <span style={{ fontSize: '1rem', marginTop: '1px' }}>📍</span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                      {item.mainText || item.address.split(',')[0]}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.secondaryText || item.address}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
