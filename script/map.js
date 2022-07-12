var width = 2400;
var height = 1900;
var noOfNodes = 100;
var GeoURL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
var csvPath = "https://raw.githubusercontent.com/GabrielBeepBoop/Covid-dataset/main/owid-covid-data_processed.csv" // path to csv containing the COVID-19 data
var oceanURL = "https://gist.githubusercontent.com/jrrickard/8755532505a40f3b8317/raw/ecd98849d3a5f4502b773b986254f19af3b8d8fb/oceans.json";

let currentYear = 0; // Store current year
let currentCountry = "" // Current country selected by the mouse hover
let isLock = false // To lock the selected region when left mouse button is clicked

let svg = d3.select("svg").attr("viewBox", "0 0 " + width + " " + height)
//set back

const sensitivity = 75; // Sensitivity for dragging the globe

// Map and projection
const projection = d3.geoOrthographic()
  .scale(600)
  .center([0, 20])
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
  svg.selectAll("path").attr("d", globePaths)
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

  if (found) {
    // Retrieve elemnt by country
    let element = data[year].find(obj => {
      return obj.location == nameOfCountry;
    })

    // Update statistics for that chosen country
    d3.select("#country").text(nameOfCountry);
    d3.select("#year").text(year);
    // Regex for adding "," after every 3 numbers
    d3.select("#covidDeath").text(Number(element["total_death"]).toLocaleString());
    d3.select("#totalPopulation").text(Number(element["poulation"]).toLocaleString());
    d3.select("#totalVaccination").text(Number(element["total_vaccinations"]).toLocaleString());
  } else {
    // Update statistics for that chosen country
    d3.select("#country").text(nameOfCountry);
    d3.select("#year").text(year);
    // Regex for adding "," after every 3 numbers
    d3.select("#covidDeath").text("NIL");
    d3.select("#totalPopulation").text("NIL");
    d3.select("#totalVaccination").text("NIL");
  }

}

