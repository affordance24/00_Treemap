const container = document.querySelector("#treemap-container")
const width = container.getBoundingClientRect().width
const height = container.getBoundingClientRect().height

const svg = d3
  .select("#treemap-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("font-family", "Roboto Mono")
  .style("background-color", "#0F0F0F")

let currentRoot
let isZoomed = false

function renderTreemap(data) {
  const root = d3
    .hierarchy(data)
    .sum((d) => d.value)
    .sort((a, b) => b.value - a.value)

  const treemap = d3.treemap().size([width, height])

  treemap(root)

  currentRoot = root

  const nodes = svg
    .selectAll("g")
    .data(root.descendants().filter((d) => d.depth > 0))
    .join("g")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`)

  nodes
    .append("rect")
    .attr("class", "node")
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("fill", (d) =>
      d.data.name === "Buses" || d.data.name === "Railways"
        ? "#7c4dff"
        : "#0f0f0f"
    )
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 0.5)
    .style("cursor", (d) => (d.data.value < 1.5 ? "pointer" : "default"))
    .on("click", (event, d) => {
      if (isZoomed) {
        resetZoom()
      } else if (d.data.value < 1.5) {
        zoomToNode(d)
      }
    })

  nodes
    .append("foreignObject")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", (d) => d.x1 - d.x0 - 0)
    .attr("height", (d) => d.y1 - d.y0 - 0)
    .style("pointer-events", "none")
    .append("xhtml:div")
    .attr("class", "tileContainer")
    .style("width", "100%")
    .style("height", "100%")
    .style("font-size", "12px")
    .style("color", "#fff")
    .style("display", "flex")
    .style("box-sizing", "border-box")
    .style("padding", "4px")
    .style("flex-direction", "column")
    .style("overflow", "visible")
    .each(function (d) {
      const container = d3.select(this)
      container.append("p").text(d.data.name).style("margin", "0")
      container.append("p").text(d.data.value).style("margin", "0")
    })

  function zoomToNode(node) {
    const targetNodes = root.descendants().filter((d) => d.data.value < 2)

    if (targetNodes.length === 0) return

    const x0 = Math.min(...targetNodes.map((d) => d.x0))
    const x1 = Math.max(...targetNodes.map((d) => d.x1))
    const y0 = Math.min(...targetNodes.map((d) => d.y0))
    const y1 = Math.max(...targetNodes.map((d) => d.y1))

    const xScale = d3.scaleLinear().domain([x0, x1]).range([0, width])
    const yScale = d3.scaleLinear().domain([y0, y1]).range([0, height])

    nodes
      .transition()
      .duration(1200)
      .ease(d3.easePoly.exponent(4))
      .attr(
        "transform",
        (node) => `translate(${xScale(node.x0)},${yScale(node.y0)})`
      )
      .select("rect")
      .attr("width", (node) => xScale(node.x1) - xScale(node.x0))
      .attr("height", (node) => yScale(node.y1) - yScale(node.y0))

    nodes
      .select("foreignObject")
      .transition()
      .duration(750)
      .attr("width", (node) => xScale(node.x1) - xScale(node.x0))
      .attr("height", (node) => yScale(node.y1) - yScale(node.y0))

    isZoomed = true
  }

  function resetZoom() {
    nodes
      .transition()
      .duration(1000)
      .ease(d3.easePoly.exponent(4))
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .select("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .each(function (d) {
        const container = d3.select(this)
        container.append("p").text(d.data.name).style("margin", "0")
        container.append("p").text(d.data.value).style("margin", "0")
      })

    isZoomed = false
  }
}

function resizeChart() {
  const container = document.querySelector("#treemap-container")
  const newWidth = container.getBoundingClientRect().width

  svg.attr("width", newWidth)

  svg.selectAll("*").remove()

  renderTreemap(currentRoot.data)
}

window.addEventListener("resize", resizeChart)

d3.csv("Processed_GHGE_Swiss_2022.csv").then((data) => {
  const hierarchyData = { name: "Root", children: [] }
  const idToNode = {}

  data.forEach((row) => {
    const node = {
      name: row.Category,
      value: +row.Value || undefined,
      children: [],
    }

    idToNode[row.Category] = node

    if (row.Parent) {
      idToNode[row.Parent].children.push(node)
    } else {
      hierarchyData.children.push(node)
    }
  })

  renderTreemap(hierarchyData)
})

function wrapText(text, width) {
  const words = text.split(" ")
  const lines = []
  let currentLine = words.shift()

  for (const word of words) {
    if ((currentLine + " " + word).length * 6 < width) {
      currentLine += " " + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  lines.push(currentLine)
  return lines
}
