let myChartInstance = null;

// Set Chart.js global defaults for dark mode UI
Chart.defaults.color = '#94a3b8'; 
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

// --- Workspace Storage Logic ---

// Saves current row data and chart configuration to LocalStorage
function saveWorkspace() {
    const rows = document.querySelectorAll('.data-row');
    const workspaceData = [];

    // Map DOM elements to a data object array
    rows.forEach(row => {
        const color = row.querySelector('.data-color').value;
        const label = row.querySelector('.data-label').value;
        const value = row.querySelector('.data-value').value;
        workspaceData.push({ color, label, value });
    });

    // Package state including chart metadata
    const saveState = {
        data: workspaceData,
        chartType: document.getElementById('graphType').value,
        chartTitle: document.getElementById('chartTitle').value,
        xAxisLabel: document.getElementById('xAxisLabel').value,
        yAxisLabel: document.getElementById('yAxisLabel').value
    };

    localStorage.setItem('graphMakerData', JSON.stringify(saveState));
}

// Restores saved data and rebuilds the DOM elements on initialization
function loadWorkspace() {
    const savedState = localStorage.getItem('graphMakerData');
    
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        const container = document.getElementById('data-points-container');
        
        // Restore Chart settings and metadata
        if (parsedState.chartType) document.getElementById('graphType').value = parsedState.chartType;
        if (parsedState.chartTitle) document.getElementById('chartTitle').value = parsedState.chartTitle;
        if (parsedState.xAxisLabel) document.getElementById('xAxisLabel').value = parsedState.xAxisLabel;
        if (parsedState.yAxisLabel) document.getElementById('yAxisLabel').value = parsedState.yAxisLabel;

        // Rebuild data rows if saved state exists
        if (parsedState.data && parsedState.data.length > 0) {
            container.innerHTML = ''; // Clear default HTML row

            parsedState.data.forEach(data => {
                const row = document.createElement('div');
                row.className = 'data-row';
                row.innerHTML = `
                    <input type="color" class="data-color" value="${data.color}" title="Pick a color">
                    <input type="text" class="data-label" placeholder="Label" value="${data.label}">
                    <div class="number-input-wrapper">
                        <button type="button" class="spin-btn" onclick="decrementValue(this)">−</button>
                        <input type="number" class="data-value" value="${data.value}">
                        <button type="button" class="spin-btn" onclick="incrementValue(this)">+</button>
                    </div>
                    <button onclick="removeDataRow(this)" class="remove-btn" title="Remove row">✕</button>
                `;
                container.appendChild(row);
            });
            
            // Auto-render the chart using the restored data
            createGraph(); 
        }
    }
}

// Wipes the board clean to start a new graph
function clearWorkspace() {
    // Show a quick warning so they don't click it by accident
    if (confirm("Are you sure you want to clear your entire graph? This cannot be undone.")) {
        
        // 1. Clear the local storage
        localStorage.removeItem('graphMakerData');
        
        // 2. Empty out all the text boxes
        document.getElementById('chartTitle').value = '';
        document.getElementById('xAxisLabel').value = '';
        document.getElementById('yAxisLabel').value = '';
        
        // 3. Delete all rows
        const container = document.getElementById('data-points-container');
        container.innerHTML = '';
        
        // 4. Destroy the canvas chart so it goes blank
        if (myChartInstance != null) {
            myChartInstance.destroy();
            myChartInstance = null; // Reset the instance
        }
        
        // 5. Hide the download button
        document.getElementById('downloadBtn').style.display = 'none';

        // 6. Add one fresh, empty row back to the UI
        addDataRow(); 
    }
}

