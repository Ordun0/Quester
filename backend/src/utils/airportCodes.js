// backend/src/utils/airportCodes.js

/**
 * Mapeo de ciudades a códigos de aeropuerto IATA
 * Formato: 'NOMBRE_CIUDAD_VARIANTE': 'CODIGO_IATA'
 * 
 * Fuente: IATA Official Codes + Common Variants
 * Última actualización: 2026
 */

const AIRPORT_CODES = {
  // ===========================================
  // 🇺🇸 USA - Principal Airports
  // ===========================================
  'NEW YORK': 'JFK',
  'NYC': 'JFK',
  'NEW YORK, USA': 'JFK',
  'NEW YORK, NY': 'JFK',
  'NEW YORK CITY': 'JFK',
  'MANHATTAN': 'JFK',
  'BROOKLYN': 'JFK',
  'QUEENS': 'JFK',
  
  'LOS ANGELES': 'LAX',
  'LA': 'LAX',
  'LOS ANGELES, USA': 'LAX',
  'Los Angeles, USA': 'LAX',
  'LOS ANGELES, CA': 'LAX',
  'LOS ANGELES, CALIFORNIA': 'LAX',
  'HOLLYWOOD': 'LAX',
  'BEVERLY HILLS': 'LAX',
  'SANTA MONICA': 'LAX',
  
  'CHICAGO': 'ORD',
  'CHICAGO, USA': 'ORD',
  'CHICAGO, IL': 'ORD',
  'CHICAGO, ILLINOIS': 'ORD',
  
  'SAN FRANCISCO': 'SFO',
  'SAN FRANCISCO, USA': 'SFO',
  'SAN FRANCISCO, CA': 'SFO',
  'SAN FRANCISCO, CALIFORNIA': 'SFO',
  'SF': 'SFO',
  'BAY AREA': 'SFO',
  
  'SEATTLE': 'SEA',
  'SEATTLE, USA': 'SEA',
  'SEATTLE, WA': 'SEA',
  'SEATTLE, WASHINGTON': 'SEA',
  
  'MIAMI': 'MIA',
  'MIAMI, USA': 'MIA',
  'MIAMI, FL': 'MIA',
  'MIAMI, FLORIDA': 'MIA',
  'SOUTH BEACH': 'MIA',
  
  'BOSTON': 'BOS',
  'BOSTON, USA': 'BOS',
  'BOSTON, MA': 'BOS',
  'BOSTON, MASSACHUSETTS': 'BOS',
  
  'DALLAS': 'DFW',
  'DALLAS, USA': 'DFW',
  'DALLAS, TX': 'DFW',
  'DALLAS, TEXAS': 'DFW',
  'FORT WORTH': 'DFW',
  
  'HOUSTON': 'IAH',
  'HOUSTON, USA': 'IAH',
  'HOUSTON, TX': 'IAH',
  'HOUSTON, TEXAS': 'IAH',
  
  'DENVER': 'DEN',
  'DENVER, USA': 'DEN',
  'DENVER, CO': 'DEN',
  'DENVER, COLORADO': 'DEN',
  
  'LAS VEGAS': 'LAS',
  'LAS VEGAS, USA': 'LAS',
  'LAS VEGAS, NV': 'LAS',
  'LAS VEGAS, NEVADA': 'LAS',
  'VEGAS': 'LAS',
  
  'ORLANDO': 'MCO',
  'ORLANDO, USA': 'MCO',
  'ORLANDO, FL': 'MCO',
  'ORLANDO, FLORIDA': 'MCO',
  'DISNEY WORLD': 'MCO',
  'UNIVERSAL STUDIOS': 'MCO',
  
  'ATLANTA': 'ATL',
  'ATLANTA, USA': 'ATL',
  'ATLANTA, GA': 'ATL',
  'ATLANTA, GEORGIA': 'ATL',
  
  'PHOENIX': 'PHX',
  'PHOENIX, USA': 'PHX',
  'PHOENIX, AZ': 'PHX',
  'PHOENIX, ARIZONA': 'PHX',
  
  'WASHINGTON': 'IAD',
  'WASHINGTON, USA': 'IAD',
  'WASHINGTON, DC': 'IAD',
  'DC': 'IAD',
  'DISTRICT OF COLUMBIA': 'IAD',
  'CAPITOL': 'IAD',
  
  'WASHINGTON DULLES': 'IAD',
  'DULLES': 'IAD',
  
  // ===========================================
  // 🇪🇺 Europa - Principal Airports
  // ===========================================
  'LONDON': 'LHR',
  'LONDON, UK': 'LHR',
  'LONDON, UNITED KINGDOM': 'LHR',
  'LONDON, ENGLAND': 'LHR',
  'GREAT BRITAIN': 'LHR',
  'UK': 'LHR',
  
  'PARIS': 'CDG',
  'PARIS, FRANCE': 'CDG',
  'PARIS, FR': 'CDG',
  
  'ROME': 'FCO',
  'ROME, ITALY': 'FCO',
  'ROME, IT': 'FCO',
  'ROMA': 'FCO',
  
  'BARCELONA': 'BCN',
  'BARCELONA, SPAIN': 'BCN',
  'BARCELONA, ES': 'BCN',
  
  'MADRID': 'MAD',
  'MADRID, SPAIN': 'MAD',
  'MADRID, ES': 'MAD',
  
  'AMSTERDAM': 'AMS',
  'AMSTERDAM, NETHERLANDS': 'AMS',
  'AMSTERDAM, NL': 'AMS',
  'NETHERLANDS': 'AMS',
  
  'FRANKFURT': 'FRA',
  'FRANKFURT, GERMANY': 'FRA',
  'FRANKFURT, DE': 'FRA',
  'GERMANY': 'FRA',
  
  'ZURICH': 'ZRH',
  'ZURICH, SWITZERLAND': 'ZRH',
  'ZURICH, CH': 'ZRH',
  'SWITZERLAND': 'ZRH',
  
  'ISTANBUL': 'IST',
  'ISTANBUL, TURKEY': 'IST',
  'ISTANBUL, TR': 'IST',
  'TURKEY': 'IST',
  
  'LISBON': 'LIS',
  'LISBON, PORTUGAL': 'LIS',
  'LISBON, PT': 'LIS',
  
  'DUBLIN': 'DUB',
  'DUBLIN, IRELAND': 'DUB',
  'DUBLIN, IE': 'DUB',
  
  'EDINBURGH': 'EDI',
  'EDINBURGH, UK': 'EDI',
  'EDINBURGH, SCOTLAND': 'EDI',
  
  'MANCHESTER': 'MAN',
  'MANCHESTER, UK': 'MAN',
  'MANCHESTER, ENGLAND': 'MAN',
  
  'MUNICH': 'MUC',
  'MUNICH, GERMANY': 'MUC',
  'MUNICH, DE': 'MUC',
  
  'BERLIN': 'BER',
  'BERLIN, GERMANY': 'BER',
  'BERLIN, DE': 'BER',
  
  'VIENNA': 'VIE',
  'VIENNA, AUSTRIA': 'VIE',
  'VIENNA, AT': 'VIE',
  
  'PRAGUE': 'PRG',
  'PRAGUE, CZECH REPUBLIC': 'PRG',
  'PRAGUE, CZ': 'PRG',
  
  'WARSAW': 'WAW',
  'WARSAW, POLAND': 'WAW',
  'WARSAW, PL': 'WAW',
  
  'BRUSSELS': 'BRU',
  'BRUSSELS, BELGIUM': 'BRU',
  'BRUSSELS, BE': 'BRU',
  
  'COPENHAGEN': 'CPH',
  'COPENHAGEN, DENMARK': 'CPH',
  'COPENHAGEN, DK': 'CPH',
  
  'STOCKHOLM': 'ARN',
  'STOCKHOLM, SWEDEN': 'ARN',
  'STOCKHOLM, SE': 'ARN',
  
  'OSLO': 'OSL',
  'OSLO, NORWAY': 'OSL',
  'OSLO, NO': 'OSL',
  
  'HELSINKI': 'HEL',
  'HELSINKI, FINLAND': 'HEL',
  'HELSINKI, FI': 'HEL',
  
  'ATHENS': 'ATH',
  'ATHENS, GREECE': 'ATH',
  'ATHENS, GR': 'ATH',
  
  'BUDAPEST': 'BUD',
  'BUDAPEST, HUNGARY': 'BUD',
  'BUDAPEST, HU': 'BUD',
  
  'BUCHAREST': 'OTP',
  'BUCHAREST, ROMANIA': 'OTP',
  'BUCHAREST, RO': 'OTP',
  
  // ===========================================
  // 🌏 Asia - Principal Airports
  // ===========================================
  'TOKYO': 'NRT',
  'TOKYO, JAPAN': 'NRT',
  'TOKYO, JP': 'NRT',
  'JAPAN': 'NRT',
  'TOKYO NARITA': 'NRT',
  'NARITA': 'NRT',
  
  'OSAKA': 'KIX',
  'OSAKA, JAPAN': 'KIX',
  'OSAKA, JP': 'KIX',
  'KANSAI': 'KIX',
  
  'KYOTO': 'KIX',
  'KYOTO, JAPAN': 'KIX',
  
  'SINGAPORE': 'SIN',
  'SINGAPORE, SINGAPORE': 'SIN',
  'SINGAPORE, SG': 'SIN',
  
  'BANGKOK': 'BKK',
  'BANGKOK, THAILAND': 'BKK',
  'BANGKOK, TH': 'BKK',
  'THAILAND': 'BKK',
  
  'PHUKET': 'HKT',
  'PHUKET, THAILAND': 'HKT',
  'PHUKET, TH': 'HKT',
  
  'CHIANG MAI': 'CNX',
  'CHIANG MAI, THAILAND': 'CNX',
  
  'HONG KONG': 'HKG',
  'HONG KONG, CHINA': 'HKG',
  'HONG KONG, CN': 'HKG',
  'HK': 'HKG',
  
  'SEOUL': 'ICN',
  'SEOUL, SOUTH KOREA': 'ICN',
  'SEOUL, KR': 'ICN',
  'SOUTH KOREA': 'ICN',
  'KOREA': 'ICN',
  
  'BUSAN': 'PUS',
  'BUSAN, SOUTH KOREA': 'PUS',
  
  'SHANGHAI': 'PVG',
  'SHANGHAI, CHINA': 'PVG',
  'SHANGHAI, CN': 'PVG',
  'PUDONG': 'PVG',
  
  'BEIJING': 'PEK',
  'BEIJING, CHINA': 'PEK',
  'BEIJING, CN': 'PEK',
  'CHINA': 'PEK',
  
  'GUANGZHOU': 'CAN',
  'GUANGZHOU, CHINA': 'CAN',
  'GUANGZHOU, CN': 'CAN',
  
  'SHENZHEN': 'SZX',
  'SHENZHEN, CHINA': 'SZX',
  'SHENZHEN, CN': 'SZX',
  
  'CHENGDU': 'CTU',
  'CHENGDU, CHINA': 'CTU',
  'CHENGDU, CN': 'CTU',
  
  'TAIPEI': 'TPE',
  'TAIPEI, TAIWAN': 'TPE',
  'TAIPEI, TW': 'TPE',
  'TAIWAN': 'TPE',
  
  'KUALA LUMPUR': 'KUL',
  'KUALA LUMPUR, MALAYSIA': 'KUL',
  'KUALA LUMPUR, MY': 'KUL',
  'MALAYSIA': 'KUL',
  
  'JAKARTA': 'CGK',
  'JAKARTA, INDONESIA': 'CGK',
  'JAKARTA, ID': 'CGK',
  'INDONESIA': 'CGK',
  
  'BALI': 'DPS',
  'BALI, INDONESIA': 'DPS',
  'DENPASAR': 'DPS',
  
  'MANILA': 'MNL',
  'MANILA, PHILIPPINES': 'MNL',
  'MANILA, PH': 'MNL',
  'PHILIPPINES': 'MNL',
  
  'CEBU': 'CEB',
  'CEBU, PHILIPPINES': 'CEB',
  
  'HANOI': 'HAN',
  'HANOI, VIETNAM': 'HAN',
  'HANOI, VN': 'HAN',
  'VIETNAM': 'HAN',
  
  'HO CHI MINH': 'SGN',
  'HO CHI MINH CITY': 'SGN',
  'HO CHI MINH, VIETNAM': 'SGN',
  'SAIGON': 'SGN',
  
  'MUMBAI': 'BOM',
  'MUMBAI, INDIA': 'BOM',
  'MUMBAI, IN': 'BOM',
  'BOMBAY': 'BOM',
  
  'DELHI': 'DEL',
  'DELHI, INDIA': 'DEL',
  'DELHI, IN': 'DEL',
  'NEW DELHI': 'DEL',
  
  'BANGALORE': 'BLR',
  'BANGALORE, INDIA': 'BLR',
  'BANGALORE, IN': 'BLR',
  
  'COLOMBO': 'CMB',
  'COLOMBO, SRI LANKA': 'CMB',
  'COLOMBO, LK': 'CMB',
  
  'KATHMANDU': 'KTM',
  'KATHMANDU, NEPAL': 'KTM',
  'KATHMANDU, NP': 'KTM',
  
  'MALE': 'MLE',
  'MALE, MALDIVES': 'MLE',
  'MALDIVES': 'MLE',
  
  // ===========================================
  // 🌎 Americas (Non-USA) - Principal Airports
  // ===========================================
  'TORONTO': 'YYZ',
  'TORONTO, CANADA': 'YYZ',
  'TORONTO, CA': 'YYZ',
  'CANADA': 'YYZ',
  
  'VANCOUVER': 'YVR',
  'VANCOUVER, CANADA': 'YVR',
  'VANCOUVER, CA': 'YVR',
  
  'MONTREAL': 'YUL',
  'MONTREAL, CANADA': 'YUL',
  'MONTREAL, CA': 'YUL',
  
  'CALGARY': 'YYC',
  'CALGARY, CANADA': 'YYC',
  'CALGARY, CA': 'YYC',
  
  'MEXICO CITY': 'MEX',
  'MEXICO CITY, MEXICO': 'MEX',
  'MEXICO CITY, MX': 'MEX',
  'CIUDAD DE MEXICO': 'MEX',
  'CDMX': 'MEX',
  'MEXICO': 'MEX',
  
  'TIJUANA': 'TIJ',
  'TIJUANA, MEXICO': 'TIJ',
  'TIJUANA, MX': 'TIJ',
  
  'CANCUN': 'CUN',
  'CANCUN, MEXICO': 'CUN',
  'CANCUN, MX': 'CUN',
  'RIVIERA MAYA': 'CUN',
  'PLAYA DEL CARMEN': 'CUN',
  
  'GUADALAJARA': 'GDL',
  'GUADALAJARA, MEXICO': 'GDL',
  'GUADALAJARA, MX': 'GDL',
  
  'MONTERREY': 'MTY',
  'MONTERREY, MEXICO': 'MTY',
  'MONTERREY, MX': 'MTY',
  
  'PUERTO VALLARTA': 'PVR',
  'PUERTO VALLARTA, MEXICO': 'PVR',
  
  'CABO SAN LUCAS': 'SJD',
  'CABO SAN LUCAS, MEXICO': 'SJD',
  'LOS CABOS': 'SJD',
  
  'SAO PAULO': 'GRU',
  'SAO PAULO, BRAZIL': 'GRU',
  'SAO PAULO, BR': 'GRU',
  'BRAZIL': 'GRU',
  
  'RIO DE JANEIRO': 'GIG',
  'RIO DE JANEIRO, BRAZIL': 'GIG',
  'RIO DE JANEIRO, BR': 'GIG',
  'RIO': 'GIG',
  
  'BUENOS AIRES': 'EZE',
  'BUENOS AIRES, ARGENTINA': 'EZE',
  'BUENOS AIRES, AR': 'EZE',
  'ARGENTINA': 'EZE',
  
  'SANTIAGO': 'SCL',
  'SANTIAGO, CHILE': 'SCL',
  'SANTIAGO, CL': 'SCL',
  'CHILE': 'SCL',
  
  'LIMA': 'LIM',
  'LIMA, PERU': 'LIM',
  'LIMA, PE': 'LIM',
  'PERU': 'LIM',
  
  'CUSCO': 'CUZ',
  'CUSCO, PERU': 'CUZ',
  'CUSCO, PE': 'CUZ',
  'MACHU PICCHU': 'CUZ',
  
  'BOGOTA': 'BOG',
  'BOGOTA, COLOMBIA': 'BOG',
  'BOGOTA, CO': 'BOG',
  'COLOMBIA': 'BOG',
  
  'CARTAGENA': 'CTG',
  'CARTAGENA, COLOMBIA': 'CTG',
  'CARTAGENA, CO': 'CTG',
  
  'QUITO': 'UIO',
  'QUITO, ECUADOR': 'UIO',
  'QUITO, EC': 'UIO',
  'ECUADOR': 'UIO',
  
  'LA PAZ': 'LPB',
  'LA PAZ, BOLIVIA': 'LPB',
  'LA PAZ, BO': 'LPB',
  'BOLIVIA': 'LPB',
  
  'ASUNCION': 'ASU',
  'ASUNCION, PARAGUAY': 'ASU',
  'ASUNCION, PY': 'ASU',
  
  'MONTEVIDEO': 'MVD',
  'MONTEVIDEO, URUGUAY': 'MVD',
  'MONTEVIDEO, UY': 'MVD',
  'URUGUAY': 'MVD',
  
  'CARACAS': 'CCS',
  'CARACAS, VENEZUELA': 'CCS',
  'CARACAS, VE': 'CCS',
  
  'PANAMA CITY': 'PTY',
  'PANAMA CITY, PANAMA': 'PTY',
  'PANAMA': 'PTY',
  
  'SAN JOSE': 'SJO',
  'SAN JOSE, COSTA RICA': 'SJO',
  'SAN JOSE, CR': 'SJO',
  'COSTA RICA': 'SJO',
  
  'GUATEMALA CITY': 'GUA',
  'GUATEMALA CITY, GUATEMALA': 'GUA',
  'GUATEMALA': 'GUA',
  
  'SAN SALVADOR': 'SAL',
  'SAN SALVADOR, EL SALVADOR': 'SAL',
  'EL SALVADOR': 'SAL',
  
  'MANAGUA': 'MGA',
  'MANAGUA, NICARAGUA': 'MGA',
  'NICARAGUA': 'MGA',
  
  'SAN PEDRO SULA': 'SAP',
  'SAN PEDRO SULA, HONDURAS': 'SAP',
  'HONDURAS': 'SAP',
  
  'SANTO DOMINGO': 'SDQ',
  'SANTO DOMINGO, DOMINICAN REPUBLIC': 'SDQ',
  'DOMINICAN REPUBLIC': 'SDQ',
  
  'PUNTA CANA': 'PUJ',
  'PUNTA CANA, DOMINICAN REPUBLIC': 'PUJ',
  
  'HAVANA': 'HAV',
  'HAVANA, CUBA': 'HAV',
  'HAVANA, CU': 'HAV',
  'CUBA': 'HAV',
  
  'KINGSTON': 'KIN',
  'KINGSTON, JAMAICA': 'KIN',
  'JAMAICA': 'KIN',
  
  'NASSAU': 'NAS',
  'NASSAU, BAHAMAS': 'NAS',
  'BAHAMAS': 'NAS',
  
  // ===========================================
  // 🌍 Africa & Middle East - Principal Airports
  // ===========================================
  'DUBAI': 'DXB',
  'DUBAI, UAE': 'DXB',
  'DUBAI, UNITED ARAB EMIRATES': 'DXB',
  'UAE': 'DXB',
  'UNITED ARAB EMIRATES': 'DXB',
  
  'ABU DHABI': 'AUH',
  'ABU DHABI, UAE': 'AUH',
  'ABU DHABI, UNITED ARAB EMIRATES': 'AUH',
  
  'DOHA': 'DOH',
  'DOHA, QATAR': 'DOH',
  'DOHA, QA': 'DOH',
  'QATAR': 'DOH',
  
  'RIYADH': 'RUH',
  'RIYADH, SAUDI ARABIA': 'RUH',
  'RIYADH, SA': 'RUH',
  'SAUDI ARABIA': 'RUH',
  
  'JEDDAH': 'JED',
  'JEDDAH, SAUDI ARABIA': 'JED',
  'JEDDAH, SA': 'JED',
  
  'CAIRO': 'CAI',
  'CAIRO, EGYPT': 'CAI',
  'CAIRO, EG': 'CAI',
  'EGYPT': 'CAI',
  
  'MARRAKECH': 'RAK',
  'MARRAKECH, MOROCCO': 'RAK',
  'MARRAKECH, MA': 'RAK',
  'MOROCCO': 'RAK',
  
  'CASABLANCA': 'CMN',
  'CASABLANCA, MOROCCO': 'CMN',
  'CASABLANCA, MA': 'CMN',
  
  'TUNIS': 'TUN',
  'TUNIS, TUNISIA': 'TUN',
  'TUNIS, TN': 'TUN',
  'TUNISIA': 'TUN',
  
  'JOHANNESBURG': 'JNB',
  'JOHANNESBURG, SOUTH AFRICA': 'JNB',
  'JOHANNESBURG, ZA': 'JNB',
  'SOUTH AFRICA': 'JNB',
  
  'CAPE TOWN': 'CPT',
  'CAPE TOWN, SOUTH AFRICA': 'CPT',
  'CAPE TOWN, ZA': 'CPT',
  
  'NAIROBI': 'NBO',
  'NAIROBI, KENYA': 'NBO',
  'NAIROBI, KE': 'NBO',
  'KENYA': 'NBO',
  
  'MOMBASA': 'MBA',
  'MOMBASA, KENYA': 'MBA',
  'MOMBASA, KE': 'MBA',
  
  'ADDIS ABABA': 'ADD',
  'ADDIS ABABA, ETHIOPIA': 'ADD',
  'ADDIS ABABA, ET': 'ADD',
  'ETHIOPIA': 'ADD',
  
  'LAGOS': 'LOS',
  'LAGOS, NIGERIA': 'LOS',
  'LAGOS, NG': 'LOS',
  'NIGERIA': 'LOS',
  
  'ACCRA': 'ACC',
  'ACCRA, GHANA': 'ACC',
  'ACCRA, GH': 'ACC',
  'GHANA': 'ACC',
  
  'DAKAR': 'DSS',
  'DAKAR, SENEGAL': 'DSS',
  'DAKAR, SN': 'DSS',
  'SENEGAL': 'DSS',
  
  // ===========================================
  // 🌏 Oceania - Principal Airports
  // ===========================================
  'SYDNEY': 'SYD',
  'SYDNEY, AUSTRALIA': 'SYD',
  'SYDNEY, AU': 'SYD',
  'AUSTRALIA': 'SYD',
  
  'MELBOURNE': 'MEL',
  'MELBOURNE, AUSTRALIA': 'MEL',
  'MELBOURNE, AU': 'MEL',
  
  'BRISBANE': 'BNE',
  'BRISBANE, AUSTRALIA': 'BNE',
  'BRISBANE, AU': 'BNE',
  
  'PERTH': 'PER',
  'PERTH, AUSTRALIA': 'PER',
  'PERTH, AU': 'PER',
  
  'ADELAIDE': 'ADL',
  'ADELAIDE, AUSTRALIA': 'ADL',
  'ADELAIDE, AU': 'ADL',
  
  'GOLD COAST': 'OOL',
  'GOLD COAST, AUSTRALIA': 'OOL',
  'GOLD COAST, AU': 'OOL',
  
  'CAIRNS': 'CNS',
  'CAIRNS, AUSTRALIA': 'CNS',
  'CAIRNS, AU': 'CNS',
  'GREAT BARRIER REEF': 'CNS',
  
  'AUCKLAND': 'AKL',
  'AUCKLAND, NEW ZEALAND': 'AKL',
  'AUCKLAND, NZ': 'AKL',
  'NEW ZEALAND': 'AKL',
  
  'WELLINGTON': 'WLG',
  'WELLINGTON, NEW ZEALAND': 'WLG',
  'WELLINGTON, NZ': 'WLG',
  
  'CHRISTCHURCH': 'CHC',
  'CHRISTCHURCH, NEW ZEALAND': 'CHC',
  'CHRISTCHURCH, NZ': 'CHC',
  
  'QUEENSTOWN': 'ZQN',
  'QUEENSTOWN, NEW ZEALAND': 'ZQN',
  'QUEENSTOWN, NZ': 'ZQN',
  
  'FIJI': 'NAN',
  'NADI': 'NAN',
  'NADI, FIJI': 'NAN',
  
  // ===========================================
  // 🌍 Other Popular Destinations
  // ===========================================
  'REYKJAVIK': 'KEF',
  'REYKJAVIK, ICELAND': 'KEF',
  'REYKJAVIK, IS': 'KEF',
  'ICELAND': 'KEF',
  
  'LUXEMBOURG': 'LUX',
  'LUXEMBOURG, LUXEMBOURG': 'LUX',
  'LUXEMBOURG, LU': 'LUX',
  
  'MALTA': 'MLA',
  'VALLETTA': 'MLA',
  'VALLETTA, MALTA': 'MLA',
  
  'CYPRUS': 'LCA',
  'LARNACA': 'LCA',
  'LARNACA, CYPRUS': 'LCA',
  
  'TEL AVIV': 'TLV',
  'TEL AVIV, ISRAEL': 'TLV',
  'TEL AVIV, IL': 'TLV',
  'ISRAEL': 'TLV',
  
  'JERUSALEM': 'TLV',
  'JERUSALEM, ISRAEL': 'TLV',
  
  'BEIRUT': 'BEY',
  'BEIRUT, LEBANON': 'BEY',
  'BEIRUT, LB': 'BEY',
  'LEBANON': 'BEY',
  
  'AMMAN': 'AMM',
  'AMMAN, JORDAN': 'AMM',
  'AMMAN, JO': 'AMM',
  'JORDAN': 'AMM',
  
  'PETRA': 'AQJ',
  'PETRA, JORDAN': 'AQJ',
  'AQABA': 'AQJ',
  
  'TASHKENT': 'TAS',
  'TASHKENT, UZBEKISTAN': 'TAS',
  'TASHKENT, UZ': 'TAS',
  'UZBEKISTAN': 'TAS',
  
  'ALMATY': 'ALA',
  'ALMATY, KAZAKHSTAN': 'ALA',
  'ALMATY, KZ': 'ALA',
  'KAZAKHSTAN': 'ALA',
  
  'TBILISI': 'TBS',
  'TBILISI, GEORGIA': 'TBS',
  'TBILISI, GE': 'TBS',
  'GEORGIA': 'TBS',
  
  'YEREVAN': 'EVN',
  'YEREVAN, ARMENIA': 'EVN',
  'YEREVAN, AM': 'EVN',
  'ARMENIA': 'EVN',
  
  'BAKU': 'GYD',
  'BAKU, AZERBAIJAN': 'GYD',
  'BAKU, AZ': 'GYD',
  'AZERBAIJAN': 'GYD',
  
  // ===========================================
  // 🏝️ Island & Resort Destinations
  // ===========================================
  'MALDIVES': 'MLE',
  'MALE, MALDIVES': 'MLE',
  
  'SEYCHELLES': 'SEZ',
  'MAHE': 'SEZ',
  'MAHE, SEYCHELLES': 'SEZ',
  
  'MAURITIUS': 'MRU',
  'PORT LOUIS': 'MRU',
  'PORT LOUIS, MAURITIUS': 'MRU',
  
  'ZANZIBAR': 'ZNZ',
  'ZANZIBAR, TANZANIA': 'ZNZ',
  'STONE TOWN': 'ZNZ',
  
  'SEYCHELLES': 'SEZ',
  
  'FIJI': 'NAN',
  'NADI, FIJI': 'NAN',
  
  'BORA BORA': 'BOB',
  'BORA BORA, FRENCH POLYNESIA': 'BOB',
  
  'TAHITI': 'PPT',
  'PAPEETE': 'PPT',
  'PAPEETE, FRENCH POLYNESIA': 'PPT',
  
  'HAWAII': 'HNL',
  'HONOLULU': 'HNL',
  'HONOLULU, HAWAII': 'HNL',
  'HONOLULU, HI': 'HNL',
  'OAHU': 'HNL',
  
  'MAUI': 'OGG',
  'MAUI, HAWAII': 'OGG',
  'KAHULUI': 'OGG',
  
  'BIG ISLAND': 'KOA',
  'KONA': 'KOA',
  'KONA, HAWAII': 'KOA',
  
  'KAUAI': 'LIH',
  'KAUAI, HAWAII': 'LIH',
  'LIHUE': 'LIH'
};

