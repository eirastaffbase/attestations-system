const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx6W4263eNu6AQe8zYvLW1K0Ks_Qmr7JWqdfQ3iG0nNnCUIusH-EaQd3RW8dNHENF4tIg/exec";

document.addEventListener("DOMContentLoaded", () => {
    const svg = document.getElementById('signature-pad');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    
    const saveUserIdInput = document.getElementById('save-user-id');
    const loadUserIdInput = document.getElementById('load-user-id');
    const signatureDisplay = document.getElementById('signature-display'); 

    let drawing = false;
    let currentPath;
    let currentPathData;

    function getEventPosition(e) {
        const rect = svg.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function startDrawing(e) {
        e.preventDefault(); 
        drawing = true;
        const { x, y } = getEventPosition(e);
        
        currentPathData = `M ${x.toFixed(2)} ${y.toFixed(2)}`;
        currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        currentPath.setAttribute('d', currentPathData);
        currentPath.setAttribute('stroke', '#000');
        currentPath.setAttribute('stroke-width', '2');
        currentPath.setAttribute('fill', 'none');
        currentPath.setAttribute('stroke-linecap', 'round');
        
        svg.appendChild(currentPath);
    }

    function draw(e) {
        if (!drawing) return;
        
        e.preventDefault(); 
        const { x, y } = getEventPosition(e);
        currentPathData += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
        currentPath.setAttribute('d', currentPathData);
    }

    function stopDrawing() {
        drawing = false;
        currentPath = null;
        currentPathData = "";
    }

    svg.addEventListener('mousedown', startDrawing);
    svg.addEventListener('mousemove', draw);
    svg.addEventListener('touchstart', startDrawing, { passive: false });
    svg.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('mouseup', stopDrawing);
    window.addEventListener('touchend', stopDrawing);

    clearBtn.addEventListener('click', () => {
        svg.innerHTML = '';
        signatureDisplay.innerHTML = 'Pad cleared...';
    });

    saveBtn.addEventListener('click', () => {
        if (svg.children.length === 0) {
            alert("Please provide a signature first.");
            return;
        }

        const userId = saveUserIdInput.value.trim();
        if (!userId) {
            alert("Please enter a User ID to save.");
            return;
        }

        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">${svg.innerHTML}</svg>`;
        const entry = {
            userId: userId, 
            svgData: svgString
        };

        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain', 
            },
            body: JSON.stringify(entry),
            })
        .then(response => response.json()) 
        .then(result => {
            console.log("Response from server:", result);
            if (result.status === 'success') {
                signatureDisplay.textContent = `Signature saved for ${userId}!`;
                svg.innerHTML = ''; // Clear the pad
            } else {
                signatureDisplay.textContent = `Error saving: ${result.message}`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            signatureDisplay.textContent = `Fetch Error: ${error.message}.`;
        })
        .finally(() => {
            saveBtn.textContent = 'Save Signature';
            saveBtn.disabled = false;
        });
    });

    // --- Load Signature by ID ---
    loadBtn.addEventListener('click', () => {
        const userId = loadUserIdInput.value.trim();
        if (!userId) {
            alert("Please enter a User ID to load.");
            return;
        }

        signatureDisplay.textContent = 'Loading...'; // Changed text
        loadBtn.textContent = 'Loading...';
        loadBtn.disabled = true;

        // fetch URL with userId
        const fetchUrl = `${SCRIPT_URL}?userId=${encodeURIComponent(userId)}`;

        fetch(fetchUrl)
            .then(response => response.json())
            .then(result => {
                if (result.status === 'success') {
                    // Render svg
                    signatureDisplay.innerHTML = result.data; 
                } else if (result.status === 'not_found') {
                    signatureDisplay.textContent = `No signature found for User ID: ${userId}`;
                } else {
                    signatureDisplay.textContent = `Error loading data: ${result.message}`;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                signatureDisplay.textContent = `Fetch Error: ${error.message}`;
            })
            .finally(() => {
                loadBtn.textContent = 'Load Signature by ID';
                loadBtn.disabled = false;
            });
    });
});