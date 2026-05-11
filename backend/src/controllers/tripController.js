// backend/src/controllers/tripController.js

const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand} = require('@aws-sdk/lib-dynamodb');

// Configurar cliente de DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const docClient = DynamoDBDocumentClient.from(client);

// ===========================================
// BASE DE DATOS DE UBICACIONES (Mock para Tarea 56)
// ✅ RF-01.01.02 - Validar que destino/origen exista
// ===========================================
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
// ===========================================
// TAREA 55: GUARDAR PASO 1 - ORIGEN, DESTINO Y FECHAS
// RF-01: DESTINO Y FECHAS
// ===========================================
exports.saveStep1 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { origin, destination, startDate, endDate } = req.body;

    // ===========================================
    // RF-01.01.01 - Validar campos no vacíos
    // ===========================================
    if (!origin || !destination || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'All fields are required',
        fields: {
          origin: !origin,
          destination: !destination,
          startDate: !startDate,
          endDate: !endDate
        }
      });
    }

    // ===========================================
    // RF-01.01.02 - Validar que ORIGEN exista en BD
    // RF-01.01.03 - Mensaje específico si no existe
    // ===========================================
    const normalizedOrigin = origin.trim();
    const isValidOrigin = VALID_LOCATIONS.some(
      loc => loc.toLowerCase() === normalizedOrigin.toLowerCase()
    );

    if (!isValidOrigin) {
      return res.status(400).json({
        success: false,
        error: 'ORIGIN_NOT_FOUND',
        message: 'Origin not found, please verify the name'
      });
    }

    // ===========================================
    // RF-01.01.02 - Validar que DESTINO exista en BD
    // RF-01.01.03 - Mensaje específico si no existe
    // ===========================================
    const normalizedDestination = destination.trim();
    const isValidDestination = VALID_LOCATIONS.some(
      loc => loc.toLowerCase() === normalizedDestination.toLowerCase()
    );

    if (!isValidDestination) {
      return res.status(400).json({
        success: false,
        error: 'DESTINATION_NOT_FOUND',
        message: 'Destination not found, please verify the name'
      });
    }

    // ===========================================
    // RF-01.03 - Validar fechas
    // ===========================================
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // ✅ RF-01.03.02 - No fechas pasadas
    if (start < now) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATE',
        message: 'Dates cannot be in the past'
      });
    }

    // ✅ RF-01.03.01 - Fin después de inicio
    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATE',
        message: 'End date must be after start date'
      });
    }

    // ✅ RF-01.03.03 - Máximo 10 meses
    const maxEndDate = new Date(start);
    maxEndDate.setMonth(maxEndDate.getMonth() + 10);
    
    if (end > maxEndDate) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATE',
        message: 'Trip cannot exceed 10 months'
      });
    }

    // ===========================================
    // TAREA 57: Almacenamiento temporal en DynamoDB
    // Tabla: quester-trip-sessions
    // ===========================================
    const sessionId = `sess_${uuidv4()}`;
    const timestamp = Date.now();  // ✅ Number (SIN .toString())
    const ttl = Math.floor((timestamp + 24 * 60 * 60 * 1000) / 1000); // ✅ Tarea 58: TTL 24 horas

    const putSessionParams = {
      TableName: process.env.DYNAMODB_TABLE_SESSIONS,
      Item: {
        sessionId: sessionId,
        userId: userId,
        step: 1,
        origin: normalizedOrigin,  // ✅ Agregar origin
        destination: normalizedDestination,
        startDate: startDate,
        endDate: endDate,
        duration: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
        createdAt: timestamp,  // ✅ Number (SIN .toString())
        updatedAt: timestamp,  // ✅ Number (SIN .toString())
        ttl: ttl  // ✅ TTL para eliminación automática
      }
    };

    await docClient.send(new PutCommand(putSessionParams));

    // ===========================================
    // Registrar en audit_logs
    // ===========================================
    const logId = `log_${uuidv4()}`;
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_LOGS,
      Item: {
        logId: logId,
        timestamp: timestamp,  // ✅ Number (SIN .toString())
        email: req.user.email,
        ipAddress: req.ip || req.connection.remoteAddress,
        tipoEvento: 'trip_step1_save',
        resultado: 'success',
        userId: userId,
        razon: `Origin: ${normalizedOrigin}, Destination: ${normalizedDestination}`
      }
    }));

    // ===========================================
    // Response exitoso ✅ CORREGIDO
    // ===========================================
    res.status(200).json({
      success: true,
      message: 'Step 1 saved successfully',
      data: {  // ✅ IMPORTANTE: key "data:"
        sessionId: sessionId,
        origin: normalizedOrigin,
        destination: normalizedDestination,
        startDate: startDate,
        endDate: endDate,
        duration: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
        expiresAt: new Date(ttl * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Save step1 error:', error);

    // Registrar error en audit_logs
    try {
      const logId = `log_${uuidv4()}`;
      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_LOGS,
        Item: {
          logId: logId,
          timestamp: Date.now(),  // ✅ Number (SIN .toString())
          email: req.user?.email || 'unknown',
          ipAddress: req.ip || req.connection.remoteAddress,
          tipoEvento: 'trip_step1_save',
          resultado: 'failure',
          razon: error.message,
          userId: req.user?.userId || null
        }
      }));
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to save trip step 1'
    });
  }
};

