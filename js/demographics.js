// demographics.js
// Lollipop chart (âge) + barres divergentes (genre)
// Filtre : année + zone (USA national ou État individuel)

const csvPath =
  "../data/Nutrition,_Physical_Activity,_and_Obesity_-_Behavioral_Risk_Factor_Surveillance_System_20251109.csv";

// Sélecteurs
const yearSelect  = document.getElementById("yearSelect");
const stateSelect = document.getElementById("stateSelect");

// Conteneurs D3
const ageDiv    = d3.select("#age-viz");
const genderDiv = d3.select("#gender-viz");

// Tooltip générique
const demoTooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

let obesityRows = [];      // toutes les lignes filtrées sur la Question obésité
let availableYears = [];
let availableStates = [];  // liste des LocationAbbr (sauf US) + leurs noms

d3.csv(csvPath, d => ({
  year: +d.YearStart,
  locationAbbr: d.LocationAbbr,
  locationDesc: d.LocationDesc,
  question: d.Question,
  value: d.Data_Value === "" ? NaN : +d.Data_Value,
  stratCat1: d.StratificationCategory1,
  strat1: d.Stratification1
})).then(rows => {

  // 1. Garder uniquement la question "Percent of adults aged 18 years and older who have obesity"
  obesityRows = rows.filter(
    d =>
      d.question ===
        "Percent of adults aged 18 years and older who have obesity" &&
      !isNaN(d.value) &&
      d.locationAbbr // éviter les valeurs vides
  );

  // 2. Années disponibles
  availableYears = Array.from(new Set(obesityRows.map(d => d.year))).sort(
    (a, b) => a - b
  );

  // 3. États / zone : on garde les abréviations (sauf US) triées par nom
  const stateMap = new Map(); // abbr -> name
  obesityRows.forEach(d => {
    if (d.locationAbbr !== "US") {
      stateMap.set(d.locationAbbr, d.locationDesc);
    }
  });
  availableStates = Array.from(stateMap.entries()).sort((a, b) =>
    d3.ascending(a[1], b[1])
  );

  // 4. Remplir les selects
  // Année
  availableYears.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
  yearSelect.value = availableYears[availableYears.length - 1];

  // État / Zone
  stateSelect.innerHTML = "";

  // Option nationale
  const optUS = document.createElement("option");
  optUS.value = "US";
  optUS.textContent = "États-Unis (national)";
  stateSelect.appendChild(optUS);

  // Séparateur facultatif (visuel)
  // const optSep = document.createElement("option");
  // optSep.disabled = true;
  // optSep.textContent = "────────";
  // stateSelect.appendChild(optSep);

  // Options par État
  availableStates.forEach(([abbr, name]) => {
    const opt = document.createElement("option");
    opt.value = abbr;
    opt.textContent = `${name} (${abbr})`;
    stateSelect.appendChild(opt);
  });

  // Valeur par défaut : national
  stateSelect.value = "US";

  // 5. Rendu initial
  updateAll();

  // 6. Mise à jour quand l’année ou l’État changent
  yearSelect.addEventListener("change", updateAll);
  stateSelect.addEventListener("change", updateAll);
});

function updateAll() {
  const year = +yearSelect.value;
  const loc  = stateSelect.value; // "US" ou code État

  drawAge(year, loc);
  drawGender(year, loc);
}

