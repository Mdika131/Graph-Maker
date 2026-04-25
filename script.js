let myChartInstance = null;

// Set Chart.js global defaults for dark mode UI
Chart.defaults.color = '#94a3b8'; 
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('data');

    if (sharedData) {
        try {
            // Safer decoding for special characters
            const decodedData = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
            
            // Apply settings using your ACTUAL IDs
            if (decodedData.title) document.getElementById('chartTitle').value = decodedData.title;
            if (decodedData.xLabel) document.getElementById('xAxisLabel').value = decodedData.xLabel;
            if (decodedData.yLabel) document.getElementById('yAxisLabel').value = decodedData.yLabel;
            if (decodedData.type) document.getElementById('graphType').value = decodedData.type;

            // Clear the workspace and add shared rows
            const container = document.getElementById('data-points-container');
            container.innerHTML = ''; 

            decodedData.rows.forEach(item => {
                // This calls your addDataRow(label, value, color)
                addDataRow(item.label, item.value, item.color);
            });

            // Re-draw the graph with the new data
            createGraph();
            console.log("Shared graph loaded!");
            
        } catch (e) {
            console.error("Error loading shared link, falling back to local storage:", e);
            loadWorkspace(); 
        }
    } else {
        loadWorkspace(); 
    }
};

// --- Workspace Storage Logic ---

function saveWorkspace() {
    const rows = document.querySelectorAll('.data-row');
    const workspaceData = [];

    rows.forEach(row => {
        const color = row.querySelector('.data-color').value;
        const label = row.querySelector('.data-label').value;
        const value = row.querySelector('.data-value').value;
        workspaceData.push({ color, label, value });
    });

    const saveState = {
        data: workspaceData,
        chartType: document.getElementById('graphType').value,
        chartTitle: document.getElementById('chartTitle').value,
        xAxisLabel: document.getElementById('xAxisLabel').value,
        yAxisLabel: document.getElementById('yAxisLabel').value
    };

    localStorage.setItem('graphMakerData', JSON.stringify(saveState));
}

function loadWorkspace() {
    const savedState = localStorage.getItem('graphMakerData');
    
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        const container = document.getElementById('data-points-container');
        
        if (parsedState.chartType) document.getElementById('graphType').value = parsedState.chartType;
        if (parsedState.chartTitle) document.getElementById('chartTitle').value = parsedState.chartTitle;
        if (parsedState.xAxisLabel) document.getElementById('xAxisLabel').value = parsedState.xAxisLabel;
        if (parsedState.yAxisLabel) document.getElementById('yAxisLabel').value = parsedState.yAxisLabel;

        if (parsedState.data && parsedState.data.length > 0) {
            container.innerHTML = ''; 

            parsedState.data.forEach(data => {
                addDataRow(data.label, data.value, data.color);
            });
            
            createGraph(); 
        }
    }
}

function clearWorkspace() {
    if (confirm("Are you sure you want to clear your entire graph? This cannot be undone.")) {
        localStorage.removeItem('graphMakerData');
        
        document.getElementById('chartTitle').value = '';
        document.getElementById('xAxisLabel').value = '';
        document.getElementById('yAxisLabel').value = '';
        
        const container = document.getElementById('data-points-container');
        container.innerHTML = '';
        
        if (myChartInstance != null) {
            myChartInstance.destroy();
            myChartInstance = null;
        }
        
        document.getElementById('downloadBtn').style.display = 'none';
        addDataRow(); 
    }
}

// Lifecycle Hooks
document.addEventListener('DOMContentLoaded', () => {
    loadWorkspace();
    
    function handleUpdate() {
        saveWorkspace();
        const firstRow = document.querySelector('.data-row');
        if (firstRow) {
            const firstLabel = firstRow.querySelector('.data-label').value;
            const firstValue = firstRow.querySelector('.data-value').value;
            if (firstLabel !== "" || firstValue !== "") {
                createGraph(); 
            }
        }
    }

    document.getElementById('data-points-container').addEventListener('input', handleUpdate);
    document.getElementById('graphType').addEventListener('change', handleUpdate);
    document.getElementById('chartTitle').addEventListener('input', handleUpdate);
    document.getElementById('xAxisLabel').addEventListener('input', handleUpdate);
    document.getElementById('yAxisLabel').addEventListener('input', handleUpdate);
});

