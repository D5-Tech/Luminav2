// Constants
const BUS_STOP_SEARCH_RADIUS = 1000; // in meters
const MAP_DEFAULT_ZOOM = 15;
const MAP_MAX_ZOOM = 19;

// Initialize map with default view
const map = L.map('map', {
    zoomControl: true,    // Keep zoom controls
    attributionControl: true
}).setView([51.505, -0.09], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: MAP_MAX_ZOOM
}).addTo(map);

// Define custom bus stop icon with an actual bus stop image
const busIcon = L.divIcon({
    className: 'custom-bus-icon',
    html: `
        <div class="bus-stop-marker">
            <img src="bus-stop-icon.png" alt="Bus Stop" class="bus-stop-image">
        </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
});

// Define updated user location icon
const userLocationIcon = L.divIcon({
    className: 'custom-location-icon',
    html: `
        <div class="current-location-marker">
            <div class="current-location-dot"></div>
            <div class="current-location-pulse"></div>
        </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// Store bus stops markers and current location marker
let busStopMarkers = [];
let currentLocationMarker = null;

// Function to find nearby bus stops using Overpass API
function findNearbyBusStops(lat, lon) {
    clearBusStopMarkers();
    
    const overpassQuery = `
        [out:json];
        node["highway"="bus_stop"](around:${BUS_STOP_SEARCH_RADIUS},${lat},${lon});
        out body;
    `;
    
    fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery
    })
    .then(response => response.json())
    .then(data => {
        if (data.elements.length === 0) {
            console.log('No bus stops found within 1km');
            return;
        }
        
        data.elements.forEach(node => {
            const busStopMarker = L.marker([node.lat, node.lon], { icon: busIcon })
                .addTo(map)
                .bindPopup(`
                    <div class="bus-stop-popup">
                        <strong>Bus Stop</strong>
                        ${node.tags.name ? `<div>${node.tags.name}</div>` : ''}
                        ${node.tags.ref ? `<div>Ref: ${node.tags.ref}</div>` : ''}
                    </div>
                `);
            
            busStopMarkers.push(busStopMarker);
        });
        
        if (busStopMarkers.length > 0) {
            const busStopGroup = L.featureGroup(busStopMarkers);
            map.fitBounds(busStopGroup.getBounds().pad(0.1));
        }
    })
    .catch(error => {
        console.error('Error fetching bus stops:', error);
    });
}

// Function to clear existing bus stop markers
function clearBusStopMarkers() {
    busStopMarkers.forEach(marker => map.removeLayer(marker));
    busStopMarkers = [];
}

// Function to handle location updates
function handleLocationUpdate(position) {
    const { latitude, longitude } = position.coords;
    
    if (currentLocationMarker) {
        currentLocationMarker.setLatLng([latitude, longitude]);
    } else {
        currentLocationMarker = L.marker([latitude, longitude], { icon: userLocationIcon }).addTo(map);
    }
    
    map.setView([latitude, longitude], MAP_DEFAULT_ZOOM);
    findNearbyBusStops(latitude, longitude);
    
    localStorage.setItem('lastLocation', JSON.stringify({ lat: latitude, lon: longitude }));
}

// Initialize map and request location immediately on page load
window.addEventListener('load', () => {
    if (navigator.geolocation) {
        // Request location immediately
        navigator.geolocation.getCurrentPosition(handleLocationUpdate, 
            error => {
                console.error('Error getting location:', error);
                alert('Unable to get your location. Please check your location permissions.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
        
        // Watch for location updates
        navigator.geolocation.watchPosition(handleLocationUpdate,
            error => {
                console.error('Error watching location:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        alert('Geolocation is not supported by your browser');
    }
    
    // Handle orientation changes
    window.addEventListener('resize', () => {
        map.invalidateSize();
    });
});