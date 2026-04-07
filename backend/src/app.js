// backend/src/app.js

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug logs
console.log('📍 Loading routes...');

// ===========================================
// ✅ CORRECCIÓN: Ruta correcta a auth/auth.js
// ===========================================
const authRoutes = require('./routes/auth/auth');  // ← Cambiar de './routes/auth'
console.log('📍 Auth routes loaded from:', './routes/auth/auth');
console.log('📍 authRoutes type:', typeof authRoutes);

app.use('/api/auth', authRoutes);
console.log('✅ Auth routes mounted at /api/auth');

// Rutas de Perfil (esta sí está bien)
const profileRoutes = require('./routes/profile');
console.log('📍 Profile routes loaded');
app.use('/api/profile', profileRoutes);
console.log('✅ Profile routes mounted at /api/profile');

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: Date.now(),
    service: 'quester-backend'
  });
});

// 404 handler (AL FINAL)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

module.exports = app;