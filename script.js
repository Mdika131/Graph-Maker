let myChartInstance = null;

// Update Chart.js global defaults for Dark Mode
Chart.defaults.color = '#94a3b8'; 
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

// --- UPDATED: Smarter Custom Spinner Logic ---
function incrementValue(btnElement) {
    const input = btnElement.previousElementSibling;
    // If the box is completely empty, treat it as 0 before adding 1
    const currentValue = Number(input.value) || 0;
    input.value = currentValue + 1;
}

function decrementValue(btnElement) {
    const input = btnElement.nextElementSibling;
    // If the box is completely empty, treat it as 0 before subtracting 1
    const currentValue = Number(input.value) || 0;
    input.value = currentValue - 1;
}

// Don't forget to update addDataRow to use value="0" instead of placeholder too!
function addDataRow() {
    const container = document.getElementById('data-points-container');
    const newRow = document.createElement('div');
    newRow.className = 'data-row';
    
    newRow.innerHTML = `
        <input type="text" class="data-label" placeholder="Label">
        <div class="number-input-wrapper">
            <button type="button" class="spin-btn" onclick="decrementValue(this)">−</button>
            <input type="number" class="data-value" value="0">
            <button type="button" class="spin-btn" onclick="incrementValue(this)">+</button>
        </div>
        <button type="button" onclick="removeDataRow(this)" class="remove-btn" title="Remove row">✕</button>
    `;
    
    container.appendChild(newRow);
    container.scrollTop = container.scrollHeight;
}

// --- NEW: Function to Remove a Data Row ---
function removeDataRow(buttonElement) {
    const container = document.getElementById('data-points-container');
    
    // Don't let the user delete the very last row!
    if (container.children.length > 1) {
        // The button is inside the row, so we delete the button's "parent"
        buttonElement.parentElement.remove();
    } else {
        alert("You must have at least one data point!");
    }
}

// --- UPDATED: Generate Graph Logic ---
function createGraph() {
    // 1. Create empty arrays to hold our new data
    const labelsArray = [];
    const valuesArray = [];

    // 2. Grab all the rows currently on the screen
    const rows = document.querySelectorAll('.data-row');

    // 3. Loop through each row to extract the text and numbers
    rows.forEach(row => {
        const labelInput = row.querySelector('.data-label').value.trim();
        const valueInput = row.querySelector('.data-value').value;

        // Only add to graph if they actually typed something in both boxes
        if (labelInput !== "" && valueInput !== "") {
            labelsArray.push(labelInput);
            valuesArray.push(Number(valueInput));
        }
    });

    // Validation check
    if (labelsArray.length === 0) {
        alert("Please enter at least one valid Label and Value!");
        return;
    }

    const chartType = document.getElementById('graphType').value;
    const ctx = document.getElementById('myChart').getContext('2d');

    if (myChartInstance != null) {
        myChartInstance.destroy();
    }

    const neonColors = [
        'rgba(99, 102, 241, 0.8)', 'rgba(14, 165, 233, 0.8)', 
        'rgba(16, 185, 129, 0.8)', 'rgba(244, 63, 94, 0.8)', 
        'rgba(168, 85, 247, 0.8)', 'rgba(250, 204, 21, 0.8)' // Added yellow in case they add lots of rows
    ];

    const solidBorders = [
        '#6366f1', '#0ea5e9', '#10b981', '#f43f5e', '#a855f7', '#facc15'
    ];

    myChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labelsArray,
            datasets: [{
                label: 'Dataset 1',
                data: valuesArray,
                backgroundColor: neonColors,
                borderColor: solidBorders,
                borderWidth: 2,
                borderRadius: chartType === 'bar' ? 8 : 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { size: 14, family: 'Poppins' },
                    bodyFont: { size: 13, family: 'Inter' },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            scales: chartType === 'pie' || chartType === 'doughnut' ? {} : {
                y: { beginAtZero: true }
            }
        }
    });
    document.getElementById('downloadBtn').style.display = 'flex';
}

// --- Download Graph Logic ---
function downloadGraph() {
    // 1. Grab the canvas element
    const canvas = document.getElementById('myChart');
    
    // 2. Create a temporary digital "link"
    const link = document.createElement('a');
    
    // 3. Name the file that will be downloaded
    link.download = 'My_Graph.png';
    
    // 4. Convert the canvas drawing into a standard PNG image URL
    link.href = canvas.toDataURL('image/png');
    
    // 5. Force the browser to click the link, triggering the download!
    link.click();
}