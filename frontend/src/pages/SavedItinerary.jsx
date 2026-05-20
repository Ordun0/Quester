import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import tripsService from '../services/trips.service';
import authService from '../services/auth.service';
import ItineraryView from '../components/trip-builder/ItineraryView';
import logo from '../assets/logo.png';

function SavedItinerary() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  
  const [itineraryData, setItineraryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null);  // 'success' | 'error' | null

  // ✅ Cargar itinerario guardado desde backend
  useEffect(() => {
    loadSavedItinerary();
  }, [tripId]);

  const loadSavedItinerary = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = authService.getToken();
      if (!token) {
        navigate('/auth');
        return;
      }

      // ✅ Llamar al endpoint GET /api/trips/:tripId
      const result = await tripsService.getTripById(token, tripId);
      
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Failed to load trip');
      }

      // ✅ Transformar datos del backend al formato esperado por ItineraryView
      const trip = result.data;
      const formattedData = {
        extraction: {
          summary: {
            origin: trip.origin,
            destination: trip.destination,
            travelDates: {
              start: trip.startDate,
              end: trip.endDate
            },
            duration: trip.duration,
            totalBudget: trip.totalBudget,
            currency: trip.currency
          },
          extractionId: trip.tripId
        },
        itinerary: {
          id: trip.tripId,
          summary: {
            title: trip.itinerary?.summary?.title || `${trip.duration}-Day ${trip.destination} Itinerary`,
            description: trip.itinerary?.summary?.description || `A personalized trip to ${trip.destination}`,
            destination: trip.destination,
            duration: trip.duration,
            totalBudget: trip.totalBudget,
            currency: trip.currency,
            travelDates: {
              start: trip.startDate,
              end: trip.endDate
            }
          },
          dailyPlan: trip.itinerary?.dailyPlan || [],
          budgetBreakdown: trip.itinerary?.budgetBreakdown || {
            flights: 0, hotels: 0, food: 0, activities: 0, transport: 0, total: 0
          },
          recommendations: trip.itinerary?.recommendations || {},
          selectedFlights: trip.itinerary?.selectedFlights || null,
          selectedHotel: trip.itinerary?.selectedHotel || null,
          weather: trip.itinerary?.weather || null,
          transport: trip.itinerary?.transport || null,
          travelers: trip.travelers || []
        }
      };

      setItineraryData(formattedData);
      console.log('✅ Loaded saved itinerary:', tripId);
      
    } catch (err) {
      console.error('❌ Error loading saved itinerary:', err);
      setError(err.message || 'Failed to load itinerary');
      
      if (err.error === 'NOT_FOUND' || err.error === 'FORBIDDEN') {
        setError('This trip was not found or you do not have access to it.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Eliminar itinerario
  const handleDeleteTrip = async () => {
    setIsDeleting(true);
    setDeleteStatus(null);
    
    try {
      const token = authService.getToken();
      if (!token) {
        navigate('/auth');
        return;
      }

      // ✅ Llamar al endpoint DELETE /api/trips/:tripId
      const result = await tripsService.deleteTrip(token, tripId);
      
      if (result.success) {
        setDeleteStatus('success');
        console.log('✅ Trip deleted successfully:', tripId);
        
        // ✅ Esperar un momento y redirigir al dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setDeleteStatus('error');
        setError(result.message || 'Failed to delete trip');
      }
    } catch (err) {
      console.error('❌ Error deleting trip:', err);
      setDeleteStatus('error');
      setError(err.message || 'Failed to delete trip');
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ Exportar a PDF (reutilizar lógica de ItineraryView)
  const handleExportPDF = async () => {
    if (!itineraryData?.itinerary) return;
    
    // ✅ Importar librerías de PDF dinámicamente
    const { jsPDF } = await import('jspdf');
    const html2canvas = await import('html2canvas');
    
    try {
      // ✅ Crear elemento temporal para renderizar PDF
      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.fontFamily = 'Arial, sans-serif';
      element.style.fontSize = '12px';
      element.style.color = '#333';
      element.style.maxWidth = '800px';
      element.style.margin = '0 auto';
      
      const itinerary = itineraryData.itinerary;
      const summary = itinerary.summary;
      
      // ✅ Construir contenido del PDF
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
          ${itinerary.selectedFlights.return ? `<p><strong>Return:</strong> ${itinerary.selectedFlights.return.airline?.name} - ${itinerary.selectedFlights.return.departure?.airport?.code} to ${itinerary.selectedFlights.return.arrival?.airport?.code}</p>` : ''}
        ` : ''}
        
        ${itinerary.selectedHotel ? `
          <h2 style="font-size: 18px; color: #1e40af; margin: 20px 0 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Hotel</h2>
          <p><strong>${itinerary.selectedHotel.name}</strong> - ${new Intl.NumberFormat('en-US', { style: 'currency', currency: itinerary.selectedHotel.totalPrice?.currency || 'USD' }).format(itinerary.selectedHotel.totalPrice?.amount || 0)} total</p>
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
                ${activity.price?.amount > 0 ? `<br/><small>💰 ${new Intl.NumberFormat('en-US', { style: 'currency', currency: activity.price.currency || 'USD' }).format(activity.price.amount)}</small>` : ''}
                ${activity.transport?.recommendedMethod ? `<br/><small>🚗 ${activity.transport.recommendedMethod} • ${activity.transport.estimatedTime}</small>` : ''}
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
        
        ${itinerary.recommendations?.transportGuidance ? `
          <h2 style="font-size: 18px; color: #1e40af; margin: 20px 0 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Transport Tips</h2>
          <p>${itinerary.recommendations.transportGuidance}</p>
        ` : ''}
        
        <p style="margin-top: 40px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
          Generated by Quester • ${new Date().toLocaleDateString()}
        </p>
      `;
      
      // ✅ Renderizar a canvas y luego a PDF
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
      
      // ✅ Descargar PDF
      const fileName = `Quester-${summary?.destination?.replace(/\s+/g, '-') || 'Itinerary'}-${summary?.travelDates?.start?.replace(/-/g, '') || 'trip'}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF exported successfully');
      
    } catch (err) {
      console.error('❌ Failed to export PDF:', err);
      alert('Failed to export PDF. Please try again.');
    }
  };

  // ✅ Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-quester-blue mx-auto"></div>
          <p className="mt-4 text-gray-600 font-sans">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Itinerary</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-quester-blue hover:bg-blue-600 text-white font-medium rounded-lg transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ✅ Renderizar ItineraryView con props adaptadas para itinerario guardado
  return (
    <>
      {/* ✅ Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete This Trip?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{itineraryData.itinerary?.summary?.destination}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTrip}
                disabled={isDeleting}
                className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                  isDeleting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : deleteStatus === 'success'
                    ? 'bg-green-600'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : deleteStatus === 'success' ? (
                  'Deleted!'
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Renderizar ItineraryView con props adaptadas */}
      <ItineraryView
        itineraryData={itineraryData}
        // ✅ Reemplazar onSaveTrip con onDeleteTrip
        onSaveTrip={() => setShowDeleteConfirm(true)}
        onExportPDF={handleExportPDF}
        isSaving={isDeleting}
        isExporting={false}
        saveStatus={deleteStatus === 'success' ? 'success' : deleteStatus === 'error' ? 'error' : null}
        actionType="delete"
        // ✅ NUEVO: Deshabilitar botón de regenerar para itinerarios guardados (RF-06.03 + RF-05.08)
        allowRegeneration={false}
      />
    </>
  );
}

export default SavedItinerary;