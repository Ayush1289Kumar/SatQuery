export interface HistoricalData {
  year: number;
  vegetationIndex?: number;
  waterLevel?: number;
  urbanDensity?: number;
}

export interface CityData {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  history: HistoricalData[];
  description: string;
}

export interface StateData {
  id: string;
  name: string;
  cities: CityData[];
}

/** Deterministic, plausible-looking 3-year trend so we don't hand-author
 * history numbers for 140+ cities. Not real data — demo/mock only. */
function trend(seed: number): HistoricalData[] {
  const veg = 35 + (seed % 45);
  const water = 30 + ((seed * 7) % 55);
  const urban = 40 + ((seed * 13) % 50);
  return [2021, 2022, 2023].map((year, i) => ({
    year,
    vegetationIndex: Math.max(8, Math.round(veg - i * (1.5 + (seed % 4)))),
    waterLevel: Math.max(8, Math.round(water - i * (1 + (seed % 3)))),
    urbanDensity: Math.min(97, Math.round(urban + i * (1.5 + (seed % 3)))),
  }));
}

interface RawCity {
  id: string;
  name: string;
  lng: number;
  lat: number;
  description: string;
}

function city(seed: number, raw: RawCity): CityData {
  return {
    id: raw.id,
    name: raw.name,
    coordinates: [raw.lng, raw.lat],
    description: raw.description,
    history: trend(seed),
  };
}

function state(id: string, name: string, cities: [number, RawCity][]): StateData {
  return { id, name, cities: cities.map(([seed, raw]) => city(seed, raw)) };
}

