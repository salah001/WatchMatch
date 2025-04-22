// routes/api/games.js
const express = require('express');
const router = express.Router();
const sportsApiService = require('../../services/sportsApiService'); 
const db = require('../../db');

// GET /api/games/search
router.get('/search', async (req, res) => {
    try {
        // Pass all query parameters directly to the service
        const queryParams = req.query;
        console.log("API /games/search received query:", queryParams);

        const apiGames = await sportsApiService.searchGames(queryParams);

	if (!apiGames || apiGames.length === 0) {
            console.log("API search returned no games.");
            return res.json([]); // No games found by API
        }
        console.log(`API search returned ${apiGames.length} potential games.`);

	const gameIdsFromApi = apiGames.map(game => game.id).filter(id => id != null);

        let scheduledGameIds = new Set(); // Use a Set for efficient lookup

        if (gameIdsFromApi.length > 0) {
            // 3. Query our DB using IN clause to find which games have screenings
            try {
                // Generate placeholders: $1, $2, $3...
                const placeholders = gameIdsFromApi.map((_, index) => `$${index + 1}`).join(',');

                // Construct the IN query string
                const screeningCheckQuery = `
                    SELECT DISTINCT external_game_id
                    FROM screenings
                    WHERE external_game_id IN (${placeholders});
                `;

                // The parameters are now the individual elements of the array
                const dbQueryParams = gameIdsFromApi;

                console.log("Executing screening check query:", screeningCheckQuery);
                console.log("With params:", dbQueryParams);

                // --- Execute the DB query ---
                const screeningCheckResult = await db.query(screeningCheckQuery, dbQueryParams);
                // ----------------------------

                // Populate the Set with IDs that have screenings
                screeningCheckResult.rows.forEach(row => {
                    scheduledGameIds.add(row.external_game_id);
                });
                console.log(`Checked ${gameIdsFromApi.length} API game IDs, found ${scheduledGameIds.size} with screenings in DB.`);

            } catch (dbError) {
                // Log the DB error but don't fail the whole search, just proceed without enrichment
                console.error('Error checking screenings table:', dbError);
                // Optionally, you could decide to return an error here if checking the DB is critical
            }
        } else {
             console.log("No valid game IDs found in API response to check against DB.");
        }

        // 4. Enrich the API results with the has_screenings flag
        const enrichedGames = apiGames.map(game => ({
            ...game, // Spread the original game data
            has_screenings: scheduledGameIds.has(game.id) // Add the boolean flag
        }));

        console.log(`Returning ${enrichedGames.length} enriched games.`);
        res.json(enrichedGames); // Return the enriched list

    } catch (err) {
        // The service should handle detailed logging
        console.error('Error in GET /api/games/search route:', err);
        res.status(500).json({ message: 'Error searching for games' });
    }
});


// GET /api/games - List all games (now from external API)
router.get('/', async (req, res) => {
  try {
    // --- Fetch games using the service ---
    // Pass options if your service function supports them (e.g., req.query.leagueId)
    const games = await sportsApiService.fetchUpcomingGames();

    // The service should already return the standardized format
    res.json(games);

  } catch (err) {
    // The service logs detailed errors, send a generic message to client
    console.error('Error in GET /api/games route:', err);
    res.status(500).json({ message: 'Error fetching games data' });
  }
});

// Optional: Add a route to get details for a specific game using its API ID
router.get('/:apiGameId', async (req, res) => {
    const { apiGameId } = req.params;
    try {
        const gameDetails = await sportsApiService.fetchGameDetails(apiGameId);
        if (gameDetails) {
            res.json(gameDetails);
        } else {
            res.status(404).json({ message: `Game with ID ${apiGameId} not found.` });
        }
    } catch (err) {
        console.error(`Error in GET /api/games/${apiGameId} route:`, err);
        res.status(500).json({ message: 'Error fetching game details' });
    }
});


module.exports = router;