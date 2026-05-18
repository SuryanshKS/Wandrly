/**
 * Simulates fetching a 10-day weather forecast based on destination and dates.
 * Replace the return statement with a real Weather API call when moving to production.
 */
export const getWeatherForecast = async (destination, startDate, endDate) => {
    // In production: const res = await axios.get(`https://api.weatherapi.com/v1/forecast.json?key=${process.env.WEATHER_API_KEY}&q=${destination}&days=10`);
    
    // Highly contextual mock response to give the LLM rich data to parse
    const lowerDest = destination.toLowerCase();
    if (lowerDest.includes("goa") || lowerDest.includes("beach")) {
        return "Tropical climate. Highs around 32°C, lows around 26°C. 80% humidity. Intermittent afternoon thundershowers expected.";
    } else if (lowerDest.includes("manali") || lowerDest.includes("leh") || lowerDest.includes("mountain")) {
        return "Alpine climate. Highs around 14°C, lows dropping to 3°C at night. Clear skies but high UV index. Strong mountain winds.";
    } else {
        return "Mild temperate climate. Highs around 28°C, lows around 18°C. Overcast skies with a 20% low chance of precipitation.";
    }
};