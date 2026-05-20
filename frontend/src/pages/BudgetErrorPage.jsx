// frontend/src/pages/BudgetErrorPage.jsx

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';

function BudgetErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ✅ Extraer datos del error desde el estado de navegación
  const { budget, totalCost, currency } = location.state || {};

  const formatCurrency = (amount, curr = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleBackToPlanner = () => {
    // ✅ Limpiar datos temporales del itinerario fallido
    sessionStorage.removeItem('itineraryData');
    navigate('/trip-builder', { state: { preserveBudget: true } });
  };

  const handleBackToDashboard = () => {
    // ✅ Limpiar datos temporales del itinerario fallido
    sessionStorage.removeItem('itineraryData');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      
      {/* Header minimal */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Quester Logo" className="w-12 h-12 object-contain" />
              <h1 className="text-2xl font-bold text-quester-purple tracking-wide">QUESTER</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Página de Error de Presupuesto */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          
          {/* Icono de error */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-quester-dark mb-4">
            Budget Limit Exceeded
          </h2>

          {/* Mensaje principal - RF-04.05.01 */}
          <p className="text-gray-700 mb-6 leading-relaxed">
            Sorry, I cannot create an itinerary with this budget. Please increase it.
          </p>

          {/* Detalles del presupuesto - RF-04.05.02 */}
          {budget && totalCost && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Your Budget:</span>
                <span className="font-medium text-quester-dark">{formatCurrency(budget, currency)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Estimated Cost:</span>
                <span className="font-medium text-red-600">{formatCurrency(totalCost, currency)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-red-200">
                <span className="text-gray-600">Difference:</span>
                <span className="font-bold text-red-600">
                  +{formatCurrency(totalCost - budget, currency)}
                </span>
              </div>
            </div>
          )}

          {/* Tips para resolver */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-left">
            <h4 className="font-semibold text-blue-900 mb-2 text-sm">Tips to fit your budget:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Increase your total budget</li>
              <li>Choose a lower hotel class</li>
              <li>Select Economy flights instead of Business</li>
              <li>Reduce the number of premium activities</li>
            </ul>
          </div>

          {/* Botones de acción - RF-04.05.02 y RF-04.05.03 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleBackToDashboard}
              className="px-6 py-3 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to My Trips
            </button>
            <button
              onClick={handleBackToPlanner}
              className="px-6 py-3 bg-quester-blue hover:bg-blue-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              Adjust Budget & Try Again
            </button>
          </div>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-gray-500">
          © 2026 Quester. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default BudgetErrorPage;