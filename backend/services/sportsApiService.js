// services/sportsApiService.js
const axios = require('axios');

const BASE_URL = process.env.SPORTS_API_BASE_URL;
const API_KEY = process.env.SPORTS_API_KEY;

if (!BASE_URL || !API_KEY) {
    console.warn("Warning: Sports API Base URL or Key not found in environment variables.");
    // Optionally throw an error if the API is critical:
    // throw new Error("Missing Sports API configuration.");
}

/**
 * Standardized Game Object Format:
 * We aim to return games in this structure from all functions in this service.
 * {
 *   id: string, // Unique ID from the API (e.g., event id)
 *   sport: string, // Name of the sport (e.g., "Soccer", "Basketball")
 *   league: string, // Name of the league (e.g., "English Premier League")
 *   homeTeam: string,
 *   awayTeam: string,
 *   startTime: Date, // ISO Date string or Date object
 *   status: string, // e.g., "Not Started", "In Play", "Finished"
 *   venue: string | null,
 *   apiSource: string // Identifier for the API source (e.g., 'thesportsdb')
 * }
 */

/**
 * Maps a game object from TheSportsDB API to our standard format.
 * @param {object} apiEvent - An event object from TheSportsDB API response.
 * @returns {object} A standardized game object.
 */
const mapApiEventToStandardGame = (apiEvent) => {
    if (!apiEvent || !apiEvent.idEvent) {
         console.warn("Received invalid event object from API:", apiEvent);
         return null; // Or throw an error
    }

    // Ensure startTime parsing is robust
     let startTime = null;
     try {
         // Example: Handle combined date/time or just date
         if (apiEvent.dateEvent && apiEvent.strTime) {
             // Check if time includes timezone info, otherwise assume UTC or local? Needs clarification from API docs.
             // Let's assume local for now, but this might need adjustment.
             startTime = new Date(`${apiEvent.dateEvent}T${apiEvent.strTime}`);
         } else if (apiEvent.dateEvent) {
             startTime = new Date(apiEvent.dateEvent); // Only date provided
         }
     } catch (e) {
         console.error("Error parsing date/time from API event:", apiEvent, e);
     }


    return {
        id: apiEvent.idEvent, // Use the API's unique event ID
        sport: apiEvent.strSport || 'Unknown Sport',
        league: apiEvent.strLeague || 'Unknown League',
        homeTeam: apiEvent.strHomeTeam || 'TBD',
        awayTeam: apiEvent.strAwayTeam || 'TBD',
        startTime: startTime ? startTime.toISOString() : null,         
	status: apiEvent.strStatus || 'Scheduled', // Map API status values if needed
        venue: apiEvent.strVenue || null,
        apiSource: 'thesportsdb',
        // Add any other fields you might need from the raw API response
        // rawApiData: apiEvent // Optionally include for debugging or future use
    };
};

/**
 * Fetches upcoming events/games from TheSportsDB.
 * Adjust the endpoint based on the specific data you need (e.g., specific league, sport).
 * Example: Fetching next 5 events for English Premier League (id 4328)
 * Endpoint: /eventsnextleague.php?id=4328
 * Example: Fetching daily events by sport and date
 * Endpoint: /eventsday.php?d=YYYY-MM-DD&s=Soccer
 *
 * @param {object} [options={}] - Options like leagueId, sportName, date.
 * @returns {Promise<Array<object>>} A promise resolving to an array of standardized game objects.
 */
const fetchUpcomingGames = async (options = {}) => {
    // --- Choose the right TheSportsDB Endpoint ---
    // This is just an EXAMPLE endpoint (next 5 EPL games).
    // You'll need to adapt this based on HOW you want to fetch games
    // (e.g., by date, by sport, all upcoming, etc.)
    // Refer to TheSportsDB API docs!
    const endpoint = `/eventsnextleague.php?id=4328`; // EXAMPLE: EPL League ID
    const url = `${BASE_URL}/${API_KEY}${endpoint}`;

    console.log(`[Sports API Service] Fetching games from: ${url}`);

    try {
        // Important: Ensure BASE_URL and API_KEY are defined
        if (!BASE_URL || !API_KEY) {
           throw new Error("Sports API is not configured in environment variables.");
        }
        const response = await axios.get(url);

        // Check the structure of the ACTUAL response from TheSportsDB
        // It might be response.data.events, response.data.results, etc.
        if (response.data && response.data.events) {
            const standardGames = response.data.events
                .map(mapApiEventToStandardGame)
                .filter(game => game !== null); // Filter out any invalid mappings
            console.log(`[Sports API Service] Fetched and mapped ${standardGames.length} games.`);
            return standardGames;
        } else {
            console.log("[Sports API Service] No events found in API response or unexpected structure:", response.data);
            return []; // Return empty array if no events found
        }
    } catch (error) {
        console.error("[Sports API Service] Error fetching games:", error.message);
         if (error.response) {
             console.error("API Response Status:", error.response.status);
             console.error("API Response Data:", error.response.data);
         } else if (error.request) {
            console.error("API No response received:", error.request);
         }
        // Depending on requirements, you might want to return empty array or throw
        // throw new Error('Failed to fetch games from external API.');
        return []; // Return empty array on error to avoid breaking consumers
    }
};

 /**
  * Fetches details for a SINGLE game by its API ID.
  * @param {string} apiGameId - The unique event ID from TheSportsDB.
  * @returns {Promise<object|null>} A promise resolving to a single standardized game object or null if not found/error.
  */
 const fetchGameDetails = async (apiGameId) => {
     const endpoint = `/lookupevent.php?id=${apiGameId}`;
     const url = `${BASE_URL}/${API_KEY}${endpoint}`;
     console.log(`[Sports API Service] Fetching details for game ID: ${apiGameId} from ${url}`);

     try {
         if (!BASE_URL || !API_KEY) {
             throw new Error("Sports API is not configured in environment variables.");
         }
         const response = await axios.get(url);

         // TheSportsDB lookup often returns an 'events' array even for a single ID
         if (response.data && response.data.events && response.data.events.length > 0) {
             const standardGame = mapApiEventToStandardGame(response.data.events[0]);
             console.log(`[Sports API Service] Fetched details for game ID: ${apiGameId}`);
             return standardGame;
         } else {
             console.log(`[Sports API Service] No event found for ID ${apiGameId} or unexpected structure:`, response.data);
             return null;
         }
     } catch (error) {
         console.error(`[Sports API Service] Error fetching details for game ID ${apiGameId}:`, error.message);
         // Handle specific errors like 404 if needed
         return null;
     }
 };

 /**
 * Searches for games based on provided criteria.
 * NOTE: The specific TheSportsDB endpoints (/eventsday.php, /searchevents.php, etc.)
 * and their parameters (d, s, e) need to be VERIFIED against the API documentation.
 * This implementation provides a likely structure.
 *
 * @param {object} [queryParams={}] - Search parameters.
 * @param {string} [queryParams.sport='Soccer'] - Sport name (default Soccer).
 * @param {string} [queryParams.team] - Team name query.
 * @param {string} [queryParams.league] - League name query.
 * @param {string} [queryParams.date] - Date in YYYY-MM-DD format.
 * @returns {Promise<Array<object>>} A promise resolving to an array of standardized game objects.
 */
