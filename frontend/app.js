// Global variables
let book = null;
let rendition = null;
let currentLocation = null;
let isBookLoaded = false;

const API_BASE_URL = 'http://localhost:8000';

// File Upload Handler
document.getElementById('epubInput').addEventListener('change', handleFileUpload);

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📁 File selected:', file.name);

    try {
        // Read file as ArrayBuffer
        const fileReader = new FileReader();
        fileReader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            loadBook(arrayBuffer, file.name);
        };
        fileReader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading the file. Please try again.');
    }
}

// Book Loading =
async function loadBook(arrayBuffer, fileName) {
    try {
        console.log(' Loading book...');

        // Create book instance
        book = ePub(arrayBuffer);

        // Get metadata
        const metadata = await book.ready;
        const bookTitle = book.packaging.metadata.title || 'Unknown Title';
        const bookAuthor = book.packaging.metadata.creator || 'Unknown Author';

        console.log(' Book loaded:', bookTitle, 'by', bookAuthor);

        // Update UI
        document.getElementById('bookTitle').textContent = bookTitle;
        document.getElementById('bookAuthor').textContent = `by ${bookAuthor}`;

        // Hide upload section, show reader
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('readerSection').style.display = 'block';

        // Create rendition
        const viewerElement = document.getElementById('viewer');
        rendition = book.renderTo(viewerElement, {
            width: '100%',
            height: '100%',
            flow: 'paginated',
        });

        // Display the first page
        await rendition.display();
        isBookLoaded = true;

        // Set up event listeners
        setupEventListeners();

        // Get initial location
        updateLocation();

        console.log(' Reader initialized');
    } catch (error) {
        console.error('Error loading book:', error);
        alert('Error loading the book. Make sure it\'s a valid .epub file.');
    }
}

// Event Listeners Setup 
function setupEventListeners() {
    // Navigation buttons
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (rendition && rendition.prev) {
            rendition.prev().then(() => updateLocation());
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (rendition && rendition.next) {
            rendition.next().then(() => updateLocation());
        }
    });

    // Upload another book
    document.getElementById('uploadAnotherBtn').addEventListener('click', resetReader);

    // Modal close
    document.getElementById('closeModal').addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('summaryModal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // Text selection / highlighting in the book viewer
    const viewerElement = document.getElementById('viewer');
    viewerElement.addEventListener('mouseup', handleTextSelection);
}

// Location & Navigation
function updateLocation() {
    if (!rendition) return;

    const currentLoc = rendition.currentLocation();
    currentLocation = currentLoc;

    if (currentLoc && currentLoc.start) {
        const startCFI = currentLoc.start.cfi;
        const progress = Math.round(rendition.book.locations.percentageFromCfi(startCFI) * 100);

        // Update display (simplified)
        document.getElementById('locationDisplay').textContent = `Progress: ${progress}%`;

        console.log(' Current Location:', {
            cfi: startCFI,
            progress: progress,
            chapter: currentLoc.start.index,
        });
    }
}

// Listen for page changes
document.addEventListener('DOMContentLoaded', () => {
    // This ensures location updates after navigation
    if (rendition) {
        rendition.on('relocated', updateLocation);
    }
});

// Text Selection Handler 
async function handleTextSelection() {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText || selectedText.length === 0) return;

    // Try to get the CFI of the selection using epub.js
    let cfi = null;
    if (rendition && rendition.getRange) {
        const iframe = document.querySelector('#viewer iframe');
        if (iframe && iframe.contentWindow) {
            const iframeSelection = iframe.contentWindow.getSelection();
            if (iframeSelection && iframeSelection.rangeCount > 0) {
                const range = iframeSelection.getRangeAt(0);
                try {
                    cfi = rendition.locationFromRange(range);
                } catch (e) {
                    cfi = null;
                }
            }
        }
    }

    // Show loading modal
    openModal(`Summary for: ${selectedText}`, `<div class='spinner'></div><p>Loading character insights...</p>`);

    // Send to backend
    try {
        const response = await fetch(`${API_BASE_URL}/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                character_name: selectedText,
                current_location: cfi || (currentLocation && currentLocation.start && currentLocation.start.cfi) || '',
            }),
        });
        const data = await response.json();
        openModal(`Summary for: ${selectedText}`, `<p>${data.summary}</p>`);
    } catch (error) {
        openModal('Error', 'Failed to fetch summary from backend.');
        console.error('Error fetching summary:', error);
    }
}
// Modal Functions
function openModal(title, content) {
    const modal = document.getElementById('summaryModal');
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = `
        <h3>${title}</h3>
        <p>${content}</p>
    `;

    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('summaryModal').style.display = 'none';
}

// Reset Reader
function resetReader() {
    book = null;
    rendition = null;
    currentLocation = null;
    isBookLoaded = false;

    document.getElementById('uploadSection').style.display = 'flex';
    document.getElementById('readerSection').style.display = 'none';
    document.getElementById('epubInput').value = '';

    console.log(' Reader reset');
}

console.log(' PlotLens app.js loaded - Phase 1 Ready!');