// --- Core UI Logic ---

function incrementValue(btnElement) {
    const input = btnElement.previousElementSibling;
    const currentValue = Number(input.value) || 0;
    input.value = currentValue + 1;
    saveWorkspace();
    createGraph();
}

function decrementValue(btnElement) {
    const input = btnElement.nextElementSibling;
    const currentValue = Number(input.value) || 0;
    input.value = currentValue - 1;
    saveWorkspace();
    createGraph();
}

// Appends a new data row to the DOM
function addDataRow(label = '', value = 0, color = null) {
    const container = document.getElementById('data-points-container');
    const newRow = document.createElement('div');
    newRow.className = 'data-row';

    const rowColor = color || getNextColor();

    newRow.innerHTML = `
        <input type="color" class="data-color" value="${rowColor}" title="Pick a color">
        <input type="text" class="data-label" placeholder="Label" value="${label}">
        <div class="number-input-wrapper">
            <button type="button" class="spin-btn" onclick="decrementValue(this)">−</button>
            <input type="number" class="data-value" value="${value}">
            <button type="button" class="spin-btn" onclick="incrementValue(this)">+</button>
        </div>
        <button type="button" class="remove-btn" onclick="removeDataRow(this)" title="Remove point">×</button>
    `;

    container.appendChild(newRow);
    
    container.scrollTop = container.scrollHeight;
    saveWorkspace(); 
    createGraph();
}

// Handles row deletion
function removeDataRow(buttonElement) {
    const container = document.getElementById('data-points-container');
    if (container.children.length > 1) {
        buttonElement.parentElement.remove();
        saveWorkspace();
        createGraph();
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

    rows.forEach(row => {
        const labelInput = row.querySelector('.data-label').value.trim();
        const valueInput = row.querySelector('.data-value').value;
        const colorInput = row.querySelector('.data-color').value;

        if (labelInput !== "" || valueInput !== "") {
            labelsArray.push(labelInput || "Unnamed");
            valuesArray.push(Number(valueInput) || 0);
            colorsArray.push(colorInput);
        }
    });

    if (labelsArray.length === 0) return;

    const selectedType = document.getElementById('graphType').value;
    const isArea = selectedType === 'area';
    const chartType = isArea ? 'line' : selectedType;

    const chartTitle = document.getElementById('chartTitle').value.trim();
    const xAxisLabel = document.getElementById('xAxisLabel').value.trim();
    const yAxisLabel = document.getElementById('yAxisLabel').value.trim();
    
    const ctx = document.getElementById('myChart').getContext('2d');
    const transparentBackgrounds = colorsArray.map(color => color + 'CC');
    
    if (myChartInstance != null) {
        myChartInstance.destroy();
    }

    const radialCharts = ['pie', 'doughnut', 'polarArea', 'radar'];

    myChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labelsArray,
            datasets: [{
                label: yAxisLabel || 'Data Values',
                data: valuesArray,
                backgroundColor: transparentBackgrounds,
                borderColor: colorsArray,
                borderWidth: 2,
                borderRadius: chartType === 'bar' ? 8 : 0,
                fill: isArea || chartType === 'polarArea' || chartType === 'radar',
                tension: 0.4,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: chartTitle !== "",
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
            scales: radialCharts.includes(chartType) ? {
                ...(chartType === 'radar' || chartType === 'polarArea' ? {
                    r: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { display: false }
                    }
                } : {})
            } : {
                x: {
                    title: {
                        display: xAxisLabel !== "",
                        text: xAxisLabel,
                        color: '#94a3b8',
                        font: { size: 13, family: 'Inter', weight: '500' }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: yAxisLabel !== "",
                        text: yAxisLabel,
                        color: '#94a3b8',
                        font: { size: 13, family: 'Inter', weight: '500' }
                    }
                }
            }
        }
    });
    
    document.getElementById('downloadBtn').style.display = 'flex';
}

