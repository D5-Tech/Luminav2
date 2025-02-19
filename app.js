// Global variables for map functionality
let map;
let userMarker;
let isLocationTracking = false;
let locationWatchId = null;

// Favicon fallback
const setFallbackFavicon = () => {
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB9UlEQVR4AWJwL/ABtGdmZjpAxX+g4XBzczENDQ0MDAwM/4GB/v7+/9HR0f/FxcX/xcXF/7m5uf+pqan/qamp/9nZ2f+5ubn/xcXF/8XFxf/R0dH/0dHR/wMDA/8DAwP/gYGB/4GB';
    document.getElementsByTagName('head')[0].appendChild(link);
};

// DOM Elements
const searchInput = document.querySelector('.search-input');
const searchOverlay = document.querySelector('.search-overlay');
const backButton = document.querySelector('.back-button');
const locationButton = document.getElementById('location-button');

// Search Functionality
searchInput.addEventListener('click', (e) => {
    if (window.innerWidth <= 375) {
        searchOverlay.hidden = false;
        document.querySelector('.search-overlay .search-input').focus();
    }
});

backButton.addEventListener('click', () => {
    searchOverlay.hidden = true;
});

// Location button functionality
locationButton.addEventListener('click', () => {
    toggleLocationTracking();
});

// Toggle location tracking
function toggleLocationTracking() {
    if (isLocationTracking) {
        stopLocationTracking();
    } else {
        startLocationTracking();
    }
    
    // Toggle active class
    locationButton.classList.toggle('active');
}

// Start tracking user location
function startLocationTracking() {
    console.log('Starting location tracking');
    isLocationTracking = true;
    
    if ("geolocation" in navigator) {
        // Add pulsing effect to button
        locationButton.classList.add('pulsing');
        
        locationWatchId = navigator.geolocation.watchPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                updateUserLocation(lat, lng);
                
                // Remove pulsing once we get the first position
                locationButton.classList.remove('pulsing');
            },
            function(error) {
                console.error("Geolocation tracking error:", error.message);
                stopLocationTracking();
                alert("Unable to track location: " + error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        alert("Geolocation is not supported by your browser");
        isLocationTracking = false;
    }
}

// Stop tracking user location
function stopLocationTracking() {
    console.log('Stopping location tracking');
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
    isLocationTracking = false;
    locationButton.classList.remove('pulsing');
}

// Update user marker on map with smooth animation
function updateUserLocation(lat, lng, animate = true) {
    if (!map) return;
    
    // If marker doesn't exist, create it
    if (!userMarker) {
        const customIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="pulse"></div>',
            iconSize: [20, 20]
        });

        userMarker = L.marker([lat, lng], {
            icon: customIcon
        }).addTo(map);
        
        // Initial set view - smooth if animate is true
        if (animate) {
            map.flyTo([lat, lng], 15, {
                duration: 2.5,
                easeLinearity: .25
            });
        } else {
            map.setView([lat, lng], 15);
        }
    } else {
        // Update existing marker position with animation
        userMarker.setLatLng([lat, lng]);
        
        // Only animate if requested and not already at the location
        if (animate) {
            const currentCenter = map.getCenter();
            const distance = map.distance(currentCenter, [lat, lng]);
            
            // Only animate if we're more than 50 meters away
            if (distance > 50) {
                map.flyTo([lat, lng], 15, {
                    duration: 1.5,
                    easeLinearity: 0.25
                });
            }
        }
    }
}

// Map initialization function
function initMap() {
    console.log('Initializing map...');
    try {
        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }

        // Initialize map with Kochi center
        map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView([10.0867, 76.3511], 13);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Get user location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Initial location setting - use smooth animation
                    updateUserLocation(lat, lng, true);
                    
                    // Add some sample bus stops
                    addBusStops();
                },
                function(error) {
                    console.log("Geolocation error:", error.message);
                    // Fall back to default location and add bus stops
                    addBusStops();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            console.log("Geolocation not supported");
            addBusStops();
        }

        // Force map to update its size
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Add sample bus stops to the map
function addBusStops() {
    const busStops = [
        { name: "Aluva Bus Stand", lat: 10.1004, lng: 76.3571 },
        { name: "Edapally Junction", lat: 10.0267, lng: 76.3084 },
        { name: "Kaloor Bus Stop", lat: 10.0007, lng: 76.2938 }
    ];

    busStops.forEach(stop => {
        const busIcon = L.divIcon({
            className: 'bus-stop-marker',
            html: '<i class="fas fa-bus" style="color: #4CAF50; font-size: 20px;"></i>',
            iconSize: [20, 20]
        });

        L.marker([stop.lat, stop.lng], { icon: busIcon })
            .bindPopup(stop.name)
            .addTo(map);
    });
}

// Location box click handler with smooth animation
document.querySelector('.location-box').addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Location box clicked');
    if (map && userMarker) {
        // Use flyTo for smooth animation
        map.flyTo(userMarker.getLatLng(), 15, {
            duration: 1.5,
            easeLinearity: 0.25
        });
    } else {
        map.flyTo([10.0867, 76.3511], 13, {
            duration: 1.5,
            easeLinearity: 0.25
        });
    }
});

// Bottom Navigation Functionality
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
    });
});

// Mobile Keyboard Detection
const originalViewport = document.querySelector('meta[name=viewport]');
const originalContent = originalViewport.content;

window.addEventListener('resize', () => {
    if (document.activeElement.tagName === 'INPUT') {
        originalViewport.content = 'width=device-width, initial-scale=1, maximum-scale=1';
    } else {
        originalViewport.content = originalContent;
    }
});

// Handle clicks on interactive elements
document.querySelectorAll('.feature-box, .stop-card, .location-box').forEach(element => {
    element.addEventListener('click', (e) => {
        console.log('Clicked:', element.className);
    });
});

// PWA Installation Handler
let deferredPrompt;
const installButton = document.getElementById('installButton');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.style.display = 'block';
});

async function installPWA() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
    installButton.style.display = 'none';
}

window.addEventListener('appinstalled', (e) => {
    console.log('PWA was installed');
    installButton.style.display = 'none';
});

// Add animations and styling for location button
const styleSheet = document.createElement('style');
styleSheet.textContent = `
.user-location-marker .pulse {
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.2);
        opacity: 0.7;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.location-button {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    width: 40px;
    height: 40px;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
}

.location-button:hover {
    background: #f5f5f5;
    transform: scale(1.05);
}

.location-button:active {
    transform: scale(0.95);
}

.location-button.active {
    background: var(--primary-color);
    color: white;
}

.location-button.pulsing {
    animation: buttonPulse 1.5s infinite;
}

@keyframes buttonPulse {
    0% {
        box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
    }
    70% {
        box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
    }
}

/* Add smooth animation to map movement */
.leaflet-fade-anim .leaflet-tile,
.leaflet-zoom-anim .leaflet-zoom-animated {
    will-change: auto !important;
    transition-property: transform, opacity;
    transition-duration: 0.25s;
}
`;
document.head.appendChild(styleSheet);

// Initialize map when the page loads
window.addEventListener('load', () => {
    initMap();
    setFallbackFavicon();
});