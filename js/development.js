
/*****************************************************************************

Development notes:

Graph parameters
  https://github.com/vasturiano/3d-force-graph

Force node position with:
  https://github.com/vasturiano/3d-force-graph/issues/90

Also see link hovering:
  https://github.com/vasturiano/3d-force-graph/issues/14

See forcing link size:
  https://github.com/d3/d3-force#forceLink

Example fetch of ontology using the GEEM platform "ontofetch.py" program. 
It returns a flat json list of terms branching from given root (defaults 
to owl:Entity)

  python ontofetch.py http://purl.obolibrary.org/obo/bfo/2.0/bfo.owl -o data -r http://purl.obolibrary.org/obo/BFO_0000001
  python ontofetch.py https://raw.githubusercontent.com/obi-ontology/obi/master/obi.owl -o data
  python ontofetch.py https://raw.githubusercontent.com/DiseaseOntology/HumanDiseaseOntology/master/src/ontology/doid-merged.owl -o data
  python ontofetch.py https://raw.githubusercontent.com/obophenotype/human-phenotype-ontology/master/hp.owl -o data -r http://purl.obolibrary.org/obo/UPHENO_0001001
  python ontofetch.py https://raw.githubusercontent.com/AgriculturalSemantics/agro/master/agro.owl -o data
  python ontofetch.py https://raw.githubusercontent.com/arpcard/aro/master/aro.owl -o test -r http://purl.obolibrary.org/obo/ARO_1000001
  python ontofetch.py https://raw.githubusercontent.com/EBISPOT/ancestro/master/hancestro.owl -o test -r http://purl.obolibrary.org/obo/HANCESTRO_0004
  python ontofetch.py https://raw.githubusercontent.com/pato-ontology/pato/master/pato.owl -o test -r http://purl.obolibrary.org/obo/PATO_0000001
  python ontofetch.py https://raw.githubusercontent.com/PopulationAndCommunityOntology/pco/master/pco.owl -o test

  Note this misses 2 branches:
  python ontofetch.py https://raw.githubusercontent.com/Planteome/plant-ontology/master/po.owl -o test -r http://purl.obolibrary.org/obo/PO_0025131
  python ontofetch.py https://raw.githubusercontent.com/CLO-ontology/CLO/master/src/ontology/clo_merged.owl -o test -r http://purl.obolibrary.org/obo/BFO_0000001
  python ontofetch.py http://purl.obolibrary.org/obo/cmo.owl -o test -r http://purl.obolibrary.org/obo/CMO_0000000
  python ontofetch.py https://raw.githubusercontent.com/evidenceontology/evidenceontology/master/eco.owl -o test -r http://purl.obolibrary.org/obo/BFO_0000001

******************************************************************************/

const LABEL_MAX_LINE_LENGTH = 30  // label text will be cut after first word ending before this character limit.
const LABEL_RE = new RegExp('(?![^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '}$)([^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '})\\s', 'g');
const GRAPH_BACKGROUND_COLOR = 0x302020
const GRAPH_DIMENSIONS = 3
// For BFO layout: -2000, .01, .011
const GRAPH_CHARGE_STRENGTH = -600 // -2000 for BFO
const GRAPH_VELOCITY_DECAY = 0.4 // default 0.4
const GRAPH_ALPHA_DECAY = 0.0228 // default 0.0228
const GRAPH_COOLDOWN = 20000 // default 15000
const GRAPH_PARTICLES = 1 // animation that shows directionality of links
const ONTOLOGY_LOOKUP_URL = 'http://purl.obolibrary.org/obo/'
const CAMERA_DISTANCE = 300

const elem = document.getElementById("3d-graph");

// Selection list of all node labels allows user to zoom in on one
document.getElementById("ontology").onchange = function(item){
  loadData(this.value, do_graph)
}

// Selection list of all node labels allows user to zoom in on one
document.getElementById("label_search").onchange = function(item){
  if (this.value != '')
    node_focus(top.dataLookup[this.value])
}


function loadData(URL, callback) {
  var xhttp = new XMLHttpRequest();
  xhttp.overrideMimeType("application/json");
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      callback( JSON.parse(this.responseText) )
    }
  }
  xhttp.open("GET", URL, true);
  xhttp.send(null);
};


