// routes/api/games.js
const express = require('express');
const router = express.Router();
const sportsApiService = require('../../services/sportsApiService'); 


// GET /api/games/search?sport=Soccer&team=Arsenal&date=YYYY-MM-DD etc.
router.get('/search', async (req, res) => {
    try {
        // Pass all query parameters directly to the service
        const queryParams = req.query;
        console.log("API /games/search received query:", queryParams);

        const games = await sportsApiService.searchGames(queryParams);
        res.json(games);

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