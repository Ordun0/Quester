// frontend/src/pages/Dashboard.jsx

import React from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Bienvenido a Quester</p>
        
        <div className="mt-8 text-center py-16">
          <p className="text-gray-500">Dashboard en desarrollo (Tarea 45)</p>
          <Link to="/login" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            Volver al Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;