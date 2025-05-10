// Crime Data Visualization Script
// This script enhances your existing HTML page with charts

const API_URL = "https://web-production-c1c9.up.railway.app/all-crimes";

// Add this to your existing HTML file in the head section:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>

// Main function to load and visualize crime data
async function loadCrimeData() {
  const tbody = document.getElementById("crime-body");
  const table = document.getElementById("crime-table");
  const loading = document.getElementById("loading");
  
  // Create container for charts
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
  
  // Create chart canvases
  chartContainer.innerHTML = `
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

// Add CSS for charts
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
