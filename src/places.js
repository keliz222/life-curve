// Birth places for true solar time, chosen as country -> region -> city.
// Each city maps to its longitude in degrees east. utcOffset is the standard time zone in hours,
// set per country or per region where a country has several zones.
const BIRTH_COUNTRIES = [
  {
    name: "China",
    utcOffset: 8,
    regions: [
      { name: "Beijing", cities: { Beijing: 116.4 } },
      { name: "Tianjin", cities: { Tianjin: 117.2 } },
      { name: "Shanghai", cities: { Shanghai: 121.5 } },
      { name: "Chongqing", cities: { Chongqing: 106.5, Wanzhou: 108.4 } },
      { name: "Hebei", cities: { Shijiazhuang: 114.5, Tangshan: 118.2, Baoding: 115.5, Handan: 114.5, Qinhuangdao: 119.6 } },
      { name: "Shanxi", cities: { Taiyuan: 112.5, Datong: 113.3, Changzhi: 113.1, Yuncheng: 111.0 } },
      { name: "Inner Mongolia", cities: { Hohhot: 111.7, Baotou: 110.0, Ordos: 110.0, Chifeng: 118.9, Hulunbuir: 119.8 } },
      { name: "Liaoning", cities: { Shenyang: 123.4, Dalian: 121.6, Anshan: 123.0, Jinzhou: 121.1 } },
      { name: "Jilin", cities: { Changchun: 125.3, Jilin: 126.6, Yanji: 129.5 } },
      { name: "Heilongjiang", cities: { Harbin: 126.6, Qiqihar: 124.0, Daqing: 125.1, Mudanjiang: 129.6 } },
      { name: "Jiangsu", cities: { Nanjing: 118.8, Suzhou: 120.6, Wuxi: 120.3, Changzhou: 120.0, Xuzhou: 117.2, Nantong: 120.9, Yangzhou: 119.4 } },
      { name: "Zhejiang", cities: { Hangzhou: 120.2, Ningbo: 121.5, Wenzhou: 120.7, Shaoxing: 120.6, Jinhua: 119.6, Taizhou: 121.4 } },
      { name: "Anhui", cities: { Hefei: 117.2, Wuhu: 118.4, Bengbu: 117.4, Anqing: 117.1, Huangshan: 118.3 } },
      { name: "Fujian", cities: { Fuzhou: 119.3, Xiamen: 118.1, Quanzhou: 118.6, Zhangzhou: 117.7 } },
      { name: "Jiangxi", cities: { Nanchang: 115.9, Ganzhou: 114.9, Jiujiang: 116.0, Shangrao: 118.0 } },
      { name: "Shandong", cities: { Jinan: 117.0, Qingdao: 120.4, Yantai: 121.4, Weifang: 119.2, Linyi: 118.4, Jining: 116.6 } },
      { name: "Henan", cities: { Zhengzhou: 113.6, Luoyang: 112.5, Kaifeng: 114.3, Nanyang: 112.5, Xinxiang: 113.9 } },
      { name: "Hubei", cities: { Wuhan: 114.3, Yichang: 111.3, Xiangyang: 112.1, Jingzhou: 112.2 } },
      { name: "Hunan", cities: { Changsha: 112.9, Zhuzhou: 113.1, Hengyang: 112.6, Yueyang: 113.1 } },
      { name: "Guangdong", cities: { Guangzhou: 113.3, Shenzhen: 114.1, Dongguan: 113.8, Foshan: 113.1, Zhuhai: 113.6, Shantou: 116.7, Zhanjiang: 110.4 } },
      { name: "Guangxi", cities: { Nanning: 108.4, Guilin: 110.3, Liuzhou: 109.4, Beihai: 109.1 } },
      { name: "Hainan", cities: { Haikou: 110.3, Sanya: 109.5 } },
      { name: "Sichuan", cities: { Chengdu: 104.1, Mianyang: 104.7, Leshan: 103.8, Nanchong: 106.1, Yibin: 104.6 } },
      { name: "Guizhou", cities: { Guiyang: 106.6, Zunyi: 106.9, Liupanshui: 104.8 } },
      { name: "Yunnan", cities: { Kunming: 102.7, Dali: 100.2, Lijiang: 100.2, Qujing: 103.8 } },
      { name: "Tibet", cities: { Lhasa: 91.1, Shigatse: 88.9, Nyingchi: 94.4 } },
      { name: "Shaanxi", cities: { "Xi'an": 108.9, Baoji: 107.2, Xianyang: 108.7, "Yan'an": 109.5 } },
      { name: "Gansu", cities: { Lanzhou: 103.8, Tianshui: 105.7, Jiuquan: 98.5, Dunhuang: 94.7 } },
      { name: "Qinghai", cities: { Xining: 101.8, Golmud: 94.9 } },
      { name: "Ningxia", cities: { Yinchuan: 106.2, Shizuishan: 106.4 } },
      { name: "Xinjiang", cities: { Urumqi: 87.6, Kashgar: 76.0, Yining: 81.3, Hami: 93.5 } },
    ],
  },
  { name: "Hong Kong", utcOffset: 8, regions: [{ name: "Hong Kong", cities: { "Hong Kong": 114.2 } }] },
  { name: "Macau", utcOffset: 8, regions: [{ name: "Macau", cities: { Macau: 113.5 } }] },
  {
    name: "Taiwan",
    utcOffset: 8,
    regions: [
      { name: "North", cities: { Taipei: 121.5, "New Taipei": 121.5, Taoyuan: 121.3, Hsinchu: 121.0 } },
      { name: "Central", cities: { Taichung: 120.7, Changhua: 120.5 } },
      { name: "South", cities: { Tainan: 120.2, Kaohsiung: 120.3 } },
      { name: "East", cities: { Hualien: 121.6, Taitung: 121.1 } },
    ],
  },
  {
    name: "United States",
    regions: [
      { name: "Alabama", utcOffset: -6, cities: { Birmingham: -86.8, Montgomery: -86.3 } },
      { name: "Alaska", utcOffset: -9, cities: { Anchorage: -149.9, Fairbanks: -147.7 } },
      { name: "Arizona", utcOffset: -7, cities: { Phoenix: -112.1, Tucson: -111.0 } },
      { name: "Arkansas", utcOffset: -6, cities: { "Little Rock": -92.3 } },
      { name: "California", utcOffset: -8, cities: { "Los Angeles": -118.2, "San Francisco": -122.4, "San Diego": -117.2, "San Jose": -121.9, Sacramento: -121.5 } },
      { name: "Colorado", utcOffset: -7, cities: { Denver: -105.0 } },
      { name: "Connecticut", utcOffset: -5, cities: { Hartford: -72.7, "New Haven": -72.9 } },
      { name: "Delaware", utcOffset: -5, cities: { Wilmington: -75.5 } },
      { name: "District of Columbia", utcOffset: -5, cities: { Washington: -77.0 } },
      { name: "Florida", utcOffset: -5, cities: { Miami: -80.2, Orlando: -81.4, Tampa: -82.5, Jacksonville: -81.7 } },
      { name: "Georgia", utcOffset: -5, cities: { Atlanta: -84.4, Savannah: -81.1 } },
      { name: "Hawaii", utcOffset: -10, cities: { Honolulu: -157.9 } },
      { name: "Idaho", utcOffset: -7, cities: { Boise: -116.2 } },
      { name: "Illinois", utcOffset: -6, cities: { Chicago: -87.6, Champaign: -88.2, Urbana: -88.2, Springfield: -89.7, Peoria: -89.6 } },
      { name: "Indiana", utcOffset: -5, cities: { Indianapolis: -86.2, "Fort Wayne": -85.1 } },
      { name: "Iowa", utcOffset: -6, cities: { "Des Moines": -93.6, "Iowa City": -91.5 } },
      { name: "Kansas", utcOffset: -6, cities: { Wichita: -97.3, "Kansas City": -94.6 } },
      { name: "Kentucky", utcOffset: -5, cities: { Louisville: -85.8, Lexington: -84.5 } },
      { name: "Louisiana", utcOffset: -6, cities: { "New Orleans": -90.1, "Baton Rouge": -91.2 } },
      { name: "Maine", utcOffset: -5, cities: { Portland: -70.3 } },
      { name: "Maryland", utcOffset: -5, cities: { Baltimore: -76.6 } },
      { name: "Massachusetts", utcOffset: -5, cities: { Boston: -71.1, Worcester: -71.8 } },
      { name: "Michigan", utcOffset: -5, cities: { Detroit: -83.0, "Ann Arbor": -83.7, "Grand Rapids": -85.7 } },
      { name: "Minnesota", utcOffset: -6, cities: { Minneapolis: -93.3, "Saint Paul": -93.1 } },
      { name: "Mississippi", utcOffset: -6, cities: { Jackson: -90.2 } },
      { name: "Missouri", utcOffset: -6, cities: { "St. Louis": -90.2, "Kansas City": -94.6 } },
      { name: "Montana", utcOffset: -7, cities: { Billings: -108.5 } },
      { name: "Nebraska", utcOffset: -6, cities: { Omaha: -96.0, Lincoln: -96.7 } },
      { name: "Nevada", utcOffset: -8, cities: { "Las Vegas": -115.1, Reno: -119.8 } },
      { name: "New Hampshire", utcOffset: -5, cities: { Manchester: -71.5 } },
      { name: "New Jersey", utcOffset: -5, cities: { Newark: -74.2, Princeton: -74.7 } },
      { name: "New Mexico", utcOffset: -7, cities: { Albuquerque: -106.6 } },
      { name: "New York", utcOffset: -5, cities: { "New York": -74.0, Buffalo: -78.9, Albany: -73.8 } },
      { name: "North Carolina", utcOffset: -5, cities: { Charlotte: -80.8, Raleigh: -78.6 } },
      { name: "North Dakota", utcOffset: -6, cities: { Fargo: -96.8 } },
      { name: "Ohio", utcOffset: -5, cities: { Columbus: -83.0, Cleveland: -81.7, Cincinnati: -84.5 } },
      { name: "Oklahoma", utcOffset: -6, cities: { "Oklahoma City": -97.5, Tulsa: -96.0 } },
      { name: "Oregon", utcOffset: -8, cities: { Portland: -122.7, Eugene: -123.1 } },
      { name: "Pennsylvania", utcOffset: -5, cities: { Philadelphia: -75.2, Pittsburgh: -80.0 } },
      { name: "Rhode Island", utcOffset: -5, cities: { Providence: -71.4 } },
      { name: "South Carolina", utcOffset: -5, cities: { Charleston: -79.9, Columbia: -81.0 } },
      { name: "South Dakota", utcOffset: -6, cities: { "Sioux Falls": -96.7 } },
      { name: "Tennessee", utcOffset: -6, cities: { Nashville: -86.8, Memphis: -90.0 } },
      { name: "Texas", utcOffset: -6, cities: { Houston: -95.4, Dallas: -96.8, Austin: -97.7, "San Antonio": -98.5 } },
      { name: "Utah", utcOffset: -7, cities: { "Salt Lake City": -111.9 } },
      { name: "Vermont", utcOffset: -5, cities: { Burlington: -73.2 } },
      { name: "Virginia", utcOffset: -5, cities: { Richmond: -77.4, "Virginia Beach": -76.0 } },
      { name: "Washington", utcOffset: -8, cities: { Seattle: -122.3, Spokane: -117.4 } },
      { name: "West Virginia", utcOffset: -5, cities: { Charleston: -81.6 } },
      { name: "Wisconsin", utcOffset: -6, cities: { Milwaukee: -87.9, Madison: -89.4 } },
      { name: "Wyoming", utcOffset: -7, cities: { Cheyenne: -104.8 } },
    ],
  },
  {
    name: "Canada",
    regions: [
      { name: "British Columbia", utcOffset: -8, cities: { Vancouver: -123.1, Victoria: -123.4 } },
      { name: "Alberta", utcOffset: -7, cities: { Calgary: -114.1, Edmonton: -113.5 } },
      { name: "Manitoba", utcOffset: -6, cities: { Winnipeg: -97.1 } },
      { name: "Ontario", utcOffset: -5, cities: { Toronto: -79.4, Ottawa: -75.7, Waterloo: -80.5 } },
      { name: "Quebec", utcOffset: -5, cities: { Montreal: -73.6, "Quebec City": -71.2 } },
      { name: "Nova Scotia", utcOffset: -4, cities: { Halifax: -63.6 } },
    ],
  },
  {
    name: "United Kingdom",
    utcOffset: 0,
    regions: [
      { name: "England", cities: { London: -0.1, Manchester: -2.2, Birmingham: -1.9, Oxford: -1.3, Cambridge: 0.1 } },
      { name: "Scotland", cities: { Edinburgh: -3.2, Glasgow: -4.3 } },
      { name: "Wales", cities: { Cardiff: -3.2 } },
      { name: "Northern Ireland", cities: { Belfast: -5.9 } },
    ],
  },
  {
    name: "Australia",
    regions: [
      { name: "New South Wales", utcOffset: 10, cities: { Sydney: 151.2, Newcastle: 151.8 } },
      { name: "Victoria", utcOffset: 10, cities: { Melbourne: 145.0 } },
      { name: "Queensland", utcOffset: 10, cities: { Brisbane: 153.0, Cairns: 145.8 } },
      { name: "South Australia", utcOffset: 9.5, cities: { Adelaide: 138.6 } },
      { name: "Western Australia", utcOffset: 8, cities: { Perth: 115.9 } },
      { name: "Northern Territory", utcOffset: 9.5, cities: { Darwin: 130.8 } },
      { name: "Tasmania", utcOffset: 10, cities: { Hobart: 147.3 } },
      { name: "Australian Capital Territory", utcOffset: 10, cities: { Canberra: 149.1 } },
    ],
  },
  {
    name: "Japan",
    utcOffset: 9,
    regions: [
      { name: "Kanto", cities: { Tokyo: 139.7, Yokohama: 139.6 } },
      { name: "Kansai", cities: { Osaka: 135.5, Kyoto: 135.8, Kobe: 135.2 } },
      { name: "Chubu", cities: { Nagoya: 136.9 } },
      { name: "Hokkaido", cities: { Sapporo: 141.4 } },
      { name: "Kyushu", cities: { Fukuoka: 130.4 } },
    ],
  },
  {
    name: "South Korea",
    utcOffset: 9,
    regions: [
      { name: "Seoul Capital Area", cities: { Seoul: 127.0, Incheon: 126.7 } },
      { name: "Southeast", cities: { Busan: 129.1, Daegu: 128.6 } },
    ],
  },
  { name: "Singapore", utcOffset: 8, regions: [{ name: "Singapore", cities: { Singapore: 103.8 } }] },
  {
    name: "Malaysia",
    utcOffset: 8,
    regions: [
      { name: "Peninsular Malaysia", cities: { "Kuala Lumpur": 101.7, Penang: 100.3, "Johor Bahru": 103.8 } },
      { name: "East Malaysia", cities: { Kuching: 110.3, "Kota Kinabalu": 116.1 } },
    ],
  },
  {
    name: "Germany",
    utcOffset: 1,
    regions: [
      { name: "Berlin", cities: { Berlin: 13.4 } },
      { name: "Bavaria", cities: { Munich: 11.6 } },
      { name: "Hesse", cities: { Frankfurt: 8.7 } },
      { name: "Hamburg", cities: { Hamburg: 10.0 } },
      { name: "North Rhine-Westphalia", cities: { Cologne: 7.0 } },
    ],
  },
  {
    name: "France",
    utcOffset: 1,
    regions: [
      { name: "Île-de-France", cities: { Paris: 2.4 } },
      { name: "Auvergne-Rhône-Alpes", cities: { Lyon: 4.8 } },
      { name: "Provence-Alpes-Côte d'Azur", cities: { Marseille: 5.4, Nice: 7.3 } },
    ],
  },
  // Countries below list their main regions and cities; small ones have a single region.
  {
    name: "Argentina",
    utcOffset: -3,
    regions: [
      { name: "Buenos Aires", cities: { "Buenos Aires": -58.4 } },
      { name: "Córdoba", cities: { "Córdoba": -64.2 } },
    ],
  },
  oneRegion("Austria", 1, { Vienna: 16.4, Salzburg: 13.0 }),
  oneRegion("Bangladesh", 6, { Dhaka: 90.4 }),
  oneRegion("Belgium", 1, { Brussels: 4.4, Antwerp: 4.4 }),
  oneRegion("Bolivia", -4, { "La Paz": -68.1 }),
  {
    name: "Brazil",
    regions: [
      { name: "São Paulo", utcOffset: -3, cities: { "São Paulo": -46.6 } },
      { name: "Rio de Janeiro", utcOffset: -3, cities: { "Rio de Janeiro": -43.2 } },
      { name: "Federal District", utcOffset: -3, cities: { "Brasília": -47.9 } },
      { name: "Amazonas", utcOffset: -4, cities: { Manaus: -60.0 } },
    ],
  },
  oneRegion("Cambodia", 7, { "Phnom Penh": 104.9 }),
  oneRegion("Chile", -4, { Santiago: -70.7 }),
  oneRegion("Colombia", -5, { "Bogotá": -74.1, "Medellín": -75.6 }),
  oneRegion("Costa Rica", -6, { "San José": -84.1 }),
  oneRegion("Cuba", -5, { Havana: -82.4 }),
  oneRegion("Czechia", 1, { Prague: 14.4, Brno: 16.6 }),
  oneRegion("Denmark", 1, { Copenhagen: 12.6 }),
  oneRegion("Dominican Republic", -4, { "Santo Domingo": -69.9 }),
  oneRegion("Ecuador", -5, { Quito: -78.5 }),
  oneRegion("Egypt", 2, { Cairo: 31.2, Alexandria: 29.9 }),
  oneRegion("Ethiopia", 3, { "Addis Ababa": 38.8 }),
  oneRegion("Fiji", 12, { Suva: 178.4 }),
  oneRegion("Finland", 2, { Helsinki: 24.9 }),
  oneRegion("Ghana", 0, { Accra: -0.2 }),
  oneRegion("Greece", 2, { Athens: 23.7, Thessaloniki: 22.9 }),
  oneRegion("Guatemala", -6, { "Guatemala City": -90.5 }),
  oneRegion("Hungary", 1, { Budapest: 19.0 }),
  {
    name: "India",
    utcOffset: 5.5,
    regions: [
      { name: "Delhi", cities: { Delhi: 77.2 } },
      { name: "Karnataka", cities: { Bengaluru: 77.6 } },
      { name: "Maharashtra", cities: { Mumbai: 72.9, Pune: 73.9 } },
      { name: "Tamil Nadu", cities: { Chennai: 80.3 } },
      { name: "Telangana", cities: { Hyderabad: 78.5 } },
      { name: "West Bengal", cities: { Kolkata: 88.4 } },
    ],
  },
  {
    name: "Indonesia",
    regions: [
      { name: "Java", utcOffset: 7, cities: { Jakarta: 106.8, Surabaya: 112.8 } },
      { name: "Bali", utcOffset: 8, cities: { Denpasar: 115.2 } },
      { name: "Papua", utcOffset: 9, cities: { Jayapura: 140.7 } },
    ],
  },
  oneRegion("Iran", 3.5, { Tehran: 51.4 }),
  oneRegion("Iraq", 3, { Baghdad: 44.4 }),
  oneRegion("Ireland", 0, { Dublin: -6.3, Cork: -8.5 }),
  oneRegion("Israel", 2, { "Tel Aviv": 34.8, Jerusalem: 35.2 }),
  {
    name: "Italy",
    utcOffset: 1,
    regions: [
      { name: "Lazio", cities: { Rome: 12.5 } },
      { name: "Lombardy", cities: { Milan: 9.2 } },
      { name: "Campania", cities: { Naples: 14.3 } },
      { name: "Tuscany", cities: { Florence: 11.3 } },
      { name: "Veneto", cities: { Venice: 12.3 } },
    ],
  },
  oneRegion("Jamaica", -5, { Kingston: -76.8 }),
  oneRegion("Kazakhstan", 5, { Almaty: 76.9, Astana: 71.4 }),
  oneRegion("Kenya", 3, { Nairobi: 36.8 }),
  oneRegion("Kuwait", 3, { "Kuwait City": 48.0 }),
  oneRegion("Laos", 7, { Vientiane: 102.6 }),
  {
    name: "Mexico",
    regions: [
      { name: "Mexico City", utcOffset: -6, cities: { "Mexico City": -99.1 } },
      { name: "Jalisco", utcOffset: -6, cities: { Guadalajara: -103.3 } },
      { name: "Nuevo León", utcOffset: -6, cities: { Monterrey: -100.3 } },
      { name: "Baja California", utcOffset: -8, cities: { Tijuana: -117.0 } },
    ],
  },
  oneRegion("Mongolia", 8, { Ulaanbaatar: 106.9 }),
  oneRegion("Morocco", 0, { Casablanca: -7.6, Rabat: -6.8 }),
  oneRegion("Myanmar", 6.5, { Yangon: 96.2 }),
  oneRegion("Nepal", 5.75, { Kathmandu: 85.3 }),
  {
    name: "Netherlands",
    utcOffset: 1,
    regions: [
      { name: "North Holland", cities: { Amsterdam: 4.9 } },
      { name: "South Holland", cities: { Rotterdam: 4.5, "The Hague": 4.3 } },
    ],
  },
  {
    name: "New Zealand",
    utcOffset: 12,
    regions: [
      { name: "North Island", cities: { Auckland: 174.8, Wellington: 174.8 } },
      { name: "South Island", cities: { Christchurch: 172.6 } },
    ],
  },
  oneRegion("Nigeria", 1, { Lagos: 3.4, Abuja: 7.5 }),
  oneRegion("North Korea", 9, { Pyongyang: 125.8 }),
  oneRegion("Norway", 1, { Oslo: 10.8, Bergen: 5.3 }),
  oneRegion("Pakistan", 5, { Karachi: 67.0, Lahore: 74.3, Islamabad: 73.1 }),
  oneRegion("Panama", -5, { "Panama City": -79.5 }),
  oneRegion("Peru", -5, { Lima: -77.0 }),
  {
    name: "Philippines",
    utcOffset: 8,
    regions: [
      { name: "Luzon", cities: { Manila: 121.0 } },
      { name: "Visayas", cities: { Cebu: 123.9 } },
      { name: "Mindanao", cities: { Davao: 125.6 } },
    ],
  },
  oneRegion("Poland", 1, { Warsaw: 21.0, "Kraków": 19.9 }),
  oneRegion("Portugal", 0, { Lisbon: -9.1, Porto: -8.6 }),
  oneRegion("Qatar", 3, { Doha: 51.5 }),
  oneRegion("Romania", 2, { Bucharest: 26.1 }),
  {
    name: "Russia",
    regions: [
      { name: "Central", utcOffset: 3, cities: { Moscow: 37.6 } },
      { name: "Northwest", utcOffset: 3, cities: { "Saint Petersburg": 30.3 } },
      { name: "Urals", utcOffset: 5, cities: { Yekaterinburg: 60.6 } },
      { name: "Siberia", utcOffset: 7, cities: { Novosibirsk: 82.9 } },
      { name: "Far East", utcOffset: 10, cities: { Vladivostok: 131.9 } },
    ],
  },
  oneRegion("Saudi Arabia", 3, { Riyadh: 46.7, Jeddah: 39.2 }),
  {
    name: "South Africa",
    utcOffset: 2,
    regions: [
      { name: "Gauteng", cities: { Johannesburg: 28.0, Pretoria: 28.2 } },
      { name: "Western Cape", cities: { "Cape Town": 18.4 } },
      { name: "KwaZulu-Natal", cities: { Durban: 31.0 } },
    ],
  },
  {
    name: "Spain",
    utcOffset: 1,
    regions: [
      { name: "Madrid", cities: { Madrid: -3.7 } },
      { name: "Catalonia", cities: { Barcelona: 2.2 } },
      { name: "Andalusia", cities: { Seville: -6.0 } },
    ],
  },
  oneRegion("Sri Lanka", 5.5, { Colombo: 79.9 }),
  oneRegion("Sweden", 1, { Stockholm: 18.1, Gothenburg: 12.0 }),
  oneRegion("Switzerland", 1, { Zurich: 8.5, Geneva: 6.1 }),
  oneRegion("Tanzania", 3, { "Dar es Salaam": 39.3 }),
  oneRegion("Thailand", 7, { Bangkok: 100.5, "Chiang Mai": 99.0, Phuket: 98.4 }),
  oneRegion("Turkey", 3, { Istanbul: 29.0, Ankara: 32.9 }),
  oneRegion("Ukraine", 2, { Kyiv: 30.5, Lviv: 24.0 }),
  oneRegion("United Arab Emirates", 4, { Dubai: 55.3, "Abu Dhabi": 54.4 }),
  oneRegion("Uruguay", -3, { Montevideo: -56.2 }),
  oneRegion("Uzbekistan", 5, { Tashkent: 69.3 }),
  oneRegion("Venezuela", -4, { Caracas: -66.9 }),
  oneRegion("Vietnam", 7, { Hanoi: 105.8, "Ho Chi Minh City": 106.7, "Da Nang": 108.2 }),
];

BIRTH_COUNTRIES.sort((a, b) => a.name.localeCompare(b.name));

function oneRegion(name, utcOffset, cities) {
  return { name, utcOffset, regions: [{ name, cities }] };
}

// The place for { country, region, city }, or null if it isn't complete or isn't listed.
function findBirthPlace(selection) {
  if (!selection) return null;
  const country = BIRTH_COUNTRIES.find((c) => c.name === selection.country);
  const region = country && country.regions.find((r) => r.name === selection.region);
  const longitude = region && region.cities[selection.city];
  if (longitude === undefined || longitude === null) return null;
  return {
    name: `${selection.city}, ${country.name}`,
    longitude,
    utcOffset: region.utcOffset ?? country.utcOffset,
  };
}

// Finds a city from the old single-list ids such as "losangeles", so saved charts keep their place.
function placeFromLegacyId(placeId) {
  const normalize = (name) => name.toLowerCase().replace(/[^a-z]/g, "");
  for (const country of BIRTH_COUNTRIES) {
    for (const region of country.regions) {
      const city = Object.keys(region.cities).find((name) => normalize(name) === placeId);
      if (city) return { country: country.name, region: region.name, city };
    }
  }
  return null;
}
