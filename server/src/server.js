const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const organizationRoutes = require('./routes/tenantRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://frontend:3000',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      system: 'healthy',
      database: 'connected',
      time: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      system: 'unhealthy',
      database: 'disconnected',
      time: new Date().toISOString()
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/organizations', userRoutes);
app.use('/api/organizations/projects', projectRoutes);
app.use('/api/organizations/projects', taskRoutes);

app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

async function initializeDatabase() {
  const fs = require('fs');
  const path = require('path');
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  const { seedDatabase } = require('./config/seedData');
  await seedDatabase();
}

app.listen(PORT, async () => {
  await initializeDatabase();
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
