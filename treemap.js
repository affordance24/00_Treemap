// Dimensions and margins
const width = 1000;
const height = 600;

// Create an SVG container
const svg = d3.select("#treemap-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("font-family", "Roboto Mono")
  .style("background-color", "#0F0F0F"); // Background color

// Define colors
const highlightColor = "#7c4dff";

// Track the current root and zoom state
let currentRoot;
let isZoomed = false; // Track zoom state

// Define the zoom range for labels and zoom effect
const zoomRange = ["Wastewater treatment and discharge", "Other"]; // Nodes to toggle visibility
const zoomValues = ["0.74", "0.01"]; // Corresponding values

// Function to render the treemap
function renderTreemap(data) {
  // Create a hierarchy
  const root = d3.hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

  // Create a treemap layout
  const treemap = d3.treemap()
    .size([width, height])
    .paddingInner(2);

  treemap(root);

  currentRoot = root; // Initialize the current root

  // Add group for each node
  const nodes = svg.selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  // Add rectangles
  nodes.append("rect")
    .attr("class", "node")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => (d.data.name === "busses" || d.data.name === "railways") ? highlightColor : "none") // Highlight only busses and railways
    .attr("stroke", "#ffffff") // Default stroke
    .attr("stroke-width", 0.5);

  // Add text labels for names (wrap text)
  const labels = nodes.append("text")
    .attr("class", "label")
    .attr("x", 4)
    .attr("y", 14)
    .style("fill", "#fff")
    .style("font-size", "15px")
    .style("opacity", d => (zoomRange.includes(d.data.name) ? 0 : 1)) // Initially hide labels in zoomRange
    .selectAll("tspan")
    .data(d => wrapText(d.data.name, d.x1 - d.x0)) // Wrap text based on node width
    .join("tspan")
    .attr("x", 4)
    .attr("dy", (_, i) => i * 15) // Offset each line
    .text(d => d);

  // Add text labels for values
  const values = nodes.append("text")
    .attr("class", "value")
    .attr("x", 4)
    .attr("y", 30) // Position below labels
    .style("fill", "#fff")
    .style("font-size", "12px")
    .style("opacity", d => (zoomValues.includes(d.data.value ? d.data.value.toString() : "") ? 0 : 1)) // Initially hide values in zoomValues
    .text(d => d.data.value ? d.data.value : "");
  
  // Zoom function (zoom into all nodes within the range)
  function zoomToRange() {
    const targetNodes = root.descendants().filter(d => zoomRange.includes(d.data.name));

    if (targetNodes.length === 0) return;

    // Calculate the bounding box for the range
    const x0 = Math.min(...targetNodes.map(d => d.x0));
    const x1 = Math.max(...targetNodes.map(d => d.x1));
    const y0 = Math.min(...targetNodes.map(d => d.y0));
    const y1 = Math.max(...targetNodes.map(d => d.y1));

    const xScale = d3.scaleLinear().domain([x0, x1]).range([0, width]);
    const yScale = d3.scaleLinear().domain([y0, y1]).range([0, height]);

    // Animate node positions
    nodes.transition().duration(750)
      .attr("transform", node => `translate(${xScale(node.x0)},${yScale(node.y0)})`)
      .select("rect")
      .attr("width", node => xScale(node.x1) - xScale(node.x0))
      .attr("height", node => yScale(node.y1) - yScale(node.y0));

    // Show labels and values for zoomRange
    svg.selectAll(".label")
      .transition()
      .duration(750)
      .style("opacity", d => (zoomRange.includes(d.data.name) ? 1 : 0));

    svg.selectAll(".value")
      .transition()
      .duration(750)
      .style("opacity", d => (zoomValues.includes(d.data.value ? d.data.value.toString() : "") ? 1 : 0));

    isZoomed = true; // Update zoom state
    updateButtonText(); // Update button label
  }

  // Reset function to go back to the initial view
  function resetZoom() {
    nodes.transition().duration(750)
      .attr("transform", d => `translate(${d.x0},${d.y0})`)
      .select("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0);

    // Hide labels and values for zoomRange
    svg.selectAll(".label")
      .transition()
      .duration(750)
      .style("opacity", d => (zoomRange.includes(d.data.name) ? 0 : 1));

    svg.selectAll(".value")
      .transition()
      .duration(750)
      .style("opacity", d => (zoomValues.includes(d.data.value ? d.data.value.toString() : "") ? 0 : 1));

    isZoomed = false; // Reset zoom state
    updateButtonText(); // Reset button label
  }

  // Update button text
  function updateButtonText() {
    d3.select("#action-button").text(isZoomed ? "Back" : "Zoom");
  }

  // Add the action button
  d3.select("body")
    .append("button")
    .attr("id", "action-button")
    .text("Zoom")
    .style("position", "relative")
    .style("top", "50px")
    .style("left", `${width - 0}px`) // Align with outer right corner of the treemap
    .style("padding", "10px 20px")
    .style("background-color", "#333")
    .style("color", "#fff")
    .style("border", "none")
    .style("border-radius", "5px")
    .style("cursor", "pointer")
    .on("click", () => {
      if (isZoomed) {
        resetZoom();
      } else {
        zoomToRange();
      }
    });
}

// Load and process the data
d3.csv("Processed_GHGE_Swiss_2022.csv").then(data => {
  const hierarchyData = { name: "Root", children: [] };
  const idToNode = {};

  data.forEach(row => {
    const node = {
      name: row.Category,
      value: +row.Value || undefined,
      children: []
    };

    idToNode[row.Category] = node;

    if (row.Parent) {
      idToNode[row.Parent].children.push(node);
    } else {
      hierarchyData.children.push(node);
    }
  });

  renderTreemap(hierarchyData);
});

// Helper function to wrap text based on node width
function wrapText(text, width) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words.shift();

  for (const word of words) {
    if ((currentLine + " " + word).length * 6 < width) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}
