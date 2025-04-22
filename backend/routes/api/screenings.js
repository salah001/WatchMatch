const express = require('express');
const router = express.Router();
const db = require('../../db');
const { authenticateToken } = require('../../authMiddleware'); 
const { checkRole } = require('../../roleMiddleware');
const sportsApiService = require('../../services/sportsApiService');

// Haversine distance calculation function (example in kilometers)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}



// Add a screening (Game at a Bar)
router.post('/add', authenticateToken, checkRole('owner'), async (req, res) => {
    try {
        const { bar_id, external_game_id, screening_time } = req.body;
        const owner_id = req.user.id; // Extracted from token
	
	// --- Validate Inputs ---
        if (!bar_id || !external_game_id || !screening_time) {
            return res.status(400).json({ error: "Missing required fields (bar_id, external_game_id, screening_time)." });
        }

        const bar = await db.query("SELECT * FROM bars WHERE id = $1 AND owner_id = $2", [bar_id, owner_id]);

        if (bar.rows.length === 0) {
            return res.status(403).json({ error: "You do not own this bar or the bar does not exist." });
        }

	console.log("Bar found:", bar.rows[0]);

	// Check if the screening already exists
        const existingScreening = await db.query(
            "SELECT * FROM screenings WHERE bar_id = $1 AND external_game_id = $2 AND screening_time = $3",
            // Use the correct variable 'external_game_id'
            [bar_id, external_game_id, screening_time]
        );

        if (existingScreening.rows.length > 0) {
            return res.status(400).json({ error: "This game is already scheduled at this bar at the same time!" });
        }

        // Insert screening
        const result = await db.query(
            "INSERT INTO screenings (bar_id, external_game_id, screening_time) VALUES ($1, $2, $3) RETURNING *",
            [bar_id, external_game_id, screening_time]
        );
        res.status(201).json({ message: "Screening added successfully", screening: result.rows[0] });

    } catch (error) {
        console.error("Error adding screening:", error);
	if (error.code === '23503') { // Example: foreign key violation if bar_id is invalid
             return res.status(400).json({ error: "Invalid bar ID." });
    }
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/screenings - List all screenings with bar & game info
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        screenings.id AS screening_id,
        screenings.screening_time,
	screenings.external_game_id,
        bars.id AS bar_id,
        bars.name AS bar_name,
        bars.address,
        bars.description
      FROM screenings
      JOIN bars ON screenings.bar_id = bars.id
      ORDER BY screenings.screening_time ASC
    `;
    const screeningResult = await db.query(screeningQuery);
    const screenings = screeningResult.rows;

    if (screenings.length === 0) {
         return res.json([]); // No screenings found
    // 2. Extract unique external game IDs
    const uniqueGameIds = [...new Set(screenings.map(s => s.external_game_id).filter(id => id != null))]

    const gameDetailsMap = new Map();
    if (uniqueGameIds.length > 0) {
        console.log(`[GET /screenings] Fetching details for ${uniqueGameIds.length} unique game IDs...`);
         const gameDetailPromises = uniqueGameIds.map(id => sportsApiService.fetchGameDetails(id));
         const gameDetailsResults = await Promise.all(gameDetailPromises);

         gameDetailsResults.forEach((gameDetail, index) => {
             if (gameDetail) {
                 gameDetailsMap.set(uniqueGameIds[index], gameDetail);
             } else {
                 console.warn(`[GET /screenings] Failed to fetch details for external_game_id: ${uniqueGameIds[index]}`);
             }
         });
        console.log(`[GET /screenings] Successfully fetched details for ${gameDetailsMap.size} games.`);
    }

    // 4. Combine screening data with game details
    const enrichedScreenings = screenings.map(screening => {
      const gameDetails = gameDetailsMap.get(screening.external_game_id);
      return {
        ...screening, // Includes screening_id, screening_time, bar details, external_game_id
        game: gameDetails || { id: screening.external_game_id, error: 'Details not found' } // Provide game details or fallback
      };
    });

    res.json(enrichedScreenings);

    }
  } catch (err) {
    console.error('Error fetching screenings:', err);
    res.status(500).json({ message: 'Error fetching screenings' });
  }
});

router.get('/upcoming', authenticateToken, async (req, res) => {
    try {
        const currentTime = new Date(); // Get current timestamp

        const screeningQuery =
            `SELECT 
		s.id AS screening_id,
		s.screening_time,
            	s.external_game_id,  
    		b.id AS bar_id,
            	b.name AS bar_name,
            	b.address AS bar_address                                      
             FROM screenings s
             JOIN bars b ON s.bar_id = b.id
          WHERE s.screening_time > $1
          ORDER BY s.screening_time ASC`;
        
	const screeningResult = await db.query(screeningQuery, [currentTime]);
        const screenings = screeningResult.rows;

	if (screenings.length === 0) {
            return res.json([]); // Return empty array, not an error
        }

	const uniqueGameIds = [...new Set(screenings.map(s => s.external_game_id).filter(id => id != null))];
	
	// 3. Fetch game details for these IDs from the API Service
        const gameDetailsMap = new Map();
        if (uniqueGameIds.length > 0) {
             console.log(`[GET /upcoming] Fetching details for ${uniqueGameIds.length} unique game IDs...`);
             // Using Promise.all to fetch details concurrently
             const gameDetailPromises = uniqueGameIds.map(id =>
                 sportsApiService.fetchGameDetails(id).catch(err => {
                     // Handle potential errors for individual fetches gracefully
                     console.error(`[GET /upcoming] Error fetching details for game ${id}:`, err.message);
                     return null; // Return null on error for a specific game
                 })
             );
             const gameDetailsResults = await Promise.all(gameDetailPromises);

             gameDetailsResults.forEach((gameDetail, index) => {
                 if (gameDetail) {
                     gameDetailsMap.set(uniqueGameIds[index], gameDetail);
                 } else {
                     // Store a fallback/error indicator if fetch failed
                     gameDetailsMap.set(uniqueGameIds[index], { id: uniqueGameIds[index], error: 'Details fetch failed' });
                 }
             });
             console.log(`[GET /upcoming] Processed details for ${uniqueGameIds.length} game IDs.`);
         }

        // 4. Combine screening data with game details
        const enrichedScreenings = screenings.map(screening => {
          const gameDetails = gameDetailsMap.get(screening.external_game_id);
          return {
            screening_id: screening.screening_id,
            screening_time: screening.screening_time,
            bar: { // Group bar details
                 id: screening.bar_id,
                 name: screening.bar_name,
                 address: screening.bar_address
            },
            game: gameDetails || { id: screening.external_game_id, error: 'Details not available' } // Provide game details or fallback
          };
        });

        res.json(enrichedScreenings);

    } catch (error) {
        console.error("Error fetching upcoming screenings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch screenings for a specific game
router.get('/game/:external_game_id', authenticateToken, async (req, res) => {
    const { external_game_id } = req.params;

    try {
        // 1. Fetch details for the specific game first (provides context)
        const gameDetails = await sportsApiService.fetchGameDetails(external_game_id);

        if (!gameDetails) {
             // Game ID might be invalid according to the API
             return res.status(404).json({ message: `Game details not found for ID: ${external_game_id}` });
        }

        // 2. Fetch screenings from DB for this external_game_id, joining with bars
        const screeningQuery = `
            SELECT
                s.id AS screening_id,
                s.screening_time,
                b.id AS bar_id,
                b.name AS bar_name,
                b.address AS bar_address
            FROM screenings s
            JOIN bars b ON s.bar_id = b.id
            WHERE s.external_game_id = $1
            ORDER BY s.screening_time ASC
        `;
        const screeningResult = await db.query(screeningQuery, [external_game_id]);

        // It's okay if no screenings are found, the game exists but isn't being shown
        // if (screeningResult.rows.length === 0) {
        //     return res.status(404).json({ message: "No screenings found for this game." });
        // }

        // 3. Format the response
        const responseData = {
            game: gameDetails, // Include details of the game being screened
            screenings: screeningResult.rows.map(s => ({ // List of places screening it
                screening_id: s.screening_id,
                screening_time: s.screening_time,
                bar: {
                    id: s.bar_id,
                    name: s.bar_name,
                    address: s.bar_address
                }
            }))
        };

        res.json(responseData);

    } catch (err) {
        // Catch errors from the API call or DB query
        console.error(`Error fetching screenings for game ${external_game_id}:`, err);
        res.status(500).json({ message: "Error fetching screenings for the game" });
    }
});


// Fetch all screenings for a specific bar
router.get('/bar/:bar_id', authenticateToken, async (req, res) => {
  const { bar_id } = req.params;

  try {
    const screeningQuery = `SELECT id AS screening_id, screening_time, external_game_id  
       FROM screenings 
       WHERE bar_id = $1
       ORDER BY screening_time ASC`;
    
    const screeningResult = await db.query(screeningQuery, [bar_id]);
    const screenings = screeningResult.rows;

    if (screenings.length === 0) {
      return res.json([]);
    }

    const uniqueGameIds = [...new Set(screenings.map(s => s.external_game_id).filter(id => id != null))];
    const gameDetailsMap = new Map();

    if (uniqueGameIds.length > 0) {
        // Using Promise.allSettled might be safer if one API call can fail without stopping others
        const gameDetailPromises = uniqueGameIds.map(id => 
            sportsApiService.fetchGameDetails(id).catch(err => { 
                console.error(`Failed to fetch game details for ${id}:`, err.message); 
                return null; // Handle individual fetch errors
            })
        );
        // Or stick with Promise.all if you want it to fail faster on any error
        // const gameDetailPromises = uniqueGameIds.map(id => sportsApiService.fetchGameDetails(id));

        const gameDetailsResults = await Promise.all(gameDetailPromises); // Or Promise.allSettled
        
        gameDetailsResults.forEach((gameDetail, index) => {
             // If using allSettled, check result.status === 'fulfilled' and result.value
             if (gameDetail) { // If using Promise.all with individual catches
                gameDetailsMap.set(uniqueGameIds[index], gameDetail);
             }
        });
    }

    const enrichedScreenings = screenings.map(screening => ({
          screening_id: screening.screening_id,
          screening_time: screening.screening_time,
          game: gameDetailsMap.get(screening.external_game_id) || { id: screening.external_game_id, error: 'Details not found' }
        }));


    res.json(enrichedScreenings); 
  } catch (err) {
    console.error("Error fetching bar screenings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/screenings/game/:external_game_id/bars
router.get('/game/:external_game_id/bars', authenticateToken, async (req, res) => {

    const { external_game_id } = req.params;
    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.lon);
    const radius = parseInt(req.query.radius, 10) || 10000; // Default radius 10km

    let query;
    let queryParams;

    // Check if latitude and longitude are valid numbers
    if (!isNaN(latitude) && !isNaN(longitude)) {

    	// --- LOCATION IS PROVIDED ---
    	console.log(`API /screenings/game/${external_game_id}/bars request. Loc: ${latitude},${longitude}, Radius: ${radius/1000}km`);

    	// Construct PostGIS Query using the GEOGRAPHY column and ST_DWithin
    	query = `
        	SELECT DISTINCT
            		b.id,
            		b.name,
           		b.address,
            		b.description,
            		-- Optional: Select original lat/lon if needed, or derive from location
            		ST_Y(b.location::geometry) as latitude,  -- Extract latitude from geography
            		ST_X(b.location::geometry) as longitude, -- Extract longitude from geography
            		-- Calculate distance in meters (using geography is accurate)
            		ST_Distance(b.location, ST_MakePoint($2, $3)::geography) as distance_meters
        	FROM screenings s
        	JOIN bars b ON s.bar_id = b.id
        	WHERE s.external_game_id = $1          -- Filter by game ID
          	AND b.location IS NOT NULL             -- Ensure the bar has a location stored
          	AND ST_DWithin(                      -- The core spatial filter
              		b.location,                      -- Bar's location (geography)
              		ST_MakePoint($2, $3)::geography, -- User's location (lon, lat) -> geography
              		$4                               -- Radius in meters
          		)
        	ORDER BY distance_meters; -- Order results by distance (nearest first)
    	`;
    	// Parameters: game_id, user_longitude, user_latitude, radius
    	queryParams = [external_game_id, longitude, latitude, radius];

    } else {
    	// --- LOCATION NOT PROVIDED (or invalid) ---
    	console.log(`API /screenings/game/${external_game_id}/bars request. Loc: ${req.query.lat || 'N/A'},${req.query.lon || 'N/A'} 	(Not Used). Radius: ${radius/1000}km`);
    	console.log('No valid location provided, returning all bars for game (with location).');

    	// Fallback query: Get all bars for the game that HAVE a location stored
    	query = `
        	SELECT DISTINCT
            		b.id,
            		b.name,
            		b.address,
            		b.description,
            		ST_Y(b.location::geometry) as latitude,  -- Extract latitude
            		ST_X(b.location::geometry) as longitude -- Extract longitude
            		-- Cannot calculate distance meaningfully without user location
        	FROM screenings s
        	JOIN bars b ON s.bar_id = b.id
        	WHERE s.external_game_id = $1
          	AND b.location IS NOT NULL; -- Only include bars with a location
    	`;
    	queryParams = [external_game_id];
    }

    try {
      console.log("Executing query:", query);
      console.log("With params:", queryParams);
      const result = await db.query(query, queryParams); // Use the correct query and params

      console.log(`Found ${result.rows.length} bars showing game ${external_game_id}` + (!isNaN(latitude) && !isNaN(longitude) ? '   nearby.' : ' (all with location).'));
      res.json(result.rows);

   } catch (err) {
    console.error(`Error fetching bars for game ${external_game_id}:`, err);
    // Send back a more specific error if it's PostGIS related? Maybe not needed for client.
    res.status(500).json({ message: 'Internal server error while fetching bars.' });
   }
}
);
module.exports = router;
