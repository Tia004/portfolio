/**
 * Latitude & Longitude Coordinates for Countries and Major Cities
 */

export interface LatLng {
  lat: number;
  lng: number;
  name: string;
  flag: string;
}

export const COUNTRY_COORDINATES: Record<string, LatLng> = {
  IT: { lat: 41.8719, lng: 12.5674, name: 'Italia', flag: '🇮🇹' },
  US: { lat: 37.0902, lng: -95.7129, name: 'Stati Uniti', flag: '🇺🇸' },
  GB: { lat: 55.3781, lng: -3.436, name: 'Regno Unito', flag: '🇬🇧' },
  DE: { lat: 51.1657, lng: 10.4515, name: 'Germania', flag: '🇩🇪' },
  FR: { lat: 46.2276, lng: 2.2137, name: 'Francia', flag: '🇫🇷' },
  ES: { lat: 40.4637, lng: -3.7492, name: 'Spagna', flag: '🇪🇸' },
  CH: { lat: 46.8182, lng: 8.2275, name: 'Svizzera', flag: '🇨🇭' },
  NL: { lat: 52.1326, lng: 5.2913, name: 'Paesi Bassi', flag: '🇳🇱' },
  BE: { lat: 50.5039, lng: 4.4699, name: 'Belgio', flag: '🇧🇪' },
  AT: { lat: 47.5162, lng: 14.5501, name: 'Austria', flag: '🇦🇹' },
  PT: { lat: 39.3999, lng: -8.2245, name: 'Portogallo', flag: '🇵🇹' },
  PL: { lat: 51.9194, lng: 19.1451, name: 'Polonia', flag: '🇵🇱' },
  RO: { lat: 45.9432, lng: 24.9668, name: 'Romania', flag: '🇷🇴' },
  SE: { lat: 60.1282, lng: 18.6435, name: 'Svezia', flag: '🇸🇪' },
  NO: { lat: 60.472, lng: 8.4689, name: 'Norvegia', flag: '🇳🇴' },
  DK: { lat: 56.2639, lng: 9.5018, name: 'Danimarca', flag: '🇩🇰' },
  FI: { lat: 61.9241, lng: 25.7482, name: 'Finlandia', flag: '🇫🇮' },
  GR: { lat: 39.0742, lng: 21.8243, name: 'Grecia', flag: '🇬🇷' },
  IE: { lat: 53.1424, lng: -7.6921, name: 'Irlanda', flag: '🇮🇪' },
  JP: { lat: 36.2048, lng: 138.2529, name: 'Giappone', flag: '🇯🇵' },
  CN: { lat: 35.8617, lng: 104.1954, name: 'Cina', flag: '🇨🇳' },
  BR: { lat: -14.235, lng: -51.9253, name: 'Brasile', flag: '🇧🇷' },
  CA: { lat: 56.1304, lng: -106.3468, name: 'Canada', flag: '🇨🇦' },
  AU: { lat: -25.2744, lng: 133.7751, name: 'Australia', flag: '🇦🇺' },
  IN: { lat: 20.5937, lng: 78.9629, name: 'India', flag: '🇮🇳' },
  KR: { lat: 35.9078, lng: 127.7669, name: 'Corea del Sud', flag: '🇰🇷' },
  MX: { lat: 23.6345, lng: -102.5528, name: 'Messico', flag: '🇲🇽' },
  AR: { lat: -38.4161, lng: -63.6167, name: 'Argentina', flag: '🇦🇷' },
  AE: { lat: 23.4241, lng: 53.8478, name: 'Emirati Arabi', flag: '🇦🇪' },
  IL: { lat: 31.0461, lng: 34.8516, name: 'Israele', flag: '🇮🇱' },
  TR: { lat: 38.9637, lng: 35.2433, name: 'Turchia', flag: '🇹🇷' },
};

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Italian cities
  Mantova: { lat: 45.1564, lng: 10.7914 },
  Milano: { lat: 45.4642, lng: 9.19 },
  Roma: { lat: 41.9028, lng: 12.4964 },
  Torino: { lat: 45.0703, lng: 7.6869 },
  Bologna: { lat: 44.4949, lng: 11.3426 },
  Firenze: { lat: 43.7696, lng: 11.2558 },
  Napoli: { lat: 40.8518, lng: 14.2681 },
  Verona: { lat: 45.4384, lng: 10.9916 },
  Brescia: { lat: 45.5416, lng: 10.2118 },
  Genova: { lat: 44.4056, lng: 8.9463 },
  Venezia: { lat: 45.4408, lng: 12.3155 },
  Padova: { lat: 45.4064, lng: 11.8768 },
  Palermo: { lat: 38.1157, lng: 13.3615 },
  Bari: { lat: 41.1171, lng: 16.8719 },
  Catania: { lat: 37.5079, lng: 15.0873 },

  // World cities
  London: { lat: 51.5074, lng: -0.1278 },
  Paris: { lat: 48.8566, lng: 2.3522 },
  Berlin: { lat: 52.52, lng: 13.405 },
  Madrid: { lat: 40.4168, lng: -3.7038 },
  Barcelona: { lat: 41.3851, lng: 2.1734 },
  Zurich: { lat: 47.3769, lng: 8.5417 },
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  'New York': { lat: 40.7128, lng: -74.006 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Sydney: { lat: -33.8688, lng: 151.2093 },
  Dubai: { lat: 25.2048, lng: 55.2708 },
};