// Load external data and boot
Promise.all([d3.json(GeoURL), d3.csv(csvPath), d3.json(oceanURL)]).then(function (loadData) {
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
          "location": element["location"], "intensity_score": intensityScore,
          "poulation": element["population"], "total_death": element["total_deaths"], "total_vaccinations": element["total_vaccinations"]
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
    currentCountry = d.properties.name;
    updateCountryTableProperty(dataForHeatMap, currentCountry, currentYear);
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

      // Update Helper text
      d3.select("#HelperText")
        .text(currentCountry + " has been selected")

      // Update Chart title for Line/Pie/Node
      d3.select("#selectedCountryStats")
        .text(currentCountry + "'s Statistics")

      // Draw the Line chart
      drawCountryLineChart(currentCountry)

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

      // Clear all the charts
      clearChart();

    }
  }

  let groupForGlobe = svg.append("g");

  // Draw the map
  groupForGlobe.append("g")
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

  // Append Ocean data
  groupForGlobe.append("g")
  .attr("id", "ocean")
  .selectAll("path")
  .data(loadData[2].features)
  .enter()
  .append("path")
  .attr("d", d3.geoPath()
  .projection(projection))
  .style("fill", "steelblue");

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
    .attr('transform', 'translate(30, 30)');

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
    .attr("x", 700)
    .attr("y", -30)
    .attr("font-size", "40px")
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
    .attr("y", -30)
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

  //Function to draw country chart
  function drawCountryLineChart(selectedCountry) {
    let country = new Set()
    let countryData = []
    let date = ""
    let deaths = ""
    let deathData = []
    // Parse the date / time
    var parseTime = d3.timeParse("%Y-%m-%d");
    var formatTime = d3.timeFormat("%Y-%m-%d");

    // Obtain all data for the selected country
    for (var i = 0; i < csvData.length; i++) {
      country.add(csvData[i]["location"])
      if (csvData[i]["location"] == selectedCountry) {
        countryData.push(csvData[i])
      }
    }
    // Map deaths data to each date
    for (var i = 0; i < countryData.length; i++) {
      date = formatTime(countryData[i]["date"])
      deaths = countryData[i]["new_deaths"]
      deathData.push({ "date": date, "deaths": +deaths })
    }

    // Dimensions for the chart
    let margin = { top: 20, right: 20, bottom: 40, left: 40 },
      width = 1200 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

    // Add country chart
    let countryChart = d3.select("#countryChart")
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
      .style("opacity", 0);

    // Format the data
    deathData.forEach(function (d) {
      d.date = parseTime(d.date);
      d.deaths = +d.deaths;
    });

    // Scale the range of the data
    x.domain(d3.extent(deathData, function (d) { return d.date; }));
    y.domain([0, d3.max(deathData, function (d) { return d.deaths; })]);

    // Add the path.
    countryChart.append("path")
      .data([deathData])
      .attr("class", "line")
      .attr("d", line);

    // Add x-axis for year chart
    countryChart.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");
    // Add y-axis for year chart
    countryChart.append("g")
      .attr("class", "axis axis-y")
      .call(d3.axisLeft(y).ticks(10))

    // Add dots with tooltips
    countryChart.selectAll("dot")
      .data(deathData)
      .enter().append("circle")
      .attr("r", 5)
      .attr("cx", function (d) { return x(d.date); })
      .attr("cy", function (d) { return y(d.deaths); })
      .on("mouseover", function (event, d) {
        div.transition()
          .duration(200)
          .style("opacity", .9);
        div.html("Date: " + formatTime(d.date) + "<br/>Deaths: " + d.deaths)
          .style("left", (event.pageX) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function (d) {
        div.transition()
          .duration(500)
          .style("opacity", 0);
      });
  }
  // Pie chart
  function drawCountryPieChart(selectedCountry) {

    let country = new Set()
    let countryData = []
    let vaccinated = ""
    let population = ""
    let vaccinationData = []

    // Selected date
    let selectedDate = "2022-06-01"
    var formatTime = d3.timeFormat("%Y-%m-%d");

    // Obtain all data for the selected country
    for (var i = 0; i < csvData.length; i++) {
      country.add(csvData[i]["location"])
      if ((csvData[i]["location"] == selectedCountry) && (formatTime(csvData[i]["date"]) == selectedDate)) {
        countryData.push(csvData[i])
      }
    }

    // Map deaths data to each date
    for (var i = 0; i < countryData.length; i++) {
      vaccinated = countryData[i]["people_vaccinated"]
      vaccinatedFull = countryData[i]["people_fully_vaccinated"]
      vaccinatedBoost = countryData[i]["total_boosters"]
      population = countryData[i]["population"]
      vaccinationData.push({ "Unvaccinated": (((+population - +vaccinated) / +population) * 100), "Vaccinated": ((+vaccinated / +population) * 100) })
    }
  
    // Dimensions for the chart
    let margin = { top: 20, right: 20, bottom: 40, left: 40 },
      width = 1200 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

    //Set radius of the pie chart
    const radius = Math.min(width, height) / 2 - margin.top;

    // Append the svg object to the div
    svg = d3.select("#countryChart")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Set the color scale
    const color = d3.scaleOrdinal()
      .range(d3.schemeDark2);

    // Function to create / update the plot for a given variable
    function update(data) {

      // Compute position of each group on the pie
      const pie = d3.pie()
        .value(function (d) { return d[1]; })
        .sort(function (a, b) { return d3.ascending(a.key, b.key); }) // This make sure that group order remains the same in the pie chart
      const data_ready = pie(Object.entries(data))

      // Shape helper to build arcs
      const arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(radius)

      var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

      // Build the pie chart
      svg
        .selectAll('vaccinationChart')
        .data(data_ready)
        .join('path')
        .attr('d', arcGenerator)
        .attr('fill', function (d) { return (color(d.data[0])) })
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("opacity", 1)
        .on("mouseover", function (event, d) {
          div.transition()
            .duration(200)
            .style("opacity", .9);
          div.html(d.data[0] + ": " + Math.round(d.data[1]) + "%")
            .style("left", (event.pageX) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", function (event, d) {
          div
            .style('left', event.pageX + 'px')
            .style('top', event.pageY + 'px')
        })
        .on("mouseout", function (d) {
          div.transition()
            .duration(500)
            .style("opacity", 0);
        });
    }
    update(vaccinationData[0])

  }
  // Node Chart
  function drawCountryNodeChart(selectedCountry) {
    let nodeData = []
    let obj = {}
    width = 740
    height = 650

    // Filter by node by selected country and take the latest value by year
    for (var i = 0; i < csvData.length; i++) {
      if ((csvData[i]["location"] == selectedCountry)) {
        nodeData.push(csvData[i])
      }
    }
    // Take the last value from the array
    nodeData = nodeData[nodeData.length - 1];

    // Scale values and convert to Integer
    var populationDensity = +nodeData['population_density'];
    var population = +nodeData['population'];
    var vacPeople = Math.ceil(+nodeData['people_fully_vaccinated']/population * 100);
    var unvacPeople = 100 - vacPeople

    let data = [];

    // Add Vaccinated to obj
    for (let i = 0; i < vacPeople; i++){
      obj = {"id": i, "status": "Vaccinated"};
      data.push(obj);
    } // Add Unvaccinated to obj
    for (let i = vacPeople; i < (vacPeople+unvacPeople); i++){
      obj = {"id": i, "status": "Unvaccinated"};
      data.push(obj);
    }


let simulation = d3.forceSimulation(data)
// Higher Density = More Compact
.force("charge", d3.forceManyBody().strength(-populationDensity))
.force("center", d3.forceCenter(width/2, height/2))
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

let svg = d3.select("#countryChart")

let nodes = svg.append("g").attr("id", "nodes")
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

// Draw the Label
svg.append("text")
.attr('x',15)
.attr('y',20)
.text("Graph is scaled to 100 Nodes")
.attr('alignment-baseline','middle')
.attr('text-anchor','start')
.attr('class',"NodeChartLegend")

svg.append("text")
.attr('x',15)
.attr('y',40)
.text("Total Population: " + addComma(population) + " People")
.attr('alignment-baseline','middle')
.attr('text-anchor','start')
.attr('class',"NodeChartLegend")

svg.append("text")
.attr('x',15)
.attr('y',60)
.text("Population Density: " + populationDensity + " No. of people per square meter")
.attr('alignment-baseline','middle')
.attr('text-anchor','start')
.attr('class',"NodeChartLegend")


svg.append("circle")
.attr('cx',20)
.attr('cy',80)
.attr('r',9)
.style('fill', "Green")
.attr('class',"NodeChartLegend")

svg.append("text")
.attr('x',35)
.attr('y',80)
.text("Vaccinated")
.attr('alignment-baseline','middle')
.attr('text-anchor','start')
.attr('class',"NodeChartLegend")

svg.append("circle")
.attr('cx',20)
.attr('cy',100)
.attr('r',9)
.style('fill', "Red")
.attr('class',"NodeChartLegend")

svg.append("text")
.attr('x',35)
.attr('y',100)
.text("Unvaccinated")
.attr('alignment-baseline','middle')
.attr('text-anchor','start')
.attr('class',"NodeChartLegend")

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
// Text to be displayed if country is undefined
function drawCountryUndefined(){
  let svg = d3.select("#countryChart")
  
  svg.append("text")
  .attr('x',400)
  .attr('y',250)
  .text("Data does not exist for this country, please select another one")
  .attr('alignment-baseline','middle')
  .attr('text-anchor','start')
  .attr('class',"NodeChartLegend")

}

  // Obtain user selection and call function to change the fill of the circles and legend
  d3.select("#optionLineChart").on("click", function (d) {
    // Clear the chart before drawing
    clearChart();
    if (currentCountry != undefined){
      drawCountryLineChart(currentCountry);
    }
    else{
      drawCountryUndefined();
    }
  })
  d3.select("#optionPieChart").on("click", function (d) {
    // Clear the chart before drawing
    clearChart();
    if (currentCountry != undefined){
      drawCountryPieChart(currentCountry);
    }
    else{
      drawCountryUndefined();
    }
  })
  d3.select("#optionNodeChart").on("click", function (d) {
    // Clear the chart before drawing
    clearChart();
    if (currentCountry != undefined){
      drawCountryNodeChart(currentCountry);
    }
    else{
      drawCountryUndefined();
    }
  })

  // Disable charts 
  if (currentCountry != "" || currentCountry == undefined ) {
    d3.select("#optionLineChart").property("disabled", true);
    d3.select("#optionLineChart").property("disabled", true);
    d3.select("#optionLineChart").property("disabled", true);
  }
  else {
    d3.select("#optionLineChart").property("disabled", false);
    d3.select("#optionLineChart").property("disabled", false);
    d3.select("#optionLineChart").property("disabled", false);

  }

})

// Function to clear chart
function clearChart(){
  d3.select("#countryChart").selectAll("g").remove()
  d3.select("#countryChart").selectAll("svg").remove()
  d3.selectAll(".NodeChartLegend").remove()
}

// Function to add comma to large numbers
function addComma(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Fun

// Initalize the zoom
initZoom();