/* -------------------------------------------------------
   LOLLIPOP CHART : OBÉSITÉ SELON L’ÂGE
--------------------------------------------------------*/
function drawAge(year, locationAbbr) {
  ageDiv.selectAll("*").remove();

  const subset = obesityRows.filter(
    d =>
      d.year === year &&
      d.locationAbbr === locationAbbr &&
      d.stratCat1 === "Age (years)"
  );

  if (subset.length === 0) {
    ageDiv.html("<p>Aucune donnée disponible pour cette combinaison année / zone.</p>");
    return;
  }

  let values = subset.map(d => ({
    age: d.strat1,
    value: d.value
  }));

  const ageOrder = [
    "18 - 24",
    "25 - 34",
    "35 - 44",
    "45 - 54",
    "55 - 64",
    "65 or older"
  ];
  values.sort((a, b) => ageOrder.indexOf(a.age) - ageOrder.indexOf(b.age));

  const width = 900;
  const height = 320;
  const margin = { top: 30, right: 80, bottom: 40, left: 120 };

  const svg = ageDiv
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(values, d => d.value) + 5])
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleBand()
    .domain(values.map(d => d.age))
    .range([margin.top, height - margin.bottom])
    .padding(0.6);

  // Axe X
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(6)
        .tickFormat(d => d + " %")
    )
    .select(".domain")
    .remove();

  // Axe Y
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .select(".domain")
    .remove();

  // Lignes
  svg
    .selectAll("line.lollipop")
    .data(values)
    .join("line")
    .attr("class", "lollipop")
    .attr("x1", x(0))
    .attr("x2", d => x(d.value))
    .attr("y1", d => y(d.age) + y.bandwidth() / 2)
    .attr("y2", d => y(d.age) + y.bandwidth() / 2)
    .attr("stroke", "#f1a1ab")
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round");

  // Points
  const points = svg
    .selectAll("circle.lollipop")
    .data(values)
    .join("circle")
    .attr("class", "lollipop")
    .attr("cx", d => x(d.value))
    .attr("cy", d => y(d.age) + y.bandwidth() / 2)
    .attr("r", 6)
    .attr("fill", "#E63946");

  // Labels
  svg
    .selectAll("text.lollipop-label")
    .data(values)
    .join("text")
    .attr("class", "lollipop-label")
    .attr("x", d => x(d.value) + 8)
    .attr("y", d => y(d.age) + y.bandwidth() / 2 + 3)
    .style("font-size", "11px")
    .style("fill", "#333")
    .text(d => d.value.toFixed(1) + " %");

  // Tooltip
  points
    .on("mouseover", (event, d) => {
      demoTooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.age}</strong><br>${d.value.toFixed(
            1
          )} % d’adultes obèses`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mousemove", event => {
      demoTooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => demoTooltip.style("opacity", 0));
}

/* -------------------------------------------------------
   BARRES DIVERGENTES : OBÉSITÉ SELON LE GENRE
--------------------------------------------------------*/
function drawGender(year, locationAbbr) {
  genderDiv.selectAll("*").remove();

  const subset = obesityRows.filter(
    d =>
      d.year === year &&
      d.locationAbbr === locationAbbr &&
      d.stratCat1 === "Sex"
  );

  if (subset.length === 0) {
    genderDiv.html("<p>Aucune donnée disponible pour cette combinaison année / zone.</p>");
    return;
  }

  let values = subset.map(d => ({
    gender: d.strat1,
    value: d.value
  }));

  const labelMap = {
    Male: "Hommes",
    Female: "Femmes"
  };
  values.forEach(d => {
    d.label = labelMap[d.gender] || d.gender;
  });

  const maxVal = d3.max(values, d => d.value);
  const width = 900;
  const height = 260;
  const margin = { top: 30, right: 80, bottom: 40, left: 80 };

  const svg = genderDiv
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Valeur signée : hommes à gauche, femmes à droite
  values.forEach(d => {
    d.signed = d.gender === "Male" ? -d.value : d.value;
  });

  const x = d3
    .scaleLinear()
    .domain([-maxVal - 5, maxVal + 5])
    .nice()
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleBand()
    .domain(values.map(d => d.label))
    .range([margin.top, height - margin.bottom])
    .padding(0.4);

  // Axe X
  const xAxis = d3
    .axisBottom(x)
    .ticks(6)
    .tickFormat(d => Math.abs(d) + " %");

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .select(".domain")
    .remove();

  // Axe Y (libellés sur la ligne centrale)
  svg
    .append("g")
    .attr("transform", `translate(${x(0)},0)`)
    .call(d3.axisLeft(y))
    .select(".domain")
    .remove();

  // Ligne verticale centrale
  svg
    .append("line")
    .attr("x1", x(0))
    .attr("x2", x(0))
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1);

  const color = d => (d.gender === "Male" ? "#457B9D" : "#E63946");

  const bars = svg
    .selectAll("rect.gender-bar")
    .data(values)
    .join("rect")
    .attr("class", "gender-bar")
    .attr("y", d => y(d.label))
    .attr("height", y.bandwidth())
    .attr("x", d => (d.signed < 0 ? x(d.signed) : x(0)))
    .attr("width", d => Math.abs(x(d.signed) - x(0)))
    .attr("fill", color)
    .attr("opacity", 0.85);

  // Labels numériques au bout des barres
  svg
    .selectAll("text.gender-label")
    .data(values)
    .join("text")
    .attr("class", "gender-label")
    .attr("y", d => y(d.label) + y.bandwidth() / 2 + 4)
    .attr("x", d =>
      d.signed < 0 ? x(d.signed) - 4 : x(d.signed) + 4
    )
    .attr("text-anchor", d =>
      d.signed < 0 ? "end" : "start"
    )
    .style("font-size", "11px")
    .style("fill", "#333")
    .text(d => d.value.toFixed(1) + " %");

  // Tooltip
  bars
    .on("mouseover", (event, d) => {
      demoTooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.label}</strong><br>${d.value.toFixed(
            1
          )} % d’adultes obèses`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mousemove", event => {
      demoTooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => demoTooltip.style("opacity", 0));
}
