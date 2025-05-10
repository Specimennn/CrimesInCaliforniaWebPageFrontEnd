// Crime Data Visualization Script
// This script enhances your existing HTML page with charts and map

const API_URL = "https://web-production-c1c9.up.railway.app/all-crimes";

// Add these to your existing HTML file in the head section:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
// <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
// <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js"></script>

// Main function to load and visualize crime data
async function loadCrimeData() {
  const tbody = document.getElementById("crime-body");
  const table = document.getElementById("crime-table");
  const loading = document.getElementById("loading");
  
  // Create container for charts and map
  const chartContainer = document.createElement("div");
  chartContainer.id = "chart-dashboard";
  chartContainer.className = "chart-dashboard";
  
  // Insert the chart container before the table
  table.parentNode.insertBefore(chartContainer, table);
  
  // Create toggle button for charts/table view
  const toggleButton = document.createElement("button");
  toggleButton.textContent = "Toggle Charts/Table";
  toggleButton.className = "toggle-button";
  toggleButton.onclick = function() {
    if (chartContainer.style.display === "none") {
      chartContainer.style.display = "block";
      table.style.display = "none";
    } else {
      chartContainer.style.display = "none";
      table.style.display = "table";
    }
  };
  
  // Insert toggle button before chart container
  chartContainer.parentNode.insertBefore(toggleButton, chartContainer);
  
  // Create chart canvases and map container
  chartContainer.innerHTML = `
    <div class="chart-row">
      <div class="chart-container">
        <h3>Crime Map - LA City</h3>
        <div id="crime-map" style="height: 500px;"></div>
      </div>
    </div>
    <div class="chart-row">
      <div class="chart-container">
        <h3>Top Crime Types</h3>
        <canvas id="crimeTypesChart"></canvas>
      </div>
    </div>
    <div class="chart-row">
      <div class="chart-container half">
        <h3>Victim Gender</h3>
        <canvas id="genderChart"></canvas>
      </div>
      <div class="chart-container half">
        <h3>Victim Age Groups</h3>
        <canvas id="ageChart"></canvas>
      </div>
    </div>
    <div class="chart-row">
      <div class="chart-container">
        <h3>Crimes by Area</h3>
        <canvas id="areaChart"></canvas>
      </div>
    </div>
    <div class="chart-row">
      <div class="chart-container">
        <h3>Crime Trends by Month</h3>
        <canvas id="timelineChart"></canvas>
      </div>
    </div>
  `;
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    // Populate the table as in your original code
    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.date_rptd || ""}</td>
        <td>${row.date_occ || ""}</td>
        <td>${row.vict_age || ""}</td>
        <td>${row.vict_sex || ""}</td>
        <td>${row.crm_cd_desc || ""}</td>
        <td>${row.area || ""}</td>
        <td>${row.lat || ""}</td>
        <td>${row.lon || ""}</td>
      `;
      tbody.appendChild(tr);
    });
    
    // Analyze data for charts
    const analysis = analyzeData(data);
    
    // Create the map
    createCrimeMap(data);
    
    // Create all charts
    createCharts(analysis);
    
    // Hide loading indicator and show content
    loading.style.display = "none";
    table.style.display = "none"; // Initially show charts instead of table
    chartContainer.style.display = "block";
    
  } catch (error) {
    loading.textContent = "Error loading data";
    console.error("Error:", error);
  }
}

// Create crime map using Leaflet
function createCrimeMap(data) {
  // Center of Los Angeles
  const LA_CENTER = [34.0522, -118.2437];
  
  // Initialize map
  const map = L.map('crime-map').setView(LA_CENTER, 10);
  
  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  
  // Create markers layer group
  const markers = L.layerGroup().addTo(map);
  
  // Create heatmap data array
  const heatData = [];
  
  // Process data for map visualization
  const validPoints = data.filter(item => {
    // Ensure we have valid lat/lon
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    return !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;
  });
  
  // Group data by crime type for the legend
  const crimeTypes = {};
  validPoints.forEach(item => {
    if (item.crm_cd_desc) {
      crimeTypes[item.crm_cd_desc] = (crimeTypes[item.crm_cd_desc] || 0) + 1;
    }
  });
  
  // Create a color map for crime types (use only top types for clarity)
  const topCrimes = Object.keys(crimeTypes)
    .sort((a, b) => crimeTypes[b] - crimeTypes[a])
    .slice(0, 8);
    
  const crimeColors = {
    "VEHICLE - STOLEN": "#FF5733",
    "BURGLARY FROM VEHICLE": "#C70039",
    "BURGLARY": "#900C3F",
    "THEFT PLAIN - PETTY": "#581845",
    "ASSAULT WITH DEADLY WEAPON": "#FF0000",
    "BATTERY - SIMPLE ASSAULT": "#FFC300",
    "ROBBERY": "#DAF7A6",
    "THEFT OF IDENTITY": "#FFC0CB"
  };
  
  // Ensure we have a color for each of our top crimes
  topCrimes.forEach((crime, index) => {
    if (!crimeColors[crime]) {
      const colorPalette = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#FF6B6B"];
      crimeColors[crime] = colorPalette[index % colorPalette.length];
    }
  });
  
  // Add clustered markers for better performance with large datasets
  const clusters = L.markerClusterGroup();
  
  // Add data points to map
  validPoints.forEach(item => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    if (lat && lon) {
      // Add to heatmap data
      heatData.push([lat, lon, 1]); // Third parameter is intensity
      
      // Create popup content
      const popupContent = `
        <strong>Crime:</strong> ${item.crm_cd_desc || 'Unknown'}<br>
        <strong>Date:</strong> ${item.date_occ || 'Unknown'}<br>
        <strong>Victim Age:</strong> ${item.vict_age || 'Unknown'}<br>
        <strong>Victim Gender:</strong> ${item.vict_sex || 'Unknown'}<br>
        <strong>Area:</strong> ${item.area || 'Unknown'}
      `;
      
      // Determine marker color based on crime type
      const defaultColor = "#3388ff"; // Default blue
      const color = crimeColors[item.crm_cd_desc] || defaultColor;
      
      // Create customized marker
      const markerOptions = {
        radius: 6,
        fillColor: color,
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      };
      
      // Add circle marker to cluster group
      const marker = L.circleMarker([lat, lon], markerOptions).bindPopup(popupContent);
      clusters.addLayer(marker);
    }
  });
  
  // Add clusters to map
  map.addLayer(clusters);
  
  // Add heatmap layer (separate visualization option)
  const heat = L.heatLayer(heatData, {
    radius: 20,
    blur: 15,
    maxZoom: 17,
    gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
  });
  
  // Create layer controls
  const baseMaps = {
    "Street Map": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }),
    "Satellite": L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    })
  };
  
  const overlayMaps = {
    "Crime Points": clusters,
    "Heat Map": heat
  };
  
  // Add active layers to map
  baseMaps["Street Map"].addTo(map);
  
  // Add layer control to map
  L.control.layers(baseMaps, overlayMaps).addTo(map);
  
  // Add legend for crime types
  const legend = L.control({position: 'bottomright'});
  
  legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    div.style.backgroundColor = 'white';
    div.style.padding = '10px';
    div.style.borderRadius = '5px';
    div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
    
    div.innerHTML = '<h4 style="margin-top:0;margin-bottom:5px;">Crime Types</h4>';
    
    // Add legend items for top crime types
    topCrimes.forEach(crime => {
      div.innerHTML += 
        `<div style="margin-bottom:3px;">
           <i style="background:${crimeColors[crime]};width:10px;height:10px;display:inline-block;"></i> 
           <span style="font-size:12px;margin-left:5px;">${crime}</span>
         </div>`;
    });
    
    return div;
  };
  
  legend.addTo(map);
  
  return map;
}

// Analyze data for visualizations
function analyzeData(data) {
  // Crime type distribution
  const crimeTypes = {};
  data.forEach(item => {
    const crimeType = item.crm_cd_desc;
    if (crimeType) {
      crimeTypes[crimeType] = (crimeTypes[crimeType] || 0) + 1;
    }
  });
  
  // Gender distribution
  const genderCounts = {};
  data.forEach(item => {
    const gender = item.vict_sex;
    if (gender) {
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    }
  });
  
  // Area distribution
  const areaCounts = {};
  data.forEach(item => {
    const area = item.area;
    if (area) {
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    }
  });
  
  // Age distribution in groups
  const ageGroups = {
    "Under 18": 0,
    "18-25": 0,
    "26-40": 0,
    "41-60": 0,
    "Over 60": 0
  };
  
  data.forEach(item => {
    const age = parseInt(item.vict_age);
    if (!isNaN(age)) {
      if (age < 18) ageGroups["Under 18"]++;
      else if (age <= 25) ageGroups["18-25"]++;
      else if (age <= 40) ageGroups["26-40"]++;
      else if (age <= 60) ageGroups["41-60"]++;
      else ageGroups["Over 60"]++;
    }
  });
  
  // Crimes by month
  const crimesByMonth = {};
  data.forEach(item => {
    if (item.date_occ) {
      const date = new Date(item.date_occ);
      if (!isNaN(date.getTime())) {
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        crimesByMonth[monthYear] = (crimesByMonth[monthYear] || 0) + 1;
      }
    }
  });
  
  return {
    crimeTypes,
    genderCounts,
    ageGroups,
    areaCounts,
    crimesByMonth
  };
}

// Create charts using Chart.js
function createCharts(analysis) {
  // Color palette
  const colors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
    '#82ca9d', '#ffc658', '#FF6B6B', '#6A0572', '#AB83A1'
  ];
  
  // 1. Top 10 Crime Types Chart
  const crimeTypeLabels = Object.keys(analysis.crimeTypes)
    .sort((a, b) => analysis.crimeTypes[b] - analysis.crimeTypes[a])
    .slice(0, 10);
  
  const crimeTypeValues = crimeTypeLabels.map(label => analysis.crimeTypes[label]);
  
  new Chart(document.getElementById('crimeTypesChart'), {
    type: 'bar',
    data: {
      labels: crimeTypeLabels,
      datasets: [{
        label: 'Number of Incidents',
        data: crimeTypeValues,
        backgroundColor: colors[0],
        borderColor: colors[0],
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  // 2. Gender Distribution Chart
  const genderLabels = Object.keys(analysis.genderCounts).map(key => {
    // Convert gender codes to full names for clarity
    if (key === 'M') return 'Male';
    if (key === 'F') return 'Female';
    if (key === 'X') return 'Non-Binary/Other';
    return key;
  });
  
  const genderValues = Object.values(analysis.genderCounts);
  
  new Chart(document.getElementById('genderChart'), {
    type: 'pie',
    data: {
      labels: genderLabels,
      datasets: [{
        data: genderValues,
        backgroundColor: colors.slice(0, genderLabels.length),
        hoverOffset: 4
      }]
    }
  });
  
  // 3. Age Groups Chart
  const ageLabels = Object.keys(analysis.ageGroups);
  const ageValues = Object.values(analysis.ageGroups);
  
  new Chart(document.getElementById('ageChart'), {
    type: 'bar',
    data: {
      labels: ageLabels,
      datasets: [{
        label: 'Number of Victims',
        data: ageValues,
        backgroundColor: colors[2],
        borderColor: colors[2],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  // 4. Top Areas Chart
  const areaLabels = Object.keys(analysis.areaCounts)
    .sort((a, b) => analysis.areaCounts[b] - analysis.areaCounts[a])
    .slice(0, 10);
  
  const areaValues = areaLabels.map(label => analysis.areaCounts[label]);
  
  new Chart(document.getElementById('areaChart'), {
    type: 'bar',
    data: {
      labels: areaLabels,
      datasets: [{
        label: 'Number of Incidents',
        data: areaValues,
        backgroundColor: colors[3],
        borderColor: colors[3],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  // 5. Crime Timeline Chart
  const timeLabels = Object.keys(analysis.crimesByMonth).sort();
  const timeValues = timeLabels.map(label => analysis.crimesByMonth[label]);
  
  new Chart(document.getElementById('timelineChart'), {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        label: 'Crimes per Month',
        data: timeValues,
        fill: false,
        borderColor: colors[4],
        tension: 0.1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Add CSS for charts and map
function addChartStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .chart-dashboard {
      display: block;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto 20px auto;
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .chart-row {
      display: flex;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }
    
    .chart-container {
      background-color: white;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      width: 100%;
      margin-bottom: 20px;
    }
    
    .chart-container.half {
      width: calc(50% - 10px);
    }
    
    .chart-container.half:first-child {
      margin-right: 20px;
    }
    
    .chart-container h3 {
      margin-top: 0;
      margin-bottom: 15px;
      font-size: 18px;
      color: #333;
    }
    
    .toggle-button {
      display: block;
      margin: 0 auto 20px auto;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    
    .toggle-button:hover {
      background-color: #45a049;
    }
    
    #crime-map {
      width: 100%;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    
    @media (max-width: 768px) {
      .chart-container.half {
        width: 100%;
        margin-right: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  addChartStyles();
  loadCrimeData();
});