// ===========================================
// TAREA 69: GUARDAR PASO 2 - VIAJEROS, INTERESES, PRESUPUESTO
// RF-03, RF-04
// ===========================================
exports.saveStep2 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId, travelers, budget, currency, budgetDistribution } = req.body;

    console.log('=== DEBUG saveStep2 ===');
    console.log('sessionId:', sessionId);
    console.log('userId:', userId);
    console.log('travelers:', travelers);
    console.log('budget:', budget);
    console.log('currency:', currency);
    console.log('budgetDistribution:', budgetDistribution);
    console.log('========================');

    // ===========================================
    // Validar campos requeridos
    // ===========================================
    if (!sessionId || !travelers || !budget || !currency) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'All fields are required',
        fields: {
          sessionId: !sessionId,
          travelers: !travelers,
          budget: !budget,
          currency: !currency
        }
      });
    }

    // ===========================================
    // Tarea 60-61: Validar viajeros (1-4)
    // ===========================================
    if (!Array.isArray(travelers) || travelers.length < 1 || travelers.length > 4) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TRAVELERS',
        message: 'Number of travelers must be between 1 and 4'
      });
    }

    // Validar nombres no vacíos
    for (let i = 0; i < travelers.length; i++) {
      const traveler = travelers[i];
      
      if (!traveler.name || traveler.name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'INVALID_TRAVELER_NAME',
          message: `Traveler ${i + 1} name is required`
        });
      }
      
      // ✅ RF-03.01.03 - Validar intereses por viajero (máx 4)
      if (traveler.interests && traveler.interests.length > 4) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_INTERESTS',
          message: `Maximum 4 interests allowed for traveler ${i + 1}`
        });
      }
    }

    // ===========================================
    // RF-04.02 - Validar presupuesto mínimo
    // ===========================================
    if (budget < 500) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_BUDGET',
        message: `Minimum budget is 500 ${currency}`
      });
    }

    // ===========================================
    // RF-04.01.02-04 - Validar moneda
    // ===========================================
    if (!['USD', 'MXN', 'EUR'].includes(currency)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CURRENCY',
        message: 'Currency must be USD, MXN, or EUR'
      });
    }

    // ===========================================
    // RF-04.03.04 - Validar suma de porcentajes = 100% (si se proporcionó)
    // ===========================================
    if (budgetDistribution) {
      const totalPercentage = Object.values(budgetDistribution).reduce((acc, val) => acc + (parseInt(val) || 0), 0);
      
      console.log('Total percentage:', totalPercentage);
      
      // Solo validar si es diferente de 0 y 100
      if (totalPercentage !== 0 && totalPercentage !== 100) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PERCENTAGE',
          message: `Budget distribution must total 100% (currently ${totalPercentage}%)`
        });
      }
    }

  // =========================================== 
  // Tarea 71: Actualizar sesión temporal en DynamoDB
  // ===========================================
  const timestamp = Date.now();  // ✅ Number (SIN .toString())
  const ttl = Math.floor((timestamp + 24 * 60 * 60 * 1000) / 1000); // TTL 24 horas

  const updateSessionParams = {
    TableName: process.env.DYNAMODB_TABLE_SESSIONS,
    Key: {
      sessionId: sessionId,
      userId: userId
    },
    UpdateExpression: 'SET step = :step, travelers = :travelers, budget = :budget, currency = :currency, budgetDistribution = :budgetDistribution, updatedAt = :updatedAt, #ttlAttr = :ttlVal',
    ExpressionAttributeValues: {
      ':step': 2,
      ':travelers': travelers,
      ':budget': budget,
      ':currency': currency,
      ':budgetDistribution': budgetDistribution || {},
      ':updatedAt': timestamp,  // ✅ Number (SIN .toString())
      ':ttlVal': ttl  // ✅ Nombre diferente para el valor
    },
    ExpressionAttributeNames: {
      '#ttlAttr': 'ttl'  // ✅ Escapar reserved keyword con nombre diferente
    } 
  };

