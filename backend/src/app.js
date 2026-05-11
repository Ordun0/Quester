// backend/src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ===========================================
// ✅ MIDDLEWARE GLOBAL
// ===========================================

// Security headers
app.use(helmet());

// CORS - Permitir requests desde frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Rate limiting para prevenir abuso
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por ventana
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later'
  }
});
app.use('/api/', limiter);

// Parse JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging para debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===========================================
// ✅ RUTAS DE AUTENTICACIÓN
// ===========================================
console.log('📍 Loading auth routes...');
const authRoutes = require('./routes/auth/auth');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes mounted at /api/auth');

// ===========================================
// ✅ RUTAS DE PERFIL DE USUARIO
// ===========================================
console.log('📍 Loading profile routes...');
const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);
console.log('✅ Profile routes mounted at /api/profile');

// ===========================================
// ✅ RUTAS DE VIAJES (TRIPS)
// ===========================================
console.log('📍 Loading trip routes...');
const tripRoutes = require('./routes/trip');
app.use('/api/trip', tripRoutes);
console.log('✅ Trip routes mounted at /api/trip');

// ===========================================
// ✅ RUTAS DE DESTINOS (SerpAPI)
// ===========================================
console.log('📍 Loading destination routes...');
const destinationRoutes = require('./routes/destination');
app.use('/api/destinations', destinationRoutes);
console.log('✅ Destination routes mounted at /api/destinations');

// ===========================================
// ✅ RUTAS DE ITINERARIO (GCP + Gemini)
// ===========================================
console.log('📍 Loading itinerary routes...');
const itineraryRoutes = require('./routes/itinerary');
app.use('/api/itinerary', itineraryRoutes);
console.log('✅ Itinerary routes mounted at /api/itinerary');

// ✅ NUEVO: Rutas de Extracción (con auth)
console.log('📍 Loading extraction routes...');
const extractionRoutes = require('./routes/extraction');
app.use('/api/extraction', extractionRoutes);  // ← Requiere auth
console.log('✅ Extraction routes mounted at /api/extraction');

console.log('📍 Loading trip routes...');
const tripsRoutes = require('./routes/trips');
app.use('/api/trips', tripsRoutes);
console.log('✅ Trip routes mounted at /api/trips');

// ===========================================
// ✅ HEALTH CHECK (Público)
// ===========================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: Date.now(),
    service: 'quester-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===========================================
// ✅ 404 HANDLER (Debe ir AL FINAL)
// ===========================================
app.use((req, res) => {
  console.warn(`⚠️ 404: Route not found - ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/profile',
      'PUT /api/profile',
      'POST /api/trip',
      'GET /api/trip/:tripId',
      'GET /api/destinations/search',
      'POST /api/itinerary/generate',
      'POST /test/consolidate',  // ← Nueva ruta de prueba
      'GET /test/gcp-connection' // ← Nueva ruta de prueba
    ]
  });
});

// ===========================================
// ✅ ERROR HANDLER GLOBAL (Debe ir AL FINAL)
// ===========================================
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Manejo de errores específicos
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token'
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Something went wrong. Please try again later.'
  });
});

// ===========================================
// ✅ EXPORTAR APP
// ===========================================
module.exports = app;