function do_graph(rawData) {
  /*
  Main function for loading a new data file and rendering a graph of it.

  */
  top.Graph = init()

  top.dataLookup = {}
  var data = {nodes:[], links:[]}

  // Case for GEEM ontofetch.py ontology term specification table:
  if ('specifications' in rawData) {
    for (var item in rawData.specifications) {
      node = rawData.specifications[item]
      prefix = node.id.split(':')[0]
      if (prefix in colorMapping)
        node.color = colorMapping[prefix].code
      else {
        console.log ('Missing color for ontology prefix ' + prefix + ' in ' + node.id)
        node.color = 'red'
      }
      data.nodes.push(node)
    }

    for (var item in rawData.specifications) {
      node = rawData.specifications[item]
      parent_id = node.parent_id
      if (parent_id in rawData.specifications) {
        data.links.push({source:parent_id, target: node.id, color: node.color})
      }

      // ESTABLISH "LIGHT" LINKS TO OTHER PARENTS?
    }
  }
  else {
    data = rawData
  }

  data.nodes.sort(function(a,b) {return (a.label === undefined || a.label.localeCompare(b.label))})

  const label_search = document.getElementById("label_search")
  for (var item in data.nodes) {
    top.dataLookup[data.nodes[item].id] = data.nodes[item]

    var option = document.createElement("option");
    option.text = data.nodes[item].label;
    option.value = data.nodes[item].id
    label_search.add(option);

  }
  
  //function updateGeometries() {
  //  Graph.nodeRelSize(4); // trigger update of 3d objects in scene
  //}

  // Too much overhead for particles on larger graphs 
  Graph.linkDirectionalParticles( data.nodes.length > 4000 ? 0 : 1)

  // Spread nodes a little wider
  Graph.d3Force('charge').strength(GRAPH_CHARGE_STRENGTH);

  // Getter/setter for the simulation intensity decay parameter, only 
  // applicable if using the d3 simulation engine.  
  //Graph.d3AlphaDecay(GRAPH_ALPHA_DECAY) // default 0.0228
  
  // Getter/setter for the nodes' velocity decay that simulates the medium
  // resistance, only applicable if using the d3 simulation engine.
  //Graph.d3VelocityDecay(GRAPH_VELOCITY_DECAY)  // default 0.4

  Graph.graphData(data);

  // Navigate to root BFO node if there is one. Slight delay to enable
  // engine to create reference points.  Ideally event for this.
  if('BFO:0000001' in top.dataLookup) {
    setTimeout(function(){node_focus(top.dataLookup['BFO:0000001']) }, 2000)
  }

}



function init() {
  return ForceGraph3D()(document.getElementById('3d-graph'))
    .width(elem.offsetWidth)
    .warmupTicks(4)
    .cooldownTime(GRAPH_COOLDOWN)
    //.cooldownTicks(300)
    .backgroundColor(GRAPH_BACKGROUND_COLOR)
    .numDimensions(GRAPH_DIMENSIONS)
    // Using D3 engine so we can pin nodes via { id: 0, fx: 0, fy: 0, fz: 0 }
    .forceEngine('d3') 

    .linkOpacity(1)
    .linkDirectionalParticles(GRAPH_PARTICLES)
    .linkDirectionalParticleWidth(2)
    //.nodeAutoColorBy('color')
    // Why does link color not always correspond to d.target? BECAUSE d.target is an object!
    /*.linkAutoColorBy(d => some bug})*/
    
    .nodeLabel(node => `<div>${node.label}<br/><span class="tooltip-id">${node.id}</span></div>`) // Text shown on mouseover. //${node.definition}
    //.nodeColor(node => highlightNodes.indexOf(node) === -1 ? 'rgba(0,255,255,0.6)' : 'rgb(255,0,0,1)')
    .onNodeHover(node => elem.style.cursor = node ? 'pointer' : null)
    .onLinkClick(link => {node_focus(link.target)})
    /*
    .onLinkHover(link => {
      // no state change
      if (highlightLink === link) return;
      highlightLink = link;
      highlightNodes = link ? [link.source, link.target] : [];
      updateGeometries();
    })
    */
    .onNodeClick(node => node_focus(node))

    .nodeThreeObject(node => {
      // Displays semi-sphere, then overlays with label text

      var nodeRadius = 5;

      switch (node.id) {
         case 'owl:Thing':
          nodeRadius = 30; node.fx = 0; node.fy = 0; node.fz = 1100; break;
      }
      const layout_node = layout[node.id]
      if (layout_node) {
        nodeRadius = 20;
        node.fz = 1000;
        node.fx = layout_node.x;
        node.fy = layout_node.y;
      }

      //var geometry = new THREE.CircleGeometry(nodeRadius); // Doesn't provide 3d orientation
      var geometry = new THREE.SphereGeometry(nodeRadius, 8, 6, 0, Math.PI);
      var material = new THREE.MeshBasicMaterial( { color: node.color } );
      var circle = new THREE.Mesh( geometry, material );
      circle.position.set( 0, 0, 0 );

      if (node.label) {
        // label converted to first few words ...
        var label = node.label.replace(LABEL_RE, '$1*');
        var ptr = label.indexOf('*')
        if (ptr > 0) label = label.split('*',1)[0] + ' ...'
      }
      else
        var label = node.id

      const sprite = new SpriteText(label);
      sprite.color = node.color;
      sprite.textHeight = 8;
      sprite.fontSize = 20;
      sprite.position.set( 0, -10, nodeRadius + 2 );

      var height = sprite._canvas.height
      var width = sprite._canvas.width

      // HACK for background sized to text; using 2nd sprite as it always faces camera.
      var spriteMap = new THREE.TextureLoader().load( "img/whitebox.png" );
      var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0x808080 , opacity : 0.5} );
      const sprite2 = new THREE.Sprite( spriteMaterial );
      sprite2.position.set( 0, -10, nodeRadius + 1 );
      sprite2.scale.set(width/2, 10 , 1);

      var group = new THREE.Group();
      group.add( circle );
      group.add( sprite2 );
      group.add( sprite );

      return group;
    })
    .onEngineStop(stuff => {

      // For BFO graph, create a string version of layout so that other
      // ontologies can be layed out under it.
      /*
      var nodes = []
      for (item in top.dataLookup) {
        var node = top.dataLookup[item];
        nodes.push({"id":node.id, "x":parseInt(node.x), "y":parseInt(node.y)})
      }
      console.log(JSON.stringify(nodes, null, 4))
      */
    })
  // End Graph setup ***********
}


