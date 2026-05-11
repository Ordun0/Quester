// frontend/src/pages/Itinerary.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ItineraryView from '../components/trip-builder/ItineraryView';
import tripsService from '../services/trips.service';

function Itinerary() {
  const navigate = useNavigate();
  const [itineraryData, setItineraryData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);  // 'success' | 'error' | null
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // ✅ Recuperar datos del itinerario desde sessionStorage
    const storedData = sessionStorage.getItem('itineraryData');
    
    if (!storedData) {
      navigate('/trip-builder');
      return;
    }

    try {
      const parsedData = JSON.parse(storedData);
      // ✅ El backend retorna { success, message,  { extraction, itinerary } }
      const data = parsedData.data || parsedData;
      setItineraryData(data);
    } catch (error) {
      console.error('Error parsing itinerary ', error);
      navigate('/trip-builder');
    }
  }, [navigate]);

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

      // ✅ Construir payload para guardar
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
        itinerary: itineraryData.itinerary,  // ✅ Itinerario completo
        sessionId: itineraryData.extraction?.extractionId  // Referencia a la sesión
      };

      const result = await tripsService.saveItinerary(token, payload);
      
      if (result.success) {
        setSaveStatus('success');
        console.log('✅ Itinerary saved to quester-trips:', result.data.tripId);
        
        // ✅ Guardar tripId en sessionStorage para referencia futura
        sessionStorage.setItem('currentTripId', result.data.tripId);
        
        // ✅ Mostrar mensaje temporal
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
      // ✅ Importar librerías de PDF dinámicamente para no afectar el bundle inicial
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      
      // ✅ Crear un elemento temporal para renderizar el PDF
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
      
      // ✅ Renderizar a canvas y luego a PDF
      document.body.appendChild(element);
      
      const canvas = await html2canvas.default(element, {
        scale: 2,  // Mejor calidad
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
      
      const imgWidth = 210;  // A4 width in mm
      const pageHeight = 297;  // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // ✅ Manejar múltiples páginas si es necesario
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
      isSaving={isSaving}
      isExporting={isExporting}
      saveStatus={saveStatus}
    />
  );
}

export default Itinerary;