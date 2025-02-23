// Initialize the map
const map = L.map('map').setView([10.1632, 76.6413], 13); // Coordinates for Aluva-Thrissur route

// Add OpenStreetMap tiles with better styling
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    minZoom: 8,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Custom icon for bus stops
const busStopIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Add markers for Aluva and Thrissur with custom icons and popups
const aluva = L.marker([10.1004, 76.3571], { icon: busStopIcon })
    .bindPopup('<b>Aluva Bus Station</b><br>Starting Point<br>Departure: 9:10 AM')
    .addTo(map);

const thrissur = L.marker([10.5276, 76.2144], { icon: busStopIcon })
    .bindPopup('<b>Thrissur Bus Station</b><br>Destination<br>Arrival: 11:00 AM')
    .addTo(map);

// Add intermediate stops
const intermediateStops = [
    { coords: [10.2558, 76.2845], name: 'Angamaly', time: '9:35 AM' },
    { coords: [10.3389, 76.2150], name: 'Chalakudy', time: '10:15 AM' },
];

intermediateStops.forEach(stop => {
    L.marker(stop.coords, { icon: busStopIcon })
        .bindPopup(`<b>${stop.name} Bus Stop</b><br>Expected Time: ${stop.time}`)
        .addTo(map);
});

// Draw route line with animation
const routePoints = [
    [10.1004, 76.3571], // Aluva
    ...intermediateStops.map(stop => stop.coords),
    [10.5276, 76.2144]  // Thrissur
];

const routeLine = L.polyline(routePoints, {
    color: '#2196F3',
    weight: 4,
    opacity: 0.8,
    lineCap: 'round',
    lineJoin: 'round',
    dashArray: '10, 10',
    dashOffset: '0'
}).addTo(map);

// Animate the route line
let offset = 0;
function animateLine() {
    offset = (offset - 1) % 20;
    routeLine.setStyle({ dashOffset: offset.toString() });
    requestAnimationFrame(animateLine);
}
animateLine();

// Fit map to show the entire route with padding
map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

// User location handling
let userMarker = null;
let userAccuracyCircle = null;

// Handle locate button click
document.querySelector('.locate-btn').addEventListener('click', () => {
    map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
});

// Handle location found event
map.on('locationfound', (e) => {
    // Remove existing user location markers
    if (userMarker) map.removeLayer(userMarker);
    if (userAccuracyCircle) map.removeLayer(userAccuracyCircle);

    // Add accuracy circle
    userAccuracyCircle = L.circle(e.latlng, {
        radius: e.accuracy / 2,
        color: '#4CAF50',
        fillColor: '#4CAF50',
        fillOpacity: 0.15,
        weight: 2
    }).addTo(map);

    // Add user marker
    userMarker = L.marker(e.latlng, {
        icon: L.divIcon({
            className: 'user-marker',
            html: '<div style="background-color: #4CAF50; border: 2px solid white; border-radius: 50%; width: 12px; height: 12px; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>'
        })
    }).addTo(map)
        .bindPopup('You are here')
        .openPopup();
});

// Handle location error
map.on('locationerror', (e) => {
    alert('Unable to find your location. Please check your device settings and try again.');
});

// Add scale control
L.control.scale({
    imperial: false,
    position: 'bottomright'
}).addTo(map);

// Add zoom controls
map.zoomControl.setPosition('bottomright');