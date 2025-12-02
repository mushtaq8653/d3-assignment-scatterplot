// - Scatter plot layout and scaling
// - Zoom and interaction functionality
// - Tooltip implementation
// - Data filtering logic
// - Error handling and data validation

// -----------------------------
// Globals (keep variable names)
// -----------------------------
let scatterData = [];
let xVariable = 'age';
let yVariable = 'substance_score';
let colorVariable = 'gender';
let showTrendLine = false;

// We'll hold zoom behavior and svg containers in these
let zoomBehavior;
let svg, plotG, xAxisG, yAxisG, clipId = 'clip-' + Date.now();
const vizSelector = '#visualization';

// create (or reuse) tooltip once
let tooltip = d3.select('body').selectAll('.d3-tooltip').data([0]);
tooltip = tooltip.enter()
  .append('div')
  .attr('class', 'd3-tooltip tooltip')
  .style('position', 'absolute')
  .style('pointer-events', 'none')
  .style('opacity', 0)
  .style('background', 'white')
  .style('border', '1px solid #ccc')
  .style('border-radius', '5px')
  .style('padding', '8px')
  .style('font-size', '12px')
  .style('box-shadow', '0 2px 10px rgba(0,0,0,0.1)')
  .merge(tooltip);

// -----------------------------
// Init
// -----------------------------
document.addEventListener('DOMContentLoaded', function() {
  setupBasicUI();   // will generate sample data and draw initial plot
  loadData();       // attempt to load CSV, will replace sample if found
});

// -----------------------------
// UI setup & sample data
// -----------------------------
function setupBasicUI() {
  if (!d3.select(vizSelector).node()) {
    d3.select('body').append('div').attr('id', vizSelector.replace('#', ''));
  }

  generateSampleData();
  createScatterPlot(scatterData);
  setupEventListeners();
}

// -----------------------------
// Load CSV (relative path) with fallback
// -----------------------------
function loadData() {
  d3.select('#data-status').text('🔄 Loading data...');
  d3.csv('data/youth_smoking_drug_data_10000_rows_expanded.csv')
    .then(function(rawData) {
      if (!rawData || rawData.length === 0) throw new Error('CSV empty');
      scatterData = processCSVData(rawData);
      d3.select('#data-status').text('✅ Using real dataset: ' + scatterData.length + ' records');
      createScatterPlot(scatterData);
    })
    .catch(function(err) {
      console.warn('CSV load failed — using sample data. Error:', err);
      d3.select('#data-status').text('⚠️ Using sample data (CSV not available)');
      // sample already generated
      createScatterPlot(scatterData);
    });
}

function processCSVData(rawData) {
  return rawData.map((d, i) => ({
    record_id: i + 1,
    age: ensureNumber(d.age, Math.floor(Math.random() * 10) + 15),
    substance_score: ensureNumber(d.substance_score, +(Math.random() * 8 - 2).toFixed(1)),
    gender: ensureString(d.gender, ['Male', 'Female'][i % 2]),
    region: ensureString(d.region, ['North', 'South', 'East', 'West'][i % 4]),
    education_level: ensureString(d.education_level, ['High School', 'College'][i % 2]),
    tobacco_use: ensureNumber(d.tobacco_use, Math.floor(Math.random() * 5)),
    alcohol_use: ensureNumber(d.alcohol_use, Math.floor(Math.random() * 5)),
    marijuana_use: ensureNumber(d.marijuana_use, Math.floor(Math.random() * 5))
  }));
}

function generateSampleData() {
  scatterData = [];
  for (let i = 0; i < 250; i++) {
    scatterData.push({
      record_id: i + 1,
      age: Math.floor(Math.random() * 10) + 15,
      substance_score: +(Math.random() * 8 - 2).toFixed(1),
      gender: ['Male', 'Female', 'Other'][i % 3],
      region: ['North', 'South', 'East', 'West', 'Central'][i % 5],
      education_level: ['High School', 'College', 'University', 'Vocational'][i % 4],
      tobacco_use: Math.floor(Math.random() * 6),
      alcohol_use: Math.floor(Math.random() * 6),
      marijuana_use: Math.floor(Math.random() * 6),
      mental_health_score: +(Math.random() * 10).toFixed(1)
    });
  }
}

