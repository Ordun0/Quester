// frontend/src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/auth.service';
import logo from '../assets/logo.png';

function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);

  // ✅ RF-04.01 - Cargar datos del usuario al montar
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // ✅ RF-05.02 - Usar sessionStorage en lugar de localStorage
      const token = authService.getToken();
      const storedUser = sessionStorage.getItem('user');

      if (!token || !storedUser) {
        navigate('/auth');
        return;
      }

      // Parsear usuario almacenado
      const userData = JSON.parse(storedUser);
      setUser(userData);

      // ✅ Cargar viajes del usuario (Tarea 115-116)
      await loadUserTrips(token);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      if (err.error === 'TOKEN_EXPIRED' || err.error === 'INVALID_TOKEN') {
        // ✅ RF-05.02 - Limpieza de tokens
        authService.logout();
        navigate('/auth');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserTrips = async (token) => {
    try {
      // TODO: Conectar con endpoint GET /api/trips cuando esté listo
      // Por ahora, datos mock para desarrollo
      const mockTrips = [
        {
          tripId: 'trip_001',
          destination: 'Tokyo, Japan',
          startDate: '2026-03-15',
          endDate: '2026-03-22',
          budget: 3200,
          spent: 2285,
          status: 'planned'
        },
        {
          tripId: 'trip_002',
          destination: 'Barcelona, Spain',
          startDate: '2026-05-05',
          endDate: '2026-05-10',
          budget: 1400,
          spent: 1220,
          status: 'planned'
        },
        {
          tripId: 'trip_003',
          destination: 'Guadalajara, Mexico',
          startDate: '2026-10-20',
          endDate: '2026-10-22',
          budget: 2000,
          spent: 880,
          status: 'planned'
        }
      ];
      setTrips(mockTrips);
    } catch (err) {
      console.error('Error loading trips:', err);
    }
  };

  // ✅ RF-05.01 - Cerrar sesión
  const handleLogout = () => {
    // ✅ RF-05.02.01 - Eliminar de localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // ✅ RF-05.02.02 - Eliminar de sessionStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // ✅ RF-05.02.03 - Eliminar datos sensibles temporales
    sessionStorage.clear();
    
    // ✅ RF-05.01.02 - Redirigir a login
    navigate('/auth');
  };

  // ✅ RF-04.01.03-04 - Generar iniciales con color
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    return (first + last).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#2E2D88', '#1F75FE', '#10B981', '#F59E0B',
      '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'
    ];
    
    if (!name) return colors[0];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // ✅ Calcular progreso de presupuesto
  const getBudgetProgress = (spent, budget) => {
    const percentage = Math.min((spent / budget) * 100, 100);
    return percentage.toFixed(0);
  };

  const getBudgetStatus = (spent, budget) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressBarColor = (spent, budget) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // ✅ Formatear fechas
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-quester-blue mx-auto"></div>
          <p className="mt-4 text-gray-600 font-sans">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* ===========================================
          HEADER - Consistente con Profile
          =========================================== */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo Quester */}
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src={logo} alt="Quester Logo" className="w-12 h-12 object-contain" />
              <h1 className="text-2xl font-bold text-quester-purple tracking-wide">QUESTER</h1>
            </Link>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {/* Avatar con enlace a perfil */}
              <Link to="/profile">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-quester-blue hover:scale-105 transition-all cursor-pointer"
                  style={{ backgroundColor: getAvatarColor(user?.nombreCompleto) }}
                  title={`View Profile - ${user?.nombreCompleto}`}
                >
                  {getInitials(user?.nombreCompleto)}
                </div>
              </Link>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-quester-blue font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ===========================================
          MAIN CONTENT
          =========================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-quester-dark">
            Welcome Back, {user?.nombreCompleto?.split(' ')[0] || 'Traveler'} 👋
          </h2>
          <p className="text-gray-600 mt-2">Where are we going today?</p>
        </div>

        {/* Create Quest Button */}
        <div className="mb-8 flex justify-end">
          <button
            onClick={() => navigate('/trip-builder')}
            className="flex items-center gap-2 px-6 py-3 bg-quester-blue hover:bg-blue-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create a Quest
          </button>
        </div>

        {/* My Quests Section */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-quester-dark">My Quests</h3>
        </div>

        {/* Trips Grid */}
        {trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <div
                key={trip.tripId}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-quester-dark mb-4">
                    {trip.destination}
                  </h4>

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
                  </div>

                  {/* Budget */}
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={getBudgetStatus(trip.spent, trip.budget)}>
                      ${trip.spent.toLocaleString()} / ${trip.budget.toLocaleString()}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressBarColor(trip.spent, trip.budget)}`}
                      style={{ width: `${getBudgetProgress(trip.spent, trip.budget)}%` }}
                    ></div>
                  </div>

                  {/* View Itinerary Link */}
                  <Link
                    to={`/trips/${trip.tripId}`}
                    className="inline-flex items-center gap-1 text-sm text-quester-blue hover:text-blue-700 font-medium transition-colors"
                  >
                    View Itinerary
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <span className="text-xs text-gray-500 capitalize">
                    Status: {trip.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No quests yet</h3>
            <p className="text-gray-500 mb-6">Start planning your first adventure!</p>
            <button
              onClick={() => navigate('/trip-builder')}
              className="px-6 py-3 bg-quester-blue hover:bg-blue-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              Create Your First Quest
            </button>
          </div>
        )}

        {/* Quick Stats (Opcional) */}
        {trips.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-quester-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-quester-dark">{trips.length}</p>
                  <p className="text-sm text-gray-600">Total Quests</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-quester-dark">
                    {trips.filter(t => t.status === 'planned').length}
                  </p>
                  <p className="text-sm text-gray-600">Planned</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-quester-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-quester-dark">
                    ${trips.reduce((acc, trip) => acc + trip.spent, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Spent</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Quester Logo" className="w-8 h-8 object-contain" />
              <span className="text-sm text-gray-600 font-medium">QUESTER</span>
            </div>
            <p className="text-xs text-gray-500">
              © 2026 Quester. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-gray-500 hover:text-quester-blue transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-gray-500 hover:text-quester-blue transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;