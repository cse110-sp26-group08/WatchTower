console.log("performance.js loaded");
console.log("flatpickr:", typeof flatpickr);

flatpickr("#date-range", {
  mode: "range",
  dateFormat: "m/d/Y",
  defaultDate: [
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    new Date()
  ]
});