// -----------------------------
// Main: createScatterPlot (builds axes, points, zoom, trend line)
// -----------------------------
function createScatterPlot(data) {
  // remove old svg if any
  d3.select(vizSelector).selectAll('svg').remove();

  const margin = { top: 50, right: 160, bottom: 60, left: 70 };
  const totalWidth = 1000;
  const totalHeight = 560;
  const width = totalWidth - margin.left - margin.right;
  const height = totalHeight - margin.top - margin.bottom;

  // create svg
  svg = d3.select(vizSelector)
    .append('svg')
    .attr('width', totalWidth)
    .attr('height', totalHeight);

  // defs + clip
  svg.append('defs')
    .append('clipPath')
    .attr('id', clipId)
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('x', 0)
    .attr('y', 0);

  // group translated by margin
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // plot group that will be zoomed (inside clip)
  plotG = g.append('g').attr('class', 'plot-group').attr('clip-path', `url(#${clipId})`);

  // axes groups
  xAxisG = g.append('g').attr('class', 'x-axis').attr('transform', `translate(0, ${height})`);
  yAxisG = g.append('g').attr('class', 'y-axis');

  // scales (ensure numeric domain exists; fallback to default)
  const xExtent = d3.extent(data, d => ensureNumber(d[xVariable], 0));
  const yExtent = d3.extent(data, d => ensureNumber(d[yVariable], 0));
  const xPad = (xExtent[1] - xExtent[0]) * 0.05 || 1;
  const yPad = (yExtent[1] - yExtent[0]) * 0.05 || 1;

  const xScale = d3.scaleLinear().domain([xExtent[0] - xPad, xExtent[1] + xPad]).range([0, width]).nice();
  const yScale = d3.scaleLinear().domain([yExtent[0] - yPad, yExtent[1] + yPad]).range([height, 0]).nice();

  // color scale for categorical variables
  const categories = Array.from(new Set(data.map(d => d[colorVariable] || 'Unknown')));
  const colorScale = d3.scaleOrdinal().domain(categories).range(d3.schemeCategory10);

  // draw axes
  xAxisG.call(d3.axisBottom(xScale));
  yAxisG.call(d3.axisLeft(yScale));

  // axis labels
  g.selectAll('.axis-label').remove();
  g.append('text').attr('class', 'axis-label x-label')
    .attr('x', width / 2).attr('y', height + 45)
    .attr('text-anchor', 'middle').style('font-weight', '600').text(getVariableLabel(xVariable));

  g.append('text').attr('class', 'axis-label y-label')
    .attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -50)
    .attr('text-anchor', 'middle').style('font-weight', '600').text(getVariableLabel(yVariable));

  // title
  g.selectAll('.chart-title').remove();
  g.append('text').attr('class', 'chart-title')
    .attr('x', width / 2).attr('y', -20).attr('text-anchor', 'middle')
    .style('font-size', '16px').style('font-weight', '700')
    .text(`Scatter Plot: ${getVariableLabel(xVariable)} vs ${getVariableLabel(yVariable)}`);

  // points (enter)
  const points = plotG.selectAll('.dot').data(data, d => d.record_id || (d.id || Math.random()));
  points.exit().remove();

  const enter = points.enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('r', 5)
    .attr('fill', d => colorScale(d[colorVariable] || 'Unknown'))
    .style('stroke', 'white')
    .style('stroke-width', 1)
    .style('opacity', 0.8)
    .on('mouseover', (event, d) => {
      tooltip.html(`
        <strong>Record #${d.record_id || ''}</strong><br/>
        ${getVariableLabel(xVariable)}: ${d[xVariable]}<br/>
        ${getVariableLabel(yVariable)}: ${d[yVariable]}<br/>
        ${getVariableLabel(colorVariable)}: ${d[colorVariable] || 'N/A'}<br/>
        Age: ${d.age || 'N/A'}<br/>
        Region: ${d.region || 'N/A'}
      `)
      .style('left', (event.pageX + 12) + 'px')
      .style('top', (event.pageY - 12) + 'px')
      .transition().duration(120).style('opacity', 0.95);

      d3.select(event.currentTarget).transition().duration(120).attr('r', 8).style('stroke', '#000');
    })
    .on('mousemove', (event) => {
      tooltip.style('left', (event.pageX + 12) + 'px').style('top', (event.pageY - 12) + 'px');
    })
    .on('mouseout', (event) => {
      tooltip.transition().duration(160).style('opacity', 0);
      d3.select(event.currentTarget).transition().duration(120).attr('r', 5).style('stroke', 'white');
    });

  // merge + position
  enter.merge(points)
    .attr('cx', d => xScale(ensureNumber(d[xVariable], 0)))
    .attr('cy', d => yScale(ensureNumber(d[yVariable], 0)))
    .transition().duration(400);

  // legend (right side)
  g.selectAll('.legend').remove();
  const legend = g.selectAll('.legend')
    .data(categories)
    .enter().append('g')
    .attr('class', 'legend')
    .attr('transform', (d, i) => `translate(${width + 20}, ${i * 22})`);

  legend.append('rect').attr('width', 14).attr('height', 14).attr('fill', d => colorScale(d));
  legend.append('text').attr('x', 20).attr('y', 11).text(d => d).style('font-size', '12px');

  // draw regression/trend line if requested
  drawTrendLineIfNeeded(data, xScale, yScale, plotG);

  // add zoom behavior
  addZoomBehavior(svg, g, xScale, yScale, width, height, data);

  // update correlation stats
  updateCorrelationStats(data, xVariable, yVariable);
}