// Lifecycle Hooks
document.addEventListener('DOMContentLoaded', () => {
    loadWorkspace(); // Restore session
    
    // NEW: A super-function that saves data AND redraws the graph instantly
    function handleUpdate() {
        saveWorkspace();
        
        // Only try to draw the graph if there's actually a label and value filled out
        const firstLabel = document.querySelector('.data-label').value;
        const firstValue = document.querySelector('.data-value').value;
        if (firstLabel !== "" && firstValue !== "") {
            createGraph(); 
        }
    }

    // Trigger the super-function anytime the user types, clicks, or changes a color!
    document.getElementById('data-points-container').addEventListener('input', handleUpdate);
    document.getElementById('graphType').addEventListener('change', handleUpdate);
    document.getElementById('chartTitle').addEventListener('input', handleUpdate);
    document.getElementById('xAxisLabel').addEventListener('input', handleUpdate);
    document.getElementById('yAxisLabel').addEventListener('input', handleUpdate);
});

// --- Core UI Logic ---

// Number input spinner utilities
function incrementValue(btnElement) {
    const input = btnElement.previousElementSibling;
    const currentValue = Number(input.value) || 0;
    input.value = currentValue + 1;
    saveWorkspace(); // Sync state
    createGraph();   // Live update
}

function decrementValue(btnElement) {
    const input = btnElement.nextElementSibling;
    const currentValue = Number(input.value) || 0;
    input.value = currentValue - 1;
    saveWorkspace(); // Sync state
    createGraph();   // Live update
}

// Appends a new data row to the DOM
function addDataRow() {
    const container = document.getElementById('data-points-container');
    const rowCount = container.children.length;
    
    // Cycle through predefined theme colors for row initialization
    const themeColors = ['#6366f1', '#0ea5e9', '#10b981', '#f43f5e', '#a855f7', '#facc15'];
    const nextColor = themeColors[rowCount % themeColors.length];

    const row = document.createElement('div');
    row.className = 'data-row';
    row.innerHTML = `
        <input type="color" class="data-color" value="${nextColor}" title="Pick a color">
        <input type="text" class="data-label" placeholder="Label">
        <div class="number-input-wrapper">
            <button type="button" class="spin-btn" onclick="decrementValue(this)">−</button>
            <input type="number" class="data-value" value="0">
            <button type="button" class="spin-btn" onclick="incrementValue(this)">+</button>
        </div>
        <button onclick="removeDataRow(this)" class="remove-btn" title="Remove row">✕</button>
    `;
    container.appendChild(row);
    
    // Auto-scroll to the bottom of the container
    container.scrollTop = container.scrollHeight;
    
    saveWorkspace(); // Sync state
    createGraph();   // Live update
    switchTab('data-tab');
}

// Handles row deletion
function removeDataRow(buttonElement) {
    const container = document.getElementById('data-points-container');
    
    // Prevent deletion of the final remaining row
    if (container.children.length > 1) {
        buttonElement.parentElement.remove();
        saveWorkspace(); // Sync state
        createGraph();   // Live update
    } else {
        alert("You must have at least one data point!");
    }
}