export const INDIA_STATES: StateData[] = [
  state('ap', 'Andhra Pradesh', [
    [1, { id: 'vis', name: 'Visakhapatnam', lng: 83.2185, lat: 17.6868, description: 'Major port city with coastal erosion and industrial expansion under watch.' }],
    [2, { id: 'vij', name: 'Vijayawada', lng: 80.6480, lat: 16.5062, description: 'River-delta city facing seasonal flood risk from the Krishna river.' }],
    [3, { id: 'gnt', name: 'Guntur', lng: 80.4365, lat: 16.3067, description: 'Agricultural hub for cotton and chilli, sensitive to drought signals.' }],
    [4, { id: 'tir', name: 'Tirupati', lng: 79.4192, lat: 13.6288, description: 'Pilgrimage city with rapid built-up growth around temple corridors.' }],
  ]),
  state('ar', 'Arunachal Pradesh', [
    [5, { id: 'itn', name: 'Itanagar', lng: 93.6053, lat: 27.0844, description: 'Capital city in a landslide-prone Himalayan foothill zone.' }],
    [6, { id: 'nhl', name: 'Naharlagun', lng: 93.6950, lat: 27.1040, description: 'Twin city to Itanagar with encroaching hillside settlements.' }],
    [7, { id: 'psg', name: 'Pasighat', lng: 95.3259, lat: 28.0670, description: 'Riverine town on the Siang, monitored for bank erosion.' }],
    [8, { id: 'twn', name: 'Tawang', lng: 91.8666, lat: 27.5859, description: 'High-altitude town with glacial and snow-cover change of interest.' }],
  ]),
  state('as', 'Assam', [
    [9, { id: 'guw', name: 'Guwahati', lng: 91.7362, lat: 26.1445, description: 'Brahmaputra-side metro with recurring monsoon flood extent mapping.' }],
    [10, { id: 'sil', name: 'Silchar', lng: 92.7789, lat: 24.8333, description: 'Barak valley city prone to seasonal waterlogging.' }],
    [11, { id: 'dib', name: 'Dibrugarh', lng: 94.9120, lat: 27.4728, description: 'Tea-belt city with river-bank shifting along the Brahmaputra.' }],
    [12, { id: 'jor', name: 'Jorhat', lng: 94.2037, lat: 26.7509, description: 'Agricultural town tracking cropland change near tea estates.' }],
  ]),
  state('br', 'Bihar', [
    [13, { id: 'pat', name: 'Patna', lng: 85.1376, lat: 25.5941, description: 'State capital on the Ganges, monitored for annual flood extent.' }],
    [14, { id: 'gay', name: 'Gaya', lng: 85.0002, lat: 24.7955, description: 'Historic city with expanding peri-urban settlement.' }],
    [15, { id: 'bhg', name: 'Bhagalpur', lng: 87.0086, lat: 25.2445, description: 'Riverside silk city with shifting Ganges sandbars nearby.' }],
    [16, { id: 'muz', name: 'Muzaffarpur', lng: 85.3910, lat: 26.1225, description: 'North Bihar town with recurring flood-plain inundation.' }],
  ]),
  state('cg', 'Chhattisgarh', [
    [17, { id: 'rai', name: 'Raipur', lng: 81.6296, lat: 21.2514, description: 'State capital with steady industrial and built-up expansion.' }],
    [18, { id: 'bhl', name: 'Bhilai', lng: 81.3509, lat: 21.1938, description: 'Steel-town with land-use change around plant infrastructure.' }],
    [19, { id: 'bil', name: 'Bilaspur', lng: 82.1391, lat: 22.0797, description: 'Regional hub tracking forest-edge encroachment.' }],
    [20, { id: 'kor', name: 'Korba', lng: 82.6963, lat: 22.3595, description: 'Coal and power-belt city with mining-linked land change.' }],
  ]),
  state('ga', 'Goa', [
    [21, { id: 'pan', name: 'Panaji', lng: 73.8278, lat: 15.4909, description: 'Coastal capital with tourism-driven coastline change.' }],
    [22, { id: 'mar', name: 'Margao', lng: 73.9581, lat: 15.2832, description: 'Commercial hub with expanding built-up footprint.' }],
    [23, { id: 'vsc', name: 'Vasco da Gama', lng: 73.8151, lat: 15.3981, description: 'Port town with harbour-adjacent land reclamation.' }],
    [24, { id: 'map', name: 'Mapusa', lng: 73.8079, lat: 15.5937, description: 'North Goa market town with agricultural-to-urban conversion.' }],
  ]),
  state('gj', 'Gujarat', [
    [25, { id: 'amd', name: 'Ahmedabad', lng: 72.5714, lat: 23.0225, description: 'Major metro tracked for rapid built-up and heat-island growth.' }],
    [26, { id: 'sur', name: 'Surat', lng: 72.8311, lat: 21.1702, description: 'Textile and diamond hub with fast riverside urban expansion.' }],
    [27, { id: 'vad', name: 'Vadodara', lng: 73.1812, lat: 22.3072, description: 'Industrial city with steady peri-urban land conversion.' }],
    [28, { id: 'rjk', name: 'Rajkot', lng: 70.8022, lat: 22.3039, description: 'Saurashtra hub monitored for groundwater and drought stress.' }],
  ]),
  state('hr', 'Haryana', [
    [29, { id: 'gur', name: 'Gurugram', lng: 77.0266, lat: 28.4595, description: 'NCR satellite city with among the fastest built-up growth in India.' }],
    [30, { id: 'far', name: 'Faridabad', lng: 77.3178, lat: 28.4089, description: 'Industrial NCR city with dense built-up expansion.' }],
    [31, { id: 'pan2', name: 'Panipat', lng: 76.9635, lat: 29.3909, description: 'Textile town tracked for cropland-to-industrial conversion.' }],
    [32, { id: 'krn', name: 'Karnal', lng: 76.9905, lat: 29.6857, description: 'Agricultural belt monitored for irrigation and crop-stress signals.' }],
  ]),
  state('hp', 'Himachal Pradesh', [
    [33, { id: 'shm', name: 'Shimla', lng: 77.1734, lat: 31.1048, description: 'Hill-station capital with landslide and construction-density concerns.' }],
    [34, { id: 'man', name: 'Manali', lng: 77.1892, lat: 32.2432, description: 'Tourist town near glacial zones with seasonal snow-cover change.' }],
    [35, { id: 'dhr', name: 'Dharamshala', lng: 76.3234, lat: 32.2190, description: 'Foothill town monitored for forest-cover and slope stability.' }],
    [36, { id: 'sol', name: 'Solan', lng: 77.0999, lat: 30.9045, description: 'Industrial hill town with expanding built-up terraces.' }],
  ]),
  state('jh', 'Jharkhand', [
    [37, { id: 'ran', name: 'Ranchi', lng: 85.3096, lat: 23.3441, description: 'State capital with plateau land-cover and reservoir monitoring.' }],
    [38, { id: 'jsr', name: 'Jamshedpur', lng: 86.2029, lat: 22.8046, description: 'Steel city with industrial land-use and river-quality tracking.' }],
    [39, { id: 'dhn', name: 'Dhanbad', lng: 86.4304, lat: 23.7957, description: 'Coalfield city with mining subsidence and land-scarring concerns.' }],
    [40, { id: 'bok', name: 'Bokaro', lng: 86.1511, lat: 23.6693, description: 'Steel-town tracked for industrial expansion near the Damodar.' }],
  ]),
  state('ka', 'Karnataka', [
    [41, { id: 'blr', name: 'Bengaluru', lng: 77.5946, lat: 12.9716, description: 'Silicon Valley of India facing vanishing lakes and green-cover loss.' }],
    [42, { id: 'mys', name: 'Mysuru', lng: 76.6394, lat: 12.2958, description: 'Heritage city with steady peri-urban agricultural conversion.' }],
    [43, { id: 'mng', name: 'Mangaluru', lng: 74.8560, lat: 12.9141, description: 'Coastal port city with monsoon flood and coastline tracking.' }],
    [44, { id: 'hbl', name: 'Hubballi', lng: 75.1240, lat: 15.3647, description: 'Twin-city hub with expanding industrial land-use.' }],
  ]),
  state('kl', 'Kerala', [
    [45, { id: 'koc', name: 'Kochi', lng: 76.2673, lat: 9.9312, description: 'Backwater port city monitored for wetland loss and flood extent.' }],
    [46, { id: 'tvm', name: 'Thiruvananthapuram', lng: 76.9366, lat: 8.5241, description: 'Capital city with coastal erosion along its shoreline.' }],
    [47, { id: 'koz', name: 'Kozhikode', lng: 75.7804, lat: 11.2588, description: 'Coastal city tracked for monsoon flooding and land-slide risk nearby.' }],
    [48, { id: 'kol', name: 'Kollam', lng: 76.6141, lat: 8.8932, description: 'Backwater town with seasonal water-body extent change.' }],
  ]),
  state('mp', 'Madhya Pradesh', [
    [49, { id: 'bho', name: 'Bhopal', lng: 77.4126, lat: 23.2599, description: 'Lake city monitored for water-body health and encroachment.' }],
    [50, { id: 'ind', name: 'Indore', lng: 75.8577, lat: 22.7196, description: 'Fast-growing metro tracked for built-up sprawl.' }],
    [51, { id: 'gwl', name: 'Gwalior', lng: 78.1828, lat: 26.2183, description: 'Historic city with expanding urban fringe.' }],
    [52, { id: 'jbp', name: 'Jabalpur', lng: 79.9864, lat: 23.1815, description: 'Narmada-side city monitored for riverbank change.' }],
  ]),
  state('mh', 'Maharashtra', [
    [53, { id: 'mum', name: 'Mumbai', lng: 72.8777, lat: 19.0760, description: 'Coastal megacity showing rapid urban expansion and changing coastline dynamics.' }],
    [54, { id: 'pun', name: 'Pune', lng: 73.8567, lat: 18.5204, description: 'Growing IT hub with significant shifts in peri-urban agricultural lands.' }],
    [55, { id: 'ngp', name: 'Nagpur', lng: 79.0882, lat: 21.1458, description: 'Central India hub tracked for green-cover and lake health.' }],
    [56, { id: 'nsk', name: 'Nashik', lng: 73.7898, lat: 19.9975, description: 'Vineyard belt monitored for irrigation and drought stress.' }],
  ]),
  state('mn', 'Manipur', [
    [57, { id: 'imp', name: 'Imphal', lng: 93.9063, lat: 24.8170, description: 'Valley capital near Loktak lake, tracked for wetland change.' }],
    [58, { id: 'tho', name: 'Thoubal', lng: 94.0154, lat: 24.6333, description: 'Agricultural town monitored for cropland shifts.' }],
    [59, { id: 'bis', name: 'Bishnupur', lng: 93.7581, lat: 24.6333, description: 'Lakeside town near Loktak with floating-biomass monitoring.' }],
    [60, { id: 'chu', name: 'Churachandpur', lng: 93.6833, lat: 24.3333, description: 'Hill town tracked for forest-cover and slope change.' }],
  ]),
  state('ml', 'Meghalaya', [
    [61, { id: 'shl', name: 'Shillong', lng: 91.8933, lat: 25.5788, description: 'Hill capital with dense cloud cover, well-suited to SAR monitoring.' }],
    [62, { id: 'tur', name: 'Tura', lng: 90.2201, lat: 25.5138, description: 'Garo Hills town tracked for forest-cover change.' }],
    [63, { id: 'jow', name: 'Jowai', lng: 92.2033, lat: 25.4500, description: 'Plateau town with limestone-quarry land-scarring.' }],
    [64, { id: 'non', name: 'Nongstoin', lng: 91.2667, lat: 25.5167, description: 'Western hills town monitored for shifting cultivation patterns.' }],
  ]),
  state('mz', 'Mizoram', [
    [65, { id: 'aiz', name: 'Aizawl', lng: 92.7176, lat: 23.7271, description: 'Ridge-top capital tracked for slope stability and built-up growth.' }],
    [66, { id: 'lun', name: 'Lunglei', lng: 92.7353, lat: 22.8879, description: 'Southern hill town monitored for jhum-cultivation cycles.' }],
    [67, { id: 'cha', name: 'Champhai', lng: 93.3286, lat: 23.4667, description: 'Border town tracked for agricultural terrace expansion.' }],
    [68, { id: 'ser', name: 'Serchhip', lng: 92.8500, lat: 23.3000, description: 'Central hill town with forest-regrowth monitoring.' }],
  ]),
  state('nl', 'Nagaland', [
    [69, { id: 'koh', name: 'Kohima', lng: 94.1077, lat: 25.6751, description: 'Hill capital tracked for terrace-farming and slope change.' }],
    [70, { id: 'dim', name: 'Dimapur', lng: 93.7267, lat: 25.9091, description: 'Valley commercial hub with fastest built-up growth in the state.' }],
    [71, { id: 'mok', name: 'Mokokchung', lng: 94.5167, lat: 26.3167, description: 'Northern hill town monitored for shifting cultivation.' }],
    [72, { id: 'tue', name: 'Tuensang', lng: 94.8333, lat: 26.2833, description: 'Eastern district town tracked for forest-edge change.' }],
  ]),
  state('od', 'Odisha', [
    [73, { id: 'bbs', name: 'Bhubaneswar', lng: 85.8245, lat: 20.2961, description: 'Capital city with expanding built-up ring and lake monitoring.' }],
    [74, { id: 'ctc', name: 'Cuttack', lng: 85.8830, lat: 20.4625, description: 'Delta city monitored for Mahanadi flood extent.' }],
    [75, { id: 'rkl', name: 'Rourkela', lng: 84.8536, lat: 22.2604, description: 'Steel city tracked for industrial land-use change.' }],
    [76, { id: 'pur', name: 'Puri', lng: 85.8312, lat: 19.8135, description: 'Coastal pilgrimage town monitored for shoreline erosion.' }],
  ]),
  state('pb', 'Punjab', [
    [77, { id: 'asr', name: 'Amritsar', lng: 74.8723, lat: 31.6340, description: 'Border city tracked for cropland and stubble-burning signals.' }],
    [78, { id: 'ldh', name: 'Ludhiana', lng: 75.8573, lat: 30.9010, description: 'Industrial hub monitored for river-quality along the Sutlej.' }],
    [79, { id: 'jal', name: 'Jalandhar', lng: 75.5762, lat: 31.3260, description: 'Agricultural belt tracked for irrigation-water stress.' }],
    [80, { id: 'pat2', name: 'Patiala', lng: 76.3869, lat: 30.3398, description: 'Historic city with steady peri-urban cropland conversion.' }],
  ]),
  state('rj', 'Rajasthan', [
    [81, { id: 'jai', name: 'Jaipur', lng: 75.7873, lat: 26.9124, description: 'Capital city tracked for rapid built-up sprawl into arid land.' }],
    [82, { id: 'jdh', name: 'Jodhpur', lng: 73.0243, lat: 26.2389, description: 'Desert city monitored for groundwater depletion signals.' }],
    [83, { id: 'udr', name: 'Udaipur', lng: 73.7125, lat: 24.5854, description: 'Lake city tracked for seasonal water-body extent.' }],
    [84, { id: 'kot', name: 'Kota', lng: 75.8648, lat: 25.2138, description: 'Riverside industrial hub monitored along the Chambal.' }],
  ]),
  state('sk', 'Sikkim', [
    [85, { id: 'gtk', name: 'Gangtok', lng: 88.6138, lat: 27.3389, description: 'Himalayan capital tracked for glacial-lake and slope monitoring.' }],
    [86, { id: 'nam', name: 'Namchi', lng: 88.3639, lat: 27.1667, description: 'South Sikkim town monitored for terrace-farming change.' }],
    [87, { id: 'gyl', name: 'Gyalshing', lng: 88.2667, lat: 27.2833, description: 'West Sikkim town tracked for forest-cover change.' }],
    [88, { id: 'man2', name: 'Mangan', lng: 88.5333, lat: 27.5167, description: 'North Sikkim town near glacial-lake outburst-flood watch zones.' }],
  ]),
  state('tn', 'Tamil Nadu', [
    [89, { id: 'che', name: 'Chennai', lng: 80.2707, lat: 13.0827, description: 'Coastal metro tracked for cyclone-linked flood extent and coastline change.' }],
    [90, { id: 'cbe', name: 'Coimbatore', lng: 76.9558, lat: 11.0168, description: 'Industrial hub monitored for reservoir and groundwater levels.' }],
    [91, { id: 'mdu', name: 'Madurai', lng: 78.1198, lat: 9.9252, description: 'Temple city tracked for peri-urban built-up growth.' }],
    [92, { id: 'trc', name: 'Tiruchirappalli', lng: 78.7047, lat: 10.7905, description: 'Riverside city monitored along the Cauvery basin.' }],
  ]),
  state('tg', 'Telangana', [
    [93, { id: 'hyd', name: 'Hyderabad', lng: 78.4867, lat: 17.3850, description: 'IT hub tracked for lake encroachment and rapid built-up sprawl.' }],
    [94, { id: 'wgl', name: 'Warangal', lng: 79.5941, lat: 17.9689, description: 'Historic city monitored for reservoir and tank-irrigation health.' }],
    [95, { id: 'nzb', name: 'Nizamabad', lng: 78.0941, lat: 18.6725, description: 'Agricultural town tracked for cropland-water stress.' }],
    [96, { id: 'krm', name: 'Karimnagar', lng: 79.1288, lat: 18.4386, description: 'Northern Telangana town monitored for irrigation-tank levels.' }],
  ]),
  state('tr', 'Tripura', [
    [97, { id: 'aga', name: 'Agartala', lng: 91.2868, lat: 23.8315, description: 'Capital city tracked for built-up growth near the Bangladesh border.' }],
    [98, { id: 'uda', name: 'Udaipur (TR)', lng: 91.4830, lat: 23.5333, description: 'Lake town monitored for seasonal water-body change.' }],
    [99, { id: 'dhm', name: 'Dharmanagar', lng: 92.1667, lat: 24.3667, description: 'Northern border town tracked for forest-edge change.' }],
    [100, { id: 'kai', name: 'Kailashahar', lng: 92.0000, lat: 24.3333, description: 'Frontier town monitored for cropland conversion.' }],
  ]),
  state('up', 'Uttar Pradesh', [
    [101, { id: 'lko', name: 'Lucknow', lng: 80.9462, lat: 26.8467, description: 'Capital city tracked for rapid ring-road built-up expansion.' }],
    [102, { id: 'kmp', name: 'Kanpur', lng: 80.3319, lat: 26.4499, description: 'Industrial city monitored for Ganges water-quality signals.' }],
    [103, { id: 'vns', name: 'Varanasi', lng: 82.9739, lat: 25.3176, description: 'Riverfront city tracked for ghats and flood-extent change.' }],
    [104, { id: 'agr', name: 'Agra', lng: 78.0081, lat: 27.1767, description: 'Heritage city monitored for haze and built-up encroachment near monuments.' }],
  ]),
  state('uk', 'Uttarakhand', [
    [105, { id: 'ddn', name: 'Dehradun', lng: 78.0322, lat: 30.3165, description: 'Capital city tracked for forest-edge and valley urban growth.' }],
    [106, { id: 'hrd', name: 'Haridwar', lng: 78.1642, lat: 29.9457, description: 'Riverside pilgrimage town monitored for Ganges flood extent.' }],
    [107, { id: 'nnt', name: 'Nainital', lng: 79.4636, lat: 29.3803, description: 'Lake town tracked for water-body health and slope stability.' }],
    [108, { id: 'rsk', name: 'Rishikesh', lng: 78.2676, lat: 30.0869, description: 'Foothill town monitored for river-course and forest change.' }],
  ]),
  state('wb', 'West Bengal', [
    [109, { id: 'kol2', name: 'Kolkata', lng: 88.3639, lat: 22.5726, description: 'Delta megacity tracked for wetland loss and cyclone flood extent.' }],
    [110, { id: 'how', name: 'Howrah', lng: 88.3105, lat: 22.5958, description: 'Twin-city hub monitored for Hooghly riverbank change.' }],
    [111, { id: 'sil2', name: 'Siliguri', lng: 88.4297, lat: 26.7271, description: 'Gateway city tracked for forest-edge and flood-plain shifts.' }],
    [112, { id: 'drg', name: 'Durgapur', lng: 87.3119, lat: 23.5204, description: 'Industrial town monitored for land-use and river-quality change.' }],
  ]),
  state('dl', 'Delhi', [
    [113, { id: 'ndl', name: 'New Delhi', lng: 77.2090, lat: 28.6139, description: 'Capital region exhibiting severe winter smog patterns visible from space.' }],
    [114, { id: 'dwk', name: 'Dwarka', lng: 77.0460, lat: 28.5921, description: 'Planned sub-city tracked for rapid residential built-up growth.' }],
    [115, { id: 'rhn', name: 'Rohini', lng: 77.1025, lat: 28.7041, description: 'North Delhi zone monitored for green-cover and density change.' }],
    [116, { id: 'ndc', name: 'Najafgarh', lng: 76.9797, lat: 28.6092, description: 'Urban-fringe zone tracked for wetland and drain encroachment.' }],
  ]),
  state('jk', 'Jammu & Kashmir', [
    [117, { id: 'srn', name: 'Srinagar', lng: 74.7973, lat: 34.0837, description: 'Valley city tracked for Dal Lake extent and snow-cover change.' }],
    [118, { id: 'jmu', name: 'Jammu', lng: 74.8570, lat: 32.7266, description: 'Winter capital monitored for built-up growth along the Tawi.' }],
    [119, { id: 'ant', name: 'Anantnag', lng: 75.1487, lat: 33.7311, description: 'South Kashmir town tracked for orchard and cropland change.' }],
    [120, { id: 'bml', name: 'Baramulla', lng: 74.3436, lat: 34.2096, description: 'Jhelum-side town monitored for riverbank and flood-plain shifts.' }],
  ]),
  state('la', 'Ladakh', [
    [121, { id: 'leh', name: 'Leh', lng: 77.5771, lat: 34.1526, description: 'High-altitude town tracked for glacier retreat and meltwater change.' }],
    [122, { id: 'krg', name: 'Kargil', lng: 76.1349, lat: 34.5539, description: 'Border town monitored for seasonal river-flow change.' }],
  ]),
  state('py', 'Puducherry', [
    [123, { id: 'pdy', name: 'Puducherry', lng: 79.8083, lat: 11.9416, description: 'Coastal town tracked for shoreline erosion and built-up growth.' }],
    [124, { id: 'krk', name: 'Karaikal', lng: 79.8380, lat: 10.9254, description: 'Delta enclave monitored for flood extent and coastal change.' }],
  ]),
  state('ch', 'Chandigarh', [
    [125, { id: 'chd', name: 'Chandigarh', lng: 76.7794, lat: 30.7333, description: 'Planned city tracked for green-cover retention amid regional sprawl.' }],
  ]),
  state('an', 'Andaman & Nicobar Islands', [
    [126, { id: 'pbr', name: 'Port Blair', lng: 92.7265, lat: 11.6234, description: 'Island capital tracked for mangrove extent and coastline change.' }],
  ]),
  state('dd', 'Dadra, Nagar Haveli, Daman & Diu', [
    [127, { id: 'dmn', name: 'Daman', lng: 72.8397, lat: 20.3974, description: 'Coastal enclave monitored for industrial land-use growth.' }],
    [128, { id: 'slv', name: 'Silvassa', lng: 73.0169, lat: 20.2766, description: 'Industrial town tracked for forest-to-built-up conversion.' }],
  ]),
  state('lk', 'Lakshadweep', [
    [129, { id: 'kvr', name: 'Kavaratti', lng: 72.6420, lat: 10.5669, description: 'Atoll capital tracked for reef health and coastline change.' }],
  ]),
];