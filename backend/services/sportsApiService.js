// services/sportsApiService.js
const axios = require('axios');
const NodeCache = require('node-cache');
//const BASE_URL = process.env.SPORTS_API_BASE_URL;
const API_KEY = process.env.SPORTS_API_KEY;


if (!API_KEY) {
    console.warn("Warning: Sports API Base URL or Key not found in environment variables.");
    // Optionally throw an error if the API is critical:
    // throw new Error("Missing Sports API configuration.");
}

// Cache setup remains the same
const apiCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 }); // Daily TTL, check hourly

// --- NEW Mapping Functions for api-sports.io ---

// Example for API-Football (v3)
const mapFootballEventToStandard = (apiEvent) => {
    const fixture = apiEvent?.fixture;
    const league = apiEvent?.league;
    const teams = apiEvent?.teams;

    if (!fixture?.id || !league?.id || !teams?.home?.id || !teams?.away?.id) {
        console.warn("[MapFootball] Invalid event structure:", apiEvent);
        return null;
    }

    let startTimeISO = null;
    try {
        // API-Football usually provides full ISO 8601 datetime string
        if (fixture.date) {
             const parsedDate = new Date(fixture.date);
             if (!isNaN(parsedDate.getTime())) {
                 startTimeISO = parsedDate.toISOString();
             } else {
                  console.warn(`[MapFootball][${fixture.id}] Could not parse fixture date: ${fixture.date}`);
             }
        }
    } catch(e) {
        console.error(`[MapFootball][${fixture.id}] Error parsing date:`, e);
    }

    return {
        id: String(fixture.id), // Ensure ID is string
        sport: 'Soccer', // Hardcode or get from config?
        league: league.name || 'Unknown League',
        homeTeam: teams.home.name || 'TBD',
        awayTeam: teams.away.name || 'TBD',
        startTime: startTimeISO,
        status: fixture.status?.long || fixture.status?.short || 'Scheduled', // Use long status if available
        venue: fixture.venue?.name || null,
        apiSource: 'apisports-football'
    };
};

// Example for API-Basketball
const mapBasketballEventToStandard = (apiEvent) => {
    // *** VERIFY response structure for Basketball ***
    const game = apiEvent; // Assuming top-level object is the game/fixture
    const league = apiEvent?.league;
    const teams = apiEvent?.teams;

     if (!game?.id || !league?.id || !teams?.home?.id || !teams?.away?.id) {
         console.warn("[MapBasketball] Invalid event structure:", apiEvent);
         return null;
     }

    let startTimeISO = null;
     try {
         // Basketball API might use 'date' directly under game object? VERIFY
         if (game.date) {
              const parsedDate = new Date(game.date); // Assumes full ISO string
              if (!isNaN(parsedDate.getTime())) {
                  startTimeISO = parsedDate.toISOString();
              } else {
                   console.warn(`[MapBasketball][${game.id}] Could not parse game date: ${game.date}`);
              }
         }
     } catch(e) {
         console.error(`[MapBasketball][${game.id}] Error parsing date:`, e);
     }

    return {
        id: String(game.id),
        sport: 'Basketball',
        league: league.name || 'Unknown League',
        homeTeam: teams.home.name || 'TBD',
        awayTeam: teams.away.name || 'TBD',
        startTime: startTimeISO,
        // Status might be under game.status.long? VERIFY
        status: game.status?.long || game.status?.short || 'Scheduled',
        // Venue might be under game.arena.name? VERIFY
        venue: game.arena?.name || null,
        apiSource: 'apisports-basketball'
    };
};

// Example for API-AmericanFootball (NFL/NCAA)
const mapAmFootballEventToStandard = (apiEvent) => {
    // *** VERIFY response structure for American Football ***
    const game = apiEvent; // Assuming top-level object is the game/fixture
    const league = apiEvent?.league;
    const teams = apiEvent?.teams;

     if (!game?.id || !league?.id || !teams?.home?.id || !teams?.away?.id) {
         console.warn("[MapAmFootball] Invalid event structure:", apiEvent);
         return null;
     }

    let startTimeISO = null;
     try {
         // Check structure - maybe game.game.date? or game.date?
         if (game.date) { // VERIFY this path
              const parsedDate = new Date(game.date);
              if (!isNaN(parsedDate.getTime())) {
                  startTimeISO = parsedDate.toISOString();
              } else {
                   console.warn(`[MapAmFootball][${game.id}] Could not parse game date: ${game.date}`);
              }
         }
     } catch(e) {
         console.error(`[MapAmFootball][${game.id}] Error parsing date:`, e);
     }

    return {
        id: String(game.id),
        sport: 'American Football',
        league: league.name || 'Unknown League', // Check league object structure
        homeTeam: teams.home.name || 'TBD', // Check teams object structure
        awayTeam: teams.away.name || 'TBD',
        startTime: startTimeISO,
        status: game.status?.long || game.status?.short || 'Scheduled', // Check status object structure
        venue: game.venue?.name || null, // Check venue object structure
        apiSource: 'apisports-amfootball'
    };
};

