const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx6W4263eNu6AQe8zYvLW1K0Ks_Qmr7JWqdfQ3iG0nNnCUIusH-EaQd3RW8dNHENF4tIg/exec";

document.addEventListener("DOMContentLoaded", () => {
    // Views
    const userCheckView = document.getElementById('user-check-view');
    const signatureView = document.getElementById('signature-view');
    const resultView = document.getElementById('result-view');

    // User ID Input
    const userIdInput = document.getElementById('user-id');
    const checkBtn = document.getElementById('check-btn');

    // Signature Pad Elements
    const svg = document.getElementById('signature-pad');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const displayUserId = document.getElementById('display-user-id');

    // Result View Elements
    const resultHeading = document.getElementById('result-heading');
    const signatureDisplay = document.getElementById('signature-display');
    const startOverBtn = document.getElementById('start-over-btn');

    let drawing = false;
    let currentPath;
    let currentPathData;
    let currentUserId = '';

    // --- Helper Functions ---
    function showView(view) {
        userCheckView.classList.add('hidden');
        signatureView.classList.add('hidden');
        resultView.classList.add('hidden');
        view.classList.remove('hidden');
    }

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

    // --- Drawing Functions ---
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

    // --- Event Listeners ---

    clearBtn.addEventListener('click', () => {
        svg.innerHTML = '';
    });

    startOverBtn.addEventListener('click', () => {
        currentUserId = '';
        userIdInput.value = '';
        svg.innerHTML = '';
        signatureDisplay.innerHTML = '';
        showView(userCheckView);
    });

    checkBtn.addEventListener('click', () => {
        const userId = userIdInput.value.trim();
        if (!userId) {
            alert("Please enter a User ID.");
            return;
        }
        currentUserId = userId;

        checkBtn.textContent = 'Checking...';
        checkBtn.disabled = true;

        const fetchUrl = `${SCRIPT_URL}?userId=${encodeURIComponent(userId)}`;

        fetch(fetchUrl)
            .then(response => response.json())
            .then(result => {
                if (result.status === 'success') {
                    // Signature found, show result view
                    resultHeading.textContent = `Welcome back, ${userId}! You have already signed.`;
                    signatureDisplay.innerHTML = result.data; 
                    showView(resultView);
                } else if (result.status === 'not_found') {
                    // No signature, show signing pad
                    displayUserId.textContent = userId;
                    showView(signatureView);
                } else {
                    alert(`Error: ${result.message}`);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert(`Fetch Error: ${error.message}`);
            })
            .finally(() => {
                checkBtn.textContent = 'Check / Sign';
                checkBtn.disabled = false;
            });
    });

    saveBtn.addEventListener('click', () => {
        if (svg.children.length === 0) {
            alert("Please provide a signature first.");
            return;
        }

        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">${svg.innerHTML}</svg>`;
        const entry = {
            userId: currentUserId,
            svgData: svgString
        };

        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        clearBtn.disabled = true;

        // Show a loading message in the result view
        resultHeading.textContent = `Saving signature for ${currentUserId}...`;
        signatureDisplay.innerHTML = 'Please wait.';
        showView(resultView);

        // POST the new signature
        fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(entry),
            })
            .then(response => response.json())
            .then(postResult => {
                if (postResult.status !== 'success') {
                    throw new Error(postResult.message || 'Failed to save signature.');
                }
                // After successful save, GET it back to display
                const fetchUrl = `${SCRIPT_URL}?userId=${encodeURIComponent(currentUserId)}`;
                return fetch(fetchUrl);
            })
            .then(response => response.json())
            .then(getResult => {
                if (getResult.status === 'success') {
                    resultHeading.textContent = `Signature Saved for ${currentUserId}!`;
                    signatureDisplay.innerHTML = getResult.data;
                } else {
                    throw new Error(getResult.message || 'Could not retrieve saved signature.');
                }
            })
            .catch(error => {
                console.error('Error during save process:', error);
                resultHeading.textContent = 'An Error Occurred';
                signatureDisplay.innerHTML = `Error: ${error.message}<br><br>Please try again.`;
            })
            .finally(() => {
                // Reset signature view buttons
                saveBtn.textContent = 'Save Signature';
                saveBtn.disabled = false;
                clearBtn.disabled = false;
                svg.innerHTML = ''; // Clear the pad for next time
            });
    });
});