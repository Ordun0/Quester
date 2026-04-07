// frontend/src/components/trip-builder/Step2Travelers.jsx

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { destinationSchema } from '../../utils/validators';

function Step2Travelers({ tripData, updateTripData, onValid, onNext }) {
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [duration, setDuration] = useState(0);
  const [durationError, setDurationError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue
  } = useForm({
    resolver: zodResolver(destinationSchema),
    mode: 'onBlur'
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const destination = watch('destination');

  // ✅ RF-01.02.03 - Calcular duración automáticamente
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Incluir ambos días
      
      if (diffDays > 0) {
        setDuration(diffDays);
        setDurationError('');
        updateTripData('step1', { duration: diffDays });
      } else {
        setDuration(0);
        // ✅ RF-01.03.04 - Mensaje específico
        setDurationError('End date must be after start date');
      }
    } else {
      setDuration(0);
    }
  }, [startDate, endDate, updateTripData]);

  // Validar cuando cambian los valores
  useEffect(() => {
    if (destination && startDate && endDate && duration > 0 && !durationError) {
      onValid(true);
    } else {
      onValid(false);
    }
  }, [destination, startDate, endDate, duration, durationError, onValid]);

  // ✅ RF-01.01.02 - Autocompletado de destino
  const handleDestinationChange = async (e) => {
    const value = e.target.value;
    setValue('destination', value);
    
    if (value.length >= 2) {
      setIsSearching(true);
      // TODO: Conectar con API de ubicaciones (Tarea 56)
      // Por ahora, simulamos sugerencias
      setTimeout(() => {
        const mockSuggestions = [
          'Tokyo, Japan',
          'Paris, France',
          'New York, USA',
          'Barcelona, Spain',
          'Bangkok, Thailand'
        ].filter(s => s.toLowerCase().includes(value.toLowerCase()));
        
        setDestinationSuggestions(mockSuggestions);
        setShowSuggestions(true);
        setIsSearching(false);
      }, 300);
    } else {
      setDestinationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Seleccionar sugerencia
  const selectSuggestion = (suggestion) => {
    setValue('destination', suggestion);
    setDestinationSuggestions([]);
    setShowSuggestions(false);
    trigger('destination');
  };

  // ✅ RF-01.03 - Validar fechas
  const validateDates = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // ✅ RF-01.03.02 - No fechas pasadas
    if (start < now) {
      return 'Dates cannot be in the past';
    }

    // ✅ RF-01.03.01 - Fin después de inicio
    if (end <= start) {
      return 'End date must be after start date';
    }

    // ✅ RF-01.03.03 - Máximo 10 meses
    const maxEndDate = new Date(start);
    maxEndDate.setMonth(maxEndDate.getMonth() + 10);
    
    if (end > maxEndDate) {
      return 'Trip cannot exceed 10 months';
    }

    return '';
  };

  // Manejar cambio de fecha
  const handleDateChange = (field, value) => {
    setValue(field, value);
    
    if (startDate && endDate) {
      const error = validateDates();
      setDurationError(error);
    }
  };

  // Submit del paso 1
  const onSubmit = (data) => {
    const error = validateDates();
    
    if (error) {
      setDurationError(error);
      return;
    }

    updateTripData('step1', {
      destination: data.destination,
      startDate: data.startDate,
      endDate: data.endDate,
      duration: duration
    });

    onNext();
  };

  // Fecha mínima para date picker (hoy)
  const today = new Date().toISOString().split('T')[0];
  
  // Fecha máxima (10 meses desde hoy)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 10);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-quester-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-xl font-semibold text-quester-dark">Destination & Dates</h3>
      </div>

      {/* ✅ RF-01.01 - Destino */}
      <div>
        <label htmlFor="destination" className="block text-sm font-medium text-quester-dark mb-2">
          Where to?
        </label>
        <div className="relative">
          <input
            id="destination"
            type="text"
            {...register('destination')}
            onChange={handleDestinationChange}
            onBlur={() => {
              trigger('destination');
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onFocus={() => destinationSuggestions.length > 0 && setShowSuggestions(true)}
            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
              errors.destination 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-200'
            }`}
            style={{ backgroundColor: errors.destination ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
            placeholder="City or Country"
            autoComplete="off"
          />
          
          {/* Loading */}
          {isSearching && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-quester-blue"></div>
            </div>
          )}

          {/* ✅ RF-01.01.02 - Sugerencias de destino */}
          {showSuggestions && destinationSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {destinationSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* ✅ RF-01.01.01 - Mensaje de campo vacío */}
        {errors.destination && (
          <p className="mt-1 text-xs text-red-600">{errors.destination.message}</p>
        )}
        
        {/* ✅ RF-01.01.03 - Mensaje de destino no encontrado */}
        {destination && destinationSuggestions.length === 0 && !isSearching && destination.length >= 3 && (
          <p className="mt-1 text-xs text-orange-600">
            Destination not found, please verify the name
          </p>
        )}
      </div>

      {/* ✅ RF-01.02 - Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-quester-dark mb-2">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            {...register('startDate')}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            min={today}
            max={maxDateStr}
            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
              errors.startDate || durationError
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-200'
            }`}
            style={{ backgroundColor: errors.startDate || durationError ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
          />
          {errors.startDate && (
            <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-quester-dark mb-2">
            End Date
          </label>
          <input
            id="endDate"
            type="date"
            {...register('endDate')}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            min={startDate || today}
            max={maxDateStr}
            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
              errors.endDate || durationError
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-200'
            }`}
            style={{ backgroundColor: errors.endDate || durationError ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
          />
          {errors.endDate && (
            <p className="mt-1 text-xs text-red-600">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      {/* ✅ RF-01.03 - Mensajes de error de fechas */}
      {durationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {durationError}
          </p>
        </div>
      )}

      {/* ✅ RF-01.02.03 - Duración del viaje */}
      {duration > 0 && !durationError && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">Trip Duration:</span>
            <span className="text-lg font-bold text-quester-blue">
              {duration} {duration === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={!destination || !startDate || !endDate || duration <= 0 || !!durationError}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-base transition-all ${
            !destination || !startDate || !endDate || duration <= 0 || !!durationError
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-quester-blue hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
          }`}
        >
          Next
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </form>
  );
}

export default Step2Travelers;