// Example for Combat Sports (Boxing/MMA) - Might share structure
const mapCombatEventToStandard = (apiEvent) => {
     // *** VERIFY response structure for Boxing/MMA Fights ***
     // These might be structured very differently - e.g., 'fight' object, 'fighters' array?
    const fight = apiEvent; // Assuming top-level is the fight

     if (!fight?.id || !fight.league?.id /* ... other critical fields */) {
         console.warn("[MapCombat] Invalid event structure:", apiEvent);
         return null;
     }

    let startTimeISO = null;
     try {
         // Check where date/time is stored - maybe fight.date?
         if (fight.date) { // VERIFY
              const parsedDate = new Date(fight.date);
              if (!isNaN(parsedDate.getTime())) {
                  startTimeISO = parsedDate.toISOString();
              } else {
                   console.warn(`[MapCombat][${fight.id}] Could not parse fight date: ${fight.date}`);
              }
         }
     } catch(e) {
         console.error(`[MapCombat][${fight.id}] Error parsing date:`, e);
     }

     // Extracting "teams" might involve looking at a fighters array/object
     // This is highly speculative - NEEDS DOCS/SAMPLE DATA
     const fighter1 = fight.fighters?.main?.fighter1?.name || fight.fighters?.[0]?.name || 'Fighter 1';
     const fighter2 = fight.fighters?.main?.fighter2?.name || fight.fighters?.[1]?.name || 'Fighter 2';

    return {
        id: String(fight.id),
        sport: fight.league?.sport?.name || 'Combat Sport', // Get sport type if available
        league: fight.league?.name || 'Unknown Event', // League/Promotion name
        homeTeam: fighter1, // Use fighter names as "teams"
        awayTeam: fighter2,
        startTime: startTimeISO,
        status: fight.status?.long || fight.status?.short || 'Scheduled', // Check status structure
        venue: fight.venue?.name || fight.arena?.name || null, // Check venue structure
        apiSource: 'apisports-combat' // Or specific boxing/mma
    };
};
//**********************************

const SPORT_API_CONFIG = {
    'soccer': { // Use consistent lowercase keys
        baseURL: 'https://v3.football.api-sports.io', // VERIFY exact hostname
        endpoints: {
            fixtures: '/fixtures' // VERIFY endpoint for fixtures by date
        },
        mapFunction: mapFootballEventToStandard // Specific mapping function
    },
    'basketball': {
        baseURL: 'https://v1.basketball.api-sports.io', // VERIFY exact hostname
        endpoints: {
            games: '/games' // VERIFY endpoint for games by date
        },
        mapFunction: mapBasketballEventToStandard // Specific mapping function
    },
    'american football': { // Handle variations like 'Football' vs 'American Football'
        baseURL: 'https://v1.american-football.api-sports.io', // VERIFY exact hostname
        endpoints: {
            games: '/games' // VERIFY endpoint
        },
        mapFunction: mapAmFootballEventToStandard
    },
    'boxing': {
         baseURL: 'https://v1.boxing.api-sports.io', // VERIFY exact hostname
         endpoints: {
             fights: '/fights' // VERIFY endpoint for fights by date (might differ)
         },
         mapFunction: mapCombatEventToStandard // May share with MMA?
    },
     'mma': {
         baseURL: 'https://v1.mma.api-sports.io', // VERIFY exact hostname
         endpoints: {
             fights: '/fights' // VERIFY endpoint
         },
         mapFunction: mapCombatEventToStandard // May share with Boxing?
     }
    // Add other sports as needed
};


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
 *   apiSource: string // Identifier for the API source 
 * }
 */

/**
 * Maps a game object from TheSportsDB API to our standard format.
 * @param {object} apiEvent - An event object from TheSportsDB API response.
 * @returns {object} A standardized game object.
 */
