document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map with a default view (will be updated when location is available)
    const map = L.map('map').setView([51.505, -0.09], 13);
    let userMarker = null;
    let userPosition = null;
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Status indicator for debugging
    function showStatus(message, isError = false) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'status-message';
        statusDiv.textContent = message;
        statusDiv.style.position = 'absolute';
        statusDiv.style.bottom = '40px';
        statusDiv.style.left = '10px';
        statusDiv.style.padding = '8px 12px';
        statusDiv.style.backgroundColor = isError ? 'rgba(255,0,0,0.7)' : 'rgba(0,0,0,0.7)';
        statusDiv.style.color = 'white';
        statusDiv.style.borderRadius = '4px';
        statusDiv.style.zIndex = '1000';
        statusDiv.style.maxWidth = '80%';
        document.querySelector('.map-container').appendChild(statusDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            statusDiv.remove();
        }, 5000);
    }
    
    // Create custom bus icon element for Leaflet
    const createBusIcon = () => {
        return L.divIcon({
            html: `<div class="custom-bus-icon"><i class="fas fa-bus"></i></div>`,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    };
    
    // Function to request location with proper error handling
    function requestLocation() {
        showStatus("Requesting your location...");
        
        // Check if geolocation is supported
        if (!navigator.geolocation) {
            showStatus("Geolocation is not supported by your browser", true);
            return;
        }
        
        const locationOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            // Success callback
            function(position) {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                userPosition = [userLat, userLng];
                
                showStatus(`Location found: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`);
                
                // Center map on user location
                map.setView([userLat, userLng], 15);
                
                // Remove previous marker if exists
                if (userMarker) {
                    map.removeLayer(userMarker);
                }
                
                // Add marker for user location
                userMarker = L.marker([userLat, userLng], {
                    icon: L.divIcon({
                        html: `<div style="background-color: #2196F3; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
                        className: '',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(map)
                .bindPopup('Your Location')
                .openPopup();
                
                // Fetch nearby bus stops
                fetchNearbyBusStops(userLat, userLng);
                
                // Show the current location button
                document.querySelector('.current-location-button').style.display = 'flex';
            },
            // Error callback
            function(error) {
                let errorMessage;
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location access denied. Please enable location services in your browser settings.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information unavailable. Try again later.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out. Please try again.";
                        break;
                    default:
                        errorMessage = `Location error: ${error.message}`;
                }
                showStatus(errorMessage, true);
                console.error("Geolocation error:", error);
            },
            locationOptions
        );
    }
    
    // Function to go to current location
    function goToCurrentLocation() {
        if (userPosition) {
            map.setView(userPosition, 17); // Zoom in closer
            if (userMarker) {
                userMarker.openPopup();
            }
        } else {
            showStatus("Getting your location...");
            requestLocation();
        }
    }
    
    // Alternative method using IP-based geolocation if browser geolocation fails
    function useIPBasedLocation() {
        showStatus("Trying IP-based location...");
        
        // Use a free IP geolocation API
        fetch('https://ipapi.co/json/')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.latitude && data.longitude) {
                    showStatus(`IP location found: ${data.city}, ${data.country_name}`);
                    userPosition = [data.latitude, data.longitude];
                    map.setView(userPosition, 13);
                    
                    // Remove previous marker if exists
                    if (userMarker) {
                        map.removeLayer(userMarker);
                    }
                    
                    // Add marker for approximate location
                    userMarker = L.marker(userPosition, {
                        icon: L.divIcon({
                            html: `<div style="background-color: #FF9800; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
                            className: '',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(map)
                    .bindPopup('Your Approximate Location')
                    .openPopup();
                    
                    // Fetch nearby bus stops
                    fetchNearbyBusStops(data.latitude, data.longitude);
                    
                    // Show the current location button
                    document.querySelector('.current-location-button').style.display = 'flex';
                } else {
                    showStatus("Could not determine your location", true);
                }
            })
            .catch(error => {
                showStatus("Failed to get IP-based location", true);
                console.error("IP geolocation error:", error);
            });
    }
    
    // Function to fetch nearby bus stops using Overpass API (OpenStreetMap data)
    function fetchNearbyBusStops(lat, lng) {
        showStatus("Searching for nearby bus stops...");
        
        const radius = 1500; // 1.5km radius for better results
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["highway"="bus_stop"](around:${radius},${lat},${lng});out;`;
        
        fetch(overpassUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.elements && data.elements.length > 0) {
                    showStatus(`Found ${data.elements.length} bus stops nearby`);
                    data.elements.forEach(busStop => {
                        addBusStopToMap(busStop);
                    });
                    
                    // If no bus stops found within initial radius, try with a larger radius
                } else {
                    showStatus("No bus stops found nearby. Expanding search...");
                    searchWithLargerRadius(lat, lng);
                }
            })
            .catch(error => {
                showStatus("Error fetching bus stops. Using fallback method...", true);
                console.error("Overpass API error:", error);
                // Try alternative API for bus stops
                fetchBusStopsAlternative(lat, lng);
            });
    }
    
    // Try with a larger radius if no bus stops found initially
    function searchWithLargerRadius(lat, lng) {
        const largerRadius = 3000; // 3km radius
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["highway"="bus_stop"](around:${largerRadius},${lat},${lng});node["public_transport"="platform"](around:${largerRadius},${lat},${lng}););out;`;
        
        fetch(overpassUrl)
            .then(response => response.json())
            .then(data => {
                if (data.elements && data.elements.length > 0) {
                    showStatus(`Found ${data.elements.length} bus stops in extended search`);
                    data.elements.forEach(busStop => {
                        addBusStopToMap(busStop);
                    });
                } else {
                    showStatus("No bus stops found in extended search");
                    // Add some mock bus stops for demonstration if needed
                    addMockBusStops(lat, lng);
                }
            })
            .catch(error => {
                console.error("Extended search error:", error);
                showStatus("Search failed. Adding example bus stops");
                addMockBusStops(lat, lng);
            });
    }
    
    // Alternative API for bus stops (fallback)
    function fetchBusStopsAlternative(lat, lng) {
        // This uses OpenStreetMap Nominatim as a fallback
        // Note: For production, you should use an appropriate API with proper attribution
        const url = `https://nominatim.openstreetmap.org/search.php?q=bus+stop&format=jsonv2&limit=10&lat=${lat}&lon=${lng}&radius=3000`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    showStatus(`Found ${data.length} transit locations via alternative search`);
                    data.forEach(location => {
                        if (location.lat && location.lon) {
                            const mockBusStop = {
                                lat: parseFloat(location.lat),
                                lon: parseFloat(location.lon),
                                tags: {
                                    name: location.display_name.split(',')[0] + ' (Bus Stop)'
                                }
                            };
                            addBusStopToMap(mockBusStop);
                        }
                    });
                } else {
                    showStatus("No transit locations found via alternative search");
                    addMockBusStops(lat, lng);
                }
            })
            .catch(error => {
                console.error("Alternative API error:", error);
                addMockBusStops(lat, lng);
            });
    }
    
    // Add some mock bus stops for testing/demonstration
    function addMockBusStops(lat, lng) {
        showStatus("Adding example bus stops for demonstration");
        
        // Generate bus stops in different directions from user location
        const mockStops = [
            { offset: [0.003, 0.005], name: "North Station" },
            { offset: [-0.002, 0.004], name: "Northwest Terminal" },
            { offset: [-0.004, -0.001], name: "West Junction" },
            { offset: [0.003, -0.003], name: "Southeast Square" },
            { offset: [0.005, 0.001], name: "East Avenue" }
        ];
        
        mockStops.forEach((stop, index) => {
            const mockBusStop = {
                lat: lat + stop.offset[0],
                lon: lng + stop.offset[1],
                tags: {
                    name: stop.name,
                    route_ref: `${index+1}, ${index+3}, ${index+8}`
                }
            };
            addBusStopToMap(mockBusStop);
        });
    }
    
    // Function to add bus stops to the map
    function addBusStopToMap(busStop) {
        const busIcon = createBusIcon();
        
        const marker = L.marker([busStop.lat, busStop.lon], {
            icon: busIcon
        }).addTo(map);
        
        // Create popup content
        let popupContent = `<strong>Bus Stop</strong>`;
        if (busStop.tags && busStop.tags.name) {
            popupContent = `<strong>${busStop.tags.name}</strong>`;
        }
        
        if (busStop.tags && busStop.tags.route_ref) {
            popupContent += `<br>Routes: ${busStop.tags.route_ref}`;
        }
        
        marker.bindPopup(popupContent);
    }
    
    // Handle back button click
    document.querySelector('.back-button').addEventListener('click', function() {
        // Navigate back to previous page
        window.history.back();
    });
    
    // Add reload button
    const reloadButton = document.createElement('div');
    reloadButton.className = 'reload-button';
    reloadButton.innerHTML = '<i class="fas fa-redo-alt"></i>';
    reloadButton.style.position = 'absolute';
    reloadButton.style.top = '20px';
    reloadButton.style.right = '20px';
    reloadButton.style.width = '40px';
    reloadButton.style.height = '40px';
    reloadButton.style.backgroundColor = 'white';
    reloadButton.style.borderRadius = '50%';
    reloadButton.style.display = 'flex';
    reloadButton.style.alignItems = 'center';
    reloadButton.style.justifyContent = 'center';
    reloadButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    reloadButton.style.zIndex = '2';
    reloadButton.style.cursor = 'pointer';
    document.querySelector('.map-container').appendChild(reloadButton);
    
    reloadButton.addEventListener('click', function() {
        showStatus("Refreshing location and bus stops...");
        requestLocation();
    });
    
    // Add current location button
    const currentLocationButton = document.createElement('div');
    currentLocationButton.className = 'current-location-button';
    currentLocationButton.innerHTML = '<i class="fas fa-crosshairs"></i>';
    currentLocationButton.style.position = 'absolute';
    currentLocationButton.style.bottom = '80px';
    currentLocationButton.style.right = '20px';
    currentLocationButton.style.width = '40px';
    currentLocationButton.style.height = '40px';
    currentLocationButton.style.backgroundColor = 'white';
    currentLocationButton.style.borderRadius = '50%';
    currentLocationButton.style.display = 'none'; // Initially hidden
    currentLocationButton.style.alignItems = 'center';
    currentLocationButton.style.justifyContent = 'center';
    currentLocationButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    currentLocationButton.style.zIndex = '2';
    currentLocationButton.style.cursor = 'pointer';
    document.querySelector('.map-container').appendChild(currentLocationButton);
    
    currentLocationButton.addEventListener('click', function() {
        goToCurrentLocation();
    });
    
    // Try primary location method first
    requestLocation();
    
    // If location not found within 5 seconds, try IP-based method
    setTimeout(() => {
        if (map.getZoom() === 13 && map.getCenter().lat === 51.505) {
            useIPBasedLocation();
        }
    }, 5000);
    
    // Watch position for real-time updates (optional)
    let watchId = null;
    function startWatchingPosition() {
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                function(position) {
                    const newLat = position.coords.latitude;
                    const newLng = position.coords.longitude;
                    userPosition = [newLat, newLng];
                    
                    // Update marker position
                    if (userMarker) {
                        userMarker.setLatLng(userPosition);
                    }
                },
                function(error) {
                    console.log("Error watching position:", error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 30000,
                    timeout: 27000
                }
            );
        }
    }
    
    // Start watching position after initial location is found
    setTimeout(() => {
        if (userPosition) {
            startWatchingPosition();
        }
    }, 5000);
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}