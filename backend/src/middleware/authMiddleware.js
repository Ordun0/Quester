// backend/src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

/**
 * Middleware de validación de token JWT
 * Protege rutas que requieren autenticación
 * 
 * Uso: app.use('/api/protected', authMiddleware, routeHandler);
 */
const authMiddleware = async (req, res, next) => {
  try {
    // ===========================================
    // 1. OBTENER TOKEN DEL HEADER
    // ===========================================
    const authHeader = req.headers.authorization;
    
    // Verificar que el header existe
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Authorization header is required'
      });
    }

    // ===========================================
    // 2. VALIDAR FORMATO "Bearer <token>"
    // ===========================================
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Token format must be: Bearer <token>'
      });
    }

    const [scheme, token] = parts;
    
    if (scheme !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Token must use Bearer scheme'
      });
    }

    // ===========================================
    // 3. VERIFICAR QUE EL TOKEN NO ESTÁ VACÍO
    // ===========================================
    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Token cannot be empty'
      });
    }

    // ===========================================
    // 4. VALIDAR TOKEN CON JWT.VERIFY()
    // ===========================================
    const jwtSecret = process.env.JWT_SECRET;
    
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError) {
      // Manejar diferentes tipos de errores JWT
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'Token has expired. Please login again.',
          expiredAt: jwtError.expiredAt
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Invalid token. Please login again.'
        });
      }
      
      // Error genérico
      return res.status(401).json({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Token validation failed'
      });
    }

    // ===========================================
    // 5. AGREGAR USER INFO A REQ.USER
    // ===========================================
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      nombreCompleto: decoded.nombreCompleto
    };

    console.log('✅ Token válido para usuario:', req.user.email);

    // ===========================================
    // 6. PASAR AL SIGUIENTE MIDDLEWARE/CONTROLLER
    // ===========================================
    next();

  } catch (error) {
    console.error('❌ authMiddleware error:', error);
    
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Authentication failed'
    });
  }
};

module.exports = authMiddleware;