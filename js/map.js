// map.js — Carte choroplèthe interactive avec évolution annuelle + clic État

const width = 975;
const height = 610;

const svg = d3
  .select("#map")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

const yearSlider = document.getElementById("yearSlider");
const yearLabel = document.getElementById("yearLabel");
const playBtn = document.getElementById("playBtn");

// éléments du panneau d’info
const stateTitleEl = document.getElementById("stateTitle");
const stateYearSpan = document.querySelector("#stateYear span");
const stateValueSpan = document.querySelector("#stateValue span");
const stateCommentEl = document.getElementById("stateComment");

const csvPath =
  "../data/Nutrition,_Physical_Activity,_and_Obesity_-_Behavioral_Risk_Factor_Surveillance_System_20251109.csv";

let years = [];
let obesityByYear; // Map<year, Map<stateName, value>>
let color;
let statePaths;
let playTimer = null;
let playing = false;
let selectedPath = null;
let globalMin;
let globalMax;

Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json"),
  d3.csv(csvPath, d => ({
    stateName: d.LocationDesc,
    stateAbbr: d.LocationAbbr,
    question: d.Question,
    year: +d.YearStart,
    value: d.Data_Value === "" ? NaN : +d.Data_Value,
    stratCat1: d.StratificationCategory1,
    strat1: d.Stratification1
  }))
]).then(([us, rawData]) => {
  // 1. On garde uniquement les lignes sur l'obésité des adultes, valeurs numériques, par État
  const filtered = rawData.filter(
    d =>
      d.question ===
        "Percent of adults aged 18 years and older who have obesity" &&
      !isNaN(d.value) &&
      d.stateAbbr &&
      d.stateAbbr !== "US"
  );

  // Map pour retrouver l'abréviation (AL, CA, NY...) à partir du nom d'État
  const stateAbbrByName = new Map();
  filtered.forEach(d => {
    if (!stateAbbrByName.has(d.stateName)) {
      stateAbbrByName.set(d.stateName, d.stateAbbr);
    }
  });

  // 2. On agrège : moyenne par (année, État)
  const byYearState = d3.rollup(
    filtered,
    v => d3.mean(v, d => d.value),
    d => d.year,
    d => d.stateName
  );

  years = Array.from(byYearState.keys()).sort((a, b) => a - b);
  console.log("Années trouvées pour cette question :", years);

  // Construction de obesityByYear = Map<year, Map<stateName, value>>
  obesityByYear = new Map();
  const allValues = [];

  for (const [year, stateMap] of byYearState.entries()) {
    obesityByYear.set(year, stateMap);
    for (const v of stateMap.values()) {
      allValues.push(v);
    }
  }

  const minYear = years[0];
  const maxYear = years[years.length - 1];

  // 3. Échelle de couleur commune à toutes les années
  globalMin = Math.floor(d3.min(allValues));
  globalMax = Math.ceil(d3.max(allValues));

  const nbClasses = 6; // moins de classes => différences plus marquées
  color = d3
    .scaleQuantize()
    .domain([globalMin, globalMax])
    .range(d3.schemeYlOrRd[nbClasses]);

  console.log("Bornes de classes :", color.thresholds());

  // 4. Slider configuré sur les années disponibles
  yearSlider.min = minYear;
  yearSlider.max = maxYear;
  yearSlider.step = 1;
  yearSlider.value = maxYear;
  yearLabel.textContent = maxYear;

  // 5. Géométrie des États (TopoJSON → GeoJSON)
  const states = topojson.feature(us, us.objects.states);
  const path = d3.geoPath(); // déjà projeté en Albers

  // 6. Fonction pour mettre à jour le panneau d’info
  function updateStatePanel(stateName, year) {
    const yearData = obesityByYear.get(year) || new Map();
    const val = yearData.get(stateName);

    stateTitleEl.textContent = stateName || "Aucun État sélectionné";
    stateYearSpan.textContent = year || "-";

    if (val != null) {
      stateValueSpan.textContent = val.toFixed(1) + " %";

      const middle = (globalMin + globalMax) / 2;
      let comment;
      if (val >= globalMax - 2) {
        comment = "Taux parmi les plus élevés du pays.";
      } else if (val >= middle) {
        comment = "Taux supérieur à la moyenne nationale.";
      } else {
        comment = "Taux plutôt inférieur à la moyenne nationale.";
      }
      stateCommentEl.textContent = comment;
    } else {
      stateValueSpan.textContent = "données indisponibles";
      stateCommentEl.textContent =
        "Aucune donnée rapportée pour cet État pour l’année sélectionnée.";
    }
  }

  // 7. Dessin des États
  statePaths = svg
    .append("g")
    .selectAll("path")
    .data(states.features)
    .join("path")
    .attr("d", path)
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.7)
    .on("mouseover", (event, d) => {
      const currentYear = +yearSlider.value;
      const yearData = obesityByYear.get(currentYear) || new Map();
      const val = yearData.get(d.properties.name);

      // récupérer l’abréviation via la map construite à partir du CSV
      const abbr = stateAbbrByName.get(d.properties.name);
      const label = abbr
        ? `${d.properties.name} (${abbr})`
        : d.properties.name;

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${label}</strong><br>` +
            (val != null
              ? `${val.toFixed(1)} % en ${currentYear}`
              : `Pas de données pour ${currentYear}`)
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })

    .on("mousemove", event => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    })
    .on("click", (event, d) => {
      const currentYear = +yearSlider.value;
      const stateName = d.properties.name;

      // gérer le highlight visuel
      if (selectedPath) {
        selectedPath.classList.remove("state-highlight");
      }
      selectedPath = event.currentTarget;
      selectedPath.classList.add("state-highlight");

      updateStatePanel(stateName, currentYear);
    });

  // 7bis. Libellés d'État (abréviations) au centre de chaque État
  svg
    .append("g")
    .selectAll("text")
    .data(states.features)
    .join("text")
    .attr("class", "state-label")
    .attr("transform", d => {
      const c = path.centroid(d);
      return `translate(${c[0]},${c[1]})`;
    })
    .attr("dy", "0.35em")
    .text(d => {
      const abbr = stateAbbrByName.get(d.properties.name);
      return abbr || "";
    });

  // 8. Fonction pour mettre à jour les couleurs
  function updateMap(year) {
    const yearData = obesityByYear.get(year) || new Map();

    statePaths
      .transition()
      .duration(300)
      .attr("fill", d => {
        const val = yearData.get(d.properties.name);
        return val != null ? color(val) : "#eee";
      });

    // si un État est déjà sélectionné, mettre à jour le panneau
    if (selectedPath) {
      const selectedDatum = d3.select(selectedPath).datum();
      updateStatePanel(selectedDatum.properties.name, year);
    }
  }

  // 9. Légende discrète (par classes) avec graduations propres
  const legendWidth = 260;
  const legendHeight = 10;

  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - legendWidth - 40}, ${height - 40})`);

  const legendClasses = color.range(); // couleurs
  const boxWidth = legendWidth / legendClasses.length;

  // rectangles de couleur
  legendClasses.forEach((col, i) => {
    legend
      .append("rect")
      .attr("x", i * boxWidth)
      .attr("y", 0)
      .attr("width", boxWidth)
      .attr("height", legendHeight)
      .attr("fill", col);
  });

  // axe de texte avec valeurs arrondies (25 %, 30 %, 35 %, ...)
  const legendScale = d3
    .scaleLinear()
    .domain([globalMin, globalMax])
    .range([0, legendWidth]);

  const step = 5;
  const tickValues = d3.range(
    Math.ceil(globalMin / step) * step,
    Math.floor(globalMax / step) * step + 0.1,
    step
  );

  const legendAxis = d3
    .axisBottom(legendScale)
    .tickValues(tickValues)
    .tickFormat(d => d + " %");

  legend
    .append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis)
    .select(".domain")
    .remove();

  legend
    .append("text")
    .attr("x", 0)
    .attr("y", -6)
    .style("font-size", "12px")
    .style("fill", "#333")
    .text("Taux d’obésité chez les adultes (%)");

  // 10. Slider → mise à jour
  yearSlider.addEventListener("input", () => {
    const y = +yearSlider.value;
    yearLabel.textContent = y;
    updateMap(y);
  });

  // 11. Bouton Play/Pause qui repart du début si on est déjà à la fin
  playBtn.addEventListener("click", () => {
    if (years.length <= 1) {
      alert(
        "Les données ne contiennent qu'une seule année pour cet indicateur : l'animation n'est pas disponible."
      );
      return;
    }

    if (!playing) {
      playing = true;
      playBtn.textContent = "⏸ Pause";

      let idx = years.indexOf(+yearSlider.value);

      // Si on est déjà sur la dernière année, on repart du début
      if (idx === years.length - 1) {
        idx = -1;
      }

      playTimer = setInterval(() => {
        if (idx >= years.length - 1) {
          clearInterval(playTimer);
          playing = false;
          playBtn.textContent = "▶️ Lancer";
          return;
        }

        idx += 1;
        const y = years[idx];
        yearSlider.value = y;
        yearLabel.textContent = y;
        updateMap(y);
      }, 800);
    } else {
      playing = false;
      playBtn.textContent = "▶️ Lancer";
      clearInterval(playTimer);
    }
  });

  // 12. Affichage initial : dernière année
  updateMap(maxYear);
});