function lookup_url(term_id, label) {
  if (!label)
    label = top.dataLookup[term_id].label
  return  `<a href="${ONTOLOGY_LOOKUP_URL}${term_id.replace(':','_')}" target="term">${label}</a>`
}


function get_term_id_urls(parent_list) {
  var parent_uris = []
  if (parent_list) {
    for (ptr in parent_list) {
      parent_id = parent_list[ptr]
      var parent = top.dataLookup[parent_id]
      if (parent) {
        if (parent.label)
          parent_label = parent.label
        else
          parent_label = parent_id
        parent_uris.push(`<span class="focus" onclick="node_focus(top.dataLookup['${parent_id}'])">${parent_label}</span>`)
      }
      else {
        parent_uris.push('unrecognized: ' + parent_id)
      }
    }
  }
  return parent_uris.length ? parent_uris.join(', ') : null
}


function node_focus(node) {
  if (!node) {alert("Problem, node doesn't exist"); return}

  if (node.parent_id)
    var parents = [node.parent_id]
  else
    var parents = ['(none)']
  if (node.other_parents)
    parents.push(node.other_parents)

  parents = get_term_id_urls(parents)

  document.getElementById("term_id").innerHTML = lookup_url(node.id, node.id) + (node.deprecated ? '<span class="deprecated">(deprecated)</span>' : '');
  document.getElementById("label").innerHTML = node.label || '<span class="placeholder">label</span>';
  document.getElementById("definition").innerHTML = node.definition || '<span class="placeholder">definition</span>';
  document.getElementById("ui_label").innerHTML = node.ui_label || '<span class="placeholder">UI label</span>';
  document.getElementById("ui_definition").innerHTML = node.ui_definition || '<span class="placeholder">UI definition</span>'; 
  document.getElementById("synonyms").innerHTML = node.synonyms || '<span class="placeholder">synonyms</span>';
  document.getElementById("parents").innerHTML = parents || '<span class="placeholder">parents</span>';

  // Aim at node from z dimension
  Graph.cameraPosition(
    { x: node.x, y: node.y, z: node.z + CAMERA_DISTANCE}, // new position
    node, // lookAt ({ x, y, z })
    3000  // 3 second transition duration
  )
}