// -----------------------------
// Zoom behavior: rescale axes and points + trend line update
// -----------------------------
function addZoomBehavior(svgElement, g, xScale, yScale, width, height, data) {
  // preserve zoomBehavior globally for reset
  zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 10])
    .translateExtent([[ -100, -100 ], [ width + 100, height + 100 ]])
    .extent([[0, 0], [width, height]])
    .on('zoom', (event) => {
      const transform = event.transform;
      const newX = transform.rescaleX(xScale);
      const newY = transform.rescaleY(yScale);

      // update axes
      xAxisG.call(d3.axisBottom(newX));
      yAxisG.call(d3.axisLeft(newY));

      // update points positions
      plotG.selectAll('.dot')
        .attr('cx', d => newX(ensureNumber(d[xVariable], 0)))
        .attr('cy', d => newY(ensureNumber(d[yVariable], 0)));

      // update trend line if present
      updateTrendLineOnTransform(newX, newY);
    });

  // attach zoom to the svg element
  svgElement.call(zoomBehavior);
}

// Reset view handler (resets zoom)
function resetZoomView() {
  if (!zoomBehavior || !svg) return;
  svg.transition().duration(700).call(zoomBehavior.transform, d3.zoomIdentity);
  // redraw explicitly with identity transform to ensure trend line/axes synced
  createScatterPlot(scatterData);
}

// -----------------------------
// Trend line (linear regression) utilities
// -----------------------------
function drawTrendLineIfNeeded(data, xScale, yScale, plotGroup) {
  // remove existing trend-line
  plotGroup.selectAll('.trend-line').remove();

  if (!showTrendLine) return;

  // Prepare numeric arrays
  const xs = data.map(d => ensureNumber(d[xVariable], NaN)).filter(v => !isNaN(v));
  const ys = data.map(d => ensureNumber(d[yVariable], NaN)).filter(v => !isNaN(v));
  if (xs.length < 2 || ys.length < 2) return;

  // Compute regression: slope & intercept (y = a*x + b)
  const lr = linearRegression(
    data.map(d => ensureNumber(d[xVariable], NaN)),
    data.map(d => ensureNumber(d[yVariable], NaN))
  );

  const xMin = d3.min(data, d => ensureNumber(d[xVariable], 0));
  const xMax = d3.max(data, d => ensureNumber(d[xVariable], 0));

  const lineData = [
    { x: xMin, y: lr.predict(xMin) },
    { x: xMax, y: lr.predict(xMax) }
  ];

  const lineGenerator = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y));

  plotGroup.append('path')
    .datum(lineData)
    .attr('class', 'trend-line')
    .attr('d', lineGenerator)
    .attr('stroke', '#e74c3c')
    .attr('stroke-width', 2)
    .attr('fill', 'none')
    .style('stroke-dasharray', '6 4');
}

