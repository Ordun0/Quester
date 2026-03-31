// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import { ProtectedRoute } from './middleware/authMiddleware';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth (público) */}
        <Route path="/auth" element={<Auth />} />
        
        {/* Dashboard (protegido) - RF-06.03 */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Redirigir raíz */}
        <Route path="/" element={<Navigate to="/auth" replace />} />
        
        {/* 404 */}
        <Route path="*" element={<div className="p-8 text-center font-sans">404 - Página no encontrada</div>} />
      </Routes>
    </Router>
  );
}

export default App;