// Parses DOM inputs and renders the Chart.js instance
function createGraph() {
    const labelsArray = [];
    const valuesArray = [];
    const colorsArray = [];

    const rows = document.querySelectorAll('.data-row');

    // Extract labels, values, and hex colors from active DOM rows
    rows.forEach(row => {
        const labelInput = row.querySelector('.data-label').value.trim();
        const valueInput = row.querySelector('.data-value').value;
        const colorInput = row.querySelector('.data-color').value;

        // Ignore rows with incomplete data
        if (labelInput !== "" && valueInput !== "") {
            labelsArray.push(labelInput);
            valuesArray.push(Number(valueInput));
            colorsArray.push(colorInput);
        }
    });

    // Ensure data exists before attempting to draw the chart
    if (labelsArray.length === 0) {
        return;
    }

    // Handle our custom "Area" chart type
    const selectedType = document.getElementById('graphType').value;
    const isArea = selectedType === 'area';
    const chartType = isArea ? 'line' : selectedType; // Area is just a line chart with a fill

    const chartTitle = document.getElementById('chartTitle').value.trim();
    const xAxisLabel = document.getElementById('xAxisLabel').value.trim();
    const yAxisLabel = document.getElementById('yAxisLabel').value.trim();
    
    const ctx = document.getElementById('myChart').getContext('2d');
    
    // Append alpha channel 'CC' (80% opacity) for background fills
    const transparentBackgrounds = colorsArray.map(color => color + 'CC');
    
    // Cleanup previous chart instance to avoid rendering overlaps
    if (myChartInstance != null) {
        myChartInstance.destroy();
    }

    // Identify charts that don't use standard X/Y grids
    const radialCharts = ['pie', 'doughnut', 'polarArea', 'radar'];

    // Initialize new chart
    myChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labelsArray,
            datasets: [{
                label: yAxisLabel || 'Data Values', // Fallback dataset label
                data: valuesArray,
                backgroundColor: transparentBackgrounds,
                borderColor: colorsArray,
                borderWidth: 2,
                borderRadius: chartType === 'bar' ? 8 : 0,
                fill: isArea || chartType === 'polarArea' || chartType === 'radar', // Fills the space under the line
                tension: 0.4, // Makes lines smooth and curvy
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: chartTitle !== "", // Only render if user provided a title
                    text: chartTitle,
                    color: '#f8fafc',
                    font: { size: 18, family: 'Poppins', weight: '600' },
                    padding: { bottom: 20 }
                },
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
            // Smart axes: Hide standard grids for circular charts, style the radial grids
            scales: radialCharts.includes(chartType) ? {
                ...(chartType === 'radar' || chartType === 'polarArea' ? {
                    r: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { display: false } // Hides messy numbers inside the web
                    }
                } : {})
            } : {
                x: {
                    title: {
                        display: xAxisLabel !== "", // Only render if user provided an X label
                        text: xAxisLabel,
                        color: '#94a3b8',
                        font: { size: 13, family: 'Inter', weight: '500' }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: yAxisLabel !== "", // Only render if user provided a Y label
                        text: yAxisLabel,
                        color: '#94a3b8',
                        font: { size: 13, family: 'Inter', weight: '500' }
                    }
                }
            }
        }
    });
    
    // Reveal the export button post-render
    document.getElementById('downloadBtn').style.display = 'flex';
}

/**
 * Captures the chart as a PNG. 
 * Logic: 
 * - Light/Dark themes get a solid background so text is visible in all viewers.
 * - Transparent theme skips the fill, resulting in a true transparent PNG.
 */
function downloadGraph() {
    const canvas = document.getElementById('myChart');
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Check which theme is currently selected
    const currentTheme = document.getElementById('themeSelect').value;
    
    // Only fill the background if we AREN'T in transparent mode
    if (currentTheme !== 'transparent') {
        const isLight = document.body.classList.contains('light-theme');
        tempCtx.fillStyle = isLight ? '#ffffff' : '#1e293b'; 
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
    // If it's 'transparent', we skip fillRect entirely, keeping the alpha channel at 0
    
    // Draw the chart on top (either on the solid color or on nothing/transparency)
    tempCtx.drawImage(canvas, 0, 0);
    
    const link = document.createElement('a');
    link.download = 'Graph_Maker_Export.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}

/**
 * Switches between Dark, Light, and Transparent themes.
 * It also handles the Chart.js label colors so they stay readable.
 */
function changeTheme(themeName) {
    // Clean slate: remove theme-specific classes
    document.body.classList.remove('light-theme', 'transparent-theme');
    
    if (themeName === 'light') {
        document.body.classList.add('light-theme');
        Chart.defaults.color = '#334155'; // Darker text for light background
        Chart.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.05)';
    } else {
        // Both Dark and Transparent use light-colored labels
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';
        
        if (themeName === 'transparent') {
            document.body.classList.add('transparent-theme');
        }
    }
    
    // Save to localStorage and refresh the UI
    saveWorkspace();
    createGraph();
}

/**
 * Handles switching between the Data, Labels, and Styles tabs.
 * It hides all content areas and then shows the requested one.
 */
function switchTab(tabId) {
    // Remove 'active' from all buttons and content sections
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Set the clicked button to active
    const clickedBtn = event.currentTarget;
    clickedBtn.classList.add('active');

    // Show the corresponding content section
    document.getElementById(tabId).classList.add('active');
}
