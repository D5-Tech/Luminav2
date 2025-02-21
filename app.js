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

// Create a safe fetch wrapper to handle CORS issues
const safeFetch = async (url, options = {}) => {
    try {
        // Add CORS mode
        options.mode = options.mode || 'cors';
        options.credentials = options.credentials || 'same-origin';
        
        // Add headers to handle CORS
        options.headers = {
            ...options.headers,
            'Accept': 'application/json, text/plain, */*',
        };
        
        const response = await fetch(url, options);
        return response;
    } catch (error) {
        console.warn(`Safe fetch failed for ${url}:`, error.message);
        // Return a mock response instead of throwing
        return {
            ok: false,
            status: 0,
            statusText: 'Failed due to CORS or network error',
            json: async () => ({}),
            text: async () => '',
        };
    }
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
            attributionControl: true,
            // Disable cross-origin requests for tiles when possible
            preferCanvas: true
            scrollWheelZoom: true,
dragging: !L.Browser.mobile,
tap: false, // Disable tap handler, if present
        }).setView([10.0867, 76.3511], 13);

        // Add OpenStreetMap tiles with CORS handling
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors',
            crossOrigin: 'anonymous',
            // Add error handling for tile loading
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        }).addTo(map);

        // Get user location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Initial location setting - use smooth animation
                    updateUserLocation(lat, lng, true);
                    
                    // Add bus stops
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


// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(error => {
          console.log('ServiceWorker registration failed: ', error);
        });
    });
  }

// Add this to your map initialization function
function resizeMapContainer() {
    const contentWrapper = document.querySelector('.content-wrapper');
    const mapContainer = document.getElementById('map');
    if (mapContainer && map) {
        // Calculate available height
        const headerHeight = document.querySelector('.header').offsetHeight;
        const searchHeight = document.querySelector('.search-container').offsetHeight;
        const featuresHeight = document.querySelector('.features-grid').offsetHeight;
        const nearbyHeight = document.querySelector('.nearby-stops').offsetHeight;
        const navHeight = document.querySelector('.bottom-nav').offsetHeight;
        
        // Set map height dynamically
        const availableHeight = window.innerHeight - (headerHeight + searchHeight + featuresHeight + nearbyHeight + navHeight + 48); // 48px for margins
        mapContainer.style.height = `${Math.max(250, availableHeight)}px`;
        
        // Force map to update its size
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
}
  // Add event listener for resize
// Handle content wrapper scroll
const contentWrapper = document.querySelector('.content-wrapper');
contentWrapper.addEventListener('scroll', () => {
    // Update map size if it becomes visible
    const mapContainer = document.getElementById('map');
    if (mapContainer && isElementInViewport(mapContainer)) {
        map.invalidateSize();
    }
});

// Add event listener for resize
window.addEventListener('resize', resizeMapContainer);

// Call after map initialization
resizeMapContainer();

// Add this helper function at the end of your file
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}  
  // Call after map initialization
  resizeMapContainer();
// Updated function to add bus stops with enhanced popup information

