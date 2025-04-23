async function loadCrimeData() {
    const response = await fetch("web-production-c1c9.up.railway.app");
    const data = await response.json();
  
    const labels = data.map(entry => entry.crime);
    const values = data.map(entry => entry.count);
  
    new Chart(document.getElementById("crimeChart"), {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Cantidad de crímenes",
          data: values,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
  
  loadCrimeData();
  