// MUST BE X11 colors for THREE.js
var colorTable = [
      
  {"color":"AntiqueWhite",  "code":"#FAEBD7"},
  {"color":"Aquamarine",  "code":"#7FFFD4"},
  {"color":"Blue",  "code":"#0000FF"},
  {"color":"BlueViolet",  "code":"#8A2BE2"},
  {"color":"Brown", "code":"#A52A2A"},
  {"color":"CadetBlue", "code":"#5F9EA0"},
  {"color":"Chartreuse",  "code":"#7FFF00"},
  {"color":"Chocolate", "code":"#D2691E"},
  {"color":"Coral", "code":"#FF7F50"},
  {"color":"CornflowerBlue",  "code":"#6495ED"},
  {"color":"Crimson", "code":"#DC143C"},
  {"color":"Cyan",  "code":"#00FFFF"},
  {"color":"DarkGoldenrod", "code":"#B8860B"},
  {"color":"DarkGray",  "code":"#A9A9A9"},
  {"color":"DarkKhaki", "code":"#BDB76B"},
  {"color":"DarkOliveGreen",  "code":"#556B2F"},
  {"color":"DarkOrange",  "code":"#FF8C00"},
  {"color":"DarkOrchid",  "code":"#9932CC"},
  {"color":"DarkRed", "code":"#8B0000"},
  {"color":"DarkSeaGreen",  "code":"#8FBC8F"},
  {"color":"DarkTurquoise", "code":"#00CED1"},
  {"color":"DeepPink",  "code":"#FF1493"},
  {"color":"DeepSkyBlue", "code":"#00BFFF"},
  {"color":"DodgerBlue",  "code":"#1E90FF"},
  {"color":"FireBrick", "code":"#B22222"},
  {"color":"Gold",  "code":"#FFD700"},
  {"color":"Goldenrod", "code":"#DAA520"},
  {"color":"Green", "code":"#008000"},
  {"color":"GreenYellow", "code":"#ADFF2F"},
  {"color":"HotPink", "code":"#FF69B4"},
  {"color":"IndianRed", "code":"#CD5C5C"},
  {"color":"Ivory", "code":"#FFFFF0"},
  {"color":"Khaki", "code":"#F0E68C"},
  {"color":"Lavender",  "code":"#E6E6FA"},
  {"color":"LawnGreen", "code":"#7CFC00"},
  {"color":"LemonChiffon",  "code":"#FFFACD"},
  {"color":"LightCyan", "code":"#E0FFFF"},
  {"color":"LightGoldenrodYellow",  "code":"#FAFAD2"},
  {"color":"LightGreen",  "code":"#90EE90"},
  {"color":"LightPink", "code":"#FFB6C1"},
  {"color":"LightSalmon", "code":"#FFA07A"},
  {"color":"LightSeaGreen", "code":"#20B2AA"},
  {"color":"LightSteelBlue",  "code":"#B0C4DE"},
  {"color":"Lime",  "code":"#00FF00"},
  {"color":"LimeGreen", "code":"#32CD32"},
  {"color":"Magenta", "code":"#FF00FF"},
  {"color":"Maroon",  "code":"#800000"},
  {"color":"MediumAquamarine",  "code":"#66CDAA"},
  {"color":"MediumPurple",  "code":"#9370DB"},
  {"color":"MediumSeaGreen",  "code":"#3CB371"},
  {"color":"MediumSlateBlue", "code":"#7B68EE"},
  {"color":"MediumSpringGreen", "code":"#00FA9A"},
  {"color":"MediumTurquoise", "code":"#48D1CC"},
  {"color":"NavajoWhite", "code":"#FFDEAD"},
  {"color":"Olive", "code":"#808000"},
  {"color":"OliveDrab", "code":"#6B8E23"},
  {"color":"Orange",  "code":"#FFA500"},
  {"color":"OrangeRed", "code":"#FF4500"},
  {"color":"Orchid",  "code":"#DA70D6"},
  {"color":"PaleGoldenrod", "code":"#EEE8AA"},
  {"color":"PaleGreen", "code":"#98FB98"},
  {"color":"PaleTurquoise", "code":"#AFEEEE"},
  {"color":"PaleVioletRed", "code":"#DB7093"},
  {"color":"PeachPuff", "code":"#FFDAB9"},
  {"color":"Peru",  "code":"#CD853F"},
  {"color":"Pink",  "code":"#FFC0CB"},
  {"color":"PowderBlue",  "code":"#B0E0E6"},
  {"color":"Purple",  "code":"#800080"},
  {"color":"Red", "code":"#FF0000"},
  {"color":"RosyBrown", "code":"#BC8F8F"},
  {"color":"RoyalBlue", "code":"#4169E1"},
  {"color":"Salmon",  "code":"#FA8072"},
  {"color":"SandyBrown",  "code":"#F4A460"},
  {"color":"SeaGreen",  "code":"#2E8B57"},
  {"color":"Sienna",  "code":"#A0522D"},
  {"color":"Silver",  "code":"#C0C0C0"},
  {"color":"SkyBlue", "code":"#87CEEB"},
  {"color":"SpringGreen", "code":"#00FF7F"},
  {"color":"SteelBlue", "code":"#4682B4"},
  {"color":"Tan", "code":"#D2B48C"},
  {"color":"Teal",  "code":"#008080"},
  {"color":"Tomato",  "code":"#FF6347"},
  {"color":"Turquoise", "code":"#40E0D0"},
  {"color":"Violet",  "code":"#EE82EE"},
  {"color":"Wheat", "code":"#F5DEB3"},
  {"color":"WhiteSmoke",  "code":"#F5F5F5"},
  {"color":"Yellow",  "code":"#FFFF00"},
  {"color":"YellowGreen", "code":"#9ACD32"}
]

