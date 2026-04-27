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
            const decodedData = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
            
            // Apply text settings
            if (decodedData.title) document.getElementById('chartTitle').value = decodedData.title;
            if (decodedData.xLabel) document.getElementById('xAxisLabel').value = decodedData.xLabel;
            if (decodedData.yLabel) document.getElementById('yAxisLabel').value = decodedData.yLabel;
            if (decodedData.type) document.getElementById('graphType').value = decodedData.type;

            // Clear the workspace completely
            document.getElementById('categories-container').innerHTML = '';
            document.getElementById('datasets-container').innerHTML = '';

            // Rebuild the new multi-dataset structure from the shared link
            if (decodedData.categories && decodedData.datasets) {
                decodedData.categories.forEach(cat => addCategory(cat));
                decodedData.datasets.forEach(ds => addDataset(ds.name, ds.color, ds.values));
            }

            createGraph();
            console.log("Shared graph loaded successfully!");
            
        } catch (e) {
            console.error("Link is broken or outdated, falling back to local storage:", e);
            loadWorkspace(); 
        }
    } else {
        loadWorkspace(); 
    }
};

// --- Workspace Storage Logic ---

function saveWorkspace() {
    // 1. Save all category labels
    const categories = Array.from(document.querySelectorAll('.category-row .data-label')).map(input => input.value);
    
    // 2. Save all dataset configurations and their grid values
    const datasets = Array.from(document.querySelectorAll('.dataset-block')).map(block => {
        return {
            name: block.querySelector('.dataset-name-input').value,
            color: block.querySelector('.data-color').value,
            values: Array.from(block.querySelectorAll('.data-value')).map(input => Number(input.value) || 0)
        };
    });

    const saveState = {
        categories: categories,
        datasets: datasets,
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
        
        // Restore standard inputs
        if (parsedState.chartType) document.getElementById('graphType').value = parsedState.chartType;
        if (parsedState.chartTitle) document.getElementById('chartTitle').value = parsedState.chartTitle;
        if (parsedState.xAxisLabel) document.getElementById('xAxisLabel').value = parsedState.xAxisLabel;
        if (parsedState.yAxisLabel) document.getElementById('yAxisLabel').value = parsedState.yAxisLabel;

        // Restore multi-dataset arrays if they exist in storage
        if (parsedState.categories && parsedState.datasets) {
            document.getElementById('categories-container').innerHTML = ''; 
            document.getElementById('datasets-container').innerHTML = ''; 

            parsedState.categories.forEach(cat => addCategory(cat));
            parsedState.datasets.forEach(ds => addDataset(ds.name, ds.color, ds.values));
            
            createGraph(); 
            return; // Exit early if successful
        }
    }
    
    // Fallback: If no saved data, or old data format, start fresh
    document.getElementById('categories-container').innerHTML = '';
    document.getElementById('datasets-container').innerHTML = '';
    addCategory();
    addDataset();
}   

function clearWorkspace() {
    if (confirm("Are you sure you want to clear your entire graph? This cannot be undone.")) {
        // 1. Wipe the local storage memory
        localStorage.removeItem('graphMakerData');
        
        // 2. Clear out the global text settings
        document.getElementById('chartTitle').value = '';
        document.getElementById('xAxisLabel').value = '';
        document.getElementById('yAxisLabel').value = '';
        
        // 3. Destroy the current chart visually
        if (myChartInstance != null) {
            myChartInstance.destroy();
            myChartInstance = null;
        }
        
        document.getElementById('downloadBtn').style.display = 'none';
        
        // 4. Wipe the new multi-dataset containers
        document.getElementById('categories-container').innerHTML = '';
        document.getElementById('datasets-container').innerHTML = '';
        
        // 5. Inject a fresh, blank state
        addCategory();
        addDataset();
    }
}

