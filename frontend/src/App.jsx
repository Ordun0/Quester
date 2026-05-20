// frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Auth from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import TripBuilder from './pages/TripBuilder';  // ✅ Nuevo import para Trip Builder
import authService from './services/auth.service';
import Itinerary from './pages/Itinerary';
import SavedItinerary from './pages/SavedItinerary';
import BudgetErrorPage from './pages/BudgetErrorPage'; 

// ✅ Componente para rutas protegidas con mensaje de expiración (RF-06.03)
function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getToken();
      
      if (!token) {
        setShowExpiredMessage(true);
        setIsChecking(false);
        
        // ✅ RF-06.03.04 - Mostrar mensaje y redirigir
        setTimeout(() => {
          setShowExpiredMessage(false);
          navigate('/auth');
        }, 2500);
        
        return;
      }

      try {
        // Decodificar token para verificar expiración
        const decoded = JSON.parse(atob(token.split('.')[1]));
        
        // Verificar si expiró
        if (decoded.exp * 1000 < Date.now()) {
          authService.logout();
          setShowExpiredMessage(true);
          setIsChecking(false);
          
          // ✅ RF-06.03.04 - Mensaje exacto del requerimiento
          setTimeout(() => {
            setShowExpiredMessage(false);
            navigate('/auth');
          }, 2500);
          
          return;
        }
        
        setIsChecking(false);
      } catch (error) {
        authService.logout();
        setShowExpiredMessage(true);
        setIsChecking(false);
        
        setTimeout(() => {
          setShowExpiredMessage(false);
          navigate('/auth');
        }, 2500);
      }
    };

    checkAuth();
  }, [navigate]);

  // ✅ RF-06.03.04 - Mostrar pantalla de expiración
  if (showExpiredMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center max-w-md px-4">
          {/* Icono de candado */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          
          {/* ✅ RF-06.03.04 - Mensaje exacto del requerimiento */}
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Sesión Expirada
          </h2>
          <p className="text-gray-700 text-lg mb-2">
            Tu sesión ha expirado, por favor inicia sesión nuevamente
          </p>
          <p className="text-sm text-gray-500">
            Redirigiendo al login...
          </p>
          
          {/* Loading spinner */}
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-quester-blue mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state mientras verifica
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-quester-blue"></div>
      </div>
    );
  }

  const token = authService.getToken();
  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth (público) */}
        <Route path="/auth" element={<Auth />} />
        
        {/* Recuperación de contraseña (público) */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Dashboard (protegido con RF-06.03) */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Perfil (protegido con RF-06.03) */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        
        {/* ✅ Trip Builder (protegido con RF-06.03) - Tareas 47-83 */}
        <Route 
          path="/trip-builder" 
          element={
            <ProtectedRoute>
              <TripBuilder />
            </ProtectedRoute>
          } 
        />
		
		<Route 
          path="/itinerary" 
          element={
            <ProtectedRoute>
              <Itinerary />
            </ProtectedRoute>
          } 
        />
		
		<Route 
		  path="/itinerary/:tripId" 
		  element={
			  <SavedItinerary />
		  } 
		/>
		
		<Route path="/budget-error" element={<BudgetErrorPage />} /> 

        
        {/* Redirigir raíz */}
        <Route path="/" element={<Navigate to="/auth" replace />} />
        
        {/* 404 */}
        <Route path="*" element={<div className="p-8 text-center font-sans">404 - Página no encontrada</div>} />
      </Routes>
    </Router>
  );
}

export default App;