// Called on zoom to update trend line positions using transformed scales
function updateTrendLineOnTransform(newXScale, newYScale) {
  // if no trend line present, nothing to update
  const path = plotG.selectAll('.trend-line');
  if (path.empty()) return;

  // compute regression using original data (same as drawTrendLineIfNeeded)
  const lr = linearRegression(
    scatterData.map(d => ensureNumber(d[xVariable], NaN)),
    scatterData.map(d => ensureNumber(d[yVariable], NaN))
  );

  const xMin = d3.min(scatterData, d => ensureNumber(d[xVariable], 0));
  const xMax = d3.max(scatterData, d => ensureNumber(d[xVariable], 0));

  const lineData = [
    { x: xMin, y: lr.predict(xMin) },
    { x: xMax, y: lr.predict(xMax) }
  ];

  const lineGenerator = d3.line()
    .x(d => newXScale(d.x))
    .y(d => newYScale(d.y));

  path.datum(lineData).attr('d', lineGenerator);
}

// Linear regression helper (returns predict(x))
function linearRegression(xArr, yArr) {
  // filter out NaNs, pairwise
  const pairs = [];
  for (let i = 0; i < Math.min(xArr.length, yArr.length); i++) {
    const x = +xArr[i], y = +yArr[i];
    if (isFinite(x) && isFinite(y)) pairs.push([x, y]);
  }
  const n = pairs.length;
  if (n === 0) return { predict: () => 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const [x, y] of pairs) {
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n || 0;
  return {
    slope, intercept,
    predict: (x) => slope * x + intercept
  };
}

// -----------------------------
// Correlation stats (unchanged logic)
function updateCorrelationStats(data, xVar, yVar) {
  const correlation = calculateCorrelation(data, xVar, yVar);
  const statsElement = d3.select('#correlation-stats');
  if (statsElement.node()) {
    statsElement.html(`
      <h4>Correlation Statistics</h4>
      <p><strong>Correlation Coefficient:</strong> ${correlation.toFixed(3)}</p>
      <p><strong>Data Points:</strong> ${data.length}</p>
      <p><strong>Trend Strength:</strong> ${getTrendStrength(correlation)}</p>
    `);
  }
}

function calculateCorrelation(data, xVar, yVar) {
  const valid = data.filter(d => isFinite(+d[xVar]) && isFinite(+d[yVar]));
  const n = valid.length;
  if (n === 0) return 0;
  const sumX = d3.sum(valid, d => +d[xVar]);
  const sumY = d3.sum(valid, d => +d[yVar]);
  const sumXY = d3.sum(valid, d => +d[xVar] * +d[yVar]);
  const sumXX = d3.sum(valid, d => +d[xVar] * +d[xVar]);
  const sumYY = d3.sum(valid, d => +d[yVar] * +d[yVar]);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  return denominator === 0 ? 0 : numerator / denominator;
}

function getTrendStrength(correlation) {
  const absCorr = Math.abs(correlation);
  if (absCorr > 0.7) return "Strong";
  if (absCorr > 0.4) return "Moderate";
  if (absCorr > 0.2) return "Weak";
  return "Very Weak";
}

// -----------------------------
// Event listeners (hooks to  UI)
function setupEventListeners() {
  d3.select('#x-axis-select').on('change', function() {
    xVariable = this.value;
    createScatterPlot(scatterData);
  });
  d3.select('#y-axis-select').on('change', function() {
    yVariable = this.value;
    createScatterPlot(scatterData);
  });
  d3.select('#color-select').on('change', function() {
    colorVariable = this.value;
    createScatterPlot(scatterData);
  });
  d3.select('#reset-view').on('click', function() {
    resetZoomView();
  });
  d3.select('#toggle-trend').on('click', function() {
    showTrendLine = !showTrendLine;
    createScatterPlot(scatterData);
  });
}

// -----------------------------
// Helper utilities
function ensureNumber(value, defaultValue = 0) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = +value;
  return isNaN(n) ? defaultValue : n;
}
function ensureString(value, defaultValue = 'Unknown') {
  if (value === undefined || value === null || value === '') return defaultValue;
  const s = String(value).trim();
  return s === '' ? defaultValue : s;
}

function getVariableLabel(variable) {
  const labels = {
    'age': 'Age',
    'substance_score': 'Substance Score',
    'tobacco_use': 'Tobacco Use',
    'alcohol_use': 'Alcohol Use',
    'marijuana_use': 'Marijuana Use',
    'mental_health_score': 'Mental Health Score',
    'gender': 'Gender',
    'region': 'Region',
    'education_level': 'Education Level'
  };
  return labels[variable] || variable;
}