// Lifecycle Hooks
document.addEventListener('DOMContentLoaded', () => {
    // Note: loadWorkspace() is already called by window.onload, so we removed it from here to prevent double-loading.
    
    function handleUpdate() {
        saveWorkspace();
        createGraph(); 
    }

    // Bind auto-updating to the new layout containers
    document.getElementById('categories-container').addEventListener('input', handleUpdate);
    document.getElementById('datasets-container').addEventListener('input', handleUpdate);
    
    // Bind auto-updating to settings
    document.getElementById('graphType').addEventListener('change', handleUpdate);
    document.getElementById('chartTitle').addEventListener('input', handleUpdate);
    document.getElementById('xAxisLabel').addEventListener('input', handleUpdate);
    document.getElementById('yAxisLabel').addEventListener('input', handleUpdate);
});

// --- Core UI Logic ---

function incrementValue(btnElement) {
    const input = btnElement.previousElementSibling;
    input.value = (Number(input.value) || 0) + 1;
    createGraph(); saveWorkspace();
}

function decrementValue(btnElement) {
    const input = btnElement.nextElementSibling;
    input.value = (Number(input.value) || 0) - 1;
    createGraph(); saveWorkspace();
}

/**
 * Adds a new Category (X-Axis label) and injects a new value input into every existing dataset.
 */
function addCategory(catName = '') {
    const container = document.getElementById('categories-container');
    const index = container.children.length;
    
    const row = document.createElement('div');
    row.className = 'category-row';
    row.innerHTML = `
        <input type="text" class="data-label" placeholder="e.g. Q1" value="${catName}" oninput="createGraph(); saveWorkspace()">
        <button type="button" class="remove-btn" onclick="removeCategory(this)">×</button>
    `;
    container.appendChild(row);

    // Keep datasets synchronized: Add a new blank value box to every dataset
    document.querySelectorAll('.dataset-values-grid').forEach(grid => {
        grid.insertAdjacentHTML('beforeend', createValueInputHTML(0));
    });

    createGraph(); saveWorkspace();

    // Update all dataset labels dynamically when a category name changes
    document.querySelectorAll('.category-row .data-label').forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            document.querySelectorAll('.dataset-block').forEach(block => {
                const labels = block.querySelectorAll('.value-input-item label');
                if (labels[idx]) labels[idx].innerText = e.target.value || `Cat ${idx+1}`;
            });
        });
    });
}

/**
 * Removes a Category and its corresponding values from all datasets.
 */
function removeCategory(btn) {
    const row = btn.closest('.category-row');
    const container = row.parentNode;
    const index = Array.from(container.children).indexOf(row);
    
    if (container.children.length > 1) {
        row.remove();
        // Remove the exact nth value from every dataset so everything stays aligned
        document.querySelectorAll('.dataset-values-grid').forEach(grid => {
            if (grid.children[index]) grid.children[index].remove();
        });
        createGraph(); saveWorkspace();
    } else {
        alert("You must have at least one category on the X-axis!");
    }
}

/**
 * Generates the HTML snippet for a single number input, with a label!
 */
function createValueInputHTML(value, labelText = 'Value') {
    return `
        <div class="value-input-item">
            <label>${labelText}</label>
            <div class="number-input-wrapper">
                <button type="button" class="spin-btn" onclick="decrementValue(this)">−</button>
                <input type="number" class="data-value" value="${value}" oninput="createGraph(); saveWorkspace()">
                <button type="button" class="spin-btn" onclick="incrementValue(this)">+</button>
            </div>
        </div>
    `;
}

/**
 * Adds a new Dataset block (e.g. "2023 Sales")
 */
function addDataset(name = '', color = null, values = []) {
    const container = document.getElementById('datasets-container');
    const catCount = document.getElementById('categories-container').children.length;
    
    // Cycle through a premium color palette for new datasets
    const themeColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const datasetColor = color || themeColors[container.children.length % themeColors.length];
    
    const block = document.createElement('div');
    block.className = 'dataset-block';
    
    // Generate the right number of value inputs, grabbing the label from the UI
    let valuesHTML = '';
    const categoryInputs = document.querySelectorAll('.category-row .data-label');
    
    for(let i = 0; i < catCount; i++) {
        const val = values[i] !== undefined ? values[i] : 0;
        const catName = categoryInputs[i] ? categoryInputs[i].value || `Cat ${i+1}` : `Cat ${i+1}`;
        valuesHTML += createValueInputHTML(val, catName);
    }

    block.innerHTML = `
        <div class="dataset-header">
            <input type="color" class="data-color" value="${datasetColor}" oninput="createGraph(); saveWorkspace()">
            <input type="text" class="dataset-name-input" placeholder="Dataset Name (e.g. Sales)" value="${name}" oninput="createGraph(); saveWorkspace()">
            <button type="button" class="remove-btn" onclick="this.closest('.dataset-block').remove(); createGraph(); saveWorkspace()">×</button>
        </div>
        <div class="dataset-values-grid">
            ${valuesHTML}
        </div>
    `;
    container.appendChild(block);
    createGraph(); saveWorkspace();
}

