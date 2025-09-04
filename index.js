#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function printAuthor() {
	console.log('t.me/Bengamin_Button t.me/XillenAdapter');
}

function usage() {
	printAuthor();
	console.log('usage: node index.js <input.(csv|json)> [--out graph.json] [--html graph.html]');
	console.log('csv format: source,target[,weight]');
	console.log('json format: { nodes:[{id}], links:[{source,target,weight}] } or array of edges');
}

function parseCSV(text) {
	const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
	const edges = [];
	for (const line of lines) {
		const parts = line.split(',').map(s => s.trim());
		if (parts.length < 2) continue;
		const [s, t, w] = parts;
		edges.push({ source: s, target: t, weight: w ? Number(w) || 1 : 1 });
	}
	return edges;
}

function parseJSON(text) {
	const data = JSON.parse(text);
	if (Array.isArray(data)) {
		// assume array of edges
		return data.map(e => ({ source: e.source, target: e.target, weight: e.weight || 1 }));
	}
	if (data && Array.isArray(data.links)) {
		return data.links.map(e => ({ source: e.source, target: e.target, weight: e.weight || 1 }));
	}
	throw new Error('Unsupported JSON shape');
}

function buildGraph(edges) {
	const nodeSet = new Set();
	for (const e of edges) { nodeSet.add(e.source); nodeSet.add(e.target); }
	const nodes = Array.from(nodeSet).map(id => ({ id }));
	const links = edges.map(e => ({ source: e.source, target: e.target, weight: e.weight || 1 }));
	return { nodes, links };
}

function writeJSON(graph, outPath) {
	fs.writeFileSync(outPath, JSON.stringify(graph, null, 2), 'utf8');
}

function writeHTML(graph, outPath) {
	const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Xillen Graph</title>
<style>
	body { margin: 0; font-family: system-ui, sans-serif; }
	#app { width: 100vw; height: 100vh; }
	svg { width: 100%; height: 100%; background: #0e1116; }
	text { fill: #d0d7de; font-size: 11px; }
	.link { stroke: #6e7681; stroke-opacity: 0.5; }
	.node { fill: #58a6ff; }
	.node.important { fill: #f85149; }
</style>
</head>
<body>
<div id="app"></div>
<script src="https://unpkg.com/d3@7/dist/d3.min.js"></script>
<script>
const graph = ${JSON.stringify(graph)};
const width = window.innerWidth; const height = window.innerHeight;
const svg = d3.select('#app').append('svg');
const link = svg.append('g').attr('stroke-width', 1.2).selectAll('line')
	.data(graph.links)
	.join('line')
	.attr('class','link');
const node = svg.append('g').selectAll('circle')
	.data(graph.nodes)
	.join('circle')
	.attr('r', 5)
	.attr('class', d => 'node' + (degree(d.id) > 3 ? ' important' : ''))
	.call(drag(simulation));
const label = svg.append('g').selectAll('text')
	.data(graph.nodes)
	.join('text')
	.text(d => d.id)
	.attr('dx', 8)
	.attr('dy', 4);
const simulation = d3.forceSimulation(graph.nodes)
	.force('link', d3.forceLink(graph.links).id(d => d.id).distance(d => 40 + (6 - Math.min(5, d.weight||1))*10))
	.force('charge', d3.forceManyBody().strength(-150))
	.force('center', d3.forceCenter(width/2, height/2));
simulation.on('tick', () => {
	link.attr('x1', d => d.source.x)
		.attr('y1', d => d.source.y)
		.attr('x2', d => d.target.x)
		.attr('y2', d => d.target.y);
	node.attr('cx', d => d.x)
		.attr('cy', d => d.y);
	label.attr('x', d => d.x)
		.attr('y', d => d.y);
});
function drag(sim) {
	function dragstarted(event) { if (!event.active) sim.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; }
	function dragged(event) { event.subject.fx = event.x; event.subject.fy = event.y; }
	function dragended(event) { if (!event.active) sim.alphaTarget(0); event.subject.fx = null; event.subject.fy = null; }
	return d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended);
}
function degree(id){ return graph.links.reduce((n, e)=> n + ((e.source.id?e.source.id:e.source)===id || (e.target.id?e.target.id:e.target)===id ? 1:0), 0); }
</script>
</body>
</html>`;
	fs.writeFileSync(outPath, html, 'utf8');
}

function main() {
	printAuthor();
	if (process.argv.length < 3) { usage(); process.exit(1); }
	const input = process.argv[2];
	let outJSON = 'graph.json';
	let outHTML = 'graph.html';
	for (let i = 3; i < process.argv.length; i++) {
		if (process.argv[i] === '--out' && process.argv[i+1]) { outJSON = process.argv[++i]; continue; }
		if (process.argv[i] === '--html' && process.argv[i+1]) { outHTML = process.argv[++i]; continue; }
	}
	const text = fs.readFileSync(input, 'utf8');
	let edges;
	if (input.toLowerCase().endsWith('.csv')) edges = parseCSV(text); else edges = parseJSON(text);
	const graph = buildGraph(edges);
	writeJSON(graph, outJSON);
	writeHTML(graph, outHTML);
	console.log(outJSON);
	console.log(outHTML);
}

if (require.main === module) {
	main();
}
