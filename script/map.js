var width = 2400;
var height = 1900;
var noOfNodes = 100;
var GeoURL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
var csvPath = "https://raw.githubusercontent.com/GabrielBeepBoop/Covid-dataset/main/owid-covid-data_processed.csv" // path to csv containing the COVID-19 data

let currentYear = 0; // Store current year
let currentCountry = "" // Current country selected by the mouse hover
let isLock = false // To lock the selected region when left mouse button is clicked

let svg = d3.select("svg").attr("viewBox", "0 0 " + width + " " + height)
//set back

const sensitivity = 75; // Sensitivity for dragging the globe
const scaleFactor = 500;

// Map and projection
const projection = d3.geoOrthographic()
  .scale(scaleFactor)
  .center([0, 0])
  .translate([width / 2, height / 2]);

const path = d3.geoPath(projection);

//Globe drag
svg.call(d3.drag().on('drag', (event) => {
  const rotate = projection.rotate()
  const k = sensitivity / projection.scale()
  projection.rotate([
    rotate[0] + event.dx * k,
    rotate[1] - event.dy * k
  ])
  globePaths = d3.geoPath().projection(projection)
  svg.select(".globe").selectAll("path").attr("d", globePaths)
}));


let zoom = d3.zoom()
  .on('zoom', handleZoom)
  .scaleExtent([1, 5]) //Scale factor of 5
  .translateExtent([[0, 0], [width, height]]); //Set Min max to be within bounds

// Zoom call
function handleZoom(e) {
  d3.select('#worldMap g')
    .attr('transform', e.transform);
}

function initZoom() {
  d3.select('#worldMap')
    .call(zoom);
}

// Update the country heatmap intensity based on the givenYear
function updateHeatMapByYear(val, data) {
  let objectByYear = data[val];
  for (const index in objectByYear) {
    let element = objectByYear[index];
    d3.select("path#" + element["location"]).attr("fill", d3.interpolateTurbo(element["intensity_score"]));
  }
}
// Normalize the intensity score for a Year for each country between a given range from normalizedMin to normalizedMax (e.g 0 to 100)
function normalizeIntensityScoreByYear(data, year, normalizedMin, normalizedMax) {

  let intensityScoreArray = data[year].map(a => a.intensity_score);
  let minEntry = Math.min(...intensityScoreArray);
  let maxEntry = Math.max(...intensityScoreArray);
  for (const index in data[year]) {
    let currentScore = data[year][index]["intensity_score"];
    let mx = ((currentScore - minEntry) / (maxEntry - minEntry));
    let preshiftNormalized = mx * (normalizedMax - normalizedMin);
    data[year][index]["intensity_score"] = preshiftNormalized + normalizedMin;
  }

  return data;
}

// Update Country info table
function updateCountryTableProperty(data, nameOfCountry, year) {
  // Check if the country exists in the csv
  const found = data[year].some(el => el.location === nameOfCountry);

  let element = undefined;

  if (found) {
    // Retrieve element by country
      element = data[year].find(obj => {
      return obj.location == nameOfCountry;
    })

  }
  if (nameOfCountry != null && currentCountry != "" && element != undefined){
    // Update statistics for that chosen country
    d3.select("#country").text(nameOfCountry);
    d3.select("#year").text(year);
    // Regex for adding "," after every 3 numbers
    d3.select("#covidDeath").text(Number(element["total_death"]).toLocaleString());
    d3.select("#totalPopulation").text(Number(element["poulation"]).toLocaleString());
    d3.select("#populationDensity").text(Number(element["population_density"]).toLocaleString());
    d3.select("#totalVaccination").text(Number(element["total_vaccinations"]).toLocaleString());

  }
  else {
     // Update statistics for that chosen country
     d3.select("#country").text("NIL");
     d3.select("#year").text("NIL");
     // Regex for adding "," after every 3 numbers
     d3.select("#covidDeath").text("NIL");
     d3.select("#totalPopulation").text("NIL");
     d3.select("#populationDensity").text("NIL");
     d3.select("#totalVaccination").text("NIL");

  }
}