// https://github.com/OBOFoundry/OBOFoundry.github.io/blob/master/registry/obo_context.jsonld
var colorMapping = {
  "owl":  {"color":"Gold",  code:"#FFD700"},
  "oboInOwl": {"color":"Gold",  code:"#FFD700"},

  "AAO":  {"color":"AntiqueWhite",  code:"#FAEBD7"},
  "ADW":  {"color":"Aquamarine",  code:"#7FFFD4"},
  "AEO":  {"color":"Blue",  code:"#0000FF"},
  "AERO": {"color":"BlueViolet",  code:"#8A2BE2"},
  "AGRO": {"color":"Cyan",  code:"#00FFFF"},
  "APO":  {"color":"CadetBlue", code:"#5F9EA0"},
  "ARO":  {"color":"Chartreuse",  code:"#7FFF00"},
  "ATO":  {"color":"Chocolate", code:"#D2691E"},
  "BCGO": {"color":"Coral", code:"#FF7F50"},
  "BCO":  {"color":"CornflowerBlue",  code:"#6495ED"},
  "BFO":  {"color":"Goldenrod", code:"#DAA520"},
  "BILA": {"color":"Cyan",  code:"#00FFFF"},
  "BOOTSTREP":  {"color":"DarkGoldenrod", code:"#B8860B"},
  "BSPO": {"color":"DarkGray",  code:"#A9A9A9"},
  "BTO":  {"color":"DarkKhaki", code:"#BDB76B"},
  "CARO": {"color":"Khaki", code:"#F0E68C"},
  "CDAO": {"color":"DarkOrange",  code:"#FF8C00"},
  "CEPH": {"color":"DarkOrchid",  code:"#9932CC"},
  "CHEBI":  {"color":"OrangeRed", code:"#FF4500"},
  "CHEMINF":  {"color":"DarkSeaGreen",  code:"#8FBC8F"},
  "CHMO": {"color":"DarkTurquoise", code:"#00CED1"},
  "CIO":  {"color":"DeepPink",  code:"#FF1493"},
  "CL": {"color":"DeepSkyBlue", code:"#00BFFF"},
  "CLO":  {"color":"DodgerBlue",  code:"#1E90FF"},
  "CMF":  {"color":"FireBrick", code:"#B22222"},
  "CMO":  {"color":"Gold",  code:"#FFD700"},
  "CRO":  {"color":"Goldenrod", code:"#DAA520"},
  "CTENO":  {"color":"Green", code:"#008000"},
  "CVDO": {"color":"GreenYellow", code:"#ADFF2F"},
  "DC_CL":  {"color":"HotPink", code:"#FF69B4"},
  "DDANAT": {"color":"IndianRed", code:"#CD5C5C"},
  "DDPHENO":  {"color":"Ivory", code:"#FFFFF0"},
  "DIDEO":  {"color":"Khaki", code:"#F0E68C"},
  "DINTO":  {"color":"Lavender",  code:"#E6E6FA"},
  "DOID": {"color":"LawnGreen", code:"#7CFC00"},
  "DRON": {"color":"LemonChiffon",  code:"#FFFACD"},
  "DUO":  {"color":"LightCyan", code:"#E0FFFF"},
  "ECO":  {"color":"LightGoldenrodYellow",  code:"#FAFAD2"},
  "ECOCORE":  {"color":"LightGreen",  code:"#90EE90"},
  "EHDA": {"color":"LightPink", code:"#FFB6C1"},
  "EHDAA":  {"color":"LightSalmon", code:"#FFA07A"},
  "EHDAA2": {"color":"LightSeaGreen", code:"#20B2AA"},
  "EMAP": {"color":"LightSteelBlue",  code:"#B0C4DE"},
  "EMAPA":  {"color":"Lime",  code:"#00FF00"},
  "ENVO": {"color":"LimeGreen", code:"#32CD32"},
  "EO": {"color":"Magenta", code:"#FF00FF"},
  "EPO":  {"color":"Maroon",  code:"#800000"},
  "ERO":  {"color":"MediumAquamarine",  code:"#66CDAA"},
  "EUPATH": {"color":"MediumPurple",  code:"#9370DB"},
  "EV": {"color":"MediumSeaGreen",  code:"#3CB371"},
  "EXO":  {"color":"MediumSlateBlue", code:"#7B68EE"},
  "FAO":  {"color":"MediumSpringGreen", code:"#00FA9A"},
  "FBSP": {"color":"MediumTurquoise", code:"#48D1CC"},
  "FBbi": {"color":"NavajoWhite", code:"#FFDEAD"},
  "FBbt": {"color":"Olive", code:"#808000"},
  "FBcv": {"color":"OliveDrab", code:"#6B8E23"},
  "FBdv": {"color":"Orange",  code:"#FFA500"},
  "FIX":  {"color":"OrangeRed", code:"#FF4500"},
  "FLOPO":  {"color":"Orchid",  code:"#DA70D6"},
  "FLU":  {"color":"PaleGoldenrod", code:"#EEE8AA"},
  "FMA":  {"color":"PaleGreen", code:"#98FB98"},
  "FOODON": {"color":"PaleTurquoise", code:"#AFEEEE"},
  "FYPO": {"color":"PaleVioletRed", code:"#DB7093"},
  "GAZ":  {"color":"PeachPuff", code:"#FFDAB9"},
  "GENEPIO":  {"color":"Peru",  code:"#CD853F"},
  "GENO": {"color":"Pink",  code:"#FFC0CB"},
  "GEO":  {"color":"PowderBlue",  code:"#B0E0E6"},
  "GO": {"color":"PowderBlue",  code:"#B0E0E6"},
  "GRO":  {"color":"Red", code:"#FF0000"},
  "HABRONATTUS":  {"color":"RosyBrown", code:"#BC8F8F"},
  "HANCESTRO":  {"color":"SandyBrown",  code:"#F4A460"},
  "HAO":  {"color":"Salmon",  code:"#FA8072"},
  "HOM":  {"color":"SandyBrown",  code:"#F4A460"},
  "HP": {"color":"PeachPuff", code:"#FFDAB9"},
  "HSAPDV": {"color":"Sienna",  code:"#A0522D"},
  "IAO":  {"color":"Silver",  code:"#C0C0C0"},
  "ICO":  {"color":"SkyBlue", code:"#87CEEB"},
  "IDO":  {"color":"SpringGreen", code:"#00FF7F"},
  "IDOMAL": {"color":"SteelBlue", code:"#4682B4"},
  "IEV":  {"color":"Tan", code:"#D2B48C"},
  "IMR":  {"color":"Teal",  code:"#008080"},
  "INO":  {"color":"Tomato",  code:"#FF6347"},
  "IPR":  {"color":"Turquoise", code:"#40E0D0"},
  "KISAO":  {"color":"Violet",  code:"#EE82EE"},
  "LIPRO":  {"color":"Wheat", code:"#F5DEB3"},
  "LOGGERHEAD": {"color":"WhiteSmoke",  code:"#F5F5F5"},
  "MA": {"color":"Yellow",  code:"#FFFF00"},
  "MAMO": {"color":"YellowGreen", code:"#9ACD32"},
  "MAO":  {"color":"AntiqueWhite",  code:"#FAEBD7"},
  "MAT":  {"color":"Aquamarine",  code:"#7FFFD4"},
  "MF": {"color":"Blue",  code:"#0000FF"},
  "MFMO": {"color":"BlueViolet",  code:"#8A2BE2"},
  "MFO":  {"color":"Brown", code:"#A52A2A"},
  "MFOEM":  {"color":"CadetBlue", code:"#5F9EA0"},
  "MFOMD":  {"color":"Chartreuse",  code:"#7FFF00"},
  "MI": {"color":"Chocolate", code:"#D2691E"},
  "MIAPA":  {"color":"Coral", code:"#FF7F50"},
  "MICRO":  {"color":"CornflowerBlue",  code:"#6495ED"},
  "MIRNAO": {"color":"Crimson", code:"#DC143C"},
  "MIRO": {"color":"Cyan",  code:"#00FFFF"},
  "MMO":  {"color":"DarkGoldenrod", code:"#B8860B"},
  "MMUSDV": {"color":"DarkGray",  code:"#A9A9A9"},
  "MO": {"color":"DarkKhaki", code:"#BDB76B"},
  "MOD":  {"color":"DarkOliveGreen",  code:"#556B2F"},
  "MONDO":  {"color":"DarkOrange",  code:"#FF8C00"},
  "MOP":  {"color":"DarkOrchid",  code:"#9932CC"},
  "MP": {"color":"DarkRed", code:"#8B0000"},
  "MPATH":  {"color":"DarkSeaGreen",  code:"#8FBC8F"},
  "MPIO": {"color":"DarkTurquoise", code:"#00CED1"},
  "MRO":  {"color":"DeepPink",  code:"#FF1493"},
  "MS": {"color":"DeepSkyBlue", code:"#00BFFF"},
  "NBO":  {"color":"DodgerBlue",  code:"#1E90FF"},
  "NCBITaxon":  {"color":"Ivory", code:"#FFFFF0"},
  "NCIT": {"color":"Gold",  code:"#FFD700"},
  "NCRO": {"color":"Goldenrod", code:"#DAA520"},
  "NIF_CELL": {"color":"Green", code:"#008000"},
  "NIF_DYSFUNCTION":  {"color":"GreenYellow", code:"#ADFF2F"},
  "NIF_GROSSANATOMY": {"color":"HotPink", code:"#FF69B4"},
  "NMR":  {"color":"IndianRed", code:"#CD5C5C"},
  "OAE":  {"color":"Ivory", code:"#FFFFF0"},
  "OARCS":  {"color":"Khaki", code:"#F0E68C"},
  "OBA":  {"color":"Lavender",  code:"#E6E6FA"},
  "OBCS": {"color":"LawnGreen", code:"#7CFC00"},
  "OBI":  {"color":"LemonChiffon",  code:"#FFFACD"},
  "OBIB": {"color":"LightCyan", code:"#E0FFFF"},
  "OBO_REL":  {"color":"LightGoldenrodYellow",  code:"#FAFAD2"},
  "OGG":  {"color":"LightGreen",  code:"#90EE90"},
  "OGI":  {"color":"LightPink", code:"#FFB6C1"},
  "OGMS": {"color":"LightSalmon", code:"#FFA07A"},
  "OGSF": {"color":"LightSeaGreen", code:"#20B2AA"},
  "OHD":  {"color":"LightSteelBlue",  code:"#B0C4DE"},
  "OHMI": {"color":"Lime",  code:"#00FF00"},
  "OLATDV": {"color":"LimeGreen", code:"#32CD32"},
  "OMIABIS":  {"color":"Magenta", code:"#FF00FF"},
  "OMIT": {"color":"Maroon",  code:"#800000"},
  "OMP":  {"color":"MediumAquamarine",  code:"#66CDAA"},
  "OMRSE":  {"color":"MediumPurple",  code:"#9370DB"},
  "ONTONEO":  {"color":"MediumSeaGreen",  code:"#3CB371"},
  "OOSTT":  {"color":"MediumSlateBlue", code:"#7B68EE"},
  "OPL":  {"color":"MediumSpringGreen", code:"#00FA9A"},
  "OVAE": {"color":"MediumTurquoise", code:"#48D1CC"},
  "PAO":  {"color":"MediumTurquoise", code:"#48D1CC"},
  "PATO": {"color":"PaleVioletRed", code:"#DB7093"},
  "PCO":  {"color":"Orange",  code:"#FFA500"},
  "PDRO": {"color":"Orange",  code:"#FFA500"},
  "PDUMDV": {"color":"OrangeRed", code:"#FF4500"},
  "PD_ST":  {"color":"Orchid",  code:"#DA70D6"},
  "PECO": {"color":"PaleGoldenrod", code:"#EEE8AA"},
  "PGDSO":  {"color":"PaleGreen", code:"#98FB98"},
  "PLANA":  {"color":"PaleTurquoise", code:"#AFEEEE"},
  "PLO":  {"color":"PaleVioletRed", code:"#DB7093"},
  "PO": {"color":"PeachPuff", code:"#FFDAB9"},
  "PORO": {"color":"Peru",  code:"#CD853F"},
  "PPO":  {"color":"Pink",  code:"#FFC0CB"},
  "PR": {"color":"PowderBlue",  code:"#B0E0E6"},
  "PROPREO":  {"color":"Purple",  code:"#800080"},
  "PW": {"color":"Red", code:"#FF0000"},
  "RESID":  {"color":"RosyBrown", code:"#BC8F8F"},
  "REX":  {"color":"RoyalBlue", code:"#4169E1"},
  
  "REO":  {"color":"RoyalBlue", code:"#4169E1"}, //???

  "RNAO": {"color":"Salmon",  code:"#FA8072"},
  "RO": {"color":"SandyBrown",  code:"#F4A460"},
  "RS": {"color":"SeaGreen",  code:"#2E8B57"},
  "RXNO": {"color":"Sienna",  code:"#A0522D"},
  "SAO":  {"color":"Silver",  code:"#C0C0C0"},
  "SBO":  {"color":"SkyBlue", code:"#87CEEB"},
  "SEP":  {"color":"SpringGreen", code:"#00FF7F"},
  "SEPIO":  {"color":"SteelBlue", code:"#4682B4"},
  "SIBO": {"color":"Tan", code:"#D2B48C"},
  "SO": {"color":"Teal",  code:"#008080"},
  "SOPHARM":  {"color":"Tomato",  code:"#FF6347"},
  "SPD":  {"color":"Turquoise", code:"#40E0D0"},
  "STATO":  {"color":"Violet",  code:"#EE82EE"},
  "SWO":  {"color":"Wheat", code:"#F5DEB3"},
  "SYMP": {"color":"WhiteSmoke",  code:"#F5F5F5"},
  "TADS": {"color":"Yellow",  code:"#FFFF00"},
  "TAHE": {"color":"YellowGreen", code:"#9ACD32"},
  "TAHH": {"color":"AntiqueWhite",  code:"#FAEBD7"},
  "TAO":  {"color":"Aquamarine",  code:"#7FFFD4"},
  "TAXRANK":  {"color":"Blue",  code:"#0000FF"},
  "TGMA": {"color":"BlueViolet",  code:"#8A2BE2"},
  "TO": {"color":"Brown", code:"#A52A2A"},
  "TRANS":  {"color":"CadetBlue", code:"#5F9EA0"},
  "TTO":  {"color":"Chartreuse",  code:"#7FFF00"},
  "UBERON": {"color":"Chocolate", code:"#D2691E"},
  "UO": {"color":"Coral", code:"#FF7F50"},
  "UPHENO": {"color":"CornflowerBlue",  code:"#6495ED"},
  "VARIO":  {"color":"Crimson", code:"#DC143C"},
  "VHOG": {"color":"Cyan",  code:"#00FFFF"},
  "VO": {"color":"DarkGoldenrod", code:"#B8860B"},
  "VSAO": {"color":"DarkGray",  code:"#A9A9A9"},
  "VT": {"color":"DarkKhaki", code:"#BDB76B"},
  "VTO":  {"color":"DarkOliveGreen",  code:"#556B2F"},
  "WBBT": {"color":"DarkOrange",  code:"#FF8C00"},
  "WBLS": {"color":"DarkOrchid",  code:"#9932CC"},
  "WBPhenotype":  {"color":"DarkRed", code:"#8B0000"},
  "XAO":  {"color":"DarkSeaGreen",  code:"#8FBC8F"},
  "XCO":  {"color":"DarkTurquoise", code:"#00CED1"},
  "XL": {"color":"DeepPink",  code:"#FF1493"},
  "YPO":  {"color":"DeepSkyBlue", code:"#00BFFF"},
  "ZEA":  {"color":"DodgerBlue",  code:"#1E90FF"},
  "ZECO": {"color":"FireBrick", code:"#B22222"},
  "ZFA":  {"color":"Gold",  code:"#FFD700"},
  "ZFS":  {"color":"YellowGreen", code:"#9ACD32"}
}

