// frontend/src/components/trip-builder/Step3Preferences.jsx

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { preferencesSchema } from '../../utils/validators';
import { useNavigate } from 'react-router-dom';

// ✅ URL del backend para desarrollo (ajustar según tu configuración)
const API_BASE_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:3000';

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
    setValue
  } = useForm({
    resolver: zodResolver(preferencesSchema),
    mode: 'onBlur',
    defaultValues: {
      preferences: tripData.step3?.preferences || {
        avoidCrowds: false,
        ecoFriendly: false,
        wheelchairAccessible: false,
        familyFriendly: false,
        petFriendly: false
      },
      hotelClass: tripData.step3?.hotelClass || 'no-preference',
      flightClass: tripData.step3?.flightClass || 'economy',
      customPreferences: tripData.step3?.customPreferences || ''
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

  // Validar para habilitar botón (siempre válido porque todo es opcional)
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

  // ✅ Función robusta para obtener el origen desde EL LUGAR CORRECTO (step1, no step2)
  const getOrigin = () => {
    console.log('🔍 [Step3] getOrigin() debugging:', {
      step1_origin: tripData.step1?.origin,
      step2_origin: tripData.step2?.origin,
      sessionStorage_origin: sessionStorage.getItem('tripOrigin'),
      tripData_keys: tripData ? Object.keys(tripData) : []
    });
    
    // 1. ✅ Intentar desde tripData.step1 (DONDE REALMENTE SE GUARDA desde Step 1)
    if (tripData.step1?.origin && typeof tripData.step1.origin === 'string' && tripData.step1.origin.trim()) {
      console.log('✅ [Step3] Using origin from tripData.step1:', tripData.step1.origin);
      return tripData.step1.origin;
    }
    
    // 2. Intentar desde tripData.step2 (backup por si se propagó)
    if (tripData.step2?.origin && typeof tripData.step2.origin === 'string' && tripData.step2.origin.trim()) {
      console.log('✅ [Step3] Using origin from tripData.step2:', tripData.step2.origin);
      return tripData.step2.origin;
    }
    
    // 3. Intentar desde sessionStorage (backup guardado en Step 1)
    const stored = sessionStorage.getItem('tripOrigin');
    if (stored && typeof stored === 'string' && stored.trim()) {
      console.log('✅ [Step3] Using origin from sessionStorage:', stored);
      return stored;
    }
    
    // 4. Fallback con logging explícito
    console.warn('⚠️ [Step3] Using FALLBACK origin (no valid origin found):', {
      fallback: 'New York, USA',
      reason: 'step1.origin missing/empty AND step2.origin missing/empty AND sessionStorage.tripOrigin missing/empty'
    });
    return 'New York, USA';
  };

  // ✅ Submit del paso 3 - GENERAR ITINERARIO CON IA
  const onSubmit = async (data) => {
    console.log('=== 🚀 GENERATING ITINERARY ===');
    console.log('Form ', data);
    console.log('Trip ', tripData);

    setIsLoading(true);
    setError('');

    try {
      const token = sessionStorage.getItem('token');
      const sessionId = sessionStorage.getItem('sessionId');
      
      // ✅ Extraer datos de cada paso con fallback seguro
      const step1 = tripData.step1 || {};
      const step2 = tripData.step2 || {};
      const step3 = tripData.step3 || {};

      // ✅ Obtener origen con función robusta (busca en step1 primero)
      const origin = getOrigin();
      
      // ✅ DEBUG: Log completo del estado antes de enviar
      console.log('🔍 [Step3] Final payload preparation:', {
        origin_used: origin,
        destination: step1.destination,
        sessionId: sessionId,
        token_present: !!token,
        step1_has_origin: !!step1.origin,
        step2_has_origin: !!step2.origin,
        sessionStorage_has_tripOrigin: !!sessionStorage.getItem('tripOrigin')
      });

      // ✅ Construir payload para /api/extraction
      const payload = {
        tripData: {
          origin: origin,  // ✅ Usar origen validado desde step1
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
        
        // ✅ Incluir sessionId para cualquier recovery backend
        sessionId: sessionId || null
      };

      console.log('📤 Calling /api/extraction with payload:', {
        tripData_origin: payload.tripData.origin,
        tripData_destination: payload.tripData.destination,
        has_sessionId: !!payload.sessionId
      });

      // ✅ Llamar al endpoint de extracción + Gemini con URL ABSOLUTA
      const response = await fetch(`${API_BASE_URL}/api/extraction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Backend error response:', errorData);
        throw new Error(errorData.message || `Error ${response.status}: Failed to generate itinerary`);
      }

      const result = await response.json();
      console.log('✅ Itinerary generated:', result);

      if (!result.success) {
        throw new Error(result.message || 'Failed to generate itinerary');
      }

      // ✅ Guardar en sessionStorage para la vista del itinerario
      sessionStorage.setItem('itineraryData', JSON.stringify(result.data));
      console.log('✅ Itinerary data saved to sessionStorage');

      // ✅ Navegar a la vista del itinerario
      navigate('/itinerary');
      
    } catch (err) {
      console.error('❌ ERROR generating itinerary:', err);
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Unable to connect to server. Please check your connection.');
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