/**
 * Obtener código IATA para una ciudad
 * @param {string} location - Nombre de la ciudad
 * @returns {string|null} Código IATA o null si no se encuentra
 */
function getAirportCode(location) {
  if (!location) return null;
  
  var upper = String(location).toUpperCase().trim();
  
  // ✅ Buscar coincidencia exacta primero
  if (AIRPORT_CODES[upper]) {
    return AIRPORT_CODES[upper];
  }
  
  // ✅ Buscar por contiene (más flexible)
  for (var city in AIRPORT_CODES) {
    if (upper.includes(city)) {
      return AIRPORT_CODES[city];
    }
  }
  
  // ✅ Si ya es código IATA (3 letras mayúsculas), retornarlo
  if (/^[A-Z]{3}$/.test(upper)) {
    return upper;
  }
  
  // ✅ Fallback: intentar extraer código si formato es "Ciudad (XXX)"
  var codeMatch = upper.match(/\(([A-Z]{3})\)/);
  if (codeMatch && codeMatch[1]) {
    return codeMatch[1];
  }
  
  // ✅ Fallback final: retornar null para que el caller maneje el error
  return null;
}

/**
 * Obtener lista de todas las ciudades disponibles
 * @returns {string[]} Array de nombres de ciudades
 */
function getAvailableCities() {
  return Object.keys(AIRPORT_CODES)
    .filter(key => !/^[A-Z]{3}$/.test(key)) // Excluir códigos IATA puros
    .sort();
}

/**
 * Buscar ciudades por término
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array<{city: string, code: string}>} Resultados de búsqueda
 */
function searchCities(searchTerm) {
  if (!searchTerm) return [];
  
  var term = searchTerm.toUpperCase().trim();
  var results = [];
  
  for (var city in AIRPORT_CODES) {
    if (city.includes(term) || AIRPORT_CODES[city].includes(term)) {
      results.push({
        city: city,
        code: AIRPORT_CODES[city]
      });
    }
  }
  
  return results.slice(0, 20); // Limitar a 20 resultados
}

module.exports = {
  AIRPORT_CODES,
  getAirportCode,
  getAvailableCities,
  searchCities
};