layout = {
  "BFO:0000002": { "x": -95, "y": -224 },
  "BFO:0000140": { "x": 833, "y": 265},
  "BFO:0000016": {"x": 177, "y": -1402},
  "BFO:0000024": {"x": 34, "y": 571},
  "BFO:0000034": {"x": 201, "y": -1518},
  "BFO:0000031": {"x": -93, "y": -305},
  "BFO:0000182": {"x": -1098, "y": 274},
  "BFO:0000141": {"x": 553, "y": 362},
  "BFO:0000004": {"x": 146, "y": 193},
  "BFO:0000040": {"x": -3, "y": 475},
  "BFO:0000030": {"x": -102, "y": 515},
  "BFO:0000027": {"x": -55, "y": 600},
  "BFO:0000003": {"x": -841, "y": 22},
  "BFO:0000142": {"x": 932, "y": 196},
  "BFO:0000026": {"x": 857, "y": 806},
  "BFO:0000038": {"x": -1245, "y": -165},
  "BFO:0000015": {"x": -995, "y": 220},
  "BFO:0000035": {"x": -918, "y": -10},
  "BFO:0000144": {"x": -1006, "y": 327},
  "BFO:0000019": {"x": 268, "y": -845},
  "BFO:0000017": {"x": 135, "y": -1156},
  "BFO:0000145": {"x": 373, "y": -896},
  "BFO:0000023": {"x": 166, "y": -1238},
  "BFO:0000029": {"x": 537, "y": 435},
  "BFO:0000006": {"x": 755, "y": 724},
  "BFO:0000011": {"x": -817, "y": -60},
  "BFO:0000020": {"x": 96, "y": -747},
  "BFO:0000008": {"x": -1153, "y": -89},
  "BFO:0000028": {"x": 858, "y": 716},
  "BFO:0000146": {"x": 937, "y": 295},
  "BFO:0000009": {"x": 782, "y": 853},
  "BFO:0000147": {"x": 833, "y": 169},
  "BFO:0000001": {"x": -486, "y": -116},
  "BFO:0000018": {"x": 700, "y": 812},
  "BFO:0000148": {"x": -1269, "y": -64}
}
