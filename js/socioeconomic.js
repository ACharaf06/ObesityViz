// socioeconomic.js
// Visualisations des facteurs socio-économiques : revenu, éducation, race/ethnicité

const csvPath =
  "../data/Nutrition,_Physical_Activity,_and_Obesity_-_Behavioral_Risk_Factor_Surveillance_System_20251109.csv";

// Sélecteurs
const yearSelect  = document.getElementById("yearSelect");
const stateSelect = document.getElementById("stateSelect");

// Conteneurs D3
const incomeDiv    = d3.select("#income-viz");
const educationDiv = d3.select("#education-viz");
const raceDiv      = d3.select("#race-viz");

// Tooltip générique
const socioTooltip = d3
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

  // 6. Mise à jour quand l'année ou l'État changent
  yearSelect.addEventListener("change", updateAll);
  stateSelect.addEventListener("change", updateAll);
});

function updateAll() {
  const year = +yearSelect.value;
  const loc  = stateSelect.value; // "US" ou code État

  drawIncome(year, loc);
  drawEducation(year, loc);
  drawRace(year, loc);
}

/* -------------------------------------------------------
   CHART 1 : OBÉSITÉ SELON LE REVENU
--------------------------------------------------------*/
function drawIncome(year, locationAbbr) {
  incomeDiv.selectAll("*").remove();

  const subset = obesityRows.filter(
    d =>
      d.year === year &&
      d.locationAbbr === locationAbbr &&
      d.stratCat1 === "Income"
  );

  if (subset.length === 0) {
    incomeDiv.html("<p>Aucune donnée disponible pour cette combinaison année / zone.</p>");
    return;
  }

  let values = subset.map(d => ({
    income: d.strat1,
    value: d.value
  }));

  // Ordre des tranches de revenu
  const incomeOrder = [
    "Less than $15,000",
    "$15,000 - $24,999",
    "$25,000 - $34,999",
    "$35,000 - $49,999",
    "$50,000 - $74,999",
    "$75,000 or greater"
  ];

  // Filtrer uniquement les valeurs qui sont dans notre ordre
  values = values.filter(d => incomeOrder.includes(d.income));
  values.sort((a, b) => incomeOrder.indexOf(a.income) - incomeOrder.indexOf(b.income));

  if (values.length === 0) {
    incomeDiv.html("<p>Aucune donnée disponible pour cette combinaison année / zone.</p>");
    return;
  }

  const width = 900;
  const height = 350;
  const margin = { top: 30, right: 80, bottom: 40, left: 160 };

  const svg = incomeDiv
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
    .domain(values.map(d => d.income))
    .range([margin.top, height - margin.bottom])
    .padding(0.3);

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

  // Barres
  const bars = svg
    .selectAll("rect.income-bar")
    .data(values)
    .join("rect")
    .attr("class", "income-bar")
    .attr("x", margin.left)
    .attr("y", d => y(d.income))
    .attr("width", d => x(d.value) - margin.left)
    .attr("height", y.bandwidth())
    .attr("fill", "#457B9D")
    .attr("opacity", 0.8);

  // Labels
  svg
    .selectAll("text.income-label")
    .data(values)
    .join("text")
    .attr("class", "income-label")
    .attr("x", d => x(d.value) + 8)
    .attr("y", d => y(d.income) + y.bandwidth() / 2 + 4)
    .style("font-size", "11px")
    .style("fill", "#333")
    .text(d => d.value.toFixed(1) + " %");

  // Tooltip
  bars
    .on("mouseover", (event, d) => {
      socioTooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.income}</strong><br>${d.value.toFixed(
            1
          )} % d'adultes obèses`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mousemove", event => {
      socioTooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => socioTooltip.style("opacity", 0));
}

