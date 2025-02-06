// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// DOM Elements
const searchInput = document.querySelector('.search-input');
const searchOverlay = document.querySelector('.search-overlay');
const backButton = document.querySelector('.back-button');
const mapContainer = document.getElementById('map');

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

// Initialize Map (using Leaflet.js as an example)
function initMap() {
    if (typeof L !== 'undefined') {
        const map = L.map(mapContainer).setView([10.0867, 76.3511], 13); // Kochi coordinates
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }
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

// Handle clicks on various interactive elements
document.querySelectorAll('.feature-box, .stop-card, .location-box').forEach(element => {
    element.addEventListener('click', (e) => {
        // Add your navigation or action logic here
        console.log('Clicked:', element.className);
    });
});


// PWA Installation Handler
let deferredPrompt;
const installButton = document.getElementById('installButton');

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show the install button
    installButton.style.display = 'block';
});

// Installation process
async function installPWA() {
    if (!deferredPrompt) {
        return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // Clear the deferredPrompt variable
    deferredPrompt = null;
    
    // Hide the install button
    installButton.style.display = 'none';
}

// Hide the button if app is already installed
window.addEventListener('appinstalled', (e) => {
    console.log('PWA was installed');
    installButton.style.display = 'none';
});