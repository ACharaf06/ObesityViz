// activity.js — Diagramme radar : obésité, alimentation, activité physique

const csvPath =
  "../data/Nutrition,_Physical_Activity,_and_Obesity_-_Behavioral_Risk_Factor_Surveillance_System_20251109.csv";

const stateSelect = document.getElementById("stateSelect");
const yearSelect  = document.getElementById("yearSelect");
const radarContainer = d3.select("#radar");

// Tooltip
const radarTooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

/* ----------------------------------------------------------
   INDICATEURS UTILISÉS
   Les symboles ‹ permettent d'éviter les bugs HTML avec "<"
----------------------------------------------------------- */

const INDICATORS = [
  {
    id: "obesity",
    questionId: "Q036",
    label: "Obésité",
    description: "Part d’adultes en situation d’obésité (IMC ≥ 30)."
  },
  {
    id: "fruitLow",
    questionId: "Q018",
    label: "Fruits ‹ 1 fois/jour",
    description: "Part d’adultes consommant des fruits moins d’une fois par jour."
  },
  {
    id: "vegLow",
    questionId: "Q019",
    label: "Légumes ‹ 1 fois/jour",
    description: "Part d’adultes consommant des légumes moins d’une fois par jour."
  },
  {
    id: "inactive",
    questionId: "Q047",
    label: "Aucune activité de loisir",
    description: "Part d’adultes ne pratiquant aucune activité physique de loisir."
  }
];

// Structure des données
let profileByStateYear = new Map();
let allStates = [];
let allYears = [];

// Chargement CSV
d3.csv(csvPath, d => ({
  year: +d.YearStart,
  stateName: d.LocationDesc,
  stateAbbr: d.LocationAbbr,
  questionId: d.QuestionID,
  value: d.Data_Value === "" ? NaN : +d.Data_Value,
  stratCat1: d.StratificationCategory1,
  strat1: d.Stratification1
})).then(rows => {

  const filtered = rows.filter(
    d =>
      d.stratCat1 === "Total" &&
      d.strat1 === "Total" &&
      !isNaN(d.value) &&
      d.stateAbbr &&
      d.stateAbbr !== "US" &&
      INDICATORS.some(ind => ind.questionId === d.questionId)
  );

  profileByStateYear = new Map();
  const statesSet = new Set();
  const yearsSet = new Set();

  filtered.forEach(d => {
    const indicator = INDICATORS.find(i => i.questionId === d.questionId);
    if (!indicator) return;

    if (!profileByStateYear.has(d.stateName)) {
      profileByStateYear.set(d.stateName, new Map());
    }

    const yearMap = profileByStateYear.get(d.stateName);

    if (!yearMap.has(d.year)) {
      yearMap.set(d.year, {
        obesity: null,
        fruitLow: null,
        vegLow: null,
        inactive: null
      });
    }

    yearMap.get(d.year)[indicator.id] = d.value;

    statesSet.add(d.stateName);
    yearsSet.add(d.year);
  });

  allStates = Array.from(statesSet).sort();
  allYears  = Array.from(yearsSet).sort();

  // Remplir les selects
  stateSelect.innerHTML = "";
  allStates.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    stateSelect.appendChild(opt);
  });

  yearSelect.innerHTML = "";
  allYears.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });

  // Dernière année par défaut
  yearSelect.value = allYears[allYears.length - 1];

  updateRadar();

  stateSelect.addEventListener("change", updateRadar);
  yearSelect.addEventListener("change", updateRadar);
});

// Mise à jour radar
function updateRadar() {
  const stateName = stateSelect.value;
  const year = +yearSelect.value;

  if (!profileByStateYear.has(stateName)) {
    radarContainer.html("<p>Aucune donnée disponible.</p>");
    return;
  }

  const metrics = profileByStateYear.get(stateName).get(year);
  if (!metrics) {
    radarContainer.html("<p>Aucune donnée disponible.</p>");
    return;
  }

  const dataForRadar = INDICATORS.map(ind => ({
    id: ind.id,
    label: ind.label,
    description: ind.description,
    value: metrics[ind.id]
  }));

  const valid = dataForRadar.filter(d => !isNaN(d.value)).length;
  if (valid < 2) {
    radarContainer.html("<p>Données insuffisantes pour cet État.</p>");
    return;
  }

  drawRadarChart(dataForRadar, stateName, year);
}

// Dessin radar
function drawRadarChart(data, stateName, year) {
  radarContainer.selectAll("*").remove();

  // SVG plus large pour laisser respirer les labels
  const width = 700;       // ← élargi
  const height = 520;
  const margin = 90;
  const radius = Math.min(width, height) / 2 - margin; // min = 520 → rayon inchangé

  const svg = radarContainer
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2},${height / 2 + 10})`);

  // Titre
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 26)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "600")
    .text(`Profil de santé — ${stateName}, ${year}`);

  const numAxes = data.length;
  const angleSlice = (2 * Math.PI) / numAxes;

  const maxValue = 60;
  const radialScale = d3.scaleLinear().domain([0, maxValue]).range([0, radius]);

  // Grille
  const levels = 4;
  for (let lvl = 1; lvl <= levels; lvl++) {
    const r = (radius / levels) * lvl;
    g.append("circle")
      .attr("r", r)
      .attr("fill", "none")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 0.7);

    g.append("text")
      .attr("x", 0)
      .attr("y", -r)
      .attr("dy", "-0.3em")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#777")
      .text(((lvl * maxValue) / levels).toFixed(0) + " %");
  }

  // Axes + labels
  const axis = g.append("g");
  data.forEach((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = radialScale(maxValue) * Math.cos(angle);
    const y = radialScale(maxValue) * Math.sin(angle);

    // ligne rayon
    axis.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", x)
      .attr("y2", y)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 0.8);

    // labels juste à l'extérieur du dernier cercle
    const labelRadius = radialScale(maxValue) + 25;
    const lx = labelRadius * Math.cos(angle);
    const ly = labelRadius * Math.sin(angle);

    let anchor = "middle";
    const cosA = Math.cos(angle);
    if (cosA > 0.3) anchor = "start";     // à droite
    else if (cosA < -0.3) anchor = "end"; // à gauche

    axis.append("text")
      .attr("x", lx)
      .attr("y", ly)
      .attr("text-anchor", anchor)
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#333")
      .text(d.label);
  });

  // Points
  const points = data.map((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const val = d.value ?? 0;
    const r = radialScale(Math.min(val, maxValue));
    return {
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
      label: d.label,
      value: val
    };
  });

  const line = d3
    .line()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3.curveLinearClosed);

  g.append("path")
    .datum(points)
    .attr("d", line)
    .attr("fill", "#E63946")
    .attr("fill-opacity", 0.25)
    .attr("stroke", "#E63946")
    .attr("stroke-width", 2);

  const pointGroup = g.selectAll("g.indicator-point")
    .data(points)
    .join("g")
    .attr("class", "indicator-point")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  pointGroup.append("circle")
    .attr("r", 3.5)
    .attr("fill", "#E63946");

  // Valeurs en pourcentage au-dessus des points
  pointGroup.append("text")
    .attr("x", 0)
    .attr("y", -8)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .style("fill", "#444")
    .text(d => d.value.toFixed(1) + " %");

  // Tooltip
  pointGroup
    .on("mouseover", (event, d) => {
      radarTooltip
        .style("opacity", 1)
        .html(`<strong>${d.label}</strong><br>${d.value.toFixed(1)} %`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mousemove", event => {
      radarTooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => {
      radarTooltip.style("opacity", 0);
    });
}