/* -------------------------------------------------------
   CHART 2 : OBÉSITÉ SELON L'ÉDUCATION
--------------------------------------------------------*/
function drawEducation(year, locationAbbr) {
  educationDiv.selectAll("*").remove();

  const subset = obesityRows.filter(
    d =>
      d.year === year &&
      d.locationAbbr === locationAbbr &&
      d.stratCat1 === "Education"
  );

  if (subset.length === 0) {
    educationDiv.html("<p>Aucune donnée disponible pour cette combinaison année / zone.</p>");
    return;
  }

  let values = subset.map(d => ({
    education: d.strat1,
    value: d.value
  }));

  // Ordre des niveaux d'éducation
  const educationOrder = [
    "Less than high school",
    "High school graduate",
    "Some college or technical school",
    "College graduate"
  ];

  values = values.filter(d => educationOrder.includes(d.education));
  values.sort((a, b) => educationOrder.indexOf(a.education) - educationOrder.indexOf(b.education));

  if (values.length === 0) {
    educationDiv.html("<p>Aucune donnée disponible pour cette combinaison année / zone.</p>");
    return;
  }

  const width = 900;
  const height = 300;
  const margin = { top: 30, right: 80, bottom: 40, left: 200 };

  const svg = educationDiv
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
    .domain(values.map(d => d.education))
    .range([margin.top, height - margin.bottom])
    .padding(0.3);

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

  // Barres
  const bars = svg
    .selectAll("rect.education-bar")
    .data(values)
    .join("rect")
    .attr("class", "education-bar")
    .attr("x", margin.left)
    .attr("y", d => y(d.education))
    .attr("width", d => x(d.value) - margin.left)
    .attr("height", y.bandwidth())
    .attr("fill", "#E76F51")
    .attr("opacity", 0.8);

  // Labels
  svg
    .selectAll("text.education-label")
    .data(values)
    .join("text")
    .attr("class", "education-label")
    .attr("x", d => x(d.value) + 8)
    .attr("y", d => y(d.education) + y.bandwidth() / 2 + 4)
    .style("font-size", "11px")
    .style("fill", "#333")
    .text(d => d.value.toFixed(1) + " %");

  // Tooltip
  bars
    .on("mouseover", (event, d) => {
      socioTooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.education}</strong><br>${d.value.toFixed(
            1
          )} % d'adultes obèses`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mousemove", event => {
      socioTooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => socioTooltip.style("opacity", 0));
}

/* -------------------------------------------------------
   CHART 3 : OBÉSITÉ SELON LA RACE/ETHNICITÉ
--------------------------------------------------------*/
function drawRace(year, locationAbbr) {
  raceDiv.selectAll("*").remove();

  const subset = obesityRows.filter(
    d =>
      d.year === year &&
      d.locationAbbr === locationAbbr &&
      d.stratCat1 === "Race/Ethnicity"
  );

  if (subset.length === 0) {
    raceDiv.html("<p>Aucune donnée disponible pour cette combinaison année / zone.</p>");
    return;
  }

  let values = subset.map(d => ({
    race: d.strat1,
    value: d.value
  }));

  // On garde seulement les principales catégories (exclure "Other", "2 or more races" parfois peu fiables)
  const raceOrder = [
    "American Indian/Alaska Native",
    "Asian",
    "Hawaiian/Pacific Islander",
    "Hispanic",
    "Non-Hispanic Black",
    "Non-Hispanic White"
  ];

  values = values.filter(d => raceOrder.includes(d.race));
  values.sort((a, b) => d3.descending(a.value, b.value));

  if (values.length === 0) {
    raceDiv.html("<p>Aucune donnée disponible pour cette combinaison année / zone.</p>");
    return;
  }

  const width = 900;
  const height = 350;
  const margin = { top: 30, right: 80, bottom: 40, left: 220 };

  const svg = raceDiv
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
    .domain(values.map(d => d.race))
    .range([margin.top, height - margin.bottom])
    .padding(0.5);

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

  // Lignes (lollipop)
  svg
    .selectAll("line.race-lollipop")
    .data(values)
    .join("line")
    .attr("class", "race-lollipop")
    .attr("x1", margin.left)
    .attr("x2", d => x(d.value))
    .attr("y1", d => y(d.race) + y.bandwidth() / 2)
    .attr("y2", d => y(d.race) + y.bandwidth() / 2)
    .attr("stroke", "#f1a1ab")
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round");

  // Points
  const points = svg
    .selectAll("circle.race-lollipop")
    .data(values)
    .join("circle")
    .attr("class", "race-lollipop")
    .attr("cx", d => x(d.value))
    .attr("cy", d => y(d.race) + y.bandwidth() / 2)
    .attr("r", 6)
    .attr("fill", "#E63946");

  // Labels
  svg
    .selectAll("text.race-label")
    .data(values)
    .join("text")
    .attr("class", "race-label")
    .attr("x", d => x(d.value) + 8)
    .attr("y", d => y(d.race) + y.bandwidth() / 2 + 4)
    .style("font-size", "11px")
    .style("fill", "#333")
    .text(d => d.value.toFixed(1) + " %");

  // Tooltip
  points
    .on("mouseover", (event, d) => {
      socioTooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.race}</strong><br>${d.value.toFixed(
            1
          )} % d'adultes obèses`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mousemove", event => {
      socioTooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => socioTooltip.style("opacity", 0));
}

