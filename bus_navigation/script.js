// Initialize map
const map = L.map('map').setView([10.8505, 76.2711], 13); // Default view centered on Kerala

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let userMarker = null;
let userCircle = null;

// Locate button functionality
document.getElementById('locate-me').addEventListener('click', () => {
    map.locate({setView: true, maxZoom: 16});
});

// Handle location found
map.on('locationfound', (e) => {
    const radius = e.accuracy / 2;

    // Remove existing marker and circle
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    if (userCircle) {
        map.removeLayer(userCircle);
    }

    // Add new marker and circle
    userMarker = L.marker(e.latlng).addTo(map)
        .bindPopup("You are here").openPopup();

    userCircle = L.circle(e.latlng, {
        color: '#4CAF50',
        fillColor: '#4CAF50',
        fillOpacity: 0.2,
        radius: radius
    }).addTo(map);
});

// Handle location error
map.on('locationerror', (e) => {
    alert("Could not find your location. Please check your settings and try again.");
});

// Notification bell functionality
const notificationBell = document.querySelector('.notification-bell');
const notificationPopup = document.querySelector('.notification-popup');
let popupTimeout;

notificationBell.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Show popup
    notificationPopup.classList.add('show');
    
    // Clear existing timeout
    if (popupTimeout) {
        clearTimeout(popupTimeout);
    }
    
    // Hide popup after 3 seconds
    popupTimeout = setTimeout(() => {
        notificationPopup.classList.remove('show');
    }, 3000);
});

// Create overlay for expanded images
const overlay = document.createElement('div');
overlay.className = 'overlay';
document.body.appendChild(overlay);

// Image grid functionality with click to expand
const gridItems = document.querySelectorAll('.grid-item');
gridItems.forEach(item => {
    // Create close button for each grid item
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    item.appendChild(closeButton);

    const img = item.querySelector('img');
    
    // Add loading animation
    img.addEventListener('load', () => {
        item.style.animation = 'slideIn 0.5s ease forwards';
    });
    
    // Add error handling
    img.addEventListener('error', () => {
        item.style.backgroundColor = '#f0f0f0';
        item.innerHTML = '<div style="padding: 20px; text-align: center;">Image not available</div>';
    });

    // Add click to expand functionality
    item.addEventListener('click', (e) => {
        if (!e.target.closest('.close-button')) {
            item.classList.add('expanded');
            overlay.classList.add('active');
        }
    });

    // Close button functionality
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        item.classList.remove('expanded');
        overlay.classList.remove('active');
    });
});

// Close expanded image when clicking overlay
overlay.addEventListener('click', () => {
    const expandedItem = document.querySelector('.grid-item.expanded');
    if (expandedItem) {
        expandedItem.classList.remove('expanded');
        overlay.classList.remove('active');
    }
});

// Add escape key functionality to close expanded image
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const expandedItem = document.querySelector('.grid-item.expanded');
        if (expandedItem) {
            expandedItem.classList.remove('expanded');
            overlay.classList.remove('active');
        }
    }
});

// Add smooth scroll behavior for links with hash
document.querySelectorAll('a[href*="#"]:not([href="#"])').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').split('#')[1];
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Add card hover effects
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-5px)';
        card.style.transition = 'transform 0.3s ease';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});