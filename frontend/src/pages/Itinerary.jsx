// frontend/src/pages/Itinerary.jsx

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ItineraryView from '../components/trip-builder/ItineraryView';
import tripsService from '../services/trips.service';

function Itinerary() {
  const navigate = useNavigate();
  const location = useLocation();
  const [itineraryData, setItineraryData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);  // ✅ Feedback visual para regeneración

  // ✅ CALLBACK para actualizar itinerario directamente (sin navegar)
  // Se llama desde ItineraryView.jsx después de regeneración exitosa
  const handleItineraryUpdated = useCallback((newData) => {
    console.log('🔄 [Itinerary] Direct update received, updating state');
    
    // ✅ Validar estructura antes de actualizar
    if (newData?.itinerary?.dailyPlan && Array.isArray(newData.itinerary.dailyPlan)) {
      // ✅ Actualizar sessionStorage como backup
      sessionStorage.setItem('itineraryData', JSON.stringify(newData));
      
      // ✅ Actualizar estado local → re-render automático de ItineraryView
      setItineraryData(newData);
      
      // ✅ Feedback visual opcional
      console.log('✅ [Itinerary] State updated directly with new itinerary');
      
      // ✅ Resetear estado de regeneración
      setIsRegenerating(false);
      
      return true;
    } else {
      console.error('❌ [Itinerary] Invalid data structure in update callback');
      setIsRegenerating(false);
      return false;
    }
  }, []);  // ✅ useCallback para estabilidad de referencia

  // ✅ useEffect para detectar regeneración vía location.state (fallback)
  useEffect(() => {
    if (location.state?.__key || location.state?.regenerated) {
      console.log('🔄 [Itinerary] Detected regeneration via state, syncing...');
      
      const stored = sessionStorage.getItem('itineraryData');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          let data;
          if (parsed?.itinerary && parsed?.extraction) {
            data = parsed;
          } else if (parsed?.data?.itinerary) {
            data = parsed.data;
          } else if (parsed?.dailyPlan) {
            data = { itinerary: parsed, extraction: {} };
          } else {
            throw new Error('Invalid itinerary structure');
          }
          
          if (data?.itinerary?.dailyPlan && Array.isArray(data.itinerary.dailyPlan)) {
            setItineraryData(data);
          }
        } catch (e) {
          console.error('❌ Error parsing itinerary:', e);
        }
      }
      
      // ✅ Limpiar state para evitar re-uso
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.__key, location.state?.regenerated]);

  // ✅ useEffect principal: Carga inicial desde sessionStorage
  useEffect(() => {
    const loadItinerary = () => {
      const stored = sessionStorage.getItem('itineraryData');
      
      if (!stored) {
        navigate('/trip-builder');
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        let data;
        if (parsed?.itinerary && parsed?.extraction) {
          data = parsed;
        } else if (parsed?.data?.itinerary) {
          data = parsed.data;
        } else if (parsed?.dailyPlan) {
          data = { itinerary: parsed, extraction: {} };
        } else {
          throw new Error('Invalid itinerary structure');
        }
        
        // ✅ Validar estructura mínima
        if (!data?.itinerary?.dailyPlan || !Array.isArray(data.itinerary.dailyPlan)) {
          sessionStorage.removeItem('itineraryData');
          navigate('/trip-builder');
          return;
        }
        
        // ✅ Validar presupuesto (RF-04.05 + RF-08.02)
        const summary = data.itinerary?.summary || data.summary;
        const budgetBreakdown = data.itinerary?.budgetBreakdown || data.budgetBreakdown;
        
        if (summary?.totalBudget && budgetBreakdown?.total) {
          const userBudget = summary.totalBudget;
          const estimatedCost = budgetBreakdown.total;
          
          if (estimatedCost > userBudget) {
            console.warn('⚠️ [BudgetError] Itinerary cost exceeds user budget', {
              userBudget,
              estimatedCost,
              difference: estimatedCost - userBudget,
              currency: summary.currency
            });
            
            sessionStorage.removeItem('itineraryData');
            navigate('/budget-error', {
              state: {
                budget: userBudget,
                totalCost: estimatedCost,
                currency: summary.currency || 'USD',
                difference: estimatedCost - userBudget
              }
            });
            return;
          }
        }
        
        setItineraryData(data);
        
      } catch (error) {
        console.error('Error parsing itinerary:', error);
        navigate('/trip-builder');
      }
    };

    loadItinerary();
  }, [navigate]);

  // ✅ Función para verificar límite de viajes guardados (RF-06.02)
  const checkTripLimit = async (token) => {
    try {
      const result = await tripsService.getUserTrips(token);
      
      if (result.success && result.data?.trips) {
        const activeTrips = result.data.trips.filter(trip => trip.status !== 'deleted');
        return activeTrips.length;
      }
      return 0;
    } catch (error) {
      console.error('❌ Error checking trip limit:', error);
      return 0;
    }
  };

  // ✅ Guardar itinerario en quester-trips (SOLO al presionar botón)
  const handleSaveTrip = async () => {
    if (!itineraryData?.itinerary) return;
    
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        setSaveStatus('error');
        return;
      }

      // ✅ RF-06.02: Verificar límite de 6 viajes guardados
      const tripCount = await checkTripLimit(token);
      
      if (tripCount >= 6) {
        alert('Trip limit reached. Delete a trip to create a new one');
        setSaveStatus('error');
        setIsSaving(false);
        return;
      }

      const payload = {
        tripData: {
          origin: itineraryData.extraction?.summary?.origin || itineraryData.itinerary?.summary?.origin,
          destination: itineraryData.itinerary?.summary?.destination,
          startDate: itineraryData.itinerary?.summary?.travelDates?.start,
          endDate: itineraryData.itinerary?.summary?.travelDates?.end,
          duration: itineraryData.itinerary?.summary?.duration
        },
        travelers: itineraryData.itinerary?.travelers || [],
        budget: {
          total: itineraryData.itinerary?.summary?.totalBudget,
          currency: itineraryData.itinerary?.summary?.currency
        },
        preferences: itineraryData.itinerary?.preferences || {},
        itinerary: itineraryData.itinerary,
        sessionId: itineraryData.extraction?.extractionId
      };

      const result = await tripsService.saveItinerary(token, payload);
      
      if (result.success) {
        setSaveStatus('success');
        console.log('✅ Itinerary saved to quester-trips:', result.data.tripId);
        sessionStorage.setItem('currentTripId', result.data.tripId);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('❌ Failed to save itinerary:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Exportar itinerario a PDF
  const handleExportPDF = async () => {
    if (!itineraryData?.itinerary) return;
    
    setIsExporting(true);
    
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      
      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.fontFamily = 'Arial, sans-serif';
      element.style.fontSize = '12px';
      element.style.color = '#333';
      element.style.maxWidth = '800px';
      element.style.margin = '0 auto';
      
      const itinerary = itineraryData.itinerary;
      const summary = itinerary.summary;
      
      element.innerHTML = `
        <h1 style="font-size: 24px; color: #1e40af; margin-bottom: 8px; text-align: center;">
          ${summary?.title || 'Travel Itinerary'}
        </h1>
        <p style="margin-bottom: 20px; color: #666; text-align: center;">
          ${summary?.destination} • ${summary?.travelDates?.start ? new Date(summary.travelDates.start).toLocaleDateString() : ''} to ${summary?.travelDates?.end ? new Date(summary.travelDates.end).toLocaleDateString() : ''}
        </p>
        
        <h2 style="font-size: 18px; color: #1e40af; margin: 20px 0 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Trip Summary</h2>
        <p><strong>Budget:</strong> ${summary?.currency}${summary?.totalBudget?.toLocaleString()}</p>
        <p><strong>Duration:</strong> ${summary?.duration} days</p>
        <p><strong>Travelers:</strong> ${itinerary.travelers?.length || 1}</p>
        
        ${itinerary.selectedFlights?.outbound ? `
          <h2 style="font-size: 18px; color: #1e40af; margin: 20px 0 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Flight Details</h2>
          <p><strong>Outbound:</strong> ${itinerary.selectedFlights.outbound.airline?.name} - ${itinerary.selectedFlights.outbound.departure?.airport?.code} to ${itinerary.selectedFlights.outbound.arrival?.airport?.code}</p>
          <p><strong>Return:</strong> ${itinerary.selectedFlights.return?.airline?.name || 'N/A'} - ${itinerary.selectedFlights.return?.departure?.airport?.code || 'N/A'} to ${itinerary.selectedFlights.return?.arrival?.airport?.code || 'N/A'}</p>
        ` : ''}
        
        ${itinerary.selectedHotel ? `
          <h2 style="font-size: 18px; color: #1e40af; margin: 20px 0 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Hotel</h2>
          <p><strong>${itinerary.selectedHotel.name}</strong> - ${formatCurrency(itinerary.selectedHotel.totalPrice?.amount, itinerary.selectedHotel.totalPrice?.currency)} total</p>
        ` : ''}
        
        <h2 style="font-size: 18px; color: #1e40af; margin: 20px 0 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Daily Plan</h2>
        ${itinerary.dailyPlan?.map(day => `
          <div style="margin-bottom: 20px; page-break-inside: avoid;">
            <h3 style="font-size: 16px; color: #1e40af; margin: 10px 0;">
              Day ${day.day} - ${day.theme} (${new Date(day.date).toLocaleDateString()})
            </h3>
            ${day.activities?.map(activity => `
              <div style="margin-left: 10px; margin-bottom: 8px;">
                <strong>${activity.startTime} - ${activity.endTime}</strong>: ${activity.name}
                ${activity.location ? `<br/><small>📍 ${activity.location}</small>` : ''}
                ${activity.price?.amount > 0 ? `<br/><small>💰 ${activity.price.formatted}</small>` : ''}
              </div>
            `).join('') || ''}
            ${day.dailySummary ? `<p style="font-style: italic; color: #666; margin-top: 8px;">${day.dailySummary}</p>` : ''}
          </div>
        `).join('') || ''}
        
        ${itinerary.recommendations?.packingTips?.length ? `
          <h2 style="font-size: 18px; color: #1e40af; margin: 20px 0 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Packing Tips</h2>
          <ul>
            ${itinerary.recommendations.packingTips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${itinerary.recommendations?.weatherConsiderations ? `
          <h2 style="font-size: 18px; color: #1e40af; margin: 20px 0 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Weather</h2>
          <p>${itinerary.recommendations.weatherConsiderations}</p>
        ` : ''}
        
        <p style="margin-top: 40px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
          Generated by Quester • ${new Date().toLocaleDateString()}
        </p>
      `;
      
      document.body.appendChild(element);
      
      const canvas = await html2canvas.default(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(element);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `Quester-${summary?.destination?.replace(/\s+/g, '-') || 'Itinerary'}-${summary?.travelDates?.start?.replace(/-/g, '') || 'trip'}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF exported successfully');
      
    } catch (error) {
      console.error('❌ Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ✅ Helper para formato de moneda (para el PDF)
  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!itineraryData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-quester-blue"></div>
      </div>
    );
  }

  return (
    <ItineraryView 
      itineraryData={itineraryData}
      onSaveTrip={handleSaveTrip}
      onExportPDF={handleExportPDF}
      onItineraryUpdated={handleItineraryUpdated}  // ✅ NUEVO: Callback para actualización directa
      isSaving={isSaving}
      isExporting={isExporting}
      isRegenerating={isRegenerating}  // ✅ NUEVO: Estado para feedback visual
      saveStatus={saveStatus}
      actionType="save"
    />
  );
}

export default Itinerary;