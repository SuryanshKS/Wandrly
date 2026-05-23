// import axios from 'axios';

// export const getCoordinates = async (address) => {
//   try {
//     // Nominatim is free. No API key needed, but we must set a User-Agent header
//     const response = await axios.get(
//       `https://nominatim.openstreetmap.org/search`,
//       {
//         params: {
//           q: address,
//           format: 'json',
//           limit: 1
//         },
//         headers: {
//           'User-Agent': 'Wandrly-App-Project' // Required by OpenStreetMap policy
//         }
//       }
//     );

//     if (response.data && response.data.length > 0) {
//       return { 
//         lat: parseFloat(response.data[0].lat), 
//         lng: parseFloat(response.data[0].lon) 
//       };
//     }
    
//     console.warn(`Geocoding failed for: ${address}`);
//     return null; // Return null instead of 0,0 so we know it failed
//   } catch (error) {
//     console.error("Geocoding request failed:", error);
//     return null;
//   }
// };
import axios from "axios";

export const getCoordinates = async (address) => {
    try {
        const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
        const url = `https://api.geoapify.com/v1/geocode/search`;

        const response = await axios.get(url, {
            params: {
                text: address,
                apiKey: GEOAPIFY_API_KEY,
                limit: 1,
                // THE FIX: This restricts the search exclusively to India
                filter: "countrycode:in" 
            }
        });

        if (response.data.features && response.data.features.length > 0) {
            const [lon, lat] = response.data.features[0].geometry.coordinates;
            return { lat, lon };
        }
        
        return null;
    } catch (error) {
        console.error("Geoapify Geocoding Error:", error.message);
        return null;
    }
};