const mapTheSportsDBEventToStandard = (apiEvent) => {
    const eventId = apiEvent?.idEvent || 'UNKNOWN_ID';

    if (!apiEvent || !apiEvent.idEvent) return null;

    let parsedDate = null; 
   
    try {
        const datePart = apiEvent.dateEvent;
        let timePart = apiEvent.strTime;

        if (datePart && datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
            let attemptString = null;
            if (timePart) {
                if (timePart.match(/^\d{2}:\d{2}$/)) {
                    timePart += ':00';
                }
                if (timePart.match(/^\d{2}:\d{2}:\d{2}$/)) {
                    // Assume UTC, construct ISO attempt string
                    attemptString = `${datePart}T${timePart}Z`;
                } else {
                    console.warn(`[Mapping][${eventId}] Invalid time format, ignoring time: ${timePart}`);
                    // Fall through to date-only logic
                }
            }

            // If we have a valid combined string OR no valid time was found
            if (attemptString || !timePart) {
                 // If no timepart, attemptString is null, try date only
                if (!attemptString) {
                     attemptString = `${datePart}T00:00:00Z`; // Treat date as UTC midnight
                }

                // Now try to parse the constructed string
                const tempDate = new Date(attemptString);
                if (!isNaN(tempDate.getTime())) {
                    parsedDate = tempDate; // Assign the VALID Date object
                    // console.log(`[Mapping][${eventId}] Successfully parsed: ${attemptString}`);
                } else {
                     console.warn(`[Mapping][${eventId}] Could not parse constructed/fallback dateTimeString: ${attemptString}`);
                }
            }
        } else if (datePart) {
             console.warn(`[Mapping][${eventId}] Invalid date format: ${datePart}`);
        } else {
             console.warn(`[Mapping][${eventId}] Missing dateEvent.`);
        }
    } catch (e) {
        console.error(`[Mapping][${eventId}] Unexpected error processing date/time:`, apiEvent, e);
    }
    let finalStartTimeISO = null;

    // --- *** FINAL EXPLICIT CHECK *** ---
    if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
         // Only call toISOString if parsedDate is definitely a valid Date
         finalStartTimeISO = parsedDate.toISOString();
    } else {
         // Log if we ended up with something invalid or null before trying to return
         console.warn(`[Mapping][${eventId}] Final check failed: parsedDate is not a valid Date. Value:`, parsedDate);
    }
    // --- *** END FINAL CHECK *** ---

    return {
        id: eventId, 
        sport: apiEvent.strSport || 'Unknown Sport',
        league: apiEvent.strLeague || 'Unknown League',
        homeTeam: apiEvent.strHomeTeam || 'TBD',
        awayTeam: apiEvent.strAwayTeam || 'TBD',
        startTime: new Date(apiEvent.dateEvent + 'T' + (apiEvent.strTime || '00:00:00') + 'Z').toISOString(),        
	status: apiEvent.strStatus || 'Scheduled', // Map API status values if needed
        venue: apiEvent.strVenue || null,
        apiSource: 'thesportsdb',
        // Add any other fields you might need from the raw API response
        // rawApiData: apiEvent // Optionally include for debugging or future use
    };
};



// --- Helper function to get dates - MISSING DEFINITION ---

