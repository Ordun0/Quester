import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';

// ✅ URL del backend para desarrollo (ajustar según tu configuración)
const API_BASE_URL = import.meta?.env?.VITE_AWS_BACKEND_URL || 'http://localhost:3000';

function ItineraryView({ 
  itineraryData, 
  onSaveTrip, 
  onExportPDF, 
  isSaving, 
  isExporting, 
  saveStatus,
  actionType = 'save',  // ✅ NUEVO: 'save' | 'delete', default 'save'
  allowRegeneration = true  // ✅ NUEVO: Controla visibilidad del botón Regenerate (default: true)
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeDay, setActiveDay] = useState(0);
  const [showInsights, setShowInsights] = useState(false);
  
  // ✅ NUEVO: Estados para regenerar itinerario con comentarios
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateComments, setRegenerateComments] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // ✅ NUEVO: Estado para el tripId real (formato trip_xxx)
  const [realTripId, setRealTripId] = useState(null);

  // ✅ CORREGIDO: Extraer estructura correcta
  // itineraryData ya es { extraction, itinerary } gracias a Itinerary.jsx
  const { summary, dailyPlan, budgetBreakdown, recommendations, selectedFlights, selectedHotel, weather, transport } = itineraryData.itinerary || itineraryData;
  const { extraction } = itineraryData;

  // Calcular totales - ✅ CORREGIDO para presupuesto restante
  const totalBudget = summary?.totalBudget || 0;
  const spentBudget = budgetBreakdown?.total || 0;
  // ✅ CORREGIDO: Calcular remainingBudget correctamente (puede ser negativo si over budget)
  const remainingBudget = totalBudget - spentBudget;
  const underBudget = remainingBudget >= 0;

  // Formato de moneda
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ✅ Helpers para flights
  const formatFlightTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const formatFlightDate = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getFlightDuration = (flight) => {
    if (!flight?.duration?.formatted) return 'N/A';
    return flight.duration.formatted;
  };

  const getLayoverInfo = (flight) => {
    if (!flight?.layovers?.length) return null;
    const layover = flight.layovers[0];
    return `${layover.durationFormatted} at ${layover.airport?.code || layover.airport?.name}`;
  };

  // ✅ Helpers para hotel
  const getHotelAmenities = (hotel) => {
    if (!hotel?.amenities?.length) return 'N/A';
    return hotel.amenities.slice(0, 3).join(', ') + (hotel.amenities.length > 3 ? '...' : '');
  };

  // ✅ Helper para mostrar icono de transporte
  const getTransportIcon = (method) => {
    if (!method) return null;
    const lower = method.toLowerCase();
    if (lower.includes('walk')) return '🚶';
    if (lower.includes('metro') || lower.includes('subway')) return '🚇';
    if (lower.includes('bus')) return '🚌';
    if (lower.includes('taxi')) return '🚕';
    if (lower.includes('uber') || lower.includes('lyft')) return '🚗';
    if (lower.includes('bike')) return '🚲';
    if (lower.includes('train')) return '🚆';
    if (lower.includes('ferry') || lower.includes('boat')) return '⛴️';
    return '🚙';
  };

  // ✅ Helper para color de badge de transporte
  const getTransportBadgeColor = (method) => {
    if (!method) return 'bg-gray-100 text-gray-800';
    const lower = method.toLowerCase();
    if (lower.includes('walk')) return 'bg-green-100 text-green-800';
    if (lower.includes('metro') || lower.includes('subway') || lower.includes('bus')) return 'bg-blue-100 text-blue-800';
    if (lower.includes('taxi') || lower.includes('uber') || lower.includes('lyft')) return 'bg-yellow-100 text-yellow-800';
    if (lower.includes('bike')) return 'bg-teal-100 text-teal-800';
    return 'bg-gray-100 text-gray-800';
  };

  // ✅ NUEVO: Función para extraer tripId de la URL (/itinerary/trip_xxx)
  const getTripIdFromUrl = () => {
    const match = location.pathname.match(/\/itinerary\/(trip_[a-f0-9\-]+)/i);
    return match ? match[1] : null;
  };

  // ✅ NUEVO: Función simple para obtener tripId REAL (solo formato trip_xxx)
  const getRealTripId = () => {
    // 1. Buscar en estado local (actualizado después de guardar)
    if (realTripId && realTripId.startsWith('trip_')) {
      return realTripId;
    }
    
    // 2. Buscar en la URL actual (/itinerary/trip_xxx)
    const urlTripId = getTripIdFromUrl();
    if (urlTripId) {
      return urlTripId;
    }
    
    // 3. Buscar en itineraryData props (nivel principal)
    if (itineraryData?.tripId && itineraryData.tripId.startsWith('trip_')) {
      return itineraryData.tripId;
    }
    
    // 4. Buscar en estructuras anidadas de itineraryData
    if (itineraryData?.itinerary?.tripId && itineraryData.itinerary.tripId.startsWith('trip_')) {
      return itineraryData.itinerary.tripId;
    }
    if (itineraryData?.extraction?.tripId && itineraryData.extraction.tripId.startsWith('trip_')) {
      return itineraryData.extraction.tripId;
    }
    
    // 5. Fallback: buscar en sessionStorage.itineraryData
    try {
      const stored = sessionStorage.getItem('itineraryData');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.tripId?.startsWith('trip_')) return parsed.tripId;
        if (parsed?.itinerary?.tripId?.startsWith('trip_')) return parsed.itinerary.tripId;
      }
    } catch (e) {
      // Ignorar errores de parseo
    }
    
    // 6. Fallback manual: savedTripId
    const savedId = sessionStorage.getItem('savedTripId');
    if (savedId && savedId.startsWith('trip_')) {
      return savedId;
    }
    
    return null;
  };

  // ✅ NUEVO: Efecto para actualizar realTripId cuando cambian los datos
  useEffect(() => {
    const foundId = getRealTripId();
    if (foundId && foundId !== realTripId) {
      console.log('🔄 [ItineraryView] Updated realTripId:', foundId);
      setRealTripId(foundId);
    }
  }, [itineraryData, location.pathname, saveStatus]);

  // ✅ NUEVO: Efecto para actualizar realTripId cuando saveStatus cambia a 'success'
  useEffect(() => {
    if (saveStatus === 'success') {
      const foundId = getRealTripId();
      if (foundId && foundId !== realTripId) {
        console.log('✅ [ItineraryView] Trip saved, updated realTripId:', foundId);
        setRealTripId(foundId);
      }
    }
  }, [saveStatus]);

  // ✅ NUEVO: Verificar si se puede regenerar este itinerario
  const canRegenerate = () => {
    const tripId = getRealTripId();
    return !!tripId;
  };

  // ✅ NUEVO: Función para regenerar itinerario con comentarios - LLAMANDO A /api/extraction CON FLAGS
  const handleRegenerateItinerary = async () => {
    const tripId = getRealTripId();
    
    // ✅ VALIDACIÓN: Si no hay tripId, intentar obtener originalPayload de sessionStorage
    let originalRequest = null;
    try {
      const stored = sessionStorage.getItem('originalGenerationPayload');
      if (stored) {
        originalRequest = JSON.parse(stored);
        
        // ✅ LOG DETALLADO de la estructura recuperada
        console.log('🔄 [Regenerate] originalRequest from sessionStorage:', {
          hasTripData: !!originalRequest?.tripData,
          tripData: originalRequest?.tripData,
          hasTravelers: !!originalRequest?.travelers,
          hasBudget: !!originalRequest?.budget,
          hasPreferences: !!originalRequest?.preferences
        });
        
        // ✅ VALIDAR que tripData tenga los campos requeridos
        if (!originalRequest?.tripData?.destination || !originalRequest?.tripData?.startDate || !originalRequest?.tripData?.endDate) {
          console.warn('⚠️ [Regenerate] originalRequest.tripData is incomplete, falling back to DynamoDB');
          originalRequest = null;  // ← Forzar fallback a DynamoDB si los datos están corruptos
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not parse originalGenerationPayload:', e);
    }
    
    // ✅ Si no hay tripId Y no hay originalRequest válido, no se puede regenerar
    if (!tripId && !originalRequest) {
      alert('This itinerary has not been saved yet. Please save it to "My Trips" first, then you can regenerate it with your feedback.');
      return;
    }

    if (!regenerateComments.trim()) {
      alert('Please enter your feedback before regenerating');
      return;
    }

    console.log('🔍 [Regenerate] Using:', { 
      tripId, 
      hasOriginalRequest: !!originalRequest,
      originalRequestTripData: originalRequest?.tripData
    });

    setIsRegenerating(true);
    
    try {
      const token = sessionStorage.getItem('token');
      
      // ✅ NUEVO: Construir requestBody para endpoint /api/extraction con flags de regeneración
      const requestBody = {
        // ✅ Datos del trip (de originalRequest o fallback a datos actuales)
        tripData: originalRequest?.tripData || {
          destination: summary?.destination,
          startDate: summary?.travelDates?.start,
          endDate: summary?.travelDates?.end,
          duration: summary?.duration,
          origin: extraction?.summary?.origin
        },
        travelers: originalRequest?.travelers || [],
        budget: originalRequest?.budget || {
          total: summary?.totalBudget,
          currency: summary?.currency
        },
        preferences: originalRequest?.preferences || {},
        
        // ✅ Flags de regeneración (backend validará límite y procesará userComments)
        isRegeneration: true,  // ✅ Backend sabrá que es regeneración
        originalTripId: tripId || null,  // ✅ Para tracking del contador en DynamoDB
        userComments: regenerateComments.trim(),  // ✅ Comentarios para ajustar itinerario
        
        // ✅ sessionId no es necesario para regeneración (usamos originalRequest)
        sessionId: null
      };
      
      // ✅ LOG COMPLETO del requestBody antes de enviar
      console.log('📤 [Regenerate] Sending request to /api/extraction:', {
        isRegeneration: requestBody.isRegeneration,
        originalTripId: requestBody.originalTripId,
        hasUserComments: !!requestBody.userComments,
        tripData: requestBody.tripData,
        userComments: requestBody.userComments?.substring(0, 100)
      });
      
      // ✅ Endpoint NORMAL /api/extraction (reutilizamos el que ya funciona)
      const response = await fetch(`${API_BASE_URL}/api/extraction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Backend error:', errorData);
        
        // ✅ RF-08.04: Mensajes específicos según tipo de fallo
        if (errorData.message?.includes('Destination not found')) {
          throw new Error('Destination not found, please verify the name');
        } else if (errorData.message?.includes('Invalid date')) {
          throw new Error('Invalid dates. Please check your travel dates.');
        } else if (errorData.message?.includes('budget') || errorData.message?.includes('Budget')) {
          throw new Error('Budget insufficient. Please increase your budget and try again.');
        } else if (errorData.message?.includes('Regeneration limit')) {
          throw new Error('Regeneration limit reached');
        }
        
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Regeneration response:', result);
      
      if (result.success) {
        alert('Itinerary regenerated successfully!');
        setShowRegenerateModal(false);
        setRegenerateComments('');
        
        if (result.data?.tripId) {
          console.log('🔄 [Regenerate] Saving regenerated itinerary to sessionStorage');
          
          // ✅ Normalizar estructura para asegurar compatibilidad con Itinerary.jsx
          const dataToSave = {
            extraction: result.data.extraction || result.data,
            itinerary: result.data.itinerary || result.data
          };
          
          // ✅ Guardar en sessionStorage (síncrono)
          sessionStorage.setItem('itineraryData', JSON.stringify(dataToSave));
          
          // ✅ Forzar recarga REAL del navegador con query param único
          // Esto evita que React Router intercepte y asegura carga fresca
          setTimeout(() => {
            window.location.href = '/itinerary?regenerated=' + Date.now();
          }, 150);  // Pequeño delay para asegurar que sessionStorage se guarde
        } else {
          window.location.reload();
        }
      } else {
        throw new Error(result.message || 'Failed to regenerate itinerary');
      }
      
    } catch (err) {
      console.error('❌ Regeneration error:', err);
      // ✅ RF-08.04: Mensajes específicos en alert
      if (err.message?.includes('Destination not found')) {
        alert('Destination not found, please verify the name');
      } else if (err.message?.includes('Invalid date')) {
        alert('Invalid dates. Please check your travel dates.');
      } else if (err.message?.includes('budget') || err.message?.includes('Budget')) {
        alert('Budget insufficient. Please increase your budget and try again.');
      } else if (err.message?.includes('Regeneration limit')) {
        alert('Regeneration limit reached');
      } else {
        alert(err.message || 'Error regenerating itinerary. Please try again.');
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src={logo} alt="Quester Logo" className="w-12 h-12 object-contain" />
              <h1 className="text-2xl font-bold text-quester-purple tracking-wide">QUESTER</h1>
            </Link>
            
            <div className="flex items-center gap-3">
              {/* ✅ Botón Guardar/Eliminar Trip - DINÁMICO según actionType */}
              <button
                onClick={onSaveTrip}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isSaving
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : actionType === 'delete'
                    ? saveStatus === 'success'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : saveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                    : saveStatus === 'success'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : saveStatus === 'error'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-quester-blue hover:bg-blue-600 text-white'
                }`}
                title={actionType === 'delete' ? 'Delete this trip' : 'Save to My Trips'}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {actionType === 'delete' ? 'Deleting...' : 'Saving...'}
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {actionType === 'delete' ? 'Deleted!' : 'Saved!'}
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Error
                  </>
                ) : (
                  <>
                    {/* ✅ Icono dinámico según actionType */}
                    {actionType === 'delete' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-4 0V5a2 2 0 114 0v2M9 7h6" />
                      </svg>
                    )}
                    {/* ✅ Texto dinámico según actionType */}
                    {actionType === 'delete' ? 'Delete Trip' : 'Save Trip'}
                  </>
                )}
              </button>
              
              {/* ✅ NUEVO: Botón Regenerar con Comentarios - CONDICIONADO POR allowRegeneration */}
              {allowRegeneration && (canRegenerate() || sessionStorage.getItem('originalGenerationPayload')) ? (
                <button
                  onClick={() => setShowRegenerateModal(true)}
                  disabled={isRegenerating}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    isRegenerating
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  title="Regenerate itinerary with your feedback"
                >
                  {isRegenerating ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate
                    </>
                  )}
                </button>
              ) : allowRegeneration ? (
                // ✅ Mostrar botón deshabilitado solo si allowRegeneration=true pero no hay datos para regenerar
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gray-300 text-gray-500 cursor-not-allowed"
                  title="Save this trip first to enable regeneration"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </button>
              ) : null}  {/* ✅ Si allowRegeneration=false, no renderizar nada */}
              
              {/* Botón Exportar PDF */}
              <button
                onClick={onExportPDF}
                disabled={isExporting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isExporting
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                title="Export to PDF"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
              
              {/* Botón Back to Dashboard */}
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-quester-blue font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7m7 7h18" />
                </svg>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Budget Overview Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{summary?.destination}</h1>
          <p className="text-gray-600 mb-4">
            {summary?.travelDates?.start ? new Date(summary.travelDates.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} - 
            {summary?.travelDates?.end ? new Date(summary.travelDates.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} • {summary?.duration} nights
          </p>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Total Spent: {formatCurrency(spentBudget, summary?.currency)}</p>
              <p className={`text-sm font-medium ${underBudget ? 'text-green-600' : 'text-red-600'}`}>
                {underBudget 
                  ? `${formatCurrency(remainingBudget, summary?.currency)} remaining` 
                  : `${formatCurrency(Math.abs(remainingBudget), summary?.currency)} over budget`
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Budget</p>
              <p className="text-lg font-bold text-quester-dark">{formatCurrency(totalBudget, summary?.currency)}</p>
            </div>
          </div>

          {/* Budget Bar */}
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="absolute inset-0 flex">
              <div 
                className="bg-blue-500 h-full"
                style={{ width: `${totalBudget > 0 ? Math.min((budgetBreakdown?.flights / totalBudget) * 100, 100) : 0}%` }}
                title={`Flights: ${formatCurrency(budgetBreakdown?.flights, summary?.currency)}`}
              ></div>
              <div 
                className="bg-indigo-500 h-full"
                style={{ width: `${totalBudget > 0 ? Math.min((budgetBreakdown?.hotels / totalBudget) * 100, 100) : 0}%` }}
                title={`Hotels: ${formatCurrency(budgetBreakdown?.hotels, summary?.currency)}`}
              ></div>
              <div 
                className="bg-purple-500 h-full"
                style={{ width: `${totalBudget > 0 ? Math.min((budgetBreakdown?.activities / totalBudget) * 100, 100) : 0}%` }}
                title={`Activities: ${formatCurrency(budgetBreakdown?.activities, summary?.currency)}`}
              ></div>
              <div 
                className="bg-teal-500 h-full"
                style={{ width: `${totalBudget > 0 ? Math.min((budgetBreakdown?.food / totalBudget) * 100, 100) : 0}%` }}
                title={`Food: ${formatCurrency(budgetBreakdown?.food, summary?.currency)}`}
              ></div>
              <div 
                className="bg-green-500 h-full"
                style={{ width: `${totalBudget > 0 ? Math.min((budgetBreakdown?.transport / totalBudget) * 100, 100) : 0}%` }}
                title={`Transport: ${formatCurrency(budgetBreakdown?.transport, summary?.currency)}`}
              ></div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              Flights {formatCurrency(budgetBreakdown?.flights, summary?.currency)}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-indigo-500 rounded"></div>
              Hotels {formatCurrency(budgetBreakdown?.hotels, summary?.currency)}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              Activities {formatCurrency(budgetBreakdown?.activities, summary?.currency)}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-teal-500 rounded"></div>
              Food {formatCurrency(budgetBreakdown?.food, summary?.currency)}
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              Transport {formatCurrency(budgetBreakdown?.transport, summary?.currency)}
            </span>
          </div>
        </div>

        {/* Flight Details */}
        {selectedFlights?.outbound && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-quester-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Flight Details
            </h2>
            
            {/* Outbound Flight */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">OUTBOUND FLIGHT</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Airline</span>
                  <span className="font-medium text-gray-900">
                    {selectedFlights.outbound.airline?.name} ({selectedFlights.outbound.airline?.code})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Duration</span>
                  <span className="font-medium text-gray-900">{getFlightDuration(selectedFlights.outbound)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Departure</span>
                  <span className="font-medium text-gray-900 text-right">
                    {selectedFlights.outbound.departure?.airport?.name} ({selectedFlights.outbound.departure?.airport?.code}) at {formatFlightTime(selectedFlights.outbound.departure?.time)}
                  </span>
                </div>
                {getLayoverInfo(selectedFlights.outbound) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Layover</span>
                    <span className="font-medium text-gray-900 text-right">{getLayoverInfo(selectedFlights.outbound)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Arrival</span>
                  <span className="font-medium text-gray-900 text-right">
                    {selectedFlights.outbound.arrival?.airport?.name} ({selectedFlights.outbound.arrival?.airport?.code}) at {formatFlightTime(selectedFlights.outbound.arrival?.time)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Baggage</span>
                  <span className="font-medium text-gray-900">{selectedFlights.outbound.baggage?.details || 'Check with airline'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selectedFlights.outbound.price?.amount, selectedFlights.outbound.price?.currency)}</span>
                </div>
              </div>
            </div>

            {/* Return Flight */}
            {selectedFlights.return && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">RETURN FLIGHT</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Airline</span>
                    <span className="font-medium text-gray-900">
                      {selectedFlights.return.airline?.name} ({selectedFlights.return.airline?.code})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Duration</span>
                    <span className="font-medium text-gray-900">{getFlightDuration(selectedFlights.return)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Departure</span>
                    <span className="font-medium text-gray-900 text-right">
                      {selectedFlights.return.departure?.airport?.name} ({selectedFlights.return.departure?.airport?.code}) at {formatFlightTime(selectedFlights.return.departure?.time)}
                    </span>
                  </div>
                  {getLayoverInfo(selectedFlights.return) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Layover</span>
                      <span className="font-medium text-gray-900 text-right">{getLayoverInfo(selectedFlights.return)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Arrival</span>
                    <span className="font-medium text-gray-900 text-right">
                      {selectedFlights.return.arrival?.airport?.name} ({selectedFlights.return.arrival?.airport?.code}) at {formatFlightTime(selectedFlights.return.arrival?.time)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Baggage</span>
                    <span className="font-medium text-gray-900">{selectedFlights.return.baggage?.details || 'Check with airline'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price</span>
                    <span className="font-medium text-gray-900">{formatCurrency(selectedFlights.return.price?.amount, selectedFlights.return.price?.currency)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tip */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="text-sm text-teal-800">
                Book flights early for better prices. Consider travel insurance for flexibility.
              </p>
            </div>
          </div>
        )}

        {/* Hotel Details */}
        {selectedHotel && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-quester-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Hotel Details
            </h2>
            
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedHotel.name}</h3>
                <p className="text-sm text-gray-600">
                  {selectedHotel.publicTransport?.nearest && `${selectedHotel.publicTransport.duration} to ${selectedHotel.publicTransport.nearest}`}
                </p>
              </div>
              {selectedHotel.rating && (
                <div className="flex items-center gap-1 text-teal-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-medium">{selectedHotel.rating}</span>
                  {selectedHotel.reviews && <span className="text-xs text-gray-500">({selectedHotel.reviews} reviews)</span>}
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Price</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(selectedHotel.pricePerNight?.amount, selectedHotel.pricePerNight?.currency)}/night • {formatCurrency(selectedHotel.totalPrice?.amount, selectedHotel.totalPrice?.currency)} total
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amenities</span>
                <span className="font-medium text-gray-900">{getHotelAmenities(selectedHotel)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Check-in / Check-out</span>
                <span className="font-medium text-gray-900">
                  {selectedHotel.checkInTime} / {selectedHotel.checkOutTime}
                </span>
              </div>
            </div>

            {selectedHotel.freeCancellation === false && (
              <div className="mt-3 flex items-center gap-1 text-sm text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Non-refundable rate - review cancellation policy before booking</span>
              </div>
            )}
          </div>
        )}

        {/* Weather Considerations */}
        {recommendations?.weatherConsiderations && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Weather Considerations</h4>
                <p className="text-sm text-blue-800">{recommendations.weatherConsiderations}</p>
              </div>
            </div>
          </div>
        )}

        {/* Transport Guidance */}
        {recommendations?.transportGuidance && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <div>
                <h4 className="font-semibold text-purple-900 mb-1">Transport Tips</h4>
                <p className="text-sm text-purple-800">{recommendations.transportGuidance}</p>
              </div>
            </div>
          </div>
        )}

        {/* Day Tabs */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {dailyPlan?.map((day, index) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(index)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeDay === index
                  ? 'bg-quester-blue text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Day {day.day} - {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>

        {/* Day Content */}
        {dailyPlan?.[activeDay] && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Activities Timeline */}
            <div className="space-y-6">
              {dailyPlan[activeDay].activities?.map((activity, index) => (
                <div key={index} className="relative">
                  {/* Timeline dot and line */}
                  <div className="absolute left-0 top-0">
                    <div className="w-3 h-3 bg-quester-blue rounded-full"></div>
                    {index < dailyPlan[activeDay].activities.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-300 absolute left-1.5 top-3"></div>
                    )}
                  </div>

                  <div className="ml-8">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.startTime} – {activity.endTime}
                    </p>
                    
                    <h3 className="font-semibold text-gray-900 mt-1">{activity.name}</h3>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                      {activity.location && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {activity.location}
                        </span>
                      )}
                      
                      {/* Transport info */}
                      {activity.transport?.recommendedMethod && (
                        <span className="flex items-center gap-1">
                          <span className="text-lg">{getTransportIcon(activity.transport.recommendedMethod)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTransportBadgeColor(activity.transport.recommendedMethod)}`}>
                            {activity.transport.recommendedMethod}
                          </span>
                          {activity.transport.estimatedTime && (
                            <span className="text-gray-500">• {activity.transport.estimatedTime}</span>
                          )}
                          {activity.transport.estimatedCost?.amount > 0 && (
                            <span className="text-gray-500">• {formatCurrency(activity.transport.estimatedCost.amount, activity.transport.estimatedCost.currency)}</span>
                          )}
                        </span>
                      )}
                      
                      {activity.price?.amount > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatCurrency(activity.price?.amount, activity.price?.currency)}
                        </span>
                      )}
                    </div>

                    {/* Transport description */}
                    {activity.transport?.recommendedMethod && activity.transport.recommendedMethod !== 'walking' && (
                      <p className="text-xs text-gray-500 mt-1 ml-1">
                        💡 {activity.transport.recommendedMethod} recommended: {activity.transport.recommendedMethod.toLowerCase().includes('metro') ? 'Fastest and most economical option' : activity.transport.recommendedMethod.toLowerCase().includes('taxi') ? 'Most convenient for short distances' : 'Good balance of cost and convenience'}
                      </p>
                    )}

                    {/* Crowd Level Tag */}
                    {activity.crowdLevel && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.crowdLevel === 'quiet'
                              ? 'bg-green-100 text-green-800'
                              : activity.crowdLevel === 'moderate'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {activity.crowdLevel.charAt(0).toUpperCase() + activity.crowdLevel.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Summary */}
            {dailyPlan[activeDay].dailySummary && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 italic">{dailyPlan[activeDay].dailySummary}</p>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Section */}
        {recommendations && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Travel Tips</h3>
            
            {recommendations.packingTips?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Packing Tips</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {recommendations.packingTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {recommendations.localCustoms?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Local Customs</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {recommendations.localCustoms.map((custom, idx) => (
                    <li key={idx}>{custom}</li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations?.transportGuidance && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Transport Guidance</h4>
                <p className="text-sm text-gray-600">{recommendations.transportGuidance}</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ✅ NUEVO: MODAL - Regenerar con Comentarios */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-quester-dark">Regenerate Itinerary</h3>
              <button
                onClick={() => {
                  setShowRegenerateModal(false);
                  setRegenerateComments('');
                }}
                className="p-2 text-gray-500 hover:text-gray-700"
                disabled={isRegenerating}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Tell us what you'd like to change. Examples:
            </p>
            <ul className="text-xs text-gray-500 mb-4 space-y-1 list-disc list-inside">
              <li>"I don't want to visit the museum"</li>
              <li>"The hotel doesn't suit my style"</li>
              <li>"I want fewer activities per day"</li>
              <li>"Add more food experiences"</li>
            </ul>
            
            <textarea
              value={regenerateComments}
              onChange={(e) => setRegenerateComments(e.target.value)}
              placeholder="Enter your feedback here..."
              className="w-full h-32 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-quester-blue resize-none"
              style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
              disabled={isRegenerating}
            />
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRegenerateModal(false);
                  setRegenerateComments('');
                }}
                disabled={isRegenerating}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateItinerary}
                disabled={isRegenerating || !regenerateComments.trim()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                  isRegenerating || !regenerateComments.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isRegenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Regenerate Itinerary
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate Itinerary
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItineraryView;