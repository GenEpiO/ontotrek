
/*****************************************************************************
development2.js interface for 3d-force-graph
******************************************************************************/

RENDER_QUICKER = false
RENDER_DEPTH = 50
RENDER_GALAXY = false
RENDER_DEPRECATED = false
RENDER_LABELS = true
GRAPH_DIMENSIONS = 3
GRAPH_LINK_WIDTH = 2
EXIT_DEPTH = 26;
dataLookup = {}

const LABEL_MAX_LINE_LENGTH = 30  // label text is cut after first word ending before this character limit.
const LABEL_RE = new RegExp('(?![^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '}$)([^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '})\\s', 'g');
const GRAPH_DOM_EL = $("#3d-graph");
const GRAPH_BACKGROUND_COLOR = "#302020"
// For BFO layout: -2000, .01, .011
const GRAPH_CHARGE_STRENGTH = -30000 // negative=repulsion; positive=attraction // -2000 for BFO
const GRAPH_NODE_DEPTH = 100
const GRAPH_VELOCITY_DECAY = 0.4// default 0.4
const GRAPH_ALPHA_DECAY = 0.0228 // default 0.0228
const GRAPH_NODE_RADIUS = 5
//const GRAPH_COOLDOWN_TIME = 1500 // default 15000
//const GRAPH_COOLDOWN = 30000 // default 15000
const GRAPH_COOLDOWN_TICKS = 50 // default 15000
const GRAPH_PARTICLES = 0 // animation that shows directionality of links
const ONTOLOGY_LOOKUP_URL = 'http://purl.obolibrary.org/obo/'
const CAMERA_DISTANCE = 300.0
const NO_LABELS = false


function do_graph(rawData) {
  /*
  Main function for loading a new data file and rendering a graph of it.

  */
  $(document.body).css({'cursor' : 'wait'});

  top.Graph = init() // Any possible memory leak on reload?
  top.rawData = rawData
  node_focus()

  // Usual case for GEEM ontofetch.py ontology term specification table:
  data = init_geem_data(rawData)
  init_search(data) 

  //Graph.linkDirectionalParticles(0)

  $("#status").html(top.builtData.nodes.length + " terms");

  // Chop the data into two parts so first pulls most upper level categories into position.
  //var tempQ = top.RENDER_QUICKER
  //var tempL = top.RENDER_LABELS
  top.RENDER_QUICKER = true
  top.RENDER_LABELS = false

  top.Graph
    //.numDimensions(2) // Can we downsize it temporarily?
    //.linkDirectionalParticles(0)
    .d3Force('center', null)
    .d3Force('charge').strength(GRAPH_CHARGE_STRENGTH)

  // Incrementally adds graph nodes in batches until maximum depth reached
  if (data.nodes.length) {

      top.MAX_DEPTH = top.builtData.nodes[top.builtData.nodes.length-1].depth;
      top.NEW_NODES = []; // global so depth_iterate can see it
      top.ITERATE = 1;
      Graph.cooldownTicks(GRAPH_COOLDOWN_TICKS) // initial setting
      Graph.graphData({nodes:[],links:[]})

  }
  
  /*
  // Navigate to root BFO node if there is one. Slight delay to enable
  // engine to create reference points.  Ideally event for this.
  if('BFO:0000001' in top.dataLookup) {
    setTimeout(function(){
      node_focus(top.dataLookup['BFO:0000001']) 
    }, 2000)
  }
  */

}


function refresh_graph() {
  // The graph engine is triggered to redraw its own data.
  if (top.Graph) {
    Graph.nodeRelSize(4); 
    // new command Graph.refresh() ????
  }
}

function init() {

  return ForceGraph3D()(document.getElementById('3d-graph'))

    // Using dfault D3 engine so we can pin nodes via { id: 0, fx: 0, fy: 0, fz: 0 }
    .forceEngine('d3')  
    .d3Force('center', null)  // Enables us to add nodes without shifting centre of mass or having a centre attractor
    //.d3Force('charge').strength(GRAPH_CHARGE_STRENGTH)
    .width(GRAPH_DOM_EL.width())
    .warmupTicks(0)
    //.cooldownTime(GRAPH_COOLDOWN_TIME)
    .cooldownTicks(GRAPH_COOLDOWN_TICKS)
    .backgroundColor(GRAPH_BACKGROUND_COLOR)

    // Getter/setter for the simulation intensity decay parameter, only 
    // applicable if using the d3 simulation engine.  
    .d3AlphaDecay(GRAPH_ALPHA_DECAY) // default 0.0228
    
    // Getter/setter for the nodes' velocity decay that simulates the medium
    // resistance, only applicable if using the d3 simulation engine.
    .d3VelocityDecay(GRAPH_VELOCITY_DECAY)  // default 0.4

    // IS THERE A WAY TO FORCE CAMERA TO only pan, and rotate on x,y but not Z ?
    .cameraPosition({x:0, y:0, z: 3000 },{x:0, y:0, z: 0 })

    .linkWidth(function(link) {return link.width > GRAPH_LINK_WIDTH ? link.width : GRAPH_LINK_WIDTH})
    .linkResolution(3) // 3 sided, i.e. triangular beam
    .linkOpacity(1)

    //.linkDirectionalParticles( ..) // done in do_graph
    //.linkDirectionalParticleWidth(4)
    //.linkDirectionalParticleSpeed(.002)
    
    //.nodeAutoColorBy('color')
    // Note d.target is an object!
    /*.linkAutoColorBy(d => d.target.color})*/

    .nodeLabel(node => `<div>${node.label}<br/><span class="tooltip-id">${node.id}</span></div>`) // Text shown on mouseover. //${node.definition}
    //.nodeColor(node => node.color) //triggers refresh on each animation cycle
    //.nodeColor(node => highlightNodes.indexOf(node) === -1 ? 'rgba(0,255,255,0.6)' : 'rgb(255,0,0,1)')
    .onNodeHover(node => GRAPH_DOM_EL[0].style.cursor = node ? 'pointer' : null)
    .onLinkClick(link => {node_focus(link.target)})
    .onNodeClick(node => node_focus(node))
    .nodeThreeObject(node => render_node(node))

    .onEngineStop(stuff => {
      depth_iterate()
    })

}


function depth_iterate() {

  if (top.ITERATE > top.EXIT_DEPTH) {
    //Graph.stopAnimation()
    var refresh = false
    var flag = $("#render_labels:checked").length == 1
    if (top.RENDER_LABELS != flag) {
      top.RENDER_LABELS = flag
      refresh = true
    }
    var flag = $("#render_quicker:checked").length == 1
    if (top.RENDER_QUICKER != flag) {
      top.RENDER_QUICKER = flag
      // set_directional_particles()
      refresh = true
    }
    if (refresh) 
      Graph.nodeRelSize(4); //Triggers redraw of everything

    return; // End of it all.
  }

  // Convert all parent node flex coordinates to fixed ones.
  for (item in top.NEW_NODES) {
    var node = top.NEW_NODES[item]
    node.fx = node.x;
    node.fy = node.y;
  }

  if (top.ITERATE < top.EXIT_DEPTH && top.ITERATE != top.MAX_DEPTH && top.ITERATE < top.RENDER_DEPTH) {

    top.Graph.d3Force('charge').strength(GRAPH_CHARGE_STRENGTH/(top.ITERATE*top.ITERATE) )
    //top.Graph.d3Force('charge').strength(GRAPH_CHARGE_STRENGTH + (GRAPH_CHARGE_STRENGTH/top.EXIT_DEPTH)*top.ITERATE)

    top.NEW_NODES = top.builtData.nodes.filter(n => n.depth == top.ITERATE)


    // freez z coordinate
    for (item in top.NEW_NODES) {
      node = top.NEW_NODES[item]
      // depth temporarily set close to parent so that it temporarily acts as antagonist 
      node.fz = node_depth(node)
      /* can't set node.x, y on new nodes. */
    }

    var newLinks = top.builtData.links.filter(l => top.dataLookup[l.target] && top.dataLookup[l.target].depth == top.ITERATE);
    
    Graph.cooldownTicks((top.NEW_NODES.length+30)/6)

    const { nodes, links } = Graph.graphData();

    $("#status").html('Rendering ' + (nodes.length + newLinks.length) + ' of ' + top.builtData.nodes.length + " terms, depth " + top.ITERATE);

    Graph.graphData({
      nodes: nodes.concat(top.NEW_NODES), // [...nodes, ...newNodes],
      links: links.concat(newLinks) //  [...links, ...newLinks]
    });

  }

  // Final step: Flip into requested (2 or 3) dimensions, with parents fixed by their 2d (x, y) 
  else {
    //alert('here' + top.ITERATE + ',' + top.MAX_DEPTH)
    $(document.body).css({'cursor' : 'default'});
    Graph.numDimensions(GRAPH_DIMENSIONS)
   // Graph.d3Force('charge').strength(-100 ) // 
    // z coordinate reset to standard hierarchy
    for (item in top.builtData.nodes) {
      node = top.builtData.nodes[item]
      node.fz = node_depth(node) + Math.random()*20 - 10
    }
    // don't make below var newNodes / var newLinks?
    newNodes = top.builtData.nodes.filter(n => n.depth >= top.ITERATE && n.depth <= top.RENDER_DEPTH)
    newLinks = top.builtData.links.filter(l => function(l) {
      var target = top.dataLookup[l.target]
      return target.depth >= top.ITERATE && target.depth <= top.RENDER_DEPTH
    });

    const { nodes, links } = Graph.graphData();

    const total_nodes = nodes.length + newNodes.length
    $("#status").html('Rendering ' + total_nodes + ' of ' + top.builtData.nodes.length + " terms, depth >= " + top.ITERATE);

    Graph.cooldownTicks(total_nodes)  // GRAPH_COOLDOWN_TICKS * 3

    Graph.graphData({
      nodes: nodes.concat(newNodes),
      links: links.concat(newLinks)
    });

  }


  top.ITERATE ++;

}