const searchGames = async (queryParams = {}) => {
    const { sport = 'Soccer', team, league, date } = queryParams;
    let endpoint = '';
    let params = {};

    // --- Determine the correct API endpoint based on parameters ---
    // PRIORITIZE more specific searches (e.g., date over general league/team)
    if (date) {
        // Assumes /eventsday.php takes 'd' for date and 's' for sport
        // VERIFY THIS with TheSportsDB docs
        console.log(`[Sports API Service] Searching by Date: ${date}, Sport: ${sport}`);
        endpoint = `/eventsday.php`;
        params = { d: date, s: sport };
    } else if (team) {
        // Assumes /searchevents.php takes 'e' for event/team name and 's' for sport
        // VERIFY THIS with TheSportsDB docs
        console.log(`[Sports API Service] Searching by Team: ${team}, Sport: ${sport}`);
        endpoint = `/searchevents.php`;
        params = { e: team, s: sport };
    } else if (league) {
        // Assumes /searchevents.php can also search by league name? Or maybe needs league ID?
        // Might need a preliminary call to find league ID if API requires it.
        // Example: Using /eventsnextleague.php requires ID, not name.
        // Let's assume /searchevents.php works with league name for now. VERIFY!
        console.log(`[Sports API Service] Searching by League: ${league}, Sport: ${sport}`);
        endpoint = `/searchevents.php`;
        params = { e: league, s: sport }; // CHECK if 'e' works for leagues too
    } else {
        // Default search: Maybe upcoming games for the default sport?
        // Or return error/empty? Let's fetch upcoming for the specified sport.
        // Needs an appropriate endpoint. Let's reuse fetchUpcomingGames logic conceptually
        // or find an endpoint like /eventsnext.php?s=Soccer (VERIFY)
        console.log(`[Sports API Service] Default search: Upcoming for Sport: ${sport}`);
        // Placeholder: Use fetchUpcomingGames or adapt its logic
        // This might require fetching by league ID if there's no general sport endpoint
        return fetchUpcomingGames({ sport: sport }); // Or implement specific logic here
    }

    // Construct URL with query parameters
    const url = new URL(`${BASE_URL}/${API_KEY}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    console.log(`[Sports API Service] Calling API: ${url.toString()}`);

    try {
        if (!BASE_URL || !API_KEY) {
           throw new Error("Sports API is not configured in environment variables.");
        }
        const response = await axios.get(url.toString());

        // Process the response - ** The key might be 'event' for search, not 'events' - VERIFY! **
        const eventsData = response.data?.event || response.data?.events || null; // Adjust based on actual API response structure

        if (eventsData && Array.isArray(eventsData)) {
            const standardGames = eventsData
                .map(mapApiEventToStandardGame)
                .filter(game => game !== null); // Filter out invalid mappings
            console.log(`[Sports API Service] Search returned ${standardGames.length} games.`);
            return standardGames;
        } else {
            console.log("[Sports API Service] No events found in search response or unexpected structure:", response.data);
            return [];
        }
    } catch (error) {
        console.error("[Sports API Service] Error searching games:", error.message);
        if (error.response) {
            console.error("API Response Status:", error.response.status);
            console.error("API Response Data:", error.response.data);
        } else if (error.request) {
           console.error("API No response received:", error.request);
        }
        return []; // Return empty array on error
    }
};


module.exports = {
    fetchUpcomingGames,
    fetchGameDetails,
    searchGames, 
    mapApiEventToStandardGame 
};