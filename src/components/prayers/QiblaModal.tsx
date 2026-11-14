import React, { useState, useEffect } from 'react';
import { Compass, X, MapPin, Navigation, Info } from 'lucide-react';
import { PrayerService } from '../../services/prayerService';
import { db } from '../../services/storage';

interface QiblaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QiblaModal: React.FC<QiblaModalProps> = ({ isOpen, onClose }) => {
  const state = db.getState();
  const locationName = state.prayerSettings?.location_name || 'Algiers, Algeria';

  // Default coordinates (Algiers)
  const defaultLat = 36.7538;
  const defaultLng = 3.0588;

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: defaultLat,
    lng: defaultLng,
  });

  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const qiblaData = PrayerService.getQiblaDirection(coords.lat, coords.lng);

  useEffect(() => {
    if (!isOpen) return;

    // Optional GPS lookup if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Fall back gracefully to default
        },
        { timeout: 5000 }
      );
    }

    // Device orientation support for mobile phone compass
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;
      if ((e as any).webkitCompassHeading) {
        // iOS
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Android
        heading = 360 - e.alpha;
      }
      if (heading !== null) {
        setDeviceHeading(Math.round(heading));
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // The needle rotates to qiblaData.bearingDegrees.
  // If device heading is available, needle relative angle = bearing - heading.
  const needleRotation = deviceHeading !== null
    ? (qiblaData.bearingDegrees - deviceHeading + 360) % 360
    : qiblaData.bearingDegrees;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Qibla Compass
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Direction to the Holy Kaaba (Mecca)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compass Visual Display */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-56 h-56 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-subtle)] flex items-center justify-center shadow-inner">
            {/* Cardinal Markers */}
            <div className="absolute top-2.5 text-xs font-extrabold text-rose-500 tracking-wider">
              N
            </div>
            <div className="absolute bottom-2.5 text-xs font-bold text-[var(--color-text-secondary)]">
              S
            </div>
            <div className="absolute right-3 text-xs font-bold text-[var(--color-text-secondary)]">
              E
            </div>
            <div className="absolute left-3 text-xs font-bold text-[var(--color-text-secondary)]">
              W
            </div>

            {/* Subtle Degree Ring Ticks */}
            <div className="absolute inset-5 rounded-full border border-dashed border-[var(--color-border)] opacity-40 pointer-events-none" />

            {/* Rotating Qibla Needle */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${needleRotation}deg)` }}
            >
              <div className="relative w-full h-full flex flex-col items-center justify-between py-6">
                {/* Needle Tip Pointing to Kaaba */}
                <div className="flex flex-col items-center">
                  <div className="w-0 h-0 border-x-[7px] border-x-transparent border-b-[18px] border-b-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  <div className="mt-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300">
                    KAABA
                  </div>
                </div>

                {/* Center Pivot */}
                <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-[var(--color-surface)] shadow-md z-10" />

                {/* Needle Tail */}
                <div className="w-0 h-0 border-x-[5px] border-x-transparent border-t-[12px] border-t-slate-500 opacity-60" />
              </div>
            </div>
          </div>

          {/* Bearing & Distance Details */}
          <div className="mt-4 text-center">
            <div className="text-2xl font-mono font-extrabold text-[var(--color-text-primary)]">
              {qiblaData.bearingDegrees}° {qiblaData.cardinal}
            </div>
            <div className="text-xs text-amber-400 font-semibold mt-0.5">
              {qiblaData.distanceKm.toLocaleString()} km to Mecca
            </div>
            {deviceHeading !== null && (
              <div className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                Phone Heading: {deviceHeading}°
              </div>
            )}
          </div>
        </div>

        {/* Location & Coordinates Banner */}
        <div className="p-3 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-semibold text-[var(--color-text-primary)] truncate">
              {locationName}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
            {coords.lat.toFixed(2)}°N, {coords.lng.toFixed(2)}°E
          </span>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md"
        >
          Close Compass
        </button>
      </div>
    </div>
  );
};