console.log('📦 Updating DynamoDB session...');
console.log('UpdateExpression:', updateSessionParams.UpdateExpression);
console.log('ExpressionAttributeNames:', updateSessionParams.ExpressionAttributeNames);
await docClient.send(new UpdateCommand(updateSessionParams));
console.log('✅ Session updated successfully');

    console.log('📦 Updating DynamoDB session...');
    await docClient.send(new UpdateCommand(updateSessionParams));
    console.log('✅ Session updated successfully');

    // ===========================================
    // Registrar en audit_logs
    // ===========================================
    const logId = `log_${uuidv4()}`;
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_LOGS,
      Item: {
        logId: logId,
        timestamp: timestamp,  // ✅ Number (SIN .toString())
        email: req.user.email,
        ipAddress: req.ip || req.connection.remoteAddress,
        tipoEvento: 'trip_step2_save',
        resultado: 'success',
        userId: userId,
        razon: `Travelers: ${travelers.length}, Budget: ${currency} ${budget}`
      }
    }));

    // ===========================================
    // Response exitoso ✅ CON "data:"
    // ===========================================
    res.status(200).json({
      success: true,
      message: 'Step 2 saved successfully',
      data: {  // ✅ IMPORTANTE: key "data"
        sessionId: sessionId,
        step: 2,
        travelers: travelers,
        budget: budget,
        currency: currency,
        budgetDistribution: budgetDistribution || {},
        expiresAt: new Date(ttl * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Save step2 error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    // Registrar error en audit_logs
    try {
      const logId = `log_${uuidv4()}`;
      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_LOGS,
        Item: {
          logId: logId,
          timestamp: Date.now(),  // ✅ Number (SIN .toString())
          email: req.user?.email || 'unknown',
          ipAddress: req.ip || req.connection.remoteAddress,
          tipoEvento: 'trip_step2_save',
          resultado: 'failure',
          razon: error.message,
          userId: req.user?.userId || null
        }
      }));
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to save trip step 2'
    });
  }
};

// ===========================================
// TAREA 80: GUARDAR PASO 3 - PREFERENCIAS
// RF-03.02, RF-03.03, RF-03.04
// ===========================================
exports.saveStep3 = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId, preferences, hotelClass, flightClass, customPreferences } = req.body;

    console.log('=== DEBUG saveStep3 ===');
    console.log('sessionId:', sessionId);
    console.log('preferences:', preferences);
    console.log('hotelClass:', hotelClass);
    console.log('flightClass:', flightClass);
    console.log('customPreferences:', customPreferences);
    console.log('========================');

    // ===========================================
    // Validar campos requeridos (sessionId)
    // ===========================================
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Session ID is required'
      });
    }

    // ===========================================
    // Tarea 81: Actualizar sesión temporal en DynamoDB
    // ===========================================
    const timestamp = Date.now();  // ✅ Number (SIN .toString())
    const ttl = Math.floor((timestamp + 24 * 60 * 60 * 1000) / 1000);

    const updateSessionParams = {
      TableName: process.env.DYNAMODB_TABLE_SESSIONS,
      Key: {
        sessionId: sessionId,
        userId: userId
      },
      UpdateExpression: 'SET step = :step, preferences = :preferences, hotelClass = :hotelClass, flightClass = :flightClass, customPreferences = :customPreferences, updatedAt = :updatedAt, #ttlAttr = :ttlVal',
      ExpressionAttributeValues: {
        ':step': 3,
        ':preferences': preferences || {},
        ':hotelClass': hotelClass || 'no-preference',
        ':flightClass': flightClass || 'economy',
        ':customPreferences': customPreferences || '',
        ':updatedAt': timestamp,  // ✅ Number (SIN .toString())
        ':ttlVal': ttl
      },
      ExpressionAttributeNames: {
        '#ttlAttr': 'ttl'  // ✅ Escapar reserved keyword
      }
    };

    console.log('📦 Updating DynamoDB session...');
    await docClient.send(new UpdateCommand(updateSessionParams));
    console.log('✅ Session updated successfully');

    // ===========================================
    // Registrar en audit_logs
    // ===========================================
    const logId = `log_${uuidv4()}`;
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_LOGS,
      Item: {
        logId: logId,
        timestamp: timestamp,  // ✅ Number (SIN .toString())
        email: req.user.email,
        ipAddress: req.ip || req.connection.remoteAddress,
        tipoEvento: 'trip_step3_save',
        resultado: 'success',
        userId: userId,
        razon: `Hotel: ${hotelClass}, Flight: ${flightClass}`
      }
    }));

    res.status(200).json({
      success: true,
      message: 'Step 3 saved successfully',
      data: {  // ✅ IMPORTANTE: key "data"
        sessionId: sessionId,
        step: 3,
        preferences: preferences || {},
        hotelClass: hotelClass || 'no-preference',
        flightClass: flightClass || 'economy',
        expiresAt: new Date(ttl * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Save step3 error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    try {
      const logId = `log_${uuidv4()}`;
      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_LOGS,
        Item: {
          logId: logId,
          timestamp: Date.now(),  // ✅ Number (SIN .toString())
          email: req.user?.email || 'unknown',
          ipAddress: req.ip || req.connection.remoteAddress,
          tipoEvento: 'trip_step3_save',
          resultado: 'failure',
          razon: error.message,
          userId: req.user?.userId || null
        }
      }));
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to save trip step 3'
    });
  }
};