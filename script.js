let myChartInstance = null;

// Set Chart.js global defaults for dark mode UI
Chart.defaults.color = '#94a3b8'; 
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

// Custom number input spinner logic
function incrementValue(btnElement) {
    const input = btnElement.previousElementSibling;
    // Default to 0 if the input is empty
    const currentValue = Number(input.value) || 0;
    input.value = currentValue + 1;
}

function decrementValue(btnElement) {
    const input = btnElement.nextElementSibling;
    // Default to 0 if the input is empty
    const currentValue = Number(input.value) || 0;
    input.value = currentValue - 1;
}

// Appends a new data row to the DOM
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
    // Auto-scroll to the bottom of the container
    container.scrollTop = container.scrollHeight;
}

// Handles row deletion
function removeDataRow(buttonElement) {
    const container = document.getElementById('data-points-container');
    
    // Prevent deletion of the very last row
    if (container.children.length > 1) {
        buttonElement.parentElement.remove();
    } else {
        alert("You must have at least one data point!");
    }
}

// Parses DOM inputs and renders the Chart.js instance
function createGraph() {
    const labelsArray = [];
    const valuesArray = [];

    const rows = document.querySelectorAll('.data-row');

    // Extract labels and values from the active DOM rows
    rows.forEach(row => {
        const labelInput = row.querySelector('.data-label').value.trim();
        const valueInput = row.querySelector('.data-value').value;

        // Ignore rows with incomplete data
        if (labelInput !== "" && valueInput !== "") {
            labelsArray.push(labelInput);
            valuesArray.push(Number(valueInput));
        }
    });

    // Ensure we have data before attempting to draw the chart
    if (labelsArray.length === 0) {
        alert("Please enter at least one valid Label and Value!");
        return;
    }

    const chartType = document.getElementById('graphType').value;
    const ctx = document.getElementById('myChart').getContext('2d');

    // Cleanup previous chart instance to avoid rendering overlaps
    if (myChartInstance != null) {
        myChartInstance.destroy();
    }

    // Base theme colors
    const neonColors = [
        'rgba(99, 102, 241, 0.8)', 'rgba(14, 165, 233, 0.8)', 
        'rgba(16, 185, 129, 0.8)', 'rgba(244, 63, 94, 0.8)', 
        'rgba(168, 85, 247, 0.8)', 'rgba(250, 204, 21, 0.8)'
    ];

    const solidBorders = [
        '#6366f1', '#0ea5e9', '#10b981', '#f43f5e', '#a855f7', '#facc15'
    ];

    // Initialize new chart
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
    
    // Reveal the download button once a graph is successfully generated
    document.getElementById('downloadBtn').style.display = 'flex';
}

// Handles exporting the chart canvas as a PNG
function downloadGraph() {
    const canvas = document.getElementById('myChart');
    const link = document.createElement('a');
    
    link.download = 'My_Graph.png';
    link.href = canvas.toDataURL('image/png'); // Convert canvas to base64 image URL
    link.click(); // Trigger native download
}
