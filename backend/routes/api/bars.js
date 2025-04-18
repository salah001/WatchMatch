const express = require('express');
const router = express.Router();
const db = require('../../db'); 
const { authenticateToken } = require('../../authMiddleware');
const { checkRole } = require('../../roleMiddleware');

// Register a new bar (owners only)
router.post('/register', authenticateToken, checkRole('owner'),async (req, res) => {
	const { name, address, description } = req.body;
	const owner_id = req.user.id;

	if (!name || !address) {
    		return res.status(400).json({ message: 'Missing required fields' });
  	}
   
	try {
    		const result = await db.query( `INSERT INTO bars (owner_id, name, address, description, created_at)
      		VALUES ($1, $2, $3, $4, NOW()) RETURNING *`, [owner_id, name, address, description] );

    		res.status(201).json(result.rows[0]);
 	} catch (err) {
    		console.error('Error creating bar:', err);
    		res.status(500).json({ message: 'Failed to create bar' });
  	}
});

// GET /api/bars - List all bars
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM bars ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bars:', err);
    res.status(500).json({ message: 'Error fetching bars' });
  }
});

router.get('/owned', authenticateToken, checkRole('owner'), async (req, res) => {
  const ownerId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM bars WHERE owner_id = $1', [ownerId]);
    res.json({bars: result.rows});
  } catch (err) {
    console.error('Error fetching owned bars:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//// GET /api/bar/:bar_id - Get a single bar by ID
router.get('/:bar_id', async (req, res) => {
  try {
    const barId = req.params.bar_id;
    const bar = await db.query('SELECT * FROM bars WHERE id = $1', [barId]);

    if (bar.rows.length === 0) {
      return res.status(404).json({ message: 'Bar not found' });
    }

    res.json(bar.rows[0]);
  } catch (err) {
    console.error('Error fetching bar by ID:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/owned', authenticateToken, checkRole('owner'), async (req, res) => {
  const ownerId = req.user.id;
  try {
    const result = await db.query('SELECT * FROM bars WHERE owner_id = $1', [ownerId]);
    res.json({bars: result.rows});
  } catch (err) {
    console.error('Error fetching owned bars:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