// Parses DOM inputs and renders the Chart.js instance
/**
 * Parses the dynamic DOM elements and renders the Chart.js instance
 */
function createGraph() {
    // 1. Gather Categories (X-Axis Labels)
    const labelsArray = [];
    document.querySelectorAll('.category-row .data-label').forEach(input => {
        labelsArray.push(input.value.trim() || '...');
    });

    if (labelsArray.length === 0) return;

    // 2. Global Chart Settings
    const selectedType = document.getElementById('graphType').value;
    const isArea = selectedType === 'area';
    const chartType = isArea ? 'line' : selectedType;
    const chartTitle = document.getElementById('chartTitle').value.trim();
    const xAxisLabel = document.getElementById('xAxisLabel').value.trim();
    const yAxisLabel = document.getElementById('yAxisLabel').value.trim();
    
    // 3. Gather Datasets dynamically
    const datasetsArray = [];
    document.querySelectorAll('.dataset-block').forEach(block => {
        const name = block.querySelector('.dataset-name-input').value.trim() || 'Unnamed';
        const color = block.querySelector('.data-color').value;
        const values = [];
        
        block.querySelectorAll('.data-value').forEach(input => {
            values.push(Number(input.value) || 0);
        });

        datasetsArray.push({
            label: name,
            data: values,
            backgroundColor: chartType === 'line' || chartType === 'radar' ? color + '33' : color + 'CC', // 33 hex adds light transparency
            borderColor: color,
            borderWidth: 2,
            borderRadius: chartType === 'bar' ? 6 : 0,
            fill: isArea || chartType === 'polarArea' || chartType === 'radar',
            tension: 0.4
        });
    });

    // 4. Render Chart
    const ctx = document.getElementById('myChart').getContext('2d');
    if (myChartInstance != null) {
        myChartInstance.destroy();
    }

    const radialCharts = ['pie', 'doughnut', 'polarArea', 'radar'];

    myChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labelsArray,
            datasets: datasetsArray
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
 * Packages the multi-dataset graph configuration into a URL and copies it
 */
function shareGraph() {
    // 1. Gather all category names
    const categories = Array.from(document.querySelectorAll('.category-row .data-label')).map(input => input.value);
    
    // 2. Gather dataset details
    const datasets = Array.from(document.querySelectorAll('.dataset-block')).map(block => {
        return {
            name: block.querySelector('.dataset-name-input').value,
            color: block.querySelector('.data-color').value,
            values: Array.from(block.querySelectorAll('.data-value')).map(input => Number(input.value) || 0)
        };
    });

    // 3. Combine into final payload
    const graphData = {
        title: document.getElementById('chartTitle').value,
        xLabel: document.getElementById('xAxisLabel').value,
        yLabel: document.getElementById('yAxisLabel').value,
        type: document.getElementById('graphType').value,
        categories: categories,
        datasets: datasets
    };

    // 4. Encode and generate the shareable link
    const jsonString = JSON.stringify(graphData);
    const encodedData = btoa(unescape(encodeURIComponent(jsonString)));
    const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;

    // 5. Copy to clipboard with UI feedback
    navigator.clipboard.writeText(shareUrl).then(() => {
        const btn = document.getElementById('shareBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = "✓ Copied!";
        btn.style.background = "#10b981"; // Success green
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = ""; 
        }, 2000);
        
    }).catch(err => {
        console.error('Failed to copy link: ', err);
    });
}
