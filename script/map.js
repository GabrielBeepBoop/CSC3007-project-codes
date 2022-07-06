var width = 2400;
var height = 1900;
var GeoURL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
var csvPath = "./data/owid-covid-data_processed.csv" // path to csv containing the COVID-19 data

let currentYear = 0; // Store current year
let currentCountry = "" // Current country selected by the mouse hover

let svg = d3.select("svg").attr("viewBox", "0 0 " + width + " " + height)

// Map and projection
const path = d3.geoPath();
const projection = d3.geoMercator()
  .scale(250)
  .center([0, 20])
  .translate([width / 2, height / 2]);

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
function updateHeatMapByYear(val , data){
  let objectByYear = data[val];
  for (const index in objectByYear){
    let element =  objectByYear[index];
    d3.select("path#" + element["location"]).attr("fill",  d3.interpolateTurbo(element["intensity_score"]));
  }
}
// Normalize the intensity score for a Year for each country between a given range from normalizedMin to normalizedMax (e.g 0 to 100)
function normalizeIntensityScoreByYear(data, year, normalizedMin, normalizedMax){
    
    let intensityScoreArray = data[year].map(a => a.intensity_score);
    let minEntry = Math.min(...intensityScoreArray);
    let maxEntry = Math.max(...intensityScoreArray);
    for (const index in  data[year]){
      let currentScore = data[year][index]["intensity_score"];
      let mx  = ((currentScore - minEntry) / (maxEntry - minEntry));
      let preshiftNormalized = mx*(normalizedMax-normalizedMin);
      data[year][index]["intensity_score"] = preshiftNormalized + normalizedMin;
    }

    return data;
}

// Update Country info table
function updateCountryTableProperty(data ,nameOfCountry, year){
  // Check if the country exists in the csv
  const found = data[year].some(el => el.location ===nameOfCountry);

  if (found){      
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
  }else{
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
Promise.all([d3.json(GeoURL), d3.csv(csvPath) ]).then(function (loadData) {
  let topo = loadData[0]
  let csvData = loadData[1];

  // Preprocess data
  csvData.forEach(e => {
    e["date"]=  new Date(e["date"]);
  });

  // Get the distinct years from the COVID-19 dataset
  let yearResults = [...new Set(csvData.map(data => data["date"].getFullYear()))];

  // An object that stores the data needed for the heat map
  let dataForHeatMap = {}
  for (const j in yearResults){
    dataForHeatMap[yearResults[j]] = []
  }

  // Set current year
  currentYear = yearResults[0];

  // Get the countries with no duplicates
  let countriesArray = [...new Set(csvData.map(function(item) { return item["location"]; }))];

   for (const i in countriesArray){

    for (const j in yearResults){
        let year = yearResults[j]
  
        // Filter by countries and year
        singleCountryData = csvData.filter(obj => obj.location == countriesArray[i]) ;
        singleCountryData = singleCountryData.filter(obj => obj.date.getFullYear() == year );

        if (Object.keys(singleCountryData).length != 0){
      
          // Get the object that has the latest date from that year
          element =  singleCountryData.reduce((a, b) => (a["date"] > b["date"] ? a : b));
          
          // Compute the intensity score (mortality rate)
          intensityScore =  element["total_deaths"] / element["population"];
          if (isNaN(intensityScore) ){
            intensityScore = 0;
          }
      
          // Insert location, intensity score, total deaths, population, total vaccinations into the dataForHeatMap
          dataForHeatMap[year].push({ "location": element["location"], "intensity_score": intensityScore,
           "poulation":element["population"], "total_death": element["total_deaths"], "total_vaccinations": element["total_vaccinations"]});

        } else{

         // Insert location, intensity score, total deaths, population, total vaccinations into the dataForHeatMap
          dataForHeatMap[year].push({ "location": element["location"], "intensity_score": 0,
          "poulation": 0, "total_death": 0, "total_vaccinations": 0}
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

  // Draw the map
   svg.append("g")
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

  // For the first Year 2020 color fill update for country
  dataForHeatMap = normalizeIntensityScoreByYear(dataForHeatMap, currentYear, 0, 1);
  updateHeatMapByYear(currentYear, dataForHeatMap);

  // Horizontal slider
  var sliderHorizontal = d3
    .sliderBottom()
    .min(d3.min(yearResults))
    .max(d3.max(yearResults)) 
    .width(100 )
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

  for (var i =0; i <= 10; i++)
  {
    data.push({"color": d3.interpolateTurbo( parseFloat(i)/ 10),"value": parseFloat(i)/10});
  }
  const rangeMultiplier = 100;
    
  var extent = d3.extent(data, d =>  parseFloat(d.value) * rangeMultiplier);
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

  // Title for legends
  g.append("text")
      .style("fill", "#000000")
      .attr("x",  -50)
      .attr("y",  -30)
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
      .attr("offset", d => ((d.value  * rangeMultiplier - extent[0]) / (extent[1] - extent[0]) * 100) + "%")
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

})

// Initalize the zoom
initZoom();