function downloadGraph() {
    const canvas = document.getElementById('myChart');
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    const currentTheme = document.getElementById('themeSelect').value;
    
    if (currentTheme !== 'transparent') {
        const isLight = document.body.classList.contains('light-theme');
        tempCtx.fillStyle = isLight ? '#ffffff' : '#1e293b'; 
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
    
    tempCtx.drawImage(canvas, 0, 0);
    
    const link = document.createElement('a');
    link.download = 'Graph_Maker_Export.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();

    const btn = document.getElementById('downloadBtn');
    const originalContent = btn.innerHTML;
    
    btn.innerHTML = "✓ Saved!";
    btn.style.filter = "brightness(1.2)";
    btn.style.background = "#10b981"; 
    
    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.style.filter = "";
        btn.style.background = "";
    }, 2000);
}

function changeTheme(themeName) {
    document.body.classList.remove('light-theme', 'transparent-theme');
    
    if (themeName === 'light') {
        document.body.classList.add('light-theme');
        Chart.defaults.color = '#334155';
        Chart.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.05)';
    } else {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';
        if (themeName === 'transparent') {
            document.body.classList.add('transparent-theme');
        }
    }
    
    saveWorkspace();
    createGraph();
}

function switchTab(event, tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const clickedBtn = event.currentTarget;
    clickedBtn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        
        lines.forEach(line => {
            if (!line.trim()) return;
            const parts = line.split(',');
            
            if (parts.length >= 2) {
                const label = parts[0].trim().replace(/['"]+/g, ''); 
                const value = parseFloat(parts[1].trim());

                if (!isNaN(value)) {
                    addDataRow(label, value); 
                }
            }
        });

        createGraph();   // Fixed from updateChart()
        saveWorkspace(); 
        event.target.value = ''; 
    };
    reader.readAsText(file);
}

function getNextColor() {
    const container = document.getElementById('data-points-container');
    const rowCount = container ? container.children.length : 0;
    const themeColors = ['#6366f1', '#0ea5e9', '#10b981', '#f43f5e', '#a855f7', '#facc15'];
    return themeColors[rowCount % themeColors.length];
}

/**
 * Packages the current graph data into a shareable URL and copies it to clipboard
 */
function shareGraph() {
    // 1. Collect settings using your actual IDs
    const graphData = {
        title: document.getElementById('chartTitle').value,
        xLabel: document.getElementById('xAxisLabel').value,
        yLabel: document.getElementById('yAxisLabel').value,
        type: document.getElementById('graphType').value,
        rows: []
    };

    // 2. Collect rows using your actual Class Names
    document.querySelectorAll('.data-row').forEach(row => {
        graphData.rows.push({
            label: row.querySelector('.data-label').value,
            value: row.querySelector('.data-value').value,
            color: row.querySelector('.data-color').value
        });
    });

    // 3. Encode safely and generate the URL
    const jsonString = JSON.stringify(graphData);
    const encodedData = btoa(unescape(encodeURIComponent(jsonString)));
    const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;

    // 4. Copy to clipboard with visual button feedback
    navigator.clipboard.writeText(shareUrl).then(() => {
        const btn = document.getElementById('shareBtn');
        const originalText = btn.innerHTML;
        
        // Change button state to show it worked
        btn.innerHTML = "✓ Copied!";
        btn.style.background = "#10b981"; // Success green
        
        // Reset button back to normal after 2 seconds
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = ""; // Reverts to CSS gradient
        }, 2000);
        
    }).catch(err => {
        console.error('Failed to copy link: ', err);
    });
}
