var width = 2400;
var height = 1900;
var GeoURL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

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
  d3.select('svg g')
    .attr('transform', e.transform);
}

function initZoom() {
  d3.select('svg')
    .call(zoom);
}



// Load external data and boot
Promise.all([d3.json(GeoURL)]).then(function (loadData) {
  let topo = loadData[0]

  // Add tooltip
  var tooltip = d3.select("body")
    .append("div")
    .attr('class', 'd3-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('padding', '10px')
    .style('border-radius', '10px')
    .style('color', 'white')
    .style('background', 'rgba(0,0,0,0.8)')
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
      .html(d.properties.name)
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
    .attr("fill", "Green")
    // Set the ID to the name of each country 
    .attr("ID", function (d) {
      return d.properties.name;
    })
    .style("stroke", "transparent")
    .attr("class", function (d) { return "Country" })
    .style("opacity", .8)

    // Set the respective mouse movements functions
    .on("mouseover", mouseOver)
    .on("mousemove", mouseMove)
    .on("mouseleave", mouseLeave)

})

// Initalize the zoom
initZoom();