const getNextNDates = (days) => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        dates.push(targetDate.toISOString().split('T')[0]); // YYYY-MM-DD
    }
    return dates;
};
// ----------------------------------------------------------

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
    const { sport, team, league, date } = queryParams;

    // --- *** Require Sport *** ---
    if (!sport || sport.trim() === '') {
        console.warn("[Sports API Service] Search called without mandatory 'sport' parameter.");
        return []; // Return empty if sport is missing
    }
    const normalizedSport = sport.trim().toLowerCase();
    const sportConfig = SPORT_API_CONFIG[normalizedSport];

    if (!sportConfig) {
        console.warn(`[Sports API Service] Unsupported sport requested: ${sport}`);
        return [];
    }

    const numberOfDays = 15;
    const cacheKey = `games_15day:${normalizedSport}`;
    const cachedRawEvents = apiCache.get(cacheKey);
    let apiResults = [];

    // --- Check Cache ---
    if (cachedRawEvents) {
        console.log(`[Sports API Service] Cache HIT for key: ${cacheKey}`);
        apiResults = cachedRawEvents;
    } else {
        console.log(`[Sports API Service] Cache MISS for key: ${cacheKey}. Fetching from API...`);
        const datesToFetch = getNextNDates(numberOfDays);
        const fetchPromises = [];
	const urlsCalled = [];

        for (const dateString of datesToFetch) {
            const endpoint = sportConfig.endpoints.fixtures || sportConfig.endpoints.games || sportConfig.endpoints.fights;

  	    if (!endpoint) {
                 console.warn(`[Sports API Service] No fixture/game endpoint defined for ${normalizedSport}`);
                 continue; // Skip if endpoint missing
            }
	    
	    const params = { date: dateString };

            const url = new URL(`${sportConfig.baseURL}${endpoint}`);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
	    const urlString = url.toString();
            urlsCalled.push(urlString); // Store URL
            fetchPromises.push(axios.get(url.toString(), {
	   	headers: { 'x-apisports-key': API_KEY } } 
	    ));
        }

	let fetchedApiResults = []; 
        try {
	    console.log(`[Sports API Service] Making ${fetchPromises.length} API calls...`);
            const responses = await Promise.allSettled(fetchPromises);
	    console.log("[Sports API Service] API Responses Received:", responses.length);
            responses.forEach((result, index) => {
		const requestUrl = urlsCalled[index];
                if (result.status === 'fulfilled') {
			console.log(`[Sports API Service] SUCCESS for ${requestUrl}. Data structure:`, JSON.stringify(result.value.data, null, 2).substring(0, 500) + '...');
			const responseData = result.value.data?.response;
			if (responseData && Array.isArray(responseData)) {
                        	console.log(`[Sports API Service] Found ${responseData.length} events in response for ${requestUrl}.`);
                        	fetchedApiResults = fetchedApiResults.concat(responseData);
                    	} else {
                        	console.warn(`[Sports API Service] No 'response' array found or not an array for ${requestUrl}. Full data logged above.`);
                    	}
                } else if (result.status === 'rejected') {
                     console.error(`[Sports API Service] FAILED for ${requestUrl}:`, result.reason?.message || result.reason); // Log detailed error
                     // Log Axios error details if available
                     if (result.reason?.response) {
                          console.error(`[Sports API Service] Error Status: ${result.reason.response.status}`);
                          console.error(`[Sports API Service] Error Data:`, result.reason.response.data);
                     }
                }
            });

	    apiResults = fetchedApiResults;
            if (apiResults.length > 0) {
                 apiCache.set(cacheKey, apiResults);
                 console.log(`[Sports API Service] Stored ${apiResults.length} raw events in cache for key: ${cacheKey}`);
            } else {
                 console.log(`[Sports API Service] No events found in any API responses. Caching empty result.`);
                 apiCache.set(cacheKey, []);
            }
        } catch (error) {
             console.error("[Sports API Service] Unexpected error fetching multi-day games:", error.message);
             apiResults = [];
        }
    } // End API fetch logic

    // --- Local Filtering ---
    let filteredResults = apiResults;
    console.log(`[Sports API Service] Starting with ${filteredResults.length} events for ${normalizedSport} before filtering.`);

    // !! IMPORTANT: Update property names based on ACTUAL API response structure for EACH sport !!
    if (league && filteredResults.length > 0) {
         const lowerCaseLeague = league.toLowerCase().trim();
         // Example: Football uses league.name, Basketball might use league.name too? Verify.
         filteredResults = filteredResults.filter(event =>
             event.league?.name && event.league.name.toLowerCase().includes(lowerCaseLeague)
         );
         console.log(`Filtered by League "${league}", ${filteredResults.length} results remain.`);
    }
     if (team && filteredResults.length > 0) {
         const lowerCaseTeam = team.toLowerCase().trim();
         // Example: Football uses teams.home.name / teams.away.name. Basketball? NFL? Combat? Verify.
          filteredResults = filteredResults.filter(event =>
             (event.teams?.home?.name && event.teams.home.name.toLowerCase().includes(lowerCaseTeam)) ||
             (event.teams?.away?.name && event.teams.away.name.toLowerCase().includes(lowerCaseTeam))
         );
         console.log(`Filtered by Team "${team}", ${filteredResults.length} results remain.`);
    }
     if (date && filteredResults.length > 0) {
         // Example: Football uses fixture.date (full ISO string). Basketball? NFL? Verify.
         // Need to compare only the date part.
         const filterDate = date; // YYYY-MM-DD
         filteredResults = filteredResults.filter(event =>
             event.fixture?.date && event.fixture.date.startsWith(filterDate)
         );
         console.log(`Filtered by Date "${filterDate}", ${filteredResults.length} results remain.`);
     }

    // --- Map final filtered results using sport-specific mapper ---
    const mapFn = sportConfig.mapFunction;
    if (!mapFn) {
        console.error(`[Sports API Service] No mapping function defined for sport: ${normalizedSport}`);
        return []; // Cannot map if function is missing
    }
    const standardGames = filteredResults
        .map(mapFn) // Use the correct mapping function
        .filter(game => game !== null);

    console.log(`[Sports API Service] Search finalized. Returning ${standardGames.length} games.`);
    return standardGames;
};

// Make sure fetchUpcomingGames is also updated if used as a fallback
// or by the owner's GET /api/games route to be more flexible
// (e.g., accept sport, date range options)


module.exports = {
    fetchGameDetails,
    searchGames, 
    // Export individual mappers if needed elsewhere, or keep them internal
    // mapFootballEventToStandard,
    // mapBasketballEventToStandard,
    // ... 
};