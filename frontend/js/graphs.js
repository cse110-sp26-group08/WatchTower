document.addEventListener("DOMContentLoaded", () => {
  const chartCanvas = document.getElementById("dashboardChart");

  if (!chartCanvas || typeof Chart === "undefined") {
    return;
  }

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const errorCounts = [12, 19, 9, 15, 7, 11, 5];
  const warningCounts = [21, 16, 14, 18, 13, 10, 8];

  new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Errors",
          data: errorCounts,
          borderColor: "#1f49ff",
          backgroundColor: "rgba(31, 73, 255, 0.14)",
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#1f49ff"
        },
        {
          label: "Warnings",
          data: warningCounts,
          borderColor: "#00a38c",
          backgroundColor: "rgba(0, 163, 140, 0.1)",
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#00a38c"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            boxWidth: 12,
            usePointStyle: true,
            pointStyle: "circle",
            color: "#313547",
            font: {
              family: "Arial, sans-serif",
              size: 12,
              weight: "600"
            }
          }
        },
        tooltip: {
          backgroundColor: "#111827",
          titleColor: "#f8fafc",
          bodyColor: "#dbe4f0",
          displayColors: true,
          padding: 12
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: "#6b7280"
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(15, 23, 42, 0.08)"
          },
          ticks: {
            stepSize: 5,
            color: "#6b7280"
          },
          title: {
            display: true,
            text: "Events",
            color: "#4b5563",
            font: {
              family: "Arial, sans-serif",
              size: 12,
              weight: "600"
            }
          }
        }
      }
    }
  });
});
