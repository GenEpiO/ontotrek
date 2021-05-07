
/*****************************************************************************
development2.js interface for 3d-force-graph
******************************************************************************/

var RENDER_QUICKER = false;
var RENDER_DEPTH = 50;
var RENDER_GALAXY = false;
var RENDER_DEPRECATED = false;
var RENDER_LABELS = true;
var RENDER_ULO_EDGE = false;
var RENDER_OTHER_PARENTS = false;
var GRAPH_DIMENSIONS = 3;
var GRAPH_LINK_WIDTH = 3;
var GRAPH_NODE_DEPTH = 100; // 100 
var RENDER_SLICES = false;

var EXIT_DEPTH = 26;
// Label text is cut after first word ending before this character limit.
const LABEL_MAX_LINE_LENGTH = 30;  
const LABEL_RE = new RegExp('(?![^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '}$)([^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '})\\s', 'g');

// For BFO layout: -2000, .01, .011
// -30000 = normal.  negative=repulsion; positive=attraction // -2000 for BFO
const GRAPH_CHARGE_STRENGTH = -10000;

const GRAPH_LINK_HIGHLIGHT_RADIUS = 15;
const GRAPH_VELOCITY_DECAY = 0.4; // default 0.4
const GRAPH_ALPHA_DECAY = 0.0228; // default 0.0228
const GRAPH_NODE_RADIUS = 5;
//const GRAPH_COOLDOWN_TIME = 1500 // default 15000
//const GRAPH_COOLDOWN = 30000 // default 15000
const GRAPH_COOLDOWN_TICKS = 50; // default 15000
const ONTOLOGY_LOOKUP_URL = 'http://purl.obolibrary.org/obo/';
const CAMERA_DISTANCE = 300.0;

// Regular expression to match robot's markup triple explanation of
// unsatisfiable reasoning:
const RE_MD_TRIPLE = /\[(?<subject_label>[^\]]+)\]\((?<subject_uri>[^)]+)\) (?<relation>\w+) \[(?<object_label>[^\]]+)\]\((?<object_uri>[^)]+)\)/;
const RE_URL = /^https?:\/\/.+/i;
const RE_URL_ROOT = /^https?:\/\/[^#?]+/i;
const RE_NAMESPACE_URL = /(?<prefix>https?:\/\/.+[\/#](?<namespace>\w+)(?<separator>[_:]))(?<id>\w+)/;

/***************** DOM and APPEARANCE *****************/
const GRAPH_DOM_EL = $("#3d-graph");
const GRAPH_BACKGROUND_COLOR = "#302020";
// HACK for background sized to text; using 2nd semitransparent grey sprite as it always faces camera.
SPRITE_MAP = new THREE.TextureLoader().load( "img/whitebox.png" );
SPRITE_MATERIAL = new THREE.SpriteMaterial( { map: SPRITE_MAP, color: 0x808080 , opacity : 0.5} );
SPRITE_FONT_COLOR = '#FAEBD7';

const SYNONYM_FIELD = ["synonyms", 
  "oboInOwl:hasSynonym", 
  "oboInOwl:hasExactSynonym", 
  "oboInOwl:hasBroadSynonym", 
  "oboInOwl:hasNarrowSynonym", 
  "oboInOwl:hasRelatedSynonym"
]

// function load_graph(rawData) {
//   $(document.body).css({'cursor' : 'wait'});

//   top.Graph = ForceGraph3D({controlType: 'trackball'})(document.getElementById('3d-graph'))

//   // Using dfault D3 engine so we can pin nodes via { id: 0, fx: 0, fy: 0, fz: 0 }
//   .forceEngine('d3')
//   .d3Force('center', null)  // Enables us to add nodes without shifting centre of mass or having a centre attractor
//   //.d3Force('charge').strength(GRAPH_CHARGE_STRENGTH)
//   .width(GRAPH_DOM_EL.width())
//   .warmupTicks(0)
//   //.cooldownTime(GRAPH_COOLDOWN_TIME)
//   .cooldownTicks(GRAPH_COOLDOWN_TICKS)
//   .backgroundColor(GRAPH_BACKGROUND_COLOR)

//   // Getter/setter for the simulation intensity decay parameter, only 
//   // applicable if using the d3 simulation engine.  
//   .d3AlphaDecay(GRAPH_ALPHA_DECAY) // default 0.0228
  
//   // Getter/setter for the nodes' velocity decay that simulates the medium
//   // resistance, only applicable if using the d3 simulation engine.
//   .d3VelocityDecay(GRAPH_VELOCITY_DECAY)  // default 0.4

//   // IS THERE A WAY TO FORCE CAMERA TO only pan, and rotate on x,y but not Z ?
//   .cameraPosition({x:0, y:0, z: 3000 },{x:0, y:0, z: 0 })
//   //.linkWidth(link => link === highlightLink ? 4 : 1)
//   .linkWidth(function(link) {
//     // 
//     return link.highlight ? GRAPH_LINK_HIGHLIGHT_RADIUS : link.width > GRAPH_LINK_WIDTH ? link.width : GRAPH_LINK_WIDTH
//   })
//   // It would be great if we could make it dashed instead
//   .linkColor(function(link) {
//     return link.highlight ? link.highlight : link.color
//   })

//   .linkResolution(3) // 3 sided, i.e. triangular beam
//   .linkOpacity(1)

//   //.nodeAutoColorBy('color')
//   // Note d.target is an object!
//   /*.linkAutoColorBy(d => d.target.color})*/

//   // Text shown on mouseover.  WAS node.label
//   .nodeLabel(node => `<div>${node['rdfs:label']}<br/><span class="tooltip-id">${node.id}</span></div>`) 

//   //.nodeColor(node => node.highlight ? 'color) // Note: this triggers refresh on each animation cycle
//   //.nodeColor(node => highlightNodes.indexOf(node) === -1 ? 'rgba(0,255,255,0.6)' : 'rgb(255,0,0,1)')
//   //.nodeColor(node => node.highlight ? '#F00' : node.color ) 
  
//   // Not doing anything...
//   .nodeRelSize(node => node.highlight ? 18 : 4 ) // 4 is default
//   .onNodeHover(node => GRAPH_DOM_EL[0].style.cursor = node ? 'pointer' : null)
//   .onLinkClick(link => {node_focus(link.target)})
//   .onNodeClick(node => node_focus(node))
//   .nodeThreeObject(node => render_node(node))

//   top.rawData = rawData
//   node_focus()

//   // Usual case for GEEM ontofetch.py ontology term specification table:
//   data = init_ontofetch_data(rawData)
//   init_search(data) 

//   var request = new XMLHttpRequest();
//   request.open("GET", "../data/trees/agro_nodes.json", false);
//   request.send(null)
//   var nodes = JSON.parse(request.responseText);
  
//   var request = new XMLHttpRequest();
//   request.open("GET", "../data/trees/agro_links.json", false);
//   request.send(null)
//   var links = JSON.parse(request.responseText);

//   $("#status").html(top.builtData.nodes.length + " terms");

//   // Chop the data into two parts so first pulls most upper level categories into position.
//   //var tempQ = top.RENDER_QUICKER
//   //var tempL = top.RENDER_LABELS
//   top.RENDER_QUICKER = false
//   top.RENDER_LABELS = true

//   top.Graph
//     //.linkDirectionalParticles(0)
//     .d3Force('center', null)
//     .d3Force('charge').strength(GRAPH_CHARGE_STRENGTH)

//   Graph.graphData({nodes:nodes, links:links})

//   $(document.body).css({'cursor' : 'default'});

// }

function load_graph() {

  if (top.RAW_DATA) {
    // Rendering of all but last pass skips labels and fancy polygons.
    top.RENDER_QUICKER = true;
    top.RENDER_LABELS = true;

    $(document.body).css({'cursor': 'wait'});

    setNodeReport(); // Clear out sidebar info

    const nodes_url = $("select#ontology option").filter(':selected')[0].dataset.nodes
    const links_url = $("select#ontology option").filter(':selected')[0].dataset.links
    const metadata_url = $("select#ontology option").filter(':selected')[0].dataset.metadata

    var request = new XMLHttpRequest();
    request.open("GET", nodes_url, false);
    request.send(null);
    var nodes = JSON.parse(request.responseText);
    
    var request = new XMLHttpRequest();
    request.open("GET", links_url, false);
    request.send(null);
    var links = JSON.parse(request.responseText);

    var request = new XMLHttpRequest();
    request.open("GET", metadata_url, false);
    request.send(null);
    var metadata = JSON.parse(request.responseText)

    top.BUILT_DATA = init_ontofetch_data(metadata);
    top.MAX_DEPTH = top.BUILT_DATA.nodes[top.BUILT_DATA.nodes.length-1].depth;
    init_search(top.BUILT_DATA);

    top.GRAPH = init(load=true, nodes=nodes, links=links);
    
    top.dataLookup = Object.fromEntries(nodes.map(e => [e.id, e]))

    $(document.body).css({'cursor' : 'default'});
    $("#download_button").css({'visibility': 'visible'})
    $("#rerender_button").css({'visibility': 'visible'})
  }
}

function load_uploaded_graph() {

  // Rendering of all but last pass skips labels and fancy polygons.
  top.RENDER_QUICKER = true;
  top.RENDER_LABELS = true;

  $(document.body).css({'cursor': 'wait'});

  setNodeReport(); // Clear out sidebar info

  top.BUILT_DATA = init_ontofetch_data(top.METADATA_JSON);
  top.MAX_DEPTH = top.BUILT_DATA.nodes[top.BUILT_DATA.nodes.length-1].depth;
  init_search(top.BUILT_DATA);

  top.GRAPH = init(load=true, nodes=top.NODES_JSON, links=top.LINKS_JSON);
  
  top.dataLookup = Object.fromEntries(nodes.map(e => [e.id, e]))

  $(document.body).css({'cursor' : 'default'});
  $("#download_button").css({'visibility': 'visible'})
}

/*
  Main method for loading a new data file and rendering a graph of it.

*/
function do_graph() {

  if (top.RAW_DATA) {

    // Rendering of all but last pass skips labels and fancy polygons.
    top.RENDER_QUICKER = true;
    top.RENDER_LABELS = true;
    top.NEW_NODES = []; // global so depth_iterate can see it
    top.ITERATE = 1;

    $(document.body).css({'cursor' : 'wait'});

    setNodeReport(); // Clear out sidebar info

    // Usual case for GEEM ontofetch.py ontology term specification table:
    // This creates top.BUILT_DATA
    top.BUILT_DATA = init_ontofetch_data(top.RAW_DATA);
    $("#status").html(top.BUILT_DATA.nodes.length + " terms");
    top.MAX_DEPTH = top.BUILT_DATA.nodes[top.BUILT_DATA.nodes.length-1].depth;
    init_search(top.BUILT_DATA);

    top.GRAPH = init(load=false);

    $("#download_button").css({'visibility': 'visible'})
    $("#rerender_button").css({'visibility': 'visible'})
  }
};


function init(load=false, nodes=null, links=null) {

  // controlType is  'fly', 'orbit' or 'trackball' 

  if (load) {
    return ForceGraph3D({controlType: 'trackball'})(GRAPH_DOM_EL[0])

    .graphData({nodes: nodes, links: links})

    // Using dfault D3 engine so we can pin nodes via { id: 0, fx: 0, fy: 0, fz: 0 }
    .forceEngine('d3')
    .enableNodeDrag(false) // Stops frozen nodes from getting moved around by user
    .d3Force('center', null)  // Enables us to add nodes without shifting centre of mass or having a centre attractor
    .width(GRAPH_DOM_EL.width())
    .warmupTicks(0)
    //.cooldownTime(GRAPH_COOLDOWN_TIME)
    .cooldownTicks(0)
    .backgroundColor(GRAPH_BACKGROUND_COLOR)

    // Getter/setter for the simulation intensity decay parameter, only 
    // applicable if using the d3 simulation engine.  
    .d3AlphaDecay(GRAPH_ALPHA_DECAY) // default 0.0228
    
    // Getter/setter for the nodes' velocity decay that simulates the medium
    // resistance, only applicable if using the d3 simulation engine.
    // .d3VelocityDecay(GRAPH_VELOCITY_DECAY)  // default 0.4

    // IS THERE A WAY TO FORCE CAMERA TO only pan, and rotate on x,y but not Z ?
    .cameraPosition({x:0, y:-4000, z: 2000 }, {x:0, y:0, z: 0 })
    //.linkWidth(link => link === highlightLink ? 4 : 1)
    .linkWidth(function(link) {
      // 
      return link.highlight ? GRAPH_LINK_HIGHLIGHT_RADIUS : link.width > GRAPH_LINK_WIDTH ? link.width : GRAPH_LINK_WIDTH
    })

    // Note d.target is an object!
    /*.linkAutoColorBy(d => d.target.color})*/
    // It would be great if we could make it dashed instead
    // First mark a link by its highlight if any;
    // then by group's color if top.RENDER_ULO_EDGE;
    // then by color.

    // PROBLEM: sometimes target is node, sometimes string.
    // CAREFUL! THIS ITERATES AND SEEMS TO CHANGE NODE source / target
    // from id to object.
    .linkColor(function(link) {
      var target = link.target;

      if (link.highlight_color)
        return link.highlight_color;

      // only happens on post-first-render, so link.target established as object
      if (top.RENDER_ULO_EDGE === true) {

        var group = top.dataLookup[link.target.group_id];
        if (group && group.color) {
          return group.color;
        };
      }

      //link.target itself is actually string id on first pass.
      if (!link.target.prefix) {
        // convert to object
        target = top.dataLookup[link.target];
      }

      // used for ULO as ontology color when not rendering by ULO branch color
      if (target.prefix == 'BFO') {
        return getOntologyColor(top.dataLookup[target.id]);
      }

      return target.color;
    })

    .linkResolution(3) // 3 sided, i.e. triangular beam
    .linkOpacity(1)

    // Text shown on mouseover.  WAS node.label
    .nodeLabel(node => `<div>${node['rdfs:label']}<br/><span class="tooltip-id">${node.id}</span></div>`) 

    //.nodeAutoColorBy('color')
    //.nodeColor(node => node.highlight ? 'color) // Note: this triggers refresh on each animation cycle
    //.nodeColor(node => highlightNodes.indexOf(node) === -1 ? 'rgba(0,255,255,0.6)' : 'rgb(255,0,0,1)')
    //.nodeColor(node => node.highlight ? '#F00' : node.color ) 
    
    // Not doing anything...
    .nodeRelSize(node => node.highlight ? 18 : 4 ) // 4 is default
    .onNodeHover(node => GRAPH_DOM_EL[0].style.cursor = node ? 'pointer' : null)
    .onLinkClick(link => {setNodeReport(link.target)})
    .onNodeClick(node => setNodeReport(node))
    .nodeThreeObject(node => render_node(node))

    // Do this only for 3d iterated version
    // Running on each iteration?
    .onEngineStop(stuff => {
      depth_iterate();
    })
  }

  else {
    return ForceGraph3D({controlType: 'trackball'})(GRAPH_DOM_EL[0])

    // Using dfault D3 engine so we can pin nodes via { id: 0, fx: 0, fy: 0, fz: 0 }
    .forceEngine('d3')
    .enableNodeDrag(false) // Stops frozen nodes from getting moved around by user
    .d3Force('center', null)  // Enables us to add nodes without shifting centre of mass or having a centre attractor
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
    .cameraPosition({x:0, y:-4000, z: 2000 }, {x:0, y:0, z: 0 })
    //.linkWidth(link => link === highlightLink ? 4 : 1)
    .linkWidth(function(link) {
      // 
      return link.highlight ? GRAPH_LINK_HIGHLIGHT_RADIUS : link.width > GRAPH_LINK_WIDTH ? link.width : GRAPH_LINK_WIDTH
    })

    // Note d.target is an object!
    /*.linkAutoColorBy(d => d.target.color})*/
    // It would be great if we could make it dashed instead
    // First mark a link by its highlight if any;
    // then by group's color if top.RENDER_ULO_EDGE;
    // then by color.

    // PROBLEM: sometimes target is node, sometimes string.
    // CAREFUL! THIS ITERATES AND SEEMS TO CHANGE NODE source / target
    // from id to object.
    .linkColor(function(link) {
      var target = link.target;

      if (link.highlight_color)
        return link.highlight_color;

      // only happens on post-first-render, so link.target established as object
      if (top.RENDER_ULO_EDGE === true) {

        var group = top.dataLookup[link.target.group_id];
        if (group && group.color) {
          return group.color;
        };
      }

      //link.target itself is actually string id on first pass.
      if (!link.target.prefix) {
        // convert to object
        target = top.dataLookup[link.target];
      }

      // used for ULO as ontology color when not rendering by ULO branch color
      if (target.prefix == 'BFO') {
        return getOntologyColor(top.dataLookup[target.id]);
      }

      return target.color;
    })

    .linkResolution(3) // 3 sided, i.e. triangular beam
    .linkOpacity(1)

    // Text shown on mouseover.  WAS node.label
    .nodeLabel(node => `<div>${node['rdfs:label']}<br/><span class="tooltip-id">${node.id}</span></div>`) 

    //.nodeAutoColorBy('color')
    //.nodeColor(node => node.highlight ? 'color) // Note: this triggers refresh on each animation cycle
    //.nodeColor(node => highlightNodes.indexOf(node) === -1 ? 'rgba(0,255,255,0.6)' : 'rgb(255,0,0,1)')
    //.nodeColor(node => node.highlight ? '#F00' : node.color ) 
    
    // Not doing anything...
    .nodeRelSize(node => node.highlight ? 18 : 4 ) // 4 is default
    .onNodeHover(node => GRAPH_DOM_EL[0].style.cursor = node ? 'pointer' : null)
    .onLinkClick(link => {setNodeReport(link.target)})
    .onNodeClick(node => setNodeReport(node))
    .nodeThreeObject(node => render_node(node))

    // Do this only for 3d iterated version
    // Running on each iteration?
    .onEngineStop(stuff => {
      depth_iterate();
    })

  }
}


function depth_iterate() {
  /*
  Handles one iteration at depth n at a time.
  On each iteration, adds all nodes at that depth, and any connections to
  parents that they have.
  Only on top.EXIT_DEPTH iteration are labels rendered, thicker edges,
  and switch to given dimension.

  */
  if (top.ITERATE > top.EXIT_DEPTH) {
    if (top.GRAPH) {
      top.GRAPH.pauseAnimation();
    }
    return
  }

  // Convert all parent node flex coordinates to fixed ones.
  for (item in top.NEW_NODES) {
    var node = top.NEW_NODES[item];

    // If it doesn't have to move any more because it has no kids,
    // then fix its position; it therefore get taken out of "cooldown" list
    // Thus speeding calculation
    if (node.children.length == 0) {
      node.fy = node.y;
      node.fx = node.x;
    }

    const parent = top.dataLookup[node.parent_id];
    if (parent) {
      parent.fx = parent.x;
      parent.fy = parent.y;
      // fix parent z
      if (RENDER_SLICES && !(node.id in top.layout))
        node.fx = parent.fx;
    }

    if (GRAPH_DIMENSIONS == 2 && !(node.id in top.layout))
       node.fz = lookup_2d_z(node)+ 30

  }

  if (top.ITERATE < top.EXIT_DEPTH && top.ITERATE != top.MAX_DEPTH && top.ITERATE < top.RENDER_DEPTH) {

    top.GRAPH.d3Force('charge')
      .strength(GRAPH_CHARGE_STRENGTH/(top.ITERATE*top.ITERATE) )

    top.NEW_NODES = top.BUILT_DATA.nodes
      .filter(n => n.depth == top.ITERATE)

    if (top.NEW_NODES.length) {

      // freeze z coordinate
      for (item in top.NEW_NODES) {
        node = top.NEW_NODES[item]

        const parent = top.dataLookup[node.parent_id];

        // depth temporarily set close to parent so that it temporarily acts as antagonist 

        if (parent && GRAPH_DIMENSIONS == 2 && !(node.id in top.layout)) {
         // node.fz = lookup_2d_z(node) - 100
          node.fz = node_depth(node)
        }
        else
          node.fz = node_depth(node)
        /* can't set node.x, y on new nodes. */
      }

      // Issue: link with otherparent getting added by target depth BUT other parent not in nodes yet.
      var newLinks = top.BUILT_DATA.links.filter(
        l => top.dataLookup[l.target] 
        && top.dataLookup[l.target].depth == top.ITERATE
        && l.other === false
        );

      const { nodes, links } = top.GRAPH.graphData();

      // Customize how many force matrix iterations it takes before rendering this iteration and moving on
      top.GRAPH.cooldownTicks(top.NEW_NODES.length < 40 ? 5 + top.NEW_NODES.length / 2 : 40)
      //GRAPH.cooldownTicks((top.NEW_NODES.length+30))


      $("#status").html('Rendering ' + (nodes.length + newLinks.length) + ' of ' + top.BUILT_DATA.nodes.length + " terms, depth " + top.ITERATE);

      // Only positions of new nodes are recalculated
      top.GRAPH.graphData({
        nodes: nodes.concat(top.NEW_NODES), // [...nodes, ...newNodes],
        links: links.concat(newLinks) //  [...links, ...newLinks]
      });


    }
    top.ITERATE ++;
  }

  else {
    // Does all remaining nodes past iteration depth limit at once
    depth_iterate_exit();
    $(document.body).css({'cursor' : 'default'});
    // Triggers update of RENDER_LABELS flag, and renders all nodes accordingly
    top.GRAPH.refresh();
  }
 
}

function depth_iterate_exit() {

  // Final step: Flip into requested (2 or 3) dimensions, with parents fixed by their 2d (x, y) 
  console.log(' Ending with' + GRAPH_DIMENSIONS + ',' + top.ITERATE + ',' + top.MAX_DEPTH + top.RENDER_DEPTH)

  // Restores these settings after quick positional render without them.
  var flag = $("#render_labels:checked").length == 1

  // Issue: with latest 3d-force-graph this flag is only causing 
  // labels of last iteration to be drawn. Graph as a whole isn't being
  // redrawn on exit.
  if (top.RENDER_LABELS != flag) {
    top.RENDER_LABELS = flag
  }
  var flag = $("#render_quicker:checked").length == 1
  if (top.RENDER_QUICKER != flag) {
    top.RENDER_QUICKER = flag
  }
  //top.GRAPH.numDimensions(GRAPH_DIMENSIONS)



  // top.GRAPH.d3Force('charge').strength(-100 ) // 
  // z coordinate reset to standard hierarchy
  for (item in top.BUILT_DATA.nodes) {
    node = top.BUILT_DATA.nodes[item]
    // This reduces crowdedness of labelling, otherwise labels are all on
    // same plane.
    // if (GRAPH_DIMENSIONS == 2 && (node.id in top.layout)) {
    if (GRAPH_DIMENSIONS == 2) {
      node.fz = 0  //lookup_2d_z(node)
    }
    else {
      const z_randomizer = Math.random() * 20 - 10
      node.fz = node_depth(node) + z_randomizer
    }

    // No need to have this node participate in force directed graph now.
    if (node.children.length == 0) {
      node.fy = node.y;
      node.fx = node.x;
    }

    const parent = top.dataLookup[node.parent_id];
    if (parent && RENDER_SLICES && !(node.id in top.layout))
      node.fx = parent.fx;

  }
  // don't make below var newNodes / var newLinks?
  var newNodes = top.BUILT_DATA.nodes.filter(n => n.depth.within(top.ITERATE, top.RENDER_DEPTH))

  // Return link if target is within depth, or link is one of the "other, i.e. secondary links.
  var newLinks = top.BUILT_DATA.links.filter(
    l => top.dataLookup[l.target] && ((RENDER_OTHER_PARENTS && l.other === true) 
      || (l.other === false && top.dataLookup[l.target].depth.within(top.ITERATE, top.RENDER_DEPTH))
    )
  );    
  /*
  // For some reason, can't code abovce as  .filter(l => function(l){...}) ?
  var newLinks = top.BUILT_DATA.links.filter( l => function(l){
    target = top.dataLookup[l.target]
    // Return link if target is within depth, or link is one of the "other, i.e. secondary links.
    // 
    return (RENDER_OTHER_PARENTS && l.other ===true) || ((l.other === false) && target.depth >= top.ITERATE && target.depth <= top.RENDER_DEPTH)
  });
  */
 
  // Fetches existing tuple of nodes and links
  const { nodes, links } = top.GRAPH.graphData();

  const new_length = nodes.length + newNodes.length
  $("#status").html('Rendering ' + new_length + ' of ' + top.BUILT_DATA.nodes.length + " terms, depth >= " + top.ITERATE);

  //top.GRAPH.cooldownTicks(new_length)  // GRAPH_COOLDOWN_TICKS * 3

  top.GRAPH.graphData({
    nodes: nodes.concat(newNodes),
    links: links.concat(newLinks)
  });

  // Ensures no more iterations
  top.ITERATE = top.EXIT_DEPTH+1;


  return; // End of it all.

} 

function lookup_2d_z(node) {
  // apply this to parent, not to a node that is being calculated.
  var parent = top.dataLookup[node.parent_id];
  // ISSUE: fixing node to parent z is causing pythagorean distance in force directed graph to screw up,
  // causing points to contract to centre.
  if (parent) {
    console.log ("z", parent.z)
    return (parent.z - 10.0)
  }
  return node_depth(node)
}

Number.prototype.within = function(a, b) {
  var min = Math.min.apply(Math, [a, b]),
      max = Math.max.apply(Math, [a, b]);
  return this >= min && this <= max;
};


  
/* Add to do_graph() to navigate to a particular node
  // Navigate to root BFO node if there is one. Slight delay to enable
  // engine to create reference points.  Ideally event for this.
  if('BFO:0000001' in top.dataLookup) {
    setTimeout(function(){
      setNodeReport(top.dataLookup['BFO:0000001']) 
    }, 2000)
  }
  */