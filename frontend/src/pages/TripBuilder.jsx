// frontend/src/pages/TripBuilder.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import Step1Destination from '../components/trip-builder/Step1Destination';
import Step2Travelers from '../components/trip-builder/Step2Travelers';
import Step3Preferences from '../components/trip-builder/Step3Preferences';

function TripBuilder() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  
  // ✅ Estado inicial con estructura APLANADA para fácil acceso
  const [tripData, setTripData] = useState({
    // ✅ Datos de Step 1 (aplanados en raíz)
    sessionId: '',
    origin: '',
    destination: '',
    startDate: '',
    endDate: '',
    duration: 0,
    
    // ✅ Datos de Step 2 (aplanados en raíz)
    travelers: [],
    budget: 0,
    currency: 'USD',
    budgetDistribution: {},
    
    // ✅ Datos de Step 3 (aplanados en raíz)
    preferences: {
      avoidCrowds: false,
      ecoFriendly: false,
      wheelchairAccessible: false,
      familyFriendly: false,
      petFriendly: false
    },
    hotelClass: 'no-preference',
    flightClass: 'economy',
    customPreferences: '',
    
    // ✅ Referencias anidadas por paso (para debugging y compatibilidad)
    step1: {},
    step2: {},
    step3: {}
  });
  
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep2Valid, setIsStep2Valid] = useState(false);
  const [isStep3Valid, setIsStep3Valid] = useState(false);

  // Verificar autenticación
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      navigate('/auth');
    }
  }, [navigate]);

  // ✅ ACTUALIZADO: Actualizar datos del viaje con aplanamiento inteligente
  const updateTripData = (step, data) => {
    console.log('📦 updateTripData called');
    console.log('Step:', step);
    console.log('Data:', data);
  
    setTripData(prev => {
      // ✅ Guardar los datos del paso en su clave correspondiente (para referencia)
      const stepData = {
        ...(prev[step] || {}),
        ...data
      };

      // ✅ Aplanar los datos importantes a la raíz para fácil acceso
      const flattenedData = { ...prev };

      if (step === 'step1') {
        // Paso 1: destination, startDate, endDate, duration, origin, sessionId
        if (data.sessionId !== undefined) flattenedData.sessionId = data.sessionId;
        if (data.origin !== undefined) flattenedData.origin = data.origin;
        if (data.destination !== undefined) flattenedData.destination = data.destination;
        if (data.startDate !== undefined) flattenedData.startDate = data.startDate;
        if (data.endDate !== undefined) flattenedData.endDate = data.endDate;
        if (data.duration !== undefined) flattenedData.duration = data.duration;
      }
      
      if (step === 'step2') {
        // Paso 2: travelers, budget, currency, budgetDistribution, sessionId
        if (data.sessionId !== undefined) flattenedData.sessionId = data.sessionId;
        if (data.travelers !== undefined) flattenedData.travelers = data.travelers;
        if (data.budget !== undefined) flattenedData.budget = data.budget;
        if (data.currency !== undefined) flattenedData.currency = data.currency;
        if (data.budgetDistribution !== undefined) flattenedData.budgetDistribution = data.budgetDistribution;
      }
      
      if (step === 'step3') {
        // Paso 3: preferences, hotelClass, flightClass, customPreferences
        if (data.preferences !== undefined) flattenedData.preferences = data.preferences;
        if (data.hotelClass !== undefined) flattenedData.hotelClass = data.hotelClass;
        if (data.flightClass !== undefined) flattenedData.flightClass = data.flightClass;
        if (data.customPreferences !== undefined) flattenedData.customPreferences = data.customPreferences;
      }

      // ✅ Guardar también en la clave del paso para referencia/debugging
      flattenedData[step] = stepData;

      console.log('✅ New tripData (flattened):', {
        sessionId: flattenedData.sessionId,
        origin: flattenedData.origin,
        destination: flattenedData.destination,
        startDate: flattenedData.startDate,
        endDate: flattenedData.endDate,
        duration: flattenedData.duration,
        travelers: flattenedData.travelers?.length,
        budget: flattenedData.budget,
        currency: flattenedData.currency,
        budgetDistribution: flattenedData.budgetDistribution
      });
      
      return flattenedData;
    });
  };

  // Navegar entre pasos
  const goToStep = (step) => {
    if (step === 1 || (step === 2 && isStep1Valid) || (step === 3 && isStep2Valid)) {
      setCurrentStep(step);
    }
  };

  // Ir al dashboard
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // ✅ Manejar finalización del Step 3 (generar itinerario)
  const handleFinalSubmit = () => {
    console.log('🎉 Final trip data ready for itinerary generation:', {
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      duration: tripData.duration,
      travelers: tripData.travelers,
      budget: tripData.budget,
      currency: tripData.currency,
      preferences: tripData.preferences,
      hotelClass: tripData.hotelClass,
      flightClass: tripData.flightClass
    });
    
    // ✅ Step3Preferences se encarga de llamar al backend y navegar a /itinerary
    // Esta función es un fallback por si el onSubmit no navega
    navigate('/itinerary');
  };

  // ✅ Debug: Verificar cambios en tripData
  useEffect(() => {
    console.log('🔍 tripData actualizado:', {
      sessionId: tripData.sessionId,
      destination: tripData.destination,
      budget: tripData.budget,
      travelers: tripData.travelers?.length,
      step: currentStep
    });
  }, [tripData, currentStep]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src={logo} alt="Quester Logo" className="w-12 h-12 object-contain" />
              <h1 className="text-2xl font-bold text-quester-purple tracking-wide">QUESTER</h1>
            </Link>

            {/* Back Button */}
            <button
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-quester-blue font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              My Quests
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-quester-dark">Create a Quest</h2>
          <p className="text-gray-600 mt-2">Plan your perfect trip in 3 steps</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {/* Step 1 */}
            <div className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  currentStep >= 1 
                    ? 'bg-quester-blue text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                1
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= 1 ? 'text-quester-dark' : 'text-gray-400'
              }`}>
                Destination
              </span>
            </div>

            {/* Line 1-2 */}
            <div className={`w-16 h-1 mx-4 ${
              currentStep >= 2 ? 'bg-quester-blue' : 'bg-gray-200'
            }`}></div>

            {/* Step 2 */}
            <div className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  currentStep >= 2 
                    ? 'bg-quester-blue text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                2
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= 2 ? 'text-quester-dark' : 'text-gray-400'
              }`}>
                Travelers
              </span>
            </div>

            {/* Line 2-3 */}
            <div className={`w-16 h-1 mx-4 ${
              currentStep >= 3 ? 'bg-quester-blue' : 'bg-gray-200'
            }`}></div>

            {/* Step 3 */}
            <div className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  currentStep >= 3 
                    ? 'bg-quester-blue text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                3
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= 3 ? 'text-quester-dark' : 'text-gray-400'
              }`}>
                Preferences
              </span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            
            {currentStep === 1 && (
              <Step1Destination 
                tripData={tripData}
                updateTripData={updateTripData}
                onValid={(isValid) => setIsStep1Valid(isValid)}
                onNext={() => goToStep(2)}
              />
            )}

            {currentStep === 2 && (
              <Step2Travelers 
                tripData={tripData}
                updateTripData={updateTripData}
                onValid={(isValid) => setIsStep2Valid(isValid)}
                onNext={() => goToStep(3)}
                onBack={() => goToStep(1)}
              />
            )}

            {currentStep === 3 && (
              <Step3Preferences 
                tripData={tripData}
                updateTripData={updateTripData}
                onValid={(isValid) => setIsStep3Valid(isValid)}
                onBack={() => goToStep(2)}
                onFinalSubmit={handleFinalSubmit}  // ✅ Pasar callback para navegación final
              />
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default TripBuilder;