const fs = require('fs');
const filePath = 'src/services/prayerService.ts';
let code = fs.readFileSync(filePath, 'utf8');

const newMethods = `
  /**
   * Computes the precise Qibla bearing and distance to the Kaaba from coordinates (defaulting to Algiers)
   */
  getQiblaDirection(latitude: number = 36.7538, longitude: number = 3.0588): {
    bearingDegrees: number;
    cardinal: string;
    distanceKm: number;
  } {
    // Kaaba coordinates
    const kaabaLat = 21.422487;
    const kaabaLng = 39.826206;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const phi1 = toRad(latitude);
    const phi2 = toRad(kaabaLat);
    const deltaLambda = toRad(kaabaLng - longitude);

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    const bearing = Math.round(((toDeg(Math.atan2(y, x)) + 360) % 360) * 10) / 10;

    // Haversine distance
    const R = 6371;
    const dPhi = toRad(kaabaLat - latitude);
    const dLambda = toRad(kaabaLng - longitude);
    const a =
      Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.round(R * c);

    const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(bearing / 22.5) % 16;
    const cardinal = cardinals[idx];

    return { bearingDegrees: bearing, cardinal, distanceKm };
  },

  /**
   * Exports prayer attendance ledger as CSV
   */
  exportPrayerHistoryCsv(): string {
    const state = db.getState();
    const prayers = state.prayers || [];
    
    // Group prayers by date
    const dateMap = new Map<string, { fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean }>();
    for (const p of prayers) {
      if (p.deleted_at) continue;
      if (!dateMap.has(p.local_date)) {
        dateMap.set(p.local_date, { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false });
      }
      const day = dateMap.get(p.local_date)!;
      if (p.prayer in day) {
        day[p.prayer] = p.completed;
      }
    }

    const headers = ['Date', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Completed Count', 'Completion Rate'];
    const sortedDates = Array.from(dateMap.keys()).sort().reverse();
    const rows = sortedDates.map(date => {
      const d = dateMap.get(date)!;
      const count = [d.fajr, d.dhuhr, d.asr, d.maghrib, d.isha].filter(Boolean).length;
      const pct = \`\${Math.round((count / 5) * 100)}%\`;
      return [
        date,
        d.fajr ? 'Yes' : 'No',
        d.dhuhr ? 'Yes' : 'No',
        d.asr ? 'Yes' : 'No',
        d.maghrib ? 'Yes' : 'No',
        d.isha ? 'Yes' : 'No',
        count,
        pct
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\\n');
  }
};
`;

code = code.replace(/\n\s*\}\s*;\s*$/, '\n' + newMethods);
fs.writeFileSync(filePath, code, 'utf8');
console.log('Appended methods to PrayerService');
