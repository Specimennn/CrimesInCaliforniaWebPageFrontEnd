const API_URL = "https://web-production-c1c9.up.railway.app/all-crimes";

async function loadCrimeData() {
  const tbody = document.getElementById("crime-body");
  const table = document.getElementById("crime-table");
  const loading = document.getElementById("loading");

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

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

    loading.style.display = "none";
    table.style.display = "table";
  } catch (error) {
    loading.textContent = "Error al cargar los datos";
    console.error("Error:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadCrimeData);