// Load external data and boot
Promise.all([d3.json(GeoURL), d3.csv(csvPath)]).then(function (loadData) {
  let topo = loadData[0]
  let csvData = loadData[1];

  // Preprocess data
  csvData.forEach(e => {
    e["date"] = new Date(e["date"]);
  });

  // Get the distinct years from the COVID-19 dataset
  let yearResults = [...new Set(csvData.map(data => data["date"].getFullYear()))];

  // An object that stores the data needed for the heat map
  let dataForHeatMap = {}
  for (const j in yearResults) {
    dataForHeatMap[yearResults[j]] = []
  }

  // Set current year
  currentYear = yearResults[0];

  // Get the countries with no duplicates
  let countriesArray = [...new Set(csvData.map(function (item) { return item["location"]; }))];

  for (const i in countriesArray) {

    for (const j in yearResults) {
      let year = yearResults[j]

      // Filter by countries and year
      singleCountryData = csvData.filter(obj => obj.location == countriesArray[i]);
      singleCountryData = singleCountryData.filter(obj => obj.date.getFullYear() == year);

      if (Object.keys(singleCountryData).length != 0) {

        // Get the object that has the latest date from that year
        element = singleCountryData.reduce((a, b) => (a["date"] > b["date"] ? a : b));

        // Compute the intensity score (mortality rate)
        intensityScore = element["total_deaths"] / element["population"];
        if (isNaN(intensityScore)) {
          intensityScore = 0;
        }

        // Insert location, intensity score, total deaths, population, total vaccinations into the dataForHeatMap
        dataForHeatMap[year].push({
          "location": element["location"], "intensity_score": intensityScore, "poulation": element["population"],
          "population_density": element["population_density"], "total_death": element["total_deaths"],
          "total_vaccinations": element["total_vaccinations"]
        });

      } else {

        // Insert location, intensity score, total deaths, population, total vaccinations into the dataForHeatMap
        dataForHeatMap[year].push({
          "location": element["location"], "intensity_score": 0,
          "poulation": 0, "total_death": 0, "total_vaccinations": 0
        }
        );
      }
    }
  }

  // Add tooltip
  var tooltip = d3.select("body")
    .append("div")
    .attr('class', 'd3-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('padding', '20px')
    .style('border-radius', '1px')
    .style('color', 'black')
    .style('background', 'rgba(255,255,255,1)')
    .style('pointer-events', 'none')

  // When the mouse is over the country
  let mouseOver = function (event, d) {
    d3.selectAll(".Country")
      .transition()
      .duration(200)
      .style("opacity", .5)
    d3.select(this)
      .transition()
      .duration(200)
      .style("opacity", 1)
      .style("stroke", "black")
    tooltip
      .html("<strong>Country:</strong> <span >" + d.properties.name)
      .style('visibility', 'visible')

  }

  // When the mouse moves over the country
  let mouseMove = function (event, d) {
    tooltip
      .style('left', event.pageX + 'px')
      .style('top', event.pageY + 'px')
  }

  // When the mouse is not over the country
  let mouseLeave = function (event, d) {
    d3.selectAll(".Country")
      .transition()
      .duration(200)
      .style("opacity", .8)
    d3.select(this)
      .transition()
      .duration(200)
      .style("stroke", "transparent")
    tooltip
      .style('visibility', 'hidden')
      currentCountry = "";
  }

  let mouseClick = function (event, d) {
    isLock = !isLock
    if (isLock == true) {

      //Remove mouse events
      d3.selectAll("path").on("mouseover", null);
      d3.selectAll("path").on("mousemove", null);
      d3.selectAll("path").on("mouseleave", null);
      tooltip
        .style('visibility', 'hidden')

      //Apply styling
      d3.select(this)
        .style("stroke-width", "3px")
        .style("opacity", 1);

      
       currentCountry = d.properties.name;
       updateCountryTableProperty(dataForHeatMap, d.properties.name, currentYear);
        
      // Update Helper text
      d3.select("#HelperText")
        .text(currentCountry + " has been selected")

      // Update Chart title for Line/Pie/Node
      d3.select("#selectedCountryStats")
        .text(currentCountry + "'s Statistics")

      // Clear any existing charts and draw the selected chart
      clearChart()
      if ($('#optionLineChart').is(':checked')) {
        drawCountryLineChart(currentCountry, currentYear)
      }
      else if ($('#optionPieChart').is(':checked')) {
        drawCountryPieChart(currentCountry, currentYear)
      }
      else if ($('#optionNodeChart').is(':checked')) {
        drawCountryNodeChart(currentCountry, currentYear)
      }

    } else {
      // Add back the mouse events
      d3.selectAll("path").on("mouseover", mouseOver);
      d3.selectAll("path").on("mousemove", mouseMove);
      d3.selectAll("path").on("mouseleave", mouseLeave);

      //Remove styling
      d3.select(event.currentTarget)
        .style("mask", "")
        .style("stroke-width", "0px");

      // Update Helper text
      d3.select("#HelperText")
        .text("Please click on a country to see more details")

      // Update Chart title for Line/Pie/Node
      d3.select("#selectedCountryStats")
        .text("Individual Country Statistics")

      // Set current country to be empty
      currentCountry = "";

      // Clear all the charts and show country not selected message
      clearChart();
      drawCountryNotSelected();

    }
  }

  let groupForGlobe = svg.append("g").attr("class", "globe");

  //Ocean
  groupForGlobe.append("circle")
  .attr("r",  scaleFactor)
  .attr("cx", width/2)
  .attr("cy", height/2 )
  .attr('fill', 'lightskyblue')

  // Draw the map
  groupForGlobe
    .selectAll("path")
    .data(topo.features)
    .enter()
    .append("path")
    // Draw each country
    .attr("d", d3.geoPath()
      .projection(projection)
    )
    // set the color of each country
    .attr("fill", d3.interpolateTurbo(0))

    // Set the ID to the name of each country 
    .attr("id", function (d) {
      return d.properties.name;
    })
    .style("stroke", "transparent")
    .attr("class", function (d) { return "Country" })
    .style("opacity", .8)

    // Set the respective mouse movements functions
    .on("mouseover", mouseOver)
    .on("mousemove", mouseMove)
    .on("mouseleave", mouseLeave)
    .on("click", mouseClick)

  // For the first Year 2020 color fill update for country
  dataForHeatMap = normalizeIntensityScoreByYear(dataForHeatMap, currentYear, 0, 1);
  updateHeatMapByYear(currentYear, dataForHeatMap);

  // Horizontal slider
  var sliderHorizontal = d3
    .sliderBottom()
    .min(d3.min(yearResults))
    .max(d3.max(yearResults))
    .width(100)
    .step(1)
    .tickFormat(d3.format(""))
    .ticks(2)
    .on('onchange', val => {
      // update heat map here
      currentYear = val;
      dataForHeatMap = normalizeIntensityScoreByYear(dataForHeatMap, val, 0, 1);
      updateHeatMapByYear(val, dataForHeatMap);
      updateCountryTableProperty(dataForHeatMap, currentCountry, currentYear);
    });

  var gHorizontal = d3
    .select('div#slider-horizontal')
    .append('svg')
    .attr('width', 300)
    .attr('height', 100)
    .append('g')
    .attr('transform', 'translate(80, 30)');

  gHorizontal.call(sliderHorizontal);

  //Legends
  var data = [];

  for (var i = 0; i <= 10; i++) {
    data.push({ "color": d3.interpolateTurbo(parseFloat(i) / 10), "value": parseFloat(i) / 10 });
  }
  const rangeMultiplier = 100;

  var extent = d3.extent(data, d => parseFloat(d.value) * rangeMultiplier);
  var padding = 100;
  var barWidth = 40;
  var innerHeight = height - (padding * 5);

  var yScale = d3.scaleLinear()
    .range([innerHeight, 0])
    .domain(extent);

  // Ticks and axis for y axis
  var yTicks = data.map(d => parseFloat(d.value) * rangeMultiplier);
  var yAxis = d3.axisRight(yScale)
    .tickSize(barWidth * 2)
    .tickValues(yTicks)
    .tickFormat(d => d + "%");

  // Create the group to hold the legend
  var g = svg.append("g").attr("transform", "translate(" + padding + "," + 200 + ")");

  // Helper Text
  g.append("text")
    .style("fill", "#000000")
    .attr("x", 670)
    .attr("y", -50)
    .attr("font-size", "45px")
    .attr("id", "HelperText")
    .attr("class", "text-center")
    .text(function () {
      //default text
      var text = "Please click on a country to see more details"
      if (currentCountry != "") {
        text = currentCountry + " has been selected"
      }
      return text;
    })

  // Title for legends
  g.append("text")
    .style("fill", "#000000")
    .attr("x", -50)
    .attr("y", -50)
    .attr("font-size", "50px")
    .text("Mortality Rate");

  var defs = svg.append("defs");
  var linearGradient = defs.append("linearGradient").attr("id", "myGradient")
    .attr('x1', '0%')
    .attr('x2', '0%')
    .attr('y1', '100%') // For vertical gradient
    .attr('y2', '0%');

  // Set the color for each stop
  linearGradient.selectAll("stop")
    .data(data)
    .enter().append("stop")
    .attr("offset", d => ((d.value * rangeMultiplier - extent[0]) / (extent[1] - extent[0]) * 100) + "%")
    .attr("stop-color", d => d.color);

  // Overlay the gradient within the recentagle
  g.append("rect")
    .attr("width", barWidth)
    .attr("height", innerHeight)
    .style("fill", "url(#myGradient)");

  g.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .select(".domain").remove();

  //Function to draw country line chart to visualize number of deaths
  function drawCountryLineChart(selectedCountry, currentYear) {
    let countryData = []
    let deathData = []
    // Parse the date / time
    var parseDate = d3.timeParse("%Y-%m");
    var formatMonth = d3.timeFormat("%B");
    var formatYear = d3.timeFormat("%Y");
    // Set deaths for each month to 0 by default
    let totalJanDeaths = 0
    let totalFebDeaths = 0
    let totalMarDeaths = 0
    let totalAprDeaths = 0
    let totalMayDeaths = 0
    let totalJunDeaths = 0
    let totalJulDeaths = 0
    let totalAugDeaths = 0
    let totalSepDeaths = 0
    let totalOctDeaths = 0
    let totalNovDeaths = 0
    let totalDecDeaths = 0

    // Obtain all data for year of the selected country
    for (var i = 0; i < csvData.length; i++) {
      if ((csvData[i]["location"] == selectedCountry) && (formatYear(csvData[i]["date"]) == currentYear)) {
        countryData.push(csvData[i])
      }
    }

    // Show the chart if data is avaliable for the country
    if (countryData.length != 0) {
      // Add up the total number of deaths for each month
      for (var i = 0; i < countryData.length; i++) {
        if (formatMonth(countryData[i]["date"]) == "January") {
          totalJanDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "February") {
          totalFebDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "March") {
          totalMarDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "April") {
          totalAprDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "May") {
          totalMayDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "June") {
          totalJunDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "July") {
          totalJulDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "August") {
          totalAugDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "September") {
          totalSepDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "October") {
          totalOctDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "November") {
          totalNovDeaths += +countryData[i]["new_deaths"]
        }
        else if (formatMonth(countryData[i]["date"]) == "December") {
          totalDecDeaths += +countryData[i]["new_deaths"]
        }
      }

      // Map the total number of deaths to the respective month of the year
      if (currentYear == "2020" || currentYear == "2021") {
        deathData.push({ "date": currentYear + "-01", "deaths": totalJanDeaths })
        deathData.push({ "date": currentYear + "-02", "deaths": totalFebDeaths })
        deathData.push({ "date": currentYear + "-03", "deaths": totalMarDeaths })
        deathData.push({ "date": currentYear + "-04", "deaths": totalAprDeaths })
        deathData.push({ "date": currentYear + "-05", "deaths": totalMayDeaths })
        deathData.push({ "date": currentYear + "-06", "deaths": totalJunDeaths })
        deathData.push({ "date": currentYear + "-07", "deaths": totalJulDeaths })
        deathData.push({ "date": currentYear + "-08", "deaths": totalAugDeaths })
        deathData.push({ "date": currentYear + "-09", "deaths": totalSepDeaths })
        deathData.push({ "date": currentYear + "-10", "deaths": totalOctDeaths })
        deathData.push({ "date": currentYear + "-11", "deaths": totalNovDeaths })
        deathData.push({ "date": currentYear + "-12", "deaths": totalDecDeaths })
      }
      else if (currentYear == "2022") {
        deathData.push({ "date": currentYear + "-01", "deaths": totalJanDeaths })
        deathData.push({ "date": currentYear + "-02", "deaths": totalFebDeaths })
        deathData.push({ "date": currentYear + "-03", "deaths": totalMarDeaths })
        deathData.push({ "date": currentYear + "-04", "deaths": totalAprDeaths })
        deathData.push({ "date": currentYear + "-05", "deaths": totalMayDeaths })
        deathData.push({ "date": currentYear + "-06", "deaths": totalJunDeaths })
      }

      // Dimensions for the chart
      let margin = { top: 20, right: 20, bottom: 50, left: 50 },
        width = 1200 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

      // Add the chart
      let svgForCountryChart = d3.select("#countryChart")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

      // Set ranges
      var x = d3.scaleTime().range([0, width]);
      var y = d3.scaleLinear().range([height, 0]);

      // Define line
      var line = d3.line()
        .x(function (d) { return x(d.date); })
        .y(function (d) { return y(d.deaths); })

      // Append tooltip
      var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style('visibility', 'visible')

      // Format the data
      deathData.forEach(function (d) {
        d.date = parseDate(d.date);
        d.deaths = +d.deaths;
      });

      // Scale the range of the data
      x.domain(d3.extent(deathData, function (d) { return d.date; }));
      y.domain([0, d3.max(deathData, function (d) { return d.deaths; })]);

      // Format x-axis to only show the names of each month
      var xAxis = d3.axisBottom(x)
        .tickFormat(d3.timeFormat("%B"));

      // Add the path.
      svgForCountryChart.append("path")
        .data([deathData])
        .attr("class", "line")
        .attr("d", line);

      // Add x-axis for year chart
      svgForCountryChart.append("g")
        .attr("class", "axis axis-x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");
      // Add y-axis for year chart
      svgForCountryChart.append("g")
        .attr("class", "axis axis-y")
        .call(d3.axisLeft(y).ticks(10))

      // Add dots with tooltips
      svgForCountryChart.selectAll("dot")
        .data(deathData)
        .enter().append("circle")
        .attr("r", 5)
        .attr("cx", function (d) { return x(d.date); })
        .attr("cy", function (d) { return y(d.deaths); })
        .on("mouseover", function (event, d) {
          div.transition()
            .duration(200)
            .style('visibility', 'visible');
          div.html("Month: " + formatMonth(d.date) + "<br/>Deaths: " + d.deaths)
        })
        .on('mousemove', function(event, d) {
          div
            .style("left", (event.pageX) + "px")
            .style("top", (event.pageY - 28) + "px");
      })
        .on("mouseout", function (d) {
          div.transition()
            .duration(500)
            .style('visibility', 'hidden')
        });
      }
      else {
        drawCountryUndefined()
      }
  }

  //Function to draw country pie chart to visualize number of vaccinations
  function drawCountryPieChart(selectedCountry, currentYear) {

    let countryData = []
    let vaccinated = 0
    let vaccinatedFull = 0
    let vaccinatedBoost = 0
    let population = 0
    let vaccinationData = []

    // Obtain latest vaccination data from the year (for 2022 last day of May is chosen as the most recent vaccination data is not avaliable for all countries)
    if (currentYear == "2020") {
      selectedDate = "31 Dec 2020"
    }
    else if (currentYear == "2021") {
      selectedDate = "31 Dec 2021"
    }
    else if (currentYear == "2022") {
      selectedDate = "31 May 2022"
    }

    // Selected date
    var formatDate = d3.timeFormat("%d %b %Y");

    // Obtain all vaccination data for the selected country and date
    for (var i = 0; i < csvData.length; i++) {
      if ((csvData[i]["location"] == selectedCountry) && (formatDate(csvData[i]["date"]) == selectedDate)) {
        countryData.push(csvData[i])
      }
    }
    // Show the chart if data is avaliable for the country
    if (countryData.length != 0) {
      // Map vaccination data based on vaccination status of the population
      for (var i = 0; i < countryData.length; i++) {
        vaccinated = countryData[i]["people_vaccinated"]
        vaccinatedFull = countryData[i]["people_fully_vaccinated"]
        vaccinatedBoost = countryData[i]["total_boosters"]
        population = countryData[i]["population"]
        percentBoost = ((+vaccinatedBoost / +population) * 100)
        percentFull = ((+vaccinatedFull / +population) * 100) - percentBoost
        percentSingle = ((+vaccinated / +population) * 100) - ((+vaccinatedFull / +population) * 100)
        percentNone = (((+population - +vaccinated) / +population) * 100)
        vaccinationData.push({ "Unvaccinated": percentNone, "Vaccinated (1 dose)": percentSingle, "Vaccinated (2 doses)": percentFull, "Vaccinated (Boosted)": percentBoost })
      }

      // Dimensions for the chart
      let margin = { top: 20, right: 20, bottom: 20, left: 10 },
        width = 1200 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

      // Set radius of the pie chart
      const radius = Math.min(width, height) / 2 - margin.top;

      // Define the domain and colors for use with color scale and legend
      let vaccinatedDomain = new Map([["Unvaccinated", "lightcoral"], ["Vaccinated (1 dose)", "palegoldenrod"], ["Vaccinated (2 doses)", "lightgreen"], ["Vaccinated (Boosted)", "lightskyblue"]])

      // Define color scale
      var vaccinatedScale = d3.scaleThreshold()
        .domain(vaccinatedDomain.keys())
        .range(vaccinatedDomain.values())

      // Define legend
      var legend = d3.legendColor()
        .labels(vaccinatedDomain.keys())
        .scale(vaccinatedScale)
        .title("Vaccination status as of " + selectedDate)
        .shape("path", d3.symbol().type(d3.symbolCircle).size(150)())

      // Append the svg object to the div
      let svgForCountryChart = d3.select("#countryChart")
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

      // Function to create or update the pie chart
      function update(data) {

        // Compute position of each group on the pie
        const pie = d3.pie()
          .value(function (d) { return d[1]; })
          .sort(function (a, b) { return d3.ascending(a.key, b.key); })
        const data_ready = pie(Object.entries(data))

        // Shape helper to build arcs
        const arcGenerator = d3.arc()
          .innerRadius(0)
          .outerRadius(radius)

        // Add legend to the svg
        svgForCountryChart.
        append("g")
        .attr("class", "PieChartLegend")
        .attr("transform", "translate(-500,-180)")
        .style("font-size", "15px")
        .style("fill", "black")
        .call(legend)

        // Append tooltip
        var div = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style('visibility', 'visible')

        // Build the pie chart
        svgForCountryChart
          .selectAll('vaccinationChart')
          .data(data_ready)
          .join('path')
          .attr('d', arcGenerator)
          .attr('fill', function (d) { return vaccinatedDomain.get(d.data[0]) })
          .attr("stroke", "white")
          .style("stroke-width", "2px")
          .style("opacity", 1)
          .on("mouseover", function (event, d) {
            div.transition()
              .duration(200)
              .style('visibility', 'visible')
            div.html(d.data[0] + ": " + Math.round(d.data[1]) + "%")
          })
          .on("mousemove", function (event, d) {
            div
              .style("left", (event.pageX) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", function (d) {
            div.transition()
              .duration(500)
              .style('visibility', 'hidden')
          });
      }
      update(vaccinationData[0])
    }
    else {
      drawCountryUndefined()
    }
  }

  //Function to draw country node chart to visualize number of vaccinations per 100 people
  function drawCountryNodeChart(selectedCountry, currentYear) {
    let nodeData = []
    let obj = {}

    // Obtain latest vaccination data from the year (for 2022 last day of May is chosen as the most recent vaccination data is not avaliable for all countries)
    if (currentYear == "2020") {
      selectedDate = "31 Dec 2020"
    }
    else if (currentYear == "2021") {
      selectedDate = "31 Dec 2021"
    }
    else if (currentYear == "2022") {
      selectedDate = "31 May 2022"
    }

    // Selected date
    var formatDate = d3.timeFormat("%d %b %Y");

    // Filter by node by selected country and date
    for (var i = 0; i < csvData.length; i++) {
      if ((csvData[i]["location"] == selectedCountry) && (formatDate(csvData[i]["date"]) == selectedDate)) {
        nodeData.push(csvData[i])
      }
    }

    // Show the chart if data is avaliable for the country
    if (nodeData.length != 0) {
      // Take the last value from the array
      nodeData = nodeData[nodeData.length - 1];

      // Scale values and convert to Integer
      var populationDensity = +nodeData['population_density'];
      var population = +nodeData['population'];
      var vacPeople = Math.ceil(+nodeData['people_vaccinated'] / population * 100);
      var unvacPeople = 100 - vacPeople

      let data = [];

      // Add Vaccinated to obj
      for (let i = 0; i < vacPeople; i++) {
        obj = { "id": i, "status": "Vaccinated" };
        data.push(obj);
      } // Add Unvaccinated to obj
      for (let i = vacPeople; i < (vacPeople + unvacPeople); i++) {
        obj = { "id": i, "status": "Unvaccinated" };
        data.push(obj);
      }

      // Dimensions for the chart
      let margin = { top: 45, right: 20, bottom: 25, left: 10 },
      width = 1200 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

      let simulation = d3.forceSimulation(data)
        // Higher Density = More Compact
        .force("charge", d3.forceManyBody().strength(-populationDensity))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX()
          .strength(0.1)
        )
        .force("y", d3.forceY()
          .y(height / 2)
          .strength(0.1)
        )
        .on("tick", tick);

      function tick() {
        circle
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
      }
    
      let svgForCountryChart = d3.select("#countryChart")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

      let nodes = svgForCountryChart.append("g").attr("id", "nodes")
        .selectAll("g")
        .data(data)
        .enter()
        .append("g");

      let circle = nodes.append("circle")
        .attr("class", "node")
        .attr("r", 15)
        .attr("fill", d => {
          if (d.status == "Vaccinated") {
            return "Green";
          } else {
            return "Red";
          }
        })
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

      // Define the domain and colors for use with color scale and legend
      let vaccinatedDomain = new Map([["Unvaccinated", "Red"], ["Vaccinated (at least 1 dose)", "Green"]])

      // Define color scale
      var vaccinatedScale = d3.scaleThreshold()
        .domain(vaccinatedDomain.keys())
        .range(vaccinatedDomain.values())

      // Define legend
      var legend = d3.legendColor()
        .labels(vaccinatedDomain.keys())
        .scale(vaccinatedScale)
        .title("Vaccination status as of " + selectedDate)
        .shape("path", d3.symbol().type(d3.symbolCircle).size(150)())

      // Add legend to the svg
      svgForCountryChart.
        append("g")
        .attr("class", "NodeChartLegend")
        .attr("transform", "translate(75,5)")
        .style("font-size", "15px")
        .style("fill", "black")
        .call(legend)

      //Function for Dragging the nodes
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    }
    else {
      drawCountryUndefined()
    }
  }

  // Text to be displayed if country is not selected
    function drawCountryNotSelected() {
      let svgForCountryChart = d3.select("#countryChart")
  
      svgForCountryChart.append("text")
        .attr('x', 370)
        .attr('y', 250)
        .text("No country is selected, please select one from the globe to view")
        .attr('alignment-baseline', 'middle')
        .attr('text-anchor', 'start')
        .attr('class', "ChartInfo")
    }
  

  // Text to be displayed if country is undefined
  function drawCountryUndefined() {
    let svgForCountryChart = d3.select("#countryChart")

    svgForCountryChart.append("text")
      .attr('x', 400)
      .attr('y', 250)
      .text("Data does not exist for this country, please select another one")
      .attr('alignment-baseline', 'middle')
      .attr('text-anchor', 'start')
      .attr('class', "ChartInfo")
  }

  // Obtain user selection and call function to display the charts
  d3.select("#optionLineChart").on("click", function (d) {
    // Clear the chart before drawing
    clearChart();
    // Only show chart if country is not blank or undefined
    if (currentCountry == "") {
      drawCountryNotSelected();
    }
    else if (currentCountry == undefined) {
      drawCountryUndefined();
    }
    else {
      drawCountryLineChart(currentCountry, currentYear);
    }
  })
  d3.select("#optionPieChart").on("click", function (d) {
    // Clear the chart before drawing
    clearChart();
    // Only show chart if country is not blank or undefined
    if (currentCountry == "") {
      drawCountryNotSelected();
    }
    else if (currentCountry == undefined) {
      drawCountryUndefined();
    }
    else {
      drawCountryPieChart(currentCountry, currentYear);
    }
  })
  d3.select("#optionNodeChart").on("click", function (d) {
    // Clear the chart before drawing
    clearChart();
    // Only show chart if country is not blank or undefined
    if (currentCountry == "") {
      drawCountryNotSelected();
    }
    else if (currentCountry == undefined) {
      drawCountryUndefined();
    }
    else {
      drawCountryNodeChart(currentCountry, currentYear);
    }
  })
  drawCountryNotSelected();
})

// Function to clear chart
function clearChart() {
  d3.select("#countryChart").selectAll("g").remove()
  d3.select("#countryChart").selectAll("svg").remove()
  d3.selectAll(".ChartInfo").remove()
  d3.selectAll(".PieChartLegend").remove()
  d3.selectAll(".NodeChartLegend").remove()
}

// Function to add comma to large numbers
function addComma(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Initalize the zoom
initZoom();