import axios from 'axios';

export const getCoordinates = async (address) => {
  try {
    // Using Mapbox Geocoding API
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`,
      {
        params: {
          access_token: process.env.MAPBOX_ACCESS_TOKEN,
          limit: 1
        }
      }
    );

    const [lng, lat] = response.data.features[0].center;
    return { lat, lng };
  } catch (error) {
    console.error("Geocoding failed:", error);
    return { lat: 0, lng: 0 }; // Fallback
  }
};