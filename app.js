// Global variables for map functionality
let map;
let userMarker;

// DOM Elements
const searchInput = document.querySelector('.search-input');
const searchOverlay = document.querySelector('.search-overlay');
const backButton = document.querySelector('.back-button');

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
                    
                    // Update map view to user location
                    map.setView([lat, lng], 15);
                    
                    // Add user marker with custom icon
                    const customIcon = L.divIcon({
                        className: 'user-location-marker',
                        html: '<div class="pulse"></div>',
                        iconSize: [20, 20]
                    });

                    userMarker = L.marker([lat, lng], {
                        icon: customIcon
                    }).addTo(map);

                    // Add some sample bus stops
                    addBusStops();
                },
                function(error) {
                    console.error("Error getting location:", error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
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

// Initialize map when the page loads
window.addEventListener('load', initMap);