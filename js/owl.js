/* Dynamically load OWL file from a web URL, parse its subclasses, labels,
  definitions, synonyms, etc. 
  Due to browser domain security this can't currently access 3rd party urls if
  served up from a localhost IP. So one would use a local test owl file url
  such as http://localhost:8000/data/bfo.owl
*/

resource = {
  '@context': {
    'xsd': 'http://www.w3.org/2001/XMLSchema#',
    'dc-terms': 'http://purl.org/dc/elements/1.1/',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'owl': 'http://www.w3.org/2002/07/owl#',
    'oboInOwl': 'http://www.geneontology.org/formats/oboInOwl#',
    'IAO': 'http://purl.obolibrary.org/obo/IAO_',
    'BFO': 'http://purl.obolibrary.org/obo/BFO_'
  },
  'reverse_c': {},
  'term': {},
  'metadata': {}
}


// Provides rdflib URL for given ontology term [prefix]:[id]
function rdflib_url (item) {
  const binding = item.split(':')
  // passing a parameter to returned function.
  return $rdf.Namespace(resource['@context'][binding[0]])(binding[1])
}



function process_ontology(store) {
  resource.term = {}
  // Compose reverse lookup table to quickly match uri prefix.
  Object.keys(resource['@context']).forEach(function (item) {
    resource.reverse_c[resource['@context'][item]] = item
  })

  //Define constants
  const root = rdflib_url("owl:Thing");
  const subClassOf = rdflib_url("rdfs:subClassOf"); // http://www.w3.org/2002/07/owl#subClassOf

  // These are stored as data property values. For now, label,
  // definition etc. are not multilingual. 
  // ISSUE: need language variants.
  const singular_annotation = {
    label: rdflib_url("rdfs:label"),
    definition: rdflib_url('IAO:0000115'),
    deprecated: rdflib_url('owl:deprecated')
  }

  // Can expect several properties/annotations of same kind added to a term, 
  // so store them
  const multi_property = {
    subClassOf: rdflib_url('rdfs:subClassOf'),
    hasSynonym: rdflib_url('oboInOwl:hasSynonym'),
    hasBroadSynonym: rdflib_url('oboInOwl:hasBroadSynonym'),
    hasNarrowSynonym: rdflib_url('oboInOwl:hasNarrowSynonym'),
    hasExactSynonym: rdflib_url('oboInOwl:hasExactSynonym')
    // ... add other synonyms here.
  }

  // Assumes only one branch
  var focus = store.any(undefined, multi_property.subClassOf, undefined)
  while (focus) {
    var top_node = focus
    focus = store.any(focus, multi_property.subClassOf)
  }
  console.log("Found owl root: " + top_node)

  // Begin search with root node
  stack = []
  stack_done = {}

  // Push all likely top level ontology terms.
  // (Future: Alternately, identify all top level terms via query.)
  stack.push(top_node)
  stack.push(store.sym(rdflib_url("owl:Thing") ))
  //stack.push(store.sym(rdflib_url("BFO:0000001")) )
  i=0;
  while (stack.length) {
    subject = stack.shift();
    // Prevents double visits to polyhierarchic nodes
    stack_done[subject] = true;

    // Add all subclasses to stack
    store.each(undefined, subClassOf, subject).forEach(
      function(subclass) {
        if (!stack_done[subclass])
          stack.push(subclass)
      }
    );

    // var t_label =       store.each(item, label)
    // console.log('label', t_label[0].value )
    //const t_label: get_value(store, item, label)
    var node = {
      'id': namespace(resource, subject.uri),
    };

    Object.keys(singular_annotation).forEach(function(property) {
      get_value(resource, node, store, subject, singular_annotation[property])
    });

    set_node_label(node) // adds shortened label

    Object.keys(multi_property).forEach(function(property) {
      get_properties(resource, node, store, subject, multi_property[property])
    });

    // Shortcut handle for primary parent.  Algorithm could be developed to
    // choose best one.
    if (node['rdfs:subClassOf'])
      node.parent_id = node['rdfs:subClassOf'][0];

    resource.term[node.id] = node;
    // Testing: cut loop short
    if (i == 3) {
     //break
    }
    i++
  }

  // console.log(resource);
  return resource
}

const splitAt = index => x => [x.slice(0, index), x.slice(index)]
// e.g.     const splited = splitAt(split_ptr)(uri);

function namespace (resource, uri) {
  if (uri && uri.indexOf('http') == 0) {

    var separator;
    var prefix;

    const separators = ['#','_','/'];
    for (ptr in separators) {
      separator = separators[ptr]
      var split_ptr = uri.lastIndexOf(separator);
      if (split_ptr > 0) {
        break;
      }
    }

    const path = uri.slice(0, split_ptr); // e.g. http://purl.obolibrary.org/obo/BFO
    const fragment = uri.slice(split_ptr+1); // e.g. 0000003
    const full_path = path + separator; // e.g. http://purl.obolibrary.org/obo/BFO_

    // NEED REVERSE LOOKUP TABLE HERE.
    prefix = resource.reverse_c[full_path]
    if (prefix) {
      return prefix + ":" + fragment;
    }
    
    // At this point path not recognized in @context lookup
    // table, so add it to @context
    prefix = path.slice(uri.lastIndexOf('/')+1);
    // At least 2 characters in @context prefix required to avoid
    // exception to rule below, as no namespace begins with number
    // and following is a URI but not an ontology term reference.
    // <owl:versionIRI rdf:resource="http://purl.obolibrary.org/obo/obi/2018-05-23/obi.owl"/>
    const minimal_prefix = prefix.substr(0,2);
    // Some alphanumeric name acting as prefix 
    if (minimal_prefix.match(/[a-z][a-z]/i )) {
      resource['@context'][prefix] = full_path;
      resource.reverse_c[full_path] = prefix;
      return prefix + ":" + fragment;
    }
  }
  return uri;    // Returns untouched string

}

function get_value(resource, node, store, subject, predicate) {
  // store.any just returns one sample value.
  var triple = store.any(subject, predicate);
  if (triple) {
    //console.log(predicate.value, triple.value );
    node[namespace(resource, predicate.uri)] = triple.value
  }
}

function get_properties(resource, node, store, subject, predicate) {
  // store.each ONLY returns OBJECT if given an object property,
  // or value if given a data property
  var triples = store.each(subject, predicate); 
  if (triples.length) {
    output = [];
    // If triple is a data property (literal value)
    if (triples[0].uri) {
      triples.forEach(function(triple) {
        //console.log(predicate.value, triple.value );
        output.push(namespace(resource, triple.uri)); // WHY?
      })
    }

    node[namespace(resource, predicate.uri)] = output
  }
}