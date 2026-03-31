// frontend/src/middleware/authMiddleware.js

import authService from '../services/auth.service';

/**
 * Verificar si el token es válido
 * RF-06.03 - Manejo de expiración de tokens
 */
export const checkAuth = () => {
  const token = authService.getToken();
  
  if (!token) {
    return { isAuthenticated: false, reason: 'no_token' };
  }
  
  try {
    // Decodificar token para verificar expiración
    const decoded = JSON.parse(atob(token.split('.')[1]));
    
    // Verificar si expiró
    if (decoded.exp * 1000 < Date.now()) {
      authService.logout();
      return { 
        isAuthenticated: false, 
        reason: 'expired',
        message: 'Tu sesión ha expirado, por favor inicia sesión nuevamente'  // RF-06.03.04
      };
    }
    
    return { isAuthenticated: true };
    
  } catch (error) {
    authService.logout();
    return { 
      isAuthenticated: false, 
      reason: 'invalid',
      message: 'Tu sesión ha expirado, por favor inicia sesión nuevamente'  // RF-06.03.04
    };
  }
};

/**
 * Protected Route Component
 * RF-06.03.03 - Redirigir automáticamente cuando token es inválido
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, reason, message } = checkAuth();
  const navigate = useNavigate();
  
  if (!isAuthenticated) {
    // Mostrar mensaje de expiración
    if (reason === 'expired' || reason === 'invalid') {
      // Podrías usar un toast/notification aquí
      alert(message);  // RF-06.03.04
    }
    navigate('/auth');
    return null;
  }
  
  return children;
};