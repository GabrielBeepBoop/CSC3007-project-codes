var width = 3000;
var height = 1250;
var GeoURL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
var popCSV = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world_population.csv"



let svg = d3.select("svg").attr("viewBox", "0 0 " + width + " " + height)

// Map and projection
const path = d3.geoPath();
const projection = d3.geoMercator()
  .scale(250)
  .center([0,20])
  .translate([width / 2, height / 2]);

// Data and color scale
const data = new Map();

// Load external data and boot
Promise.all([d3.json(GeoURL)]).then(function(loadData){
    let topo = loadData[0]

     //Add tooltip
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

    let mouseOver = function(event, d) {
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

    let mouseMove = function(event, d) {
    tooltip
        .style('left', event.pageX + 'px')
        .style('top', event.pageY + 'px')
    }

  let mouseLeave = function(event, d) {
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
      // draw each country
      .attr("d", d3.geoPath()
        .projection(projection)
      )
      // set the color of each country
      .attr("fill", "Green") 
      .attr("ID", function (d) {
        return d.properties.name;
      }) 
      .style("stroke", "transparent")
      .attr("class", function(d){ return "Country" } )
      .style("opacity", .8)
      .on("mouseover", mouseOver )
      .on("mousemove", mouseMove )
      .on("mouseleave", mouseLeave )

})