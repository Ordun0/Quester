// frontend/src/components/trip-builder/Step1Destination.jsx

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { destinationSchema } from '../../utils/validators';
import authService from '../../services/auth.service';

function Step1Destination({ tripData, updateTripData, onValid, onNext }) {
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [duration, setDuration] = useState(0);
  const [durationError, setDurationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(''); 

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
  const origin = watch('origin');
  const destination = watch('destination');

  // ✅ Lista de destinos/origenes válidos (debe coincidir con el backend)
const VALID_LOCATIONS = [
  // 🇺🇸 USA
  'New York, USA', 'Los Angeles, USA', 'Chicago, USA', 'San Francisco, USA',
  'Seattle, USA', 'Miami, USA', 'Boston, USA', 'Dallas, USA', 'Houston, USA',
  'Denver, USA', 'Las Vegas, USA', 'Orlando, USA', 'Atlanta, USA', 'Phoenix, USA',
  'Washington, USA', 'Honolulu, USA', 'Anchorage, USA', 'Portland, USA',
  'Austin, USA', 'Nashville, USA', 'New Orleans, USA', 'San Diego, USA',
  'Tampa, USA', 'Charlotte, USA', 'Minneapolis, USA', 'Detroit, USA',
  'Philadelphia, USA', 'Baltimore, USA', 'Pittsburgh, USA', 'Cleveland, USA',
  'Cincinnati, USA', 'Kansas City, USA', 'St. Louis, USA', 'Milwaukee, USA',
  'Indianapolis, USA', 'Columbus, USA', 'Raleigh, USA', 'Salt Lake City, USA',
  'Boise, USA', 'Reno, USA', 'Tucson, USA', 'Albuquerque, USA', 'Oklahoma City, USA',
  'Memphis, USA', 'Louisville, USA', 'Richmond, USA', 'Buffalo, USA', 'Rochester, USA',
  'Hartford, USA', 'Providence, USA', 'Manchester, USA', 'Burlington, USA',
  'Jacksonville, USA', 'Fort Lauderdale, USA', 'West Palm Beach, USA', 'Sarasota, USA',
  'Fort Myers, USA', 'Key West, USA', 'Myrtle Beach, USA', 'Charleston, USA',
  'Savannah, USA', 'Asheville, USA', 'Knoxville, USA', 'Chattanooga, USA',
  'Birmingham, USA', 'Mobile, USA', 'Jackson, USA', 'Little Rock, USA',
  'Tulsa, USA', 'Wichita, USA', 'Omaha, USA', 'Des Moines, USA', 'Sioux Falls, USA',
  'Fargo, USA', 'Billings, USA', 'Bozeman, USA', 'Missoula, USA', 'Spokane, USA',
  'Eugene, USA', 'Medford, USA', 'Redding, USA', 'Fresno, USA', 'Bakersfield, USA',
  'Santa Barbara, USA', 'Monterey, USA', 'Palm Springs, USA', 'Flagstaff, USA',
  'Grand Canyon, USA', 'Sedona, USA', 'Scottsdale, USA', 'Mesa, USA', 'Chandler, USA',
  'Glendale, USA', 'Tempe, USA', 'Gilbert, USA', 'Peoria, USA', 'Surprise, USA',
  'Avondale, USA', 'Goodyear, USA', 'Buckeye, USA', 'El Mirage, USA', 'Youngtown, USA',
  'Sun City, USA', 'Sun City West, USA', 'Fountain Hills, USA', 'Paradise Valley, USA',
  'Cave Creek, USA', 'Carefree, USA', 'New River, USA', 'Anthem, USA', 'Desert Hills, USA',
  'Black Canyon City, USA', 'Cordes Lakes, USA', 'Mayer, USA', 'Dewey-Humboldt, USA',
  'Prescott, USA', 'Prescott Valley, USA', 'Chino Valley, USA', 'Camp Verde, USA',
  'Cottonwood, USA', 'Clarkdale, USA', 'Jerome, USA', 'Sedona, USA', 'Oak Creek, USA',
  'Village of Oak Creek, USA', 'Cornville, USA', 'Rimrock, USA', 'McGuireville, USA',
  'Lake Montezuma, USA', 'Rincon, USA', 'Camp Verde, USA', 'Payson, USA', 'Pine, USA',
  'Strawberry, USA', 'Young, USA', 'Christopher Creek, USA', 'Heber-Overgaard, USA',
  'Pinetop-Lakeside, USA', 'Show Low, USA', 'Snowflake, USA', 'Taylor, USA',
  'Winslow, USA', 'Holbrook, USA', 'Joseph City, USA', 'Sun Valley, USA',
  'Navajo, USA', 'Chambers, USA', 'Lupton, USA', 'Sanders, USA', 'Houck, USA',
  'St. Johns, USA', 'Springerville, USA', 'Eagar, USA', 'Nutrioso, USA', 'Alpine, USA',
  'Greer, USA', 'McNary, USA', 'Fort Apache, USA', 'Whiteriver, USA', 'Cibecue, USA',
  'Carrizo, USA', 'Hon-Dah, USA', 'Pinetop, USA', 'Lakeside, USA', 'Vernon, USA',
  'Concho, USA', 'Eager, USA', 'Springerville, USA', 'St. Johns, USA', 'Nutrioso, USA',
  'Alpine, USA', 'Greer, USA', 'McNary, USA', 'Fort Apache, USA', 'Whiteriver, USA',
  'Cibecue, USA', 'Carrizo, USA', 'Hon-Dah, USA',

  // 🇨🇦 Canada
  'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada', 'Calgary, Canada',
  'Edmonton, Canada', 'Ottawa, Canada', 'Winnipeg, Canada', 'Quebec City, Canada',
  'Hamilton, Canada', 'Kitchener, Canada', 'London, Canada', 'Victoria, Canada',
  'Halifax, Canada', 'Oshawa, Canada', 'Windsor, Canada', 'Saskatoon, Canada',
  'Regina, Canada', 'St. John\'s, Canada', 'Barrie, Canada', 'Kelowna, Canada',
  'Abbotsford, Canada', 'Kingston, Canada', 'Sudbury, Canada', 'Sherbrooke, Canada',
  'Saguenay, Canada', 'Lévis, Canada', 'Trois-Rivières, Canada', 'Terrebonne, Canada',
  'Saint-Jean-sur-Richelieu, Canada', 'Repentigny, Canada', 'Brossard, Canada',
  'Drummondville, Canada', 'Saint-Jérôme, Canada', 'Granby, Canada', 'Blainville, Canada',
  'Saint-Hyacinthe, Canada', 'Shawinigan, Canada', 'Dollard-des-Ormeaux, Canada',
  'Brandon, Canada', 'Red Deer, Canada', 'Lethbridge, Canada', 'Kamloops, Canada',
  'Nanaimo, Canada', 'Prince George, Canada', 'Chilliwack, Canada', 'Vernon, Canada',
  'Penticton, Canada', 'Campbell River, Canada', 'Courtenay, Canada', 'Cranbrook, Canada',
  'Fort St. John, Canada', 'Dawson Creek, Canada', 'Terrace, Canada', 'Prince Rupert, Canada',
  'Whitehorse, Canada', 'Yellowknife, Canada', 'Iqaluit, Canada',

  // 🇪🇺 Europe
  'London, UK', 'Paris, France', 'Rome, Italy', 'Barcelona, Spain', 'Madrid, Spain',
  'Amsterdam, Netherlands', 'Frankfurt, Germany', 'Zurich, Switzerland', 'Istanbul, Turkey',
  'Lisbon, Portugal', 'Dublin, Ireland', 'Edinburgh, UK', 'Manchester, UK',
  'Munich, Germany', 'Berlin, Germany', 'Vienna, Austria', 'Prague, Czech Republic',
  'Warsaw, Poland', 'Brussels, Belgium', 'Copenhagen, Denmark', 'Stockholm, Sweden',
  'Oslo, Norway', 'Helsinki, Finland', 'Athens, Greece', 'Budapest, Hungary',
  'Bucharest, Romania', 'Sofia, Bulgaria', 'Zagreb, Croatia', 'Ljubljana, Slovenia',
  'Bratislava, Slovakia', 'Tallinn, Estonia', 'Riga, Latvia', 'Vilnius, Lithuania',
  'Reykjavik, Iceland', 'Luxembourg, Luxembourg', 'Valletta, Malta', 'Nicosia, Cyprus',
  'Monaco, Monaco', 'San Marino, San Marino', 'Vatican City, Vatican City',
  'Andorra la Vella, Andorra', 'Liechtenstein, Liechtenstein', 'Gibraltar, Gibraltar',
  'Belfast, UK', 'Cardiff, UK', 'Glasgow, UK', 'Liverpool, UK', 'Newcastle, UK',
  'Leeds, UK', 'Sheffield, UK', 'Nottingham, UK', 'Leicester, UK', 'Coventry, UK',
  'Bradford, UK', 'Stoke-on-Trent, UK', 'Wolverhampton, UK', 'Plymouth, UK',
  'Southampton, UK', 'Reading, UK', 'Derby, UK', 'Portsmouth, UK', 'York, UK',
  'Peterborough, UK', 'Cambridge, UK', 'Oxford, UK', 'Brighton, UK', 'Bournemouth, UK',
  'Swindon, UK', 'Northampton, UK', 'Norwich, UK', 'Luton, UK', 'Milton Keynes, UK',
  'Slough, UK', 'Gloucester, UK', 'Exeter, UK', 'Bath, UK', 'Chester, UK',
  'Canterbury, UK', 'Salisbury, UK', 'Winchester, UK', 'Chichester, UK', 'Wells, UK',
  'Truro, UK', 'St. Davids, UK', 'Bangor, UK', 'Armagh, UK', 'Londonderry, UK',
  'Lyon, France', 'Marseille, France', 'Toulouse, France', 'Nice, France', 'Nantes, France',
  'Strasbourg, France', 'Montpellier, France', 'Bordeaux, France', 'Lille, France',
  'Rennes, France', 'Reims, France', 'Le Havre, France', 'Saint-Étienne, France',
  'Toulon, France', 'Grenoble, France', 'Dijon, France', 'Angers, France', 'Nîmes, France',
  'Villeurbanne, France', 'Le Mans, France', 'Aix-en-Provence, France', 'Clermont-Ferrand, France',
  'Brest, France', 'Tours, France', 'Amiens, France', 'Limoges, France', 'Annecy, France',
  'Perpignan, France', 'Boulogne-Billancourt, France', 'Metz, France', 'Besançon, France',
  'Orléans, France', 'Mulhouse, France', 'Rouen, France', 'Caen, France', 'Nancy, France',
  'Argenteuil, France', 'Montreuil, France', 'Saint-Denis, France', 'Roubaix, France',
  'Tourcoing, France', 'Nanterre, France', 'Avignon, France', 'Créteil, France',
  'Dunkerque, France', 'Poitiers, France', 'Asnières-sur-Seine, France', 'Courbevoie, France',
  'Versailles, France', 'Colombes, France', 'Fort-de-France, France', 'Aulnay-sous-Bois, France',
  'Saint-Pierre, France', 'Rueil-Malmaison, France', 'Pau, France', 'Aubervilliers, France',
  'Le Tampon, France', 'Champigny-sur-Marne, France', 'Antibes, France', 'La Rochelle, France',
  'Cannes, France', 'Calais, France', 'Saint-Maur-des-Fossés, France', 'Bourges, France',
  'Dunkerque, France', 'Drancy, France', 'Ajaccio, France', 'Colmar, France', 'Mérignac, France',
  'Saint-Nazaire, France', 'Valence, France', 'Issy-les-Moulineaux, France', 'Levallois-Perret, France',
  'Quimper, France', 'La Seyne-sur-Mer, France', 'Antony, France', 'Troyes, France',
  'Neuilly-sur-Seine, France', 'Sarcelles, France', 'Les Abymes, France', 'Vénissieux, France',
  'Clichy, France', 'Lorient, France', 'Pessac, France', 'Ivry-sur-Seine, France',
  'Cergy, France', 'Cayenne, France', 'Niort, France', 'Chambéry, France', 'Montauban, France',
  'Saint-Quentin, France', 'Villejuif, France', 'Hyères, France', 'Beauvais, France',
  'Cholet, France', 'Vannes, France', 'La Roche-sur-Yon, France', 'Évry, France',
  'Arles, France', 'Narbonne, France', 'Grasse, France', 'Châlons-en-Champagne, France',
  'Le Lamentin, France', 'Noisy-le-Grand, France', 'Évreux, France', 'Antony, France',
  'Vincennes, France', 'Cagnes-sur-Mer, France', 'Saint-Ouen, France', 'Sartrouville, France',
  'Massy, France', 'Istres, France', 'Meaux, France', 'Chelles, France', 'Sevran, France',
  'Livry-Gargan, France', 'Clamart, France', 'Fréjus, France', 'Grasse, France',
  'Chartres, France', 'Épinay-sur-Seine, France', 'Meudon, France', 'Puteaux, France',
  'Gennevilliers, France', 'Viry-Châtillon, France', 'Saint-Priest, France', 'Corbeil-Essonnes, France',
  'Bayonne, France', 'Caluire-et-Cuire, France', 'Belfort, France', 'Tarbes, France',
  'Castres, France', 'Albi, France', 'Montluçon, France', 'Vichy, France', 'Roanne, France',
  'Saint-Chamond, France', 'Villefranche-sur-Saône, France', 'Mâcon, France', 'Chalon-sur-Saône, France',
  'Auxerre, France', 'Sens, France', 'Nevers, France', 'Moulins, France', 'Montbrison, France',
  'Roanne, France', 'Vichy, France', 'Clermont-Ferrand, France', 'Le Puy-en-Velay, France',
  'Aurillac, France', 'Rodez, France', 'Albi, France', 'Castres, France', 'Montauban, France',
  'Cahors, France', 'Périgueux, France', 'Bergerac, France', 'Agen, France', 'Marmande, France',
  'Villeneuve-sur-Lot, France', 'Figeac, France', 'Decazeville, France', 'Aubin, France',
  'Cransac, France', 'Saint-Affrique, France', 'Millau, France', 'Espalion, France',
  'Saint-Geniez-d\'Olt, France', 'Sévérac-le-Château, France', 'Laissac, France', 'Recoules-Prévinquières, France',
  'Saint-Laurent-d\'Olt, France', 'Peyreleau, France', 'Mostuéjouls, France', 'Le Rozier, France',
  'Meyrueis, France', 'Florac, France', 'Barre-des-Cévennes, France', 'Saint-Jean-du-Gard, France',
  'Anduze, France', 'Alès, France', 'Bagnols-sur-Cèze, France', 'Pont-Saint-Esprit, France',
  'Orange, France', 'Carpentras, France', 'Apt, France', 'Cavaillon, France', 'L\'Isle-sur-la-Sorgue, France',
  'Avignon, France', 'Arles, France', 'Salon-de-Provence, France', 'Aix-en-Provence, France',
  'Marseille, France', 'Toulon, France', 'Hyères, France', 'Saint-Tropez, France', 'Fréjus, France',
  'Cannes, France', 'Antibes, France', 'Nice, France', 'Menton, France', 'Monaco, Monaco',
  'Ventimiglia, Italy', 'Sanremo, Italy', 'Imperia, Italy', 'Savona, Italy', 'Genoa, Italy',
  'La Spezia, Italy', 'Pisa, Italy', 'Livorno, Italy', 'Florence, Italy', 'Siena, Italy',
  'Arezzo, Italy', 'Perugia, Italy', 'Terni, Italy', 'Viterbo, Italy', 'Rome, Italy',
  'Latina, Italy', 'Frosinone, Italy', 'Cassino, Italy', 'Isernia, Italy', 'Campobasso, Italy',
  'Benevento, Italy', 'Avellino, Italy', 'Salerno, Italy', 'Naples, Italy', 'Caserta, Italy',
  'Santa Maria Capua Vetere, Italy', 'Aversa, Italy', 'Giugliano in Campania, Italy',
  'Pozzuoli, Italy', 'Bacoli, Italy', 'Monte di Procida, Italy', 'Procida, Italy',
  'Ischia, Italy', 'Capri, Italy', 'Sorrento, Italy', 'Amalfi, Italy', 'Positano, Italy',
  'Ravello, Italy', 'Minori, Italy', 'Maiori, Italy', 'Cetara, Italy', 'Vietri sul Mare, Italy',
  'Cava de\' Tirreni, Italy', 'Nocera Inferiore, Italy', 'Nocera Superiore, Italy',
  'Pagani, Italy', 'Scafati, Italy', 'Angri, Italy', 'Sarno, Italy', 'Striano, Italy',
  'Poggiomarino, Italy', 'San Giuseppe Vesuviano, Italy', 'Ottaviano, Italy', 'San Sebastiano al Vesuvio, Italy',
  'Massa di Somma, Italy', 'Pollena Trocchia, Italy', 'Cercola, Italy', 'San Giorgio a Cremano, Italy',
  'Portici, Italy', 'Ercolano, Italy', 'Torre del Greco, Italy', 'Torre Annunziata, Italy',
  'Boscoreale, Italy', 'Boscotrecase, Italy', 'Trecase, Italy', 'Castellammare di Stabia, Italy',
  'Vico Equense, Italy', 'Meta, Italy', 'Piano di Sorrento, Italy', 'Sant\'Agnello, Italy',
  'Massa Lubrense, Italy', 'Capri, Italy', 'Anacapri, Italy',

  // 🇦🇸 Asia
  'Tokyo, Japan', 'Osaka, Japan', 'Kyoto, Japan', 'Singapore', 'Bangkok, Thailand',
  'Hong Kong', 'Seoul, South Korea', 'Shanghai, China', 'Beijing, China', 'Kuala Lumpur, Malaysia',
  'Jakarta, Indonesia', 'Manila, Philippines', 'Hanoi, Vietnam', 'Ho Chi Minh, Vietnam',
  'Mumbai, India', 'Delhi, India', 'Bangalore, India', 'Colombo, Sri Lanka', 'Kathmandu, Nepal',
  'Male, Maldives', 'Phuket, Thailand', 'Bali, Indonesia', 'Chiang Mai, Thailand',
  'Siem Reap, Cambodia', 'Luang Prabang, Laos', 'Yangon, Myanmar', 'Dhaka, Bangladesh',
  'Islamabad, Pakistan', 'Karachi, Pakistan', 'Lahore, Pakistan', 'Kabul, Afghanistan',
  'Tashkent, Uzbekistan', 'Almaty, Kazakhstan', 'Bishkek, Kyrgyzstan', 'Dushanbe, Tajikistan',
  'Ashgabat, Turkmenistan', 'Yerevan, Armenia', 'Tbilisi, Georgia', 'Baku, Azerbaijan',
  'Tehran, Iran', 'Baghdad, Iraq', 'Amman, Jordan', 'Beirut, Lebanon', 'Damascus, Syria',
  'Kuwait City, Kuwait', 'Manama, Bahrain', 'Doha, Qatar', 'Abu Dhabi, UAE', 'Dubai, UAE',
  'Muscat, Oman', 'Sana\'a, Yemen', 'Riyadh, Saudi Arabia', 'Jeddah, Saudi Arabia',
  'Mecca, Saudi Arabia', 'Medina, Saudi Arabia', 'Dammam, Saudi Arabia', 'Tabuk, Saudi Arabia',
  'Taif, Saudi Arabia', 'Khamis Mushait, Saudi Arabia', 'Hail, Saudi Arabia', 'Najran, Saudi Arabia',
  'Jizan, Saudi Arabia', 'Al Bahah, Saudi Arabia', 'Al Jawf, Saudi Arabia', 'Northern Borders, Saudi Arabia',
  'Al Qassim, Saudi Arabia', 'Ha\'il, Saudi Arabia', 'Al Madinah, Saudi Arabia', 'Makkah, Saudi Arabia',
  'Eastern Province, Saudi Arabia', 'Asir, Saudi Arabia', 'Jazan, Saudi Arabia', 'Najran, Saudi Arabia',
  'Al Bahah, Saudi Arabia', 'Al Jawf, Saudi Arabia', 'Northern Borders, Saudi Arabia',

  // 🌎 Americas (Non-USA/Canada)
  'Mexico City, Mexico', 'Cancun, Mexico', 'Guadalajara, Mexico', 'Monterrey, Mexico',
  'Puerto Vallarta, Mexico', 'Cabo San Lucas, Mexico', 'Tijuana, Mexico', 'Playa del Carmen, Mexico',
  'Merida, Mexico', 'Oaxaca, Mexico', 'Puebla, Mexico', 'San Miguel de Allende, Mexico',
  'Guanajuato, Mexico', 'Morelia, Mexico', 'Acapulco, Mexico', 'Mazatlan, Mexico',
  'Los Cabos, Mexico', 'La Paz, Mexico', 'Ensenada, Mexico', 'Rosarito, Mexico',
  'San Jose del Cabo, Mexico', 'Todos Santos, Mexico', 'Loreto, Mexico', 'Mulege, Mexico',
  'Guerrero Negro, Mexico', 'Santa Rosalia, Mexico', 'San Ignacio, Mexico', 'Ciudad Constitucion, Mexico',
  'La Ventana, Mexico', 'Los Barriles, Mexico', 'Buena Vista, Mexico', 'Miraflores, Mexico',
  'Santiago, Mexico', 'San Jose del Cabo, Mexico', 'Cabo San Lucas, Mexico', 'San Jose del Cabo, Mexico',
  'Cabo San Lucas, Mexico', 'San Jose del Cabo, Mexico', 'Cabo San Lucas, Mexico',
  'Buenos Aires, Argentina', 'Rio de Janeiro, Brazil', 'Sao Paulo, Brazil', 'Santiago, Chile',
  'Lima, Peru', 'Cusco, Peru', 'Bogota, Colombia', 'Cartagena, Colombia', 'Quito, Ecuador',
  'La Paz, Bolivia', 'Asuncion, Paraguay', 'Montevideo, Uruguay', 'Caracas, Venezuela',
  'Panama City, Panama', 'San Jose, Costa Rica', 'Guatemala City, Guatemala', 'San Salvador, El Salvador',
  'Managua, Nicaragua', 'San Pedro Sula, Honduras', 'Santo Domingo, Dominican Republic',
  'Punta Cana, Dominican Republic', 'Havana, Cuba', 'Kingston, Jamaica', 'Nassau, Bahamas',
  'Port of Spain, Trinidad and Tobago', 'Bridgetown, Barbados', 'Castries, Saint Lucia',
  'St. George\'s, Grenada', 'Kingstown, Saint Vincent and the Grenadines', 'Road Town, British Virgin Islands',
  'Charlotte Amalie, US Virgin Islands', 'San Juan, Puerto Rico', 'Ponce, Puerto Rico',
  'Mayaguez, Puerto Rico', 'Arecibo, Puerto Rico', 'Caguas, Puerto Rico', 'Bayamon, Puerto Rico',
  'Carolina, Puerto Rico', 'Guaynabo, Puerto Rico', 'Toa Baja, Puerto Rico', 'Dorado, Puerto Rico',
  'Vega Baja, Puerto Rico', 'Manati, Puerto Rico', 'Barceloneta, Puerto Rico', 'Florida, Puerto Rico',
  'Ciales, Puerto Rico', 'Morovis, Puerto Rico', 'Corozal, Puerto Rico', 'Naranjito, Puerto Rico',
  'Toa Alta, Puerto Rico', 'Canovanas, Puerto Rico', 'Loiza, Puerto Rico', 'Rio Grande, Puerto Rico',
  'Luquillo, Puerto Rico', 'Fajardo, Puerto Rico', 'Ceiba, Puerto Rico', 'Naguabo, Puerto Rico',
  'Humacao, Puerto Rico', 'Yabucoa, Puerto Rico', 'Maunabo, Puerto Rico', 'Patillas, Puerto Rico',
  'Arroyo, Puerto Rico', 'Guayama, Puerto Rico', 'Salinas, Puerto Rico', 'Santa Isabel, Puerto Rico',
  'Juana Diaz, Puerto Rico', 'Penuelas, Puerto Rico', 'Adjuntas, Puerto Rico', 'Utuado, Puerto Rico',
  'Lares, Puerto Rico', 'Maricao, Puerto Rico', 'San German, Puerto Rico', 'Sabana Grande, Puerto Rico',
  'Yauco, Puerto Rico', 'Guanica, Puerto Rico', 'Lajas, Puerto Rico', 'Cabo Rojo, Puerto Rico',
  'Hormigueros, Puerto Rico', 'Mayaguez, Puerto Rico', 'Anasco, Puerto Rico', 'Rincon, Puerto Rico',
  'Aguada, Puerto Rico', 'Aguadilla, Puerto Rico', 'Moca, Puerto Rico', 'Isabela, Puerto Rico',
  'Quebradillas, Puerto Rico', 'Camuy, Puerto Rico', 'Hatillo, Puerto Rico', 'Arecibo, Puerto Rico',
  'Utuado, Puerto Rico', 'Jayuya, Puerto Rico', 'Adjuntas, Puerto Rico', 'Ponce, Puerto Rico',
  'Villalba, Puerto Rico', 'Orocovis, Puerto Rico', 'Barranquitas, Puerto Rico', 'Comerio, Puerto Rico',
  'Naranjito, Puerto Rico', 'Toa Alta, Puerto Rico', 'Bayamon, Puerto Rico', 'Guaynabo, Puerto Rico',
  'San Juan, Puerto Rico', 'Carolina, Puerto Rico', 'Canovanas, Puerto Rico', 'Loiza, Puerto Rico',
  'Rio Grande, Puerto Rico', 'Luquillo, Puerto Rico', 'Fajardo, Puerto Rico', 'Ceiba, Puerto Rico',
  'Naguabo, Puerto Rico', 'Humacao, Puerto Rico', 'Yabucoa, Puerto Rico', 'Maunabo, Puerto Rico',
  'Patillas, Puerto Rico', 'Arroyo, Puerto Rico', 'Guayama, Puerto Rico', 'Salinas, Puerto Rico',
  'Santa Isabel, Puerto Rico', 'Juana Diaz, Puerto Rico', 'Penuelas, Puerto Rico', 'Yauco, Puerto Rico',
  'Guanica, Puerto Rico', 'Lajas, Puerto Rico', 'Cabo Rojo, Puerto Rico', 'Hormigueros, Puerto Rico',
  'Mayaguez, Puerto Rico', 'Anasco, Puerto Rico', 'Rincon, Puerto Rico', 'Aguada, Puerto Rico',
  'Aguadilla, Puerto Rico', 'Moca, Puerto Rico', 'Isabela, Puerto Rico', 'Quebradillas, Puerto Rico',
  'Camuy, Puerto Rico', 'Hatillo, Puerto Rico', 'Arecibo, Puerto Rico',

  // 🌍 Africa & Middle East
  'Cairo, Egypt', 'Marrakech, Morocco', 'Casablanca, Morocco', 'Tunis, Tunisia',
  'Johannesburg, South Africa', 'Cape Town, South Africa', 'Nairobi, Kenya', 'Mombasa, Kenya',
  'Addis Ababa, Ethiopia', 'Lagos, Nigeria', 'Accra, Ghana', 'Dakar, Senegal',
  'Dar es Salaam, Tanzania', 'Zanzibar, Tanzania', 'Kigali, Rwanda', 'Kampala, Uganda',
  'Lusaka, Zambia', 'Harare, Zimbabwe', 'Gaborone, Botswana', 'Windhoek, Namibia',
  'Maputo, Mozambique', 'Antananarivo, Madagascar', 'Port Louis, Mauritius', 'Victoria, Seychelles',
  'Dubai, UAE', 'Abu Dhabi, UAE', 'Doha, Qatar', 'Riyadh, Saudi Arabia', 'Jeddah, Saudi Arabia',
  'Tel Aviv, Israel', 'Jerusalem, Israel', 'Amman, Jordan', 'Beirut, Lebanon', 'Kuwait City, Kuwait',
  'Manama, Bahrain', 'Muscat, Oman', 'Doha, Qatar', 'Abu Dhabi, UAE', 'Dubai, UAE',
  'Riyadh, Saudi Arabia', 'Jeddah, Saudi Arabia', 'Mecca, Saudi Arabia', 'Medina, Saudi Arabia',
  'Dammam, Saudi Arabia', 'Tabuk, Saudi Arabia', 'Taif, Saudi Arabia', 'Khamis Mushait, Saudi Arabia',
  'Hail, Saudi Arabia', 'Najran, Saudi Arabia', 'Jizan, Saudi Arabia', 'Al Bahah, Saudi Arabia',
  'Al Jawf, Saudi Arabia', 'Northern Borders, Saudi Arabia', 'Al Qassim, Saudi Arabia',
  'Ha\'il, Saudi Arabia', 'Al Madinah, Saudi Arabia', 'Makkah, Saudi Arabia', 'Eastern Province, Saudi Arabia',
  'Asir, Saudi Arabia', 'Jazan, Saudi Arabia', 'Najran, Saudi Arabia', 'Al Bahah, Saudi Arabia',
  'Al Jawf, Saudi Arabia', 'Northern Borders, Saudi Arabia',

  // 🌏 Oceania
  'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia', 'Perth, Australia',
  'Adelaide, Australia', 'Gold Coast, Australia', 'Cairns, Australia', 'Auckland, New Zealand',
  'Wellington, New Zealand', 'Christchurch, New Zealand', 'Queenstown, New Zealand',
  'Fiji', 'Nadi, Fiji', 'Bora Bora, French Polynesia', 'Tahiti, French Polynesia',
  'Papeete, French Polynesia', 'Moorea, French Polynesia', 'Rarotonga, Cook Islands',
  'Aitutaki, Cook Islands', 'Nuku\'alofa, Tonga', 'Apia, Samoa', 'Port Vila, Vanuatu',
  'Honiara, Solomon Islands', 'Port Moresby, Papua New Guinea', 'Lautoka, Fiji',
  'Suva, Fiji', 'Nadi, Fiji', 'Denarau, Fiji', 'Coral Coast, Fiji', 'Pacific Harbour, Fiji',
  'Beqa, Fiji', 'Kadavu, Fiji', 'Taveuni, Fiji', 'Vanua Levu, Fiji', 'Savusavu, Fiji',
  'Labasa, Fiji', 'Yasawa Islands, Fiji', 'Mamanuca Islands, Fiji', 'Castaway Island, Fiji',
  'Tokoriki, Fiji', 'Monuriki, Fiji', 'Mana Island, Fiji', 'Treasure Island, Fiji',
  'Beachcomber, Fiji', 'South Sea Island, Fiji', 'Plantation Island, Fiji', 'Likuliku Lagoon Resort, Fiji',
  'Matamanoa Island, Fiji', 'Tokoriki Island, Fiji', 'Monuriki Island, Fiji', 'Mana Island, Fiji',
  'Treasure Island, Fiji', 'Beachcomber, Fiji', 'South Sea Island, Fiji', 'Plantation Island, Fiji',
  'Likuliku Lagoon Resort, Fiji', 'Matamanoa Island, Fiji',

  // 🏝️ Popular Island Destinations
  'Maldives', 'Bali, Indonesia', 'Phuket, Thailand', 'Koh Samui, Thailand', 'Krabi, Thailand',
  'Langkawi, Malaysia', 'Penang, Malaysia', 'Boracay, Philippines', 'Palawan, Philippines',
  'Cebu, Philippines', 'Siargao, Philippines', 'Coron, Philippines', 'El Nido, Philippines',
  'Bohol, Philippines', 'Siquijor, Philippines', 'Camiguin, Philippines', 'Romblon, Philippines',
  'Marinduque, Philippines', 'Mindoro, Philippines', 'Luzon, Philippines', 'Visayas, Philippines',
  'Mindanao, Philippines', 'Bantayan Island, Philippines', 'Malapascua, Philippines',
  'Apo Island, Philippines', 'Dumaguete, Philippines', 'Negros, Philippines', 'Panay, Philippines',
  'Guimaras, Philippines', 'Masbate, Philippines', 'Samar, Philippines', 'Leyte, Philippines',
  'Biliran, Philippines', 'Calicoan Island, Philippines', 'Homonhon Island, Philippines',
  'Dinagat Islands, Philippines', 'Surigao, Philippines', 'Siargao, Philippines',
  'Bucas Grande, Philippines', 'Socorro, Philippines', 'General Luna, Philippines',
  'Del Carmen, Philippines', 'Santa Monica, Philippines', 'San Benito, Philippines',
  'Pilar, Philippines', 'San Isidro, Philippines', 'Dapa, Philippines', 'Claver, Philippines',
  'Placer, Philippines', 'Sison, Philippines', 'Tagana-an, Philippines', 'Tubod, Philippines',
  'Mainit, Philippines', 'Sison, Philippines', 'Malimono, Philippines', 'San Francisco, Philippines',
  'Anao-aon, Philippines', 'San Jose, Philippines', 'Loreto, Philippines', 'Burgos, Philippines',
  'San Isidro, Philippines', 'Pilar, Philippines', 'Del Carmen, Philippines', 'Santa Monica, Philippines',
  'San Benito, Philippines', 'General Luna, Philippines', 'Dapa, Philippines', 'Claver, Philippines',
  'Placer, Philippines', 'Sison, Philippines', 'Tagana-an, Philippines', 'Tubod, Philippines',
  'Mainit, Philippines', 'Sison, Philippines', 'Malimono, Philippines', 'San Francisco, Philippines',
  'Anao-aon, Philippines', 'San Jose, Philippines', 'Loreto, Philippines', 'Burgos, Philippines'
];

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
        setDurationError('End date must be after start date');
      }
    } else {
      setDuration(0);
    }
  }, [startDate, endDate, updateTripData]);

  // Validar cuando cambian los valores
  useEffect(() => {
    if (origin && destination && startDate && endDate && duration > 0 && !durationError) {
      onValid(true);
    } else {
      onValid(false);
    }
  }, [origin, destination, startDate, endDate, duration, durationError, onValid]);

  // ✅ Manejar autocompletado de origen
  const handleOriginChange = async (e) => {
    const value = e.target.value;
    setValue('origin', value);
    
    if (value.length >= 2) {
      setIsSearchingOrigin(true);
      // Filrar locations que coincidan
      const suggestions = VALID_LOCATIONS.filter(loc => 
        loc.toLowerCase().includes(value.toLowerCase())
      );
      
      setOriginSuggestions(suggestions);
      setShowOriginSuggestions(true);
      setIsSearchingOrigin(false);
    } else {
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
    }
  };

  // ✅ Manejar autocompletado de destino
  const handleDestinationChange = async (e) => {
    const value = e.target.value;
    setValue('destination', value);
    
    if (value.length >= 2) {
      setIsSearchingDestination(true);
      // Filtrar locations que coincidan
      const suggestions = VALID_LOCATIONS.filter(loc => 
        loc.toLowerCase().includes(value.toLowerCase())
      );
      
      setDestinationSuggestions(suggestions);
      setShowDestinationSuggestions(true);
      setIsSearchingDestination(false);
    } else {
      setDestinationSuggestions([]);
      setShowDestinationSuggestions(false);
    }
  };

  // Seleccionar sugerencia de origen
  const selectOrigin = (suggestion) => {
    setValue('origin', suggestion);
    setOriginSuggestions([]);
    setShowOriginSuggestions(false);
    trigger('origin');
  };

  // Seleccionar sugerencia de destino
  const selectDestination = (suggestion) => {
    setValue('destination', suggestion);
    setDestinationSuggestions([]);
    setShowDestinationSuggestions(false);
    trigger('destination');
  };

  // ✅ RF-01.03 - Validar fechas
  const validateDates = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (start < now) {
      return 'Dates cannot be in the past';
    }

    if (end <= start) {
      return 'End date must be after start date';
    }

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
  const onSubmit = async (data) => {
    const error = validateDates();
	
	console.log('=== DEBUG SUBMIT ===');
    console.log('Origin:', data.origin);
    console.log('Destination:', data.destination);
    console.log('Start Date:', data.startDate);
    console.log('End Date:', data.endDate);
    console.log('Duration:', duration);
    console.log('Duration Error:', durationError);
    console.log('Form Errors:', errors);
    console.log('===================');
    
    if (error) {
	  console.log('❌ VALIDATION ERROR:', error);
      setDurationError(error);
      return;
    }
	
    if (!data.origin) {
      console.log('❌ ERROR: Origin is required');
    }
    if (!data.destination) {
      console.log('❌ ERROR: Destination is required');
    }
    if (!data.startDate) {
      console.log('❌ ERROR: Start date is required');
    }
    if (!data.endDate) {
      console.log('❌ ERROR: End date is required');
    }
    if (duration <= 0) {
      console.log('❌ ERROR: Duration must be greater than 0');
    }

    setIsLoading(true);

    try {
      const token = sessionStorage.getItem('token');
      
      // ✅ Enviar origen y destino al backend
      const response = await authService.saveTripStep1(token, {
        origin: data.origin,
        destination: data.destination,
        startDate: data.startDate,
        endDate: data.endDate
      });

      updateTripData('step1', {
        ...response.data,
        sessionId: response.data.sessionId
      });

      onNext();
      
    } catch (err) {
	  console.error('❌ ERROR from backend:', err);
      if (err.error === 'DESTINATION_NOT_FOUND' || err.error === 'ORIGIN_NOT_FOUND') {
        setDurationError(err.message);
      } else if (err.error === 'INVALID_DATE') {
        setDurationError(err.message);
      } else {
        setError(err.message || 'Error saving trip');
      }
    } finally {
      setIsLoading(false);
    }
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
        <h3 className="text-xl font-semibold text-quester-dark">Origin, Destination & Dates</h3>
      </div>

      {/* ✅ ORIGEN - Nuevo campo */}
      <div>
        <label htmlFor="origin" className="block text-sm font-medium text-quester-dark mb-2">
          Where from?
        </label>
        <div className="relative">
          <input
            id="origin"
            type="text"
            {...register('origin')}
            onChange={handleOriginChange}
            onBlur={() => {
              trigger('origin');
              setTimeout(() => setShowOriginSuggestions(false), 200);
            }}
            onFocus={() => originSuggestions.length > 0 && setShowOriginSuggestions(true)}
            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
              errors.origin 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-200'
            }`}
            style={{ backgroundColor: errors.origin ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
            placeholder="City or Country"
            autoComplete="off"
          />
          
          {isSearchingOrigin && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-quester-blue"></div>
            </div>
          )}

          {/* Sugerencias de origen */}
          {showOriginSuggestions && originSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {originSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectOrigin(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {errors.origin && (
          <p className="mt-1 text-xs text-red-600">{errors.origin.message}</p>
        )}
      </div>

      {/* ✅ DESTINO */}
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
              setTimeout(() => setShowDestinationSuggestions(false), 200);
            }}
            onFocus={() => destinationSuggestions.length > 0 && setShowDestinationSuggestions(true)}
            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
              errors.destination 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-200'
            }`}
            style={{ backgroundColor: errors.destination ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
            placeholder="City or Country"
            autoComplete="off"
          />
          
          {isSearchingDestination && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-quester-blue"></div>
            </div>
          )}

          {/* Sugerencias de destino */}
          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {destinationSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectDestination(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {errors.destination && (
          <p className="mt-1 text-xs text-red-600">{errors.destination.message}</p>
        )}
        
        {/* Mensaje si no se encuentra el destino */}
			{/*
        {destination && destinationSuggestions.length === 0 && !isSearchingDestination && destination.length >= 2 && (
          <p className="mt-1 text-xs text-orange-600">
            Destination not found, please verify the name
          </p>
        )}
			*/}
      </div>

      {/* ✅ FECHAS */}
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

      {/* ✅ Mensajes de error de fechas */}
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

      {/* ✅ Duración del viaje */}
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
          disabled={!origin || !destination || !startDate || !endDate || duration <= 0 || !!durationError}
		  onClick={() => {
    // ✅ DEBUG: Mostrar por qué el botón está deshabilitado
		  console.log('=== BUTTON STATE ===');
		  console.log('Origin valid:', !!origin);
		  console.log('Destination valid:', !!destination);
  		  console.log('Start Date valid:', !!startDate);
		  console.log('End Date valid:', !!endDate);
		  console.log('Duration valid:', duration > 0);
		  console.log('Duration Error:', durationError);
		  console.log('Button disabled:', !origin || !destination || !startDate || !endDate || duration <= 0 || !!durationError);
		  console.log('===================');
	  }}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-base transition-all ${
            !origin || !destination || !startDate || !endDate || duration <= 0 || !!durationError
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-quester-blue hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
          }`}
        >
          Nex
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </form>
  );
}

export default Step1Destination;