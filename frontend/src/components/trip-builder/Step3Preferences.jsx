import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { preferencesSchema } from '../../utils/validators';
import { useNavigate } from 'react-router-dom';

// ✅ URL del backend para desarrollo (ajustar según tu configuración)
const API_BASE_URL = import.meta?.env?.VITE_AWS_BACKEND_URL || 'http://100.48.137.197:3000/api';

function Step3Preferences({ tripData, updateTripData, onValid, onBack }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm({
    resolver: zodResolver(preferencesSchema),
    mode: 'onBlur',
    defaultValues: {
      preferences: tripData.preferences || {
        avoidCrowds: false,
        ecoFriendly: false,
        wheelchairAccessible: false,
        familyFriendly: false,
        petFriendly: false
      },
      hotelClass: tripData.hotelClass || 'no-preference',
      flightClass: tripData.flightClass || 'economy',
      customPreferences: tripData.customPreferences || ''
    }
  });

  const preferences = watch('preferences');
  const hotelClass = watch('hotelClass');
  const flightClass = watch('flightClass');
  const customPreferences = watch('customPreferences');

  // ✅ Actualizar contador de caracteres
  useEffect(() => {
    setCharCount(customPreferences?.length || 0);
  }, [customPreferences]);

  // ✅ Limpiar error cuando el usuario corrija los campos
  useEffect(() => {
    if (error) {
      setError('');
    }
  }, [preferences, hotelClass, flightClass, customPreferences]);

  // Validar para habilitar botón
  useEffect(() => {
    onValid(true);
  }, [onValid]);

  // ✅ RF-03.02 - Toggle preferencia
  const togglePreference = (key) => {
    const currentPreferences = { ...preferences };
    currentPreferences[key] = !currentPreferences[key];
    setValue('preferences', currentPreferences);
  };

  // ✅ RF-03.02.07 - Manejar cambio de preferencias personalizadas
  const handleCustomPreferenceChange = (e) => {
    const value = e.target.value;
    if (value.length <= 200) {
      setValue('customPreferences', value);
    }
  };

  // ✅ Función robusta para obtener el origen desde datos aplanados
  const getOrigin = () => {
    // ✅ Usar datos aplanados desde la raíz de tripData
    if (tripData?.origin && typeof tripData.origin === 'string' && tripData.origin.trim()) {
      return tripData.origin;
    }
    
    // Fallback a sessionStorage
    const stored = sessionStorage.getItem('tripOrigin');
    if (stored && typeof stored === 'string' && stored.trim()) {
      return stored;
    }
    
    return 'New York, USA';
  };

  // ✅ NUEVO: Función robusta para obtener sessionId
  const getSessionId = () => {
    return tripData?.sessionId || sessionStorage.getItem('sessionId');
  };

  // ✅ Submit del paso 3 - GENERAR ITINERARIO CON IA
  const onSubmit = async (data) => {
    console.log('=== 🚀 GENERATING ITINERARY ===');

    // ✅ RF-07.01.02: Validar TODOS los campos al intentar enviar
    const isValid = await trigger();
    if (!isValid) {
      console.log('❌ Validation failed, showing all errors');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = sessionStorage.getItem('token');
      const sessionId = getSessionId();
      
      // ✅ EXTRAER DATOS CON ESTRUCTURA APLANADA (CORREGIDO)
      // Los datos están en la raíz de tripData, NO en tripData.step1, etc.
      const step1 = {
        destination: tripData.destination || '',
        startDate: tripData.startDate || '',
        endDate: tripData.endDate || '',
        duration: tripData.duration || 0
      };
      
      const step2 = {
        travelers: tripData.travelers || [],
        budget: tripData.budget || 3000,
        currency: tripData.currency || 'USD'
      };
      
      const step3 = {
        preferences: tripData.preferences || {},
        hotelClass: tripData.hotelClass || 'no-preference',
        flightClass: tripData.flightClass || 'economy',
        customPreferences: tripData.customPreferences || ''
      };
      
      const origin = getOrigin();

      // ✅ Logging para debuggear estructura de datos
      console.log('🔍 [Step3] Data extraction for payload:', {
        step1,
        step2,
        step3,
        origin,
        tripDataKeys: Object.keys(tripData || {})
      });

      // ✅ Construir payload para /api/extraction
      const payload = {
        tripData: {
          origin: origin,
          destination: step1.destination,
          startDate: step1.startDate,
          endDate: step1.endDate,
          duration: step1.duration
        },
        travelers: (step2.travelers || []).map(t => ({
          name: t.name,
          type: t.type,
          interests: t.interests || []
        })),
        budget: {
          total: step2.budget || 3000,
          currency: step2.currency || 'USD'
        },
        preferences: {
          hotelClass: data.hotelClass || step3.hotelClass || 'no-preference',
          flightClass: data.flightClass || step3.flightClass || 'economy',
          avoidCrowds: data.preferences?.avoidCrowds || false,
          ecoFriendly: data.preferences?.ecoFriendly || false,
          familyFriendly: data.preferences?.familyFriendly || false,
          wheelchairAccessible: data.preferences?.wheelchairAccessible || false,
          petFriendly: data.preferences?.petFriendly || false,
          customNotes: data.customPreferences || step3.customPreferences || ''
        },
        sessionId: sessionId || null
      };

      console.log('📤 Calling /api/extraction with payload:', {
        origin: payload.tripData.origin,
        destination: payload.tripData.destination,
        budget: payload.budget.total,
        hotelClass: payload.preferences.hotelClass
      });

      // ✅ Llamar al endpoint de extracción + Gemini
      const response = await fetch(`${API_BASE_URL}/extraction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', response.status, response.statusText);

      // ✅ MANEJO DE ERRORES DEL BACKEND
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Backend error response:', errorData);
        
        // ✅ Si es error BUDGET_EXCEEDED, lanzar error con datos completos
        if (errorData.error === 'BUDGET_EXCEEDED') {
          throw new Error(JSON.stringify({
            ...errorData,
            message: errorData.message || 'Budget exceeded',
            type: 'BUDGET_EXCEEDED'
          }));
        }
        
        throw new Error(errorData.message || `Error ${response.status}: Failed to generate itinerary`);
      }

      const result = await response.json();
      console.log('✅ Itinerary generated:', result);

      if (!result.success) {
        throw new Error(result.message || 'Failed to generate itinerary');
      }

      // ✅ Guardar tripId en sessionStorage
      const tripId = result.data?.itinerary?.tripId || result.data?.tripId;
      if (tripId) {
        sessionStorage.setItem('savedTripId', tripId);
        console.log('✅ [Step3] savedTripId stored:', tripId);
      }

      // ✅ Guardar en sessionStorage para la vista del itinerario
      sessionStorage.setItem('itineraryData', JSON.stringify(result.data));
      console.log('✅ Itinerary data saved to sessionStorage');

      // ✅ NUEVO: Guardar payload original para posible regeneración futura
      // ⚠️ CRÍTICO: Validar que tripData tenga los campos requeridos antes de guardar
      const originalPayload = {
        tripData: payload.tripData,
        travelers: payload.travelers,
        budget: payload.budget,
        preferences: payload.preferences
      };
      
      // ✅ Logging para verificar estructura antes de guardar
      console.log('✅ [Step3] Saving originalGenerationPayload:', {
        hasTripData: !!originalPayload.tripData,
        tripData: originalPayload.tripData,
        hasTravelers: !!originalPayload.travelers,
        hasBudget: !!originalPayload.budget,
        hasPreferences: !!originalPayload.preferences
      });
      
      // ✅ Validar que tripData tenga campos requeridos antes de guardar
      if (originalPayload.tripData?.destination && originalPayload.tripData?.startDate && originalPayload.tripData?.endDate) {
        sessionStorage.setItem('originalGenerationPayload', JSON.stringify(originalPayload));
        console.log('✅ [Step3] originalGenerationPayload stored for regeneration');
      } else {
        console.warn('⚠️ [Step3] originalGenerationPayload NOT stored - missing required fields in tripData');
      }

      // ✅ Navegar a la vista del itinerario
      navigate('/itinerary');
      
    } catch (err) {
      console.error('❌ ERROR generating itinerary:', err);
      
      // ✅ Manejar error BUDGET_EXCEEDED específicamente
      const isBudgetError = 
        err.message?.includes('BUDGET_EXCEEDED') || 
        err.message?.includes('Sorry, I cannot create an itinerary with this budget') ||
        err.message?.includes('"type":"BUDGET_EXCEEDED"');
      
      if (isBudgetError) {
        console.log('🚨 [Step3] Budget exceeded error detected, navigating to /budget-error');
        
        let errorData = {};
        try {
          if (typeof err.message === 'string' && err.message.startsWith('{')) {
            errorData = JSON.parse(err.message);
          } else if (typeof err.message === 'object') {
            errorData = err.message;
          }
        } catch (e) {
          console.warn('⚠️ Could not parse error data:', e);
        }
        
        const step2 = {
          budget: tripData.budget || 3000,
          currency: tripData.currency || 'USD'
        };
        
        navigate('/budget-error', {
          state: {
            budget: errorData.userBudget || step2.budget || tripData.budget || 500,
            totalCost: errorData.estimatedTotal || 0,
            currency: errorData.currency || step2.currency || tripData.currency || 'USD',
            difference: errorData.difference || 0,
            missingComponent: errorData.missingComponent || null,
            breakdown: errorData.breakdown || null
          }
        });
        
        setIsLoading(false);
        return;
      }
      
      // ✅ RF-08.04: Mensajes de error específicos
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Unable to connect to server. Please check your connection.');
      } else if (err.message?.includes('Destination not found')) {
        setError('Destination not found, please verify the name');
      } else if (err.message?.includes('Invalid date') || err.message?.includes('Dates')) {
        setError('Invalid dates. Please check your travel dates.');
      } else if (err.message?.includes('budget') || err.message?.includes('Budget')) {
        setError('Budget insufficient. Please increase your budget and try again.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Error generating itinerary. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-quester-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <h3 className="text-xl font-semibold text-quester-dark">Preferences</h3>
      </div>

      {/* ✅ Mensajes de error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* ===========================================
          RF-03.02: PREFERENCIAS (TOGGLES) CON EMOJIS
          =========================================== */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-quester-dark">Travel Preferences (Optional)</h4>
        <p className="text-sm text-gray-600">Select any preferences that apply to your trip</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ✅ RF-03.02.01 - Avoid crowds */}
          <button
            type="button"
            onClick={() => togglePreference('avoidCrowds')}
            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              preferences.avoidCrowds
                ? 'border-quester-blue bg-blue-50'
                : 'border-gray-200 hover:border-quester-blue hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">👥</span>
            <span className="font-medium text-quester-dark">Avoid Crowds</span>
            {preferences.avoidCrowds && (
              <svg className="w-5 h-5 text-quester-blue ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* ✅ RF-03.02.02 - Eco-friendly */}
          <button
            type="button"
            onClick={() => togglePreference('ecoFriendly')}
            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              preferences.ecoFriendly
                ? 'border-quester-blue bg-blue-50'
                : 'border-gray-200 hover:border-quester-blue hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">🌱</span>
            <span className="font-medium text-quester-dark">Eco-Friendly</span>
            {preferences.ecoFriendly && (
              <svg className="w-5 h-5 text-quester-blue ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* ✅ RF-03.02.03 - Wheelchair accessible */}
          <button
            type="button"
            onClick={() => togglePreference('wheelchairAccessible')}
            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              preferences.wheelchairAccessible
                ? 'border-quester-blue bg-blue-50'
                : 'border-gray-200 hover:border-quester-blue hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">♿</span>
            <span className="font-medium text-quester-dark">Wheelchair Accessible</span>
            {preferences.wheelchairAccessible && (
              <svg className="w-5 h-5 text-quester-blue ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* ✅ RF-03.02.04 - Family friendly */}
          <button
            type="button"
            onClick={() => togglePreference('familyFriendly')}
            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              preferences.familyFriendly
                ? 'border-quester-blue bg-blue-50'
                : 'border-gray-200 hover:border-quester-blue hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">👨‍👩‍👧‍👦</span>
            <span className="font-medium text-quester-dark">Family Friendly</span>
            {preferences.familyFriendly && (
              <svg className="w-5 h-5 text-quester-blue ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* ✅ RF-03.02.05 - Pet friendly */}
          <button
            type="button"
            onClick={() => togglePreference('petFriendly')}
            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 md:col-span-2 ${
              preferences.petFriendly
                ? 'border-quester-blue bg-blue-50'
                : 'border-gray-200 hover:border-quester-blue hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">🐾</span>
            <span className="font-medium text-quester-dark">Pet Friendly</span>
            {preferences.petFriendly && (
              <svg className="w-5 h-5 text-quester-blue ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ✅ RF-03.02.07 - Custom preferences con límite de 200 caracteres */}
      <div className="space-y-2">
        <label htmlFor="customPreferences" className="block text-sm font-medium text-quester-dark">
          Additional Preferences (Optional)
        </label>
        <textarea
          id="customPreferences"
          {...register('customPreferences')}
          value={customPreferences}
          onChange={handleCustomPreferenceChange}
          rows={3}
          maxLength={200}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-quester-blue"
          style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
          placeholder="Tell us about any other preferences you have..."
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">Add any specific requirements or preferences not listed above</p>
          <span className={`text-xs font-medium ${
            charCount >= 200 ? 'text-red-600' : charCount >= 180 ? 'text-yellow-600' : 'text-gray-400'
          }`}>
            {charCount}/200
          </span>
        </div>
        {charCount >= 200 && (
          <p className="text-xs text-red-600">Maximum 200 characters reached</p>
        )}
      </div>

      {/* ===========================================
          RF-03.03: CLASE DE HOTEL
          =========================================== */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-quester-dark">Preferred Hotel Class (Optional)</h4>
        
        <div className="flex flex-wrap gap-3">
          {/* ✅ RF-03.03.02 - No preference */}
          <button
            type="button"
            onClick={() => setValue('hotelClass', 'no-preference')}
            className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
              hotelClass === 'no-preference'
                ? 'border-quester-blue bg-blue-50 text-quester-blue'
                : 'border-gray-200 hover:border-quester-blue'
            }`}
          >
            No Preference
          </button>

          {/* ✅ RF-03.03.01 - 1-5 estrellas */}
          {[1, 2, 3, 4, 5].map((stars) => (
            <button
              key={stars}
              type="button"
              onClick={() => setValue('hotelClass', stars.toString())}
              className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                hotelClass === stars.toString()
                  ? 'border-quester-blue bg-blue-50 text-quester-blue'
                  : 'border-gray-200 hover:border-quester-blue'
              }`}
            >
              {stars}★
            </button>
          ))}
        </div>
      </div>

      {/* ===========================================
          RF-03.04: CLASE DE VUELO
          =========================================== */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-quester-dark">Preferred Flight Class (Optional)</h4>
        
        <div className="flex flex-wrap gap-3">
          {/* ✅ RF-03.04.01 - Economy */}
          <button
            type="button"
            onClick={() => setValue('flightClass', 'economy')}
            className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
              flightClass === 'economy'
                ? 'border-quester-blue bg-blue-50 text-quester-blue'
                : 'border-gray-200 hover:border-quester-blue'
            }`}
          >
            Economy
          </button>

          {/* ✅ RF-03.04.02 - Business */}
          <button
            type="button"
            onClick={() => setValue('flightClass', 'business')}
            className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
              flightClass === 'business'
                ? 'border-quester-blue bg-blue-50 text-quester-blue'
                : 'border-gray-200 hover:border-quester-blue'
            }`}
          >
            Business
          </button>

          {/* ✅ RF-03.04.03 - First Class */}
          <button
            type="button"
            onClick={() => setValue('flightClass', 'first')}
            className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
              flightClass === 'first'
                ? 'border-quester-blue bg-blue-50 text-quester-blue'
                : 'border-gray-200 hover:border-quester-blue'
            }`}
          >
            First Class
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className={`px-6 py-3 font-medium transition-colors ${
            isLoading 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium text-base transition-all ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-quester-blue hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              Plan My Trip
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default Step3Preferences;