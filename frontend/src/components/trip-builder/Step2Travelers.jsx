// frontend/src/components/trip-builder/Step2Travelers.jsx

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { travelersSchema } from '../../utils/validators';
import authService from '../../services/auth.service';  // ✅ IMPORTANTE: Importar authService

function Step2Travelers({ tripData, updateTripData, onValid, onNext, onBack }) {
  const [budgetError, setBudgetError] = useState('');
  const [percentageError, setPercentageError] = useState('');
  const [totalPercentage, setTotalPercentage] = useState(100);
  const [isDistributionModified, setIsDistributionModified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);  // ✅ Estado de carga
  const [error, setError] = useState('');  // ✅ Estado de error

  // ✅ RF-04.03.02 - Distribución por defecto
  const DEFAULT_DISTRIBUTION = {
    flights: 20,
    hotels: 15,
    food: 30,
    activities: 30,
    transport: 5
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    control,
    setValue
  } = useForm({
    resolver: zodResolver(travelersSchema),
    mode: 'onBlur',
    defaultValues: {
      travelers: tripData.travelers?.length > 0 ? tripData.travelers : [{ name: '', type: 'adult', interests: [] }],
      budget: tripData.budget || 1000,
      currency: tripData.currency || 'USD',
      budgetDistribution: tripData.budgetDistribution && Object.keys(tripData.budgetDistribution).length > 0 
        ? tripData.budgetDistribution 
        : DEFAULT_DISTRIBUTION
    }
  });

  // ✅ Tarea 60: Gestión de viajeros (máx 4)
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'travelers'
  });

  const budget = watch('budget');
  const currency = watch('currency');
  const budgetDistribution = watch('budgetDistribution');
  const travelers = watch('travelers');

  // ✅ RF-04.03.04 - Calcular suma de porcentajes
  useEffect(() => {
    const sum = Object.values(budgetDistribution || {}).reduce((acc, val) => acc + (parseInt(val) || 0), 0);
    setTotalPercentage(sum);
    
    if (isDistributionModified && sum !== 100) {
      setPercentageError(`Total must be 100% (currently ${sum}%)`);
    } else {
      setPercentageError('');
    }
  }, [budgetDistribution, isDistributionModified]);

  // ✅ RF-04.02 - Validar presupuesto mínimo
  useEffect(() => {
    if (budget && budget < 500) {
      setBudgetError(`Minimum budget is 500 ${currency}`);
    } else {
      setBudgetError('');
    }
  }, [budget, currency]);

  // Validar para habilitar botón
  useEffect(() => {
    const hasTravelers = fields.length > 0 && travelers?.every(t => t.name && t.name.trim() !== '');
    const hasValidBudget = budget >= 500;
    const hasValidPercentage = !isDistributionModified || totalPercentage === 100;

    if (hasTravelers && hasValidBudget && hasValidPercentage) {
      onValid(true);
    } else {
      onValid(false);
    }
  }, [fields, travelers, budget, totalPercentage, isDistributionModified, onValid]);

  // ✅ Tarea 60: Agregar viajero
  const addTraveler = () => {
    if (fields.length < 4) {
      append({ name: '', type: 'adult', interests: [] });
    }
  };

  // ✅ RF-03.01 - Intereses por viajero (máx 4 por viajero)
  const toggleTravelerInterest = (travelerIndex, interestId) => {
    const currentTraveler = travelers[travelerIndex];
    const currentInterests = currentTraveler?.interests || [];
    const index = currentInterests.indexOf(interestId);
    
    let newInterests;
    if (index > -1) {
      // Remover interés
      newInterests = currentInterests.filter((_, i) => i !== index);
    } else {
      // Agregar interés (máx 4)
      if (currentInterests.length >= 4) {
        alert('Maximum 4 interests allowed per traveler');
        return;
      }
      newInterests = [...currentInterests, interestId];
    }
    
    // Actualizar el viajero en el form
    setValue(`travelers.${travelerIndex}.interests`, newInterests);
  };

  // ✅ RF-04.03 - Actualizar distribución de presupuesto
  const updateDistribution = (category, value) => {
    const newValue = parseInt(value) || 0;
    
    // Validar que no sea negativo
    if (newValue < 0) return;
    
    const updated = {
      ...budgetDistribution,
      [category]: newValue
    };
    
    // Marcar como modificado por el usuario
    setIsDistributionModified(true);
    
    // Actualizar el valor en el form
    setValue('budgetDistribution', updated);
  };

  // ✅ RF-04.03.04.01 - Deshabilitar incremento si suma > 100%
  const isInputDisabled = (category, currentValue) => {
    if (!isDistributionModified) return false;
    
    const currentSum = Object.values(budgetDistribution || {}).reduce((acc, val, key) => {
      if (key === category) return acc + currentValue;
      return acc + (parseInt(val) || 0);
    }, 0);
    
    return currentSum > 100;
  };

  // ✅ Submit del paso 2 - CONECTADO CON BACKEND
  const onSubmit = async (data) => {
    console.log('=== SUBMIT STEP 2 ===');
    console.log('Data from form:', data);
    console.log('Trip data:', tripData);
    console.log('SessionId:', tripData.step1?.sessionId);
    console.log('=====================');

    // Validaciones finales
    if (data.budget < 500) {
      setBudgetError(`Minimum budget is 500 ${currency}`);
      return;
    }

    if (isDistributionModified && totalPercentage !== 100) {
      setPercentageError('Total must be 100%');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = sessionStorage.getItem('token');
      const sessionId = tripData.step1?.sessionId;

      // ✅ DEBUG: Verificar sessionId
      if (!sessionId) {
        console.error('❌ ERROR: sessionId is undefined!');
        console.error('tripData:', tripData);
        setError('Session not found. Please restart from Step 1.');
        setIsLoading(false);
        return;
      }

      const payload = {
        sessionId: sessionId,
        travelers: data.travelers,
        budget: Number(data.budget),
        currency: data.currency,
        budgetDistribution: isDistributionModified ? data.budgetDistribution : DEFAULT_DISTRIBUTION
      };

      console.log('📤 Sending to backend:', payload);
      console.log('Token exists:', !!token);

      // ✅ Tarea 68: Conectar con backend
      const response = await authService.saveTripStep2(token, payload);

      console.log('✅ Backend response:', response);

      // Actualizar estado local con respuesta del backend
      updateTripData('step2', {
        ...response.data,
        sessionId: response.data.sessionId
      });

      console.log('✅ Step 2 saved successfully, navigating to Step 3...');
      onNext();
      
    } catch (err) {
      console.error('❌ ERROR from backend:', err);
      console.error('Error object:', JSON.stringify(err, null, 2));
      
      if (err.error === 'INVALID_TRAVELERS' || err.error === 'INVALID_TRAVELER_NAME') {
        setError(err.message);
      } else if (err.error === 'INVALID_BUDGET') {
        setBudgetError(err.message);
      } else if (err.error === 'INVALID_PERCENTAGE') {
        setPercentageError(err.message);
      } else if (err.error === 'INVALID_CURRENCY') {
        setError(err.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Error saving trip. Please check console for details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ RF-03.01.01 - 9 categorías de intereses
  const INTEREST_CATEGORIES = [
    { id: 'food', label: 'Food & Cuisine', icon: '🍜' },
    { id: 'culture', label: 'Culture & History', icon: '🏛️' },
    { id: 'nature', label: 'Nature & Wildlife', icon: '🌿' },
    { id: 'nightlife', label: 'Nightlife', icon: '🌃' },
    { id: 'shopping', label: 'Shopping', icon: '🛍️' },
    { id: 'adventure', label: 'Adventure & Sports', icon: '🏔️' },
    { id: 'relaxation', label: 'Relaxation & Spa', icon: '🧘' },
    { id: 'museums', label: 'Museums & Art', icon: '🎨' },
    { id: 'churches', label: 'Churches & Temples', icon: '⛪' }
  ];

  // ✅ RF-04.03.01 - 5 categorías de distribución
  const BUDGET_CATEGORIES = [
    { id: 'flights', label: 'Flights', color: 'bg-blue-500' },
    { id: 'hotels', label: 'Hotels', color: 'bg-green-500' },
    { id: 'food', label: 'Food & Dining', color: 'bg-orange-500' },
    { id: 'activities', label: 'Activities & Tours', color: 'bg-purple-500' },
    { id: 'transport', label: 'Transport', color: 'bg-cyan-500' }
  ];

  // ✅ RF-04.01.02-04 - 3 monedas disponibles
  const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'EUR', symbol: '€', name: 'Euro' }
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-quester-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="text-xl font-semibold text-quester-dark">Travelers & Budget</h3>
      </div>

      {/* ✅ Mensajes de error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* ===========================================
          TAREA 60-61: GESTIÓN DE VIAJEROS
          =========================================== */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-medium text-quester-dark">Who's going?</h4>
          <span className="text-sm text-gray-500">{fields.length}/4 travelers</span>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="p-4 border border-gray-200 rounded-lg space-y-4">
            {/* Header del viajero */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-quester-dark">Traveler {index + 1}</span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* Nombre del viajero */}
            <div>
              <input
                type="text"
                {...register(`travelers.${index}.name`)}
                placeholder={`Traveler ${index + 1} name`}
                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue ${
                  errors.travelers?.[index]?.name 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200'
                }`}
                style={{ backgroundColor: errors.travelers?.[index]?.name ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
              />
              {errors.travelers?.[index]?.name && (
                <p className="mt-1 text-xs text-red-600">{errors.travelers[index].name.message}</p>
              )}
            </div>

            {/* Tipo de viajero */}
            <div>
              <select
                {...register(`travelers.${index}.type`)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-quester-blue"
                style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
              >
                <option value="adult">Adult</option>
                <option value="child">Child (2-12)</option>
                <option value="infant">Infant (0-2)</option>
              </select>
            </div>

            {/* ✅ RF-03.01 - Intereses por viajero */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-quester-dark">
                Interests (max 4)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {INTEREST_CATEGORIES.map((category) => {
                  const travelerInterests = travelers?.[index]?.interests || [];
                  const isSelected = travelerInterests.includes(category.id);
                  const isDisabled = !isSelected && travelerInterests.length >= 4;
                  
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleTravelerInterest(index, category.id)}
                      disabled={isDisabled}
                      className={`p-3 rounded-lg border-2 transition-all text-sm ${
                        isSelected
                          ? 'border-quester-blue bg-blue-50'
                          : isDisabled
                          ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                          : 'border-gray-200 hover:border-quester-blue hover:bg-blue-50'
                      }`}
                    >
                      <div className="text-lg mb-1">{category.icon}</div>
                      <div className="font-medium text-quester-dark">{category.label}</div>
                      {isSelected && (
                        <div className="mt-1 text-xs text-quester-blue font-medium">✓</div>
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.travelers?.[index]?.interests && (
                <p className="text-xs text-red-600">{errors.travelers[index].interests.message}</p>
              )}
            </div>
          </div>
        ))}

        {/* Agregar viajero */}
        {fields.length < 4 && (
          <button
            type="button"
            onClick={addTraveler}
            className="flex items-center gap-2 text-quester-blue hover:text-blue-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Traveler
          </button>
        )}
      </div>

      {/* ===========================================
          RF-04: PRESUPUESTO TOTAL
          =========================================== */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-quester-dark">What's your budget?</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ✅ RF-04.01.02-04 - Selector de moneda (USD, MXN, EUR) */}
          <div>
            <label className="block text-sm font-medium text-quester-dark mb-2">Currency</label>
            <select
              {...register('currency')}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-quester-blue"
              style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.symbol} - {curr.name}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ RF-04.01 - Input de presupuesto */}
          <div>
            <label className="block text-sm font-medium text-quester-dark mb-2">Total Budget</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500">
                {CURRENCIES.find(c => c.code === currency)?.symbol || '$'}
              </span>
              <input
                type="number"
                {...register('budget')}
                min="500"
                className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue ${
                  budgetError || errors.budget
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200'
                }`}
                style={{ backgroundColor: budgetError || errors.budget ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
              />
            </div>
            {budgetError && (
              <p className="mt-1 text-xs text-red-600">{budgetError}</p>
            )}
            {errors.budget && (
              <p className="mt-1 text-xs text-red-600">{errors.budget.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* ===========================================
          RF-04.03: DISTRIBUCIÓN DE PORCENTAJES (OPCIONAL)
          =========================================== */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-medium text-quester-dark">Budget Distribution (Optional)</h4>
          <div className="flex items-center gap-2">
            {!isDistributionModified && (
              <span className="text-xs text-gray-500">Using default distribution</span>
            )}
            <span className={`text-sm font-medium ${
              totalPercentage === 100 ? 'text-green-600' : 'text-red-600'
            }`}>
              Total: {totalPercentage}%
            </span>
          </div>
        </div>

        {percentageError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{percentageError}</p>
          </div>
        )}

        <div className="space-y-4">
          {BUDGET_CATEGORIES.map((category) => (
            <div key={category.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-quester-dark">{category.label}</label>
                <input
                  type="number"
                  value={budgetDistribution?.[category.id] || 0}
                  onChange={(e) => updateDistribution(category.id, e.target.value)}
                  min="0"
                  max="100"
                  disabled={isInputDisabled(category.id, budgetDistribution?.[category.id] || 0)} 
                  className="w-20 px-3 py-2 text-right rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-quester-blue disabled:bg-gray-100 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${category.color}`}
                  style={{ width: `${budgetDistribution?.[category.id] || 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Botón para resetear a defaults */}
        {isDistributionModified && (
          <button
            type="button"
            onClick={() => {
              setValue('budgetDistribution', DEFAULT_DISTRIBUTION);
              setIsDistributionModified(false);
              setPercentageError('');
            }}
            className="text-sm text-quester-blue hover:text-blue-700 font-medium transition-colors"
          >
            Reset to default distribution
          </button>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={
            isLoading ||
            fields.length === 0 ||
            travelers?.some(t => !t.name || t.name.trim() === '') ||
            !budget ||
            budget < 500 ||
            (isDistributionModified && totalPercentage !== 100)
          }
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-base transition-all ${
            isLoading ||
            fields.length === 0 ||
            travelers?.some(t => !t.name || t.name.trim() === '') ||
            !budget ||
            budget < 500 ||
            (isDistributionModified && totalPercentage !== 100)
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-quester-blue hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {isLoading ? 'Saving...' : 'Next'}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </form>
  );
}

export default Step2Travelers;