// Updated function to add bus stops with enhanced popup information
function addBusStops() {
    // Common Kerala bus routes that will be used for all stops
    const commonBusRoutes = [
        { number: "KSRTC Swift", route: "Trivandrum - Kasaragod", arrival: "5 mins" },
        { number: "Private AC", route: "Kochi - Bangalore", arrival: "12 mins" },
        { number: "KSRTC Ordinary", route: "Kochi - Munnar", arrival: "15 mins" },
        { number: "Private Limited Stop", route: "Kochi - Kozhikode", arrival: "20 mins" },
        { number: "KURTC Electric", route: "City Circular", arrival: "8 mins" }
    ];

    const busStops = [
        // Major Bus Stations
        { name: "Aluva Bus Stand", lat: 10.1004, lng: 76.3571, type: "major" },
        { name: "Edapally Junction", lat: 10.0267, lng: 76.3084, type: "major" },
        { name: "Kaloor Bus Stop", lat: 10.0007, lng: 76.2938, type: "major" },
        { name: "Ernakulam KSRTC Bus Stand", lat: 9.9891, lng: 76.2846, type: "major" },
        { name: "Vyttila Mobility Hub", lat: 9.9646, lng: 76.3192, type: "major" },
        { name: "Kakkanad Bus Stand", lat: 10.0167, lng: 76.3434, type: "major" },
        
        // Regular Bus Stops
        { name: "MG Road Bus Stop", lat: 9.9727, lng: 76.2807, type: "regular" },
        { name: "Palarivattom Bus Stop", lat: 10.0084, lng: 76.3072, type: "regular" },
        { name: "Tripunithura Bus Stop", lat: 9.9484, lng: 76.3470, type: "regular" },
        { name: "Kadavanthra Bus Stop", lat: 9.9662, lng: 76.2988, type: "regular" },
        { name: "Fort Kochi Bus Stop", lat: 9.9641, lng: 76.2420, type: "regular" },
        { name: "Mattancherry Bus Stop", lat: 9.9577, lng: 76.2593, type: "regular" },
        { name: "Thevara Bus Stop", lat: 9.9386, lng: 76.3016, type: "regular" },
        { name: "Marine Drive Bus Stop", lat: 9.9801, lng: 76.2744, type: "regular" },
        
        // Smaller Bus Stops
        { name: "Panampilly Nagar Bus Stop", lat: 9.9574, lng: 76.2950, type: "small" },
        { name: "Elamkulam Bus Stop", lat: 9.9557, lng: 76.3080, type: "small" },
        { name: "Kalathiparambil Road Bus Stop", lat: 9.9752, lng: 76.2785, type: "small" },
        { name: "Padma Junction Bus Stop", lat: 9.9715, lng: 76.2857, type: "small" },
        { name: "High Court Junction Bus Stop", lat: 9.9800, lng: 76.2772, type: "small" },
        { name: "Town Hall Bus Stop", lat: 9.9830, lng: 76.2863, type: "small" },
        { name: "Kacheripady Bus Stop", lat: 9.9902, lng: 76.2871, type: "small" },
        { name: "North Bus Stop", lat: 9.9938, lng: 76.2905, type: "small" },
        { name: "Chittoor Road Bus Stop", lat: 9.9664, lng: 76.2835, type: "small" },
        { name: "Thammanam Bus Stop", lat: 9.9739, lng: 76.3124, type: "small" },
        { name: "Pathadipalam Bus Stop", lat: 10.0266, lng: 76.3195, type: "small" },
        { name: "Chakkaraparambu Bus Stop", lat: 10.0132, lng: 76.3136, type: "small" }
    ];

  // Function to generate random arrival times
  const getRandomArrival = () => {
    const times = ["2", "5", "8", "10", "15", "20"];
    return times[Math.floor(Math.random() * times.length)];
};

const getBusIconHtml = (type) => {
    let size, color, borderColor;
    
    if (type === "major") {
        size = 36;
        color = "#E53935";
        borderColor = "#B71C1C";
    } else if (type === "regular") {
        size = 30;
        color = "#1E88E5";
        borderColor = "#0D47A1";
    } else {
        size = 24;
        color = "#43A047";
        borderColor = "#1B5E20";
    }
    
    return `
        <div class="custom-bus-icon" style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border: 2px solid ${borderColor};
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">
            <i class="fas fa-bus" style="color: white; font-size: ${size/2}px;"></i>
        </div>
    `;
};

busStops.forEach(stop => {
    const busIcon = L.divIcon({
        className: 'bus-stop-marker',
        html: getBusIconHtml(stop.type),
        iconSize: stop.type === "major" ? [36, 36] : stop.type === "regular" ? [30, 30] : [24, 24],
        iconAnchor: stop.type === "major" ? [18, 18] : stop.type === "regular" ? [15, 15] : [12, 12],
        popupAnchor: [0, -10]
    });

    // Generate bus routes HTML with more compact styling
    const busRoutesHtml = commonBusRoutes.map(bus => `
        <div class="bus-route" style="
            padding: 4px 0;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #eee;
        ">
            <div style="flex: 1; min-width: 0;">
                <div style="
                    font-weight: 600;
                    font-size: 13px;
                    color: #2196F3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                ">${bus.number}</div>
                <div style="
                    font-size: 11px;
                    color: #666;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                ">${bus.route}</div>
            </div>
            <div style="
                background: #4CAF50;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
                white-space: nowrap;
            ">${getRandomArrival()} mins</div>
        </div>
    `).join('');

    const marker = L.marker([stop.lat, stop.lng], { icon: busIcon })
        .bindPopup(`
            <div style="width: 200px; padding: 4px;">
                <div style="
                    margin: 0 0 4px 0;
                    padding-bottom: 4px;
                    border-bottom: 2px solid #4CAF50;
                ">
                    <h3 style="
                        margin: 0;
                        font-size: 14px;
                        font-weight: 600;
                        color: #333;
                    ">${stop.name}</h3>
                    <span style="
                        font-size: 11px;
                        color: #666;
                    ">${stop.type === "major" ? "Major Bus Terminal" : stop.type === "regular" ? "Regular Bus Stop" : "Local Bus Stop"}</span>
                </div>
                
                <div style="max-height: 150px; overflow-y: auto; margin: 4px 0;">
                    ${busRoutesHtml}
                </div>
                
                <div style="
                    display: flex;
                    gap: 4px;
                    margin-top: 8px;
                ">
                    <button style="
                        flex: 1;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 6px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: 500;
                    ">Get Directions</button>
                    <button style="
                        flex: 1;
                        background: #2196F3;
                        color: white;
                        border: none;
                        padding: 6px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: 500;
                    ">View Schedule</button>
                </div>
            </div>
        `, {
            maxWidth: 220,
            minWidth: 200,
            className: 'custom-popup'
        })
        .addTo(map);
});

// Add CSS for enhanced popup styling
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .custom-popup .leaflet-popup-content-wrapper {
        padding: 0;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .custom-popup .leaflet-popup-content {
        margin: 0;
        line-height: 1.4;
    }

    .custom-popup .leaflet-popup-tip {
        width: 12px;
        height: 12px;
    }

    .bus-route:last-child {
        border-bottom: none;
    }

    .custom-popup button:hover {
        opacity: 0.9;
    }

    .custom-popup button:active {
        transform: scale(0.98);
    }
`;
document.head.appendChild(styleSheet);

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

// Block external scripts that might cause CORS issues
function blockExternalScripts() {
    // Override fetch to catch and handle potential CORS issues
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        try {
            if (typeof url === 'string' && url.includes('dlnk.one')) {
                console.warn('Blocked potential problematic fetch to:', url);
                return new Response('{}', { 
                    status: 200, 
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return await originalFetch(url, options);
        } catch (error) {
            console.warn('Fetch intercepted error:', error);
            return new Response('{}', { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    };
    
    // Override XMLHttpRequest to catch and handle potential CORS issues
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (typeof url === 'string' && url.includes('dlnk.one')) {
            console.warn('Blocked potential problematic XHR to:', url);
            // Change URL to a local empty response
            url = 'data:application/json,{}';
        }
        return originalXHROpen.call(this, method, url, ...args);
    };
}

// PWA Installation Handler
// PWA Installation
let deferredPrompt;
const installButton = document.getElementById('installButton');

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show the install button
  installButton.style.display = 'block';
});

function installPWA() {
  // Hide the install button
  installButton.style.display = 'none';
  // Show the prompt
  deferredPrompt.prompt();
  // Wait for the user to respond to the prompt
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    deferredPrompt = null;
  });
}

// Hide install button when app is installed
window.addEventListener('appinstalled', (evt) => {
  installButton.style.display = 'none';
  console.log('App was installed');
});

// Add animations and styling for location button
const buttonStyleSheet = document.createElement('style');
buttonStyleSheet.textContent = `
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
document.head.appendChild(buttonStyleSheet);

// Add meta tag for CORS protection
function addSecurityHeaders() {
    // Add CSP header to control which domains can load resources
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self' https://*.tile.openstreetmap.org";
    document.head.appendChild(meta);
}

// Initialize everything when the page loads
window.addEventListener('load', () => {
    // Add security and CORS protection
    addSecurityHeaders();
    blockExternalScripts();
    
    // Initialize the app
    initMap();
    setFallbackFavicon();
});