require('dotenv').config();
const cors = require('cors');
const express = require('express');
const { Pool } = require('pg');
const db = require('./db'); // Import the database connection
const authMiddleware = require('./authMiddleware');
const bcrypt = require('bcrypt'); // or use 'bcryptjs' if needed
const jwt = require('jsonwebtoken');

const corsOptions = {
  origin: '*', // or your frontend URL like "http://localhost:19006"
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// Import PostgreSQL DB connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.connect()
    .then(() => console.log("✅ Connected to PostgreSQL successfully!"))
    .catch(err => console.error("❌ Database connection error:", err));

// Default route
app.get('/', (req, res) => {
    res.send('Sports Watch App Backend is Running!');
});

//User Routes
const userRoutes = require('./routes/api/users');
app.use('/users', userRoutes);

// Bar Routes
const barRoutes = require('./routes/api/bars');
app.use('/bars', barRoutes);

// Games Routes
const gameRoutes = require('./routes/api/games');
app.use('/games', gameRoutes);

//Screening Routes
const screeningRoutes = require('./routes/api/screenings');
app.use('/screenings', screeningRoutes);

//// Auth Routes
const authRoutes = require('./routes/api/auth');
app.use('/auth', authRoutes); 


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));













