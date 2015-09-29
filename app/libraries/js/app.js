var ui = function() {
'use strict';
var width = $('.graph_cont').width(),
	height = $('.graph_cont').height();

// typical graph node radius
var SMALL_RAD = 20;

// graph node radius when you've moused over it
var BIG_RAD = 25;
var color = d3.scale.category20();
var EDGE_LIM = 1000;
var visualized = 0;

// used for determining whether interaction was a click or a drag
var clicked;

// indicates whether the graph is currently being dragged/panned
var dragging;
// mapping feature names to ints that control edge coloring

var Graph = function(graph) {
	var drag, link, linkText, labels, node, force, svg,
        container, total_edges, total_nodes, least_edges,
        node_degree;
    node_degree = 0;
    total_nodes = 0;
    total_edges = 0;
    least_edges = -1;
    var highlighted = [];
	var adj = [];
	var nodes = [];
	var links = [];
	var linked_by_index = {};
	var that = this;

	var zoomed = function() {
		container.attr('transform', 'translate(' + d3.event.translate + ') scale(' + d3.event.scale + ')');
	};

	var zoom = d3.behavior.zoom()
		.scaleExtent([0.1, 2])
		.on('zoom', zoomed);

	this.inspectNodes = function() {
		return nodes;
	};

	this.inspectLinks = function() {
		return links;
	};

	this.constructForceLayout = function() {
		$('svg').remove();
        var k = Math.sqrt(nodes.length / (width * height));
		force = d3.layout.force()
			.charge(function(d) {
                    var charge = -2000 * (d.edges / least_edges);
                    return charge;
                })
			.linkDistance(function(d) {
                    return 80 * nodes.node_degree;
                })
			.linkStrength(.6)
			.size([width, height])
			.links(links)
			.nodes(nodes)
			.on('tick', this.tick);
		svg = d3.select('.graph_cont').append('svg')
			.attr('width', width)
			.attr('height', height)
			.call(zoom)
			.on('dblclick.zoom', null);
		container = svg.append('g');
        drag = force.drag()
            .on('dragstart', dragstarted)
            .on('dragend', dragended);
	};

	this.clearNodes = function() {
		nodes = [];
		links = [];
        total_nodes = 0;
        total_edges = 0;
        least_edges = -1;
        node_degree = 0;
	};

	this.refreshNodes = function() {
		$.each(nodes, function(index, val) {
			val.fixed = true;
		});
	};

	this.neighboring = function(a, b){
		return a === b || linked_by_index[a + '-' + b];
	};

    this.countNodes = function(){
        total_nodes = nodes.length;
        total_edges = links.length;
        $.each(nodes, function(idx, val){
            if(adj[val.id].length > 0 && (least_edges === -1 || adj[val.id].length < least_edges))
                least_edges = adj[val.id].length;
            node_degree += adj[val.id].length;
            val.edges = adj[val.id].length;
        });
        node_degree = node_degree / total_nodes;
        nodes.node_degree = node_degree;
    };

	this.buildLinks = function(type){
		var min_w, max_w;
		min_w = parseInt($('#min_w').val());
		max_w = parseInt($('#max_w').val());
		adj = [];
		for(var i = 0; i < nodes.length; i++)
			adj.push([]);
		switch(type){
			case 'tree':
				var bf, target_node, node_list = [], Q = [];
				for(var i = 1; i < nodes.length; i++)
					node_list.push(nodes[i]);
				Q.push(nodes[0]);
				while(node_list.length !== 0){
					bf = Math.floor((Math.random() * 5) + 1);
					for(var i = 0; i < bf; i++){
						if(node_list.length > 0){
							target_node = Math.floor(Math.random() * (node_list.length - 1));
							links.push({'source': nodes[Q[0].id],
                                        'target': nodes[node_list[target_node].id],
								        'type': 0,
                                        'weight': Math.floor((Math.random() * max_w) + min_w)});	
							adj[Q[0].id].push(node_list[target_node].id);
							adj[node_list[target_node].id].push(Q[0].id);
							Q.push(node_list[target_node]);
							node_list.splice(target_node, 1);
						}else{
							break;
						}
					}
					Q.shift();
				}
				break;
			case 'btree':
				var target_node, node_list = [], Q = [];
				for(var i = 1; i < nodes.length; i++)
					node_list.push(nodes[i]);
				Q.push(nodes[0]);
				while(node_list.length !== 0){
					for(var i = 0; i < 2; i++){
						if(node_list.length > 0){
							target_node = Math.floor(Math.random() * (node_list.length - 1));
							links.push({'source': nodes[Q[0].id],
                                        'target': nodes[node_list[target_node].id],
								        'type': 0,
                                        'weight': Math.floor((Math.random() * max_w) + min_w)});	
							adj[Q[0].id].push(node_list[target_node].id);
							adj[node_list[target_node].id].push(Q[0].id);
							Q.push(node_list[target_node]);
							node_list.splice(target_node, 1);
						}else{
							break;
						}
					}
					Q.shift();
				}
				break;
			case 'sparse':
				var rem, target_node, source_node, source_node_id, edges, total_edges, n, node_list = [], undiscovered;
				n = nodes.length;
				total_edges = Math.floor((Math.random() * ((n * (n - 1)) / 4 - 1 - n)) + n);
				edges = Math.ceil(total_edges / n);
				rem = total_edges % n;
				for(var i = 0; i < nodes.length; i++)
					node_list.push(nodes[i]);
				while(node_list.length !== 0){
					/* source_node_id is index in node_list while source_node.id is index in nodes */
					source_node_id = Math.floor(Math.random() * (node_list.length - 1));
					source_node = node_list[source_node_id];
					node_list.splice(source_node_id, 1);
					undiscovered = [];
					for(var i = 0; i < n; i++){
						if(adj[i].indexOf(source_node.id) === -1)
							undiscovered.push(nodes[i]);
					}
					for(var i = 0; i < edges; i++){
						if(undiscovered.length > 0){
							target_node = Math.floor(Math.random() * (undiscovered.length - 1));
							links.push({'source': nodes[source_node.id],
                                        'target': undiscovered[target_node],
								        'type': 0,
                                        'weight': Math.floor((Math.random() * max_w) + min_w)});	
							adj[source_node.id].push(undiscovered[target_node].id);
							adj[undiscovered[target_node].id].push(source_node.id);
							undiscovered.splice(target_node, 1);
							rem--;
						}else{
							break;
						}
						/* Decrease number of edges per vertex when remainder -> 0 */
						if(rem == 0){
							edges--;
							rem = total_edges;
						}
					}
				}
				break;
			case 'dense':
				var rem, target_node, source_node, source_node_id, edges, total_edges, n, node_list = [], undiscovered;
				n = nodes.length;
				total_edges = Math.floor((Math.random() * ((n * (n - 1)) / 4 - 1 - n)) + n + (((n * (n - 1)) / 4)));
				edges = Math.ceil(total_edges / n);
				rem = total_edges % n;
				for(var i = 0; i < n; i++)
					node_list.push(nodes[i]);
				while(node_list.length !== 0){
					source_node_id = Math.floor(Math.random() * (node_list.length - 1));
					source_node = node_list[source_node_id];
					node_list.splice(source_node_id, 1);
					undiscovered = [];
					for(var i = 0; i < n; i++){
						if(adj[i].indexOf(source_node.id) === -1)
							undiscovered.push(nodes[i]);
					}
					for(var i = 0; i < edges; i++){
						if(undiscovered.length > 0){
							target_node = Math.floor(Math.random() * (undiscovered.length - 1));
							links.push({'source': nodes[source_node.id],
                                        'target': undiscovered[target_node],
								        'type': 0,
                                        'weight': Math.floor((Math.random() * max_w) + min_w)});	
							adj[source_node.id].push(undiscovered[target_node].id);
							adj[undiscovered[target_node].id].push(source_node.id);
							undiscovered.splice(target_node, 1);
							rem--;
						}else{
							break;
						}
						if(rem == 0){
							edges--;
							rem = total_edges;
						}
					}
				}
				break;
			case 'full':
				for(var i = 0; i < nodes.length; i++){
					for(var j = i + 1; j < nodes.length; j++){
						links.push({'source': nodes[i],
                                    'target': nodes[j],
							        'type': 0,
                                    'weight': Math.floor((Math.random() * max_w) + min_w)});
						adj[i].push(j);
						adj[j].push(i);
					}
				}
				break;
			case 'custom':
                var chance, prob = parseFloat($('#prob').val());
				for(var i = 0; i < nodes.length; i++){
					for(var j = i + 1; j < nodes.length; j++){
                        chance = Math.random() < prob;
                        if(chance === true){
                            links.push({'source': nodes[i],
                                        'target': nodes[j],
                                        'type': 0,
                                        'weight': Math.floor((Math.random() * max_w) + min_w)});
                            adj[i].push(j);
                            adj[j].push(i);
                        }
					}
				}
				break;
			case 'input':
				break;
			default:
				break;
		}
		$('#graph_data').html('');
		$('#graph_data').append('<div>' + nodes.length + ' ' + links.length + '</div>');
		linked_by_index = {};
        this.countNodes();
		for(var i = 0; i < links.length; i++){
			linked_by_index[links[i].source.id + '-' + links[i].target.id] = 1;
			linked_by_index[links[i].target.id + '-' + links[i].source.id] = 1;
			$('#graph_data').append('<div>' + links[i].source.id + ' ' + links[i].target.id + ' ' + links[i].weight + '</div>');
		}
        console.log(adj);
        console.log(nodes);
        console.log(links);
        console.log(linked_by_index);
        console.log('============================');
	}

	this.buildNodes = function(vertices, type) {
		var position;
		if(type === 'tree' || type === 'btree')
			vertices[0].group = 1;
        this.clearNodes();
		for(var i = 0; i < vertices.length; i++){
			var vertex = vertices[i];
			vertex.x = width / 2;
			vertex.y = height / 2;
			nodes.push(vertex);
		}
		this.buildLinks(type);
	};

    this.buildGraphFromInput = function(){
        var num_nodes, num_edges, edge, data = $('#graph_data').html();
        visualized = 1;
        data = data.replace(/<\/div>/g,'').split(/<div[\s\w="-:;]*>/);
        if(data[0] === '')
            data.splice(0,1);
        num_nodes = parseInt(data[0].split(' ')[0]);
        num_edges = parseInt(data[0].split(' ')[1]);
		adj = [];
		for(var i = 0; i < num_nodes; i++)
			adj.push([]);
        this.clearNodes();
        for(var i = 0; i < num_nodes; i++)
            nodes.push({'id': i, 'x': width / 2, 'y': height / 2});
        for(var i = 1; i <= num_edges; i++){
            if(data[i].length > 0){
                data[i].trim();
                edge = data[i].split(' ');
                edge = {'source': parseInt(edge[0]), 'target': parseInt(edge[1]), 'weight': parseFloat(edge[2])};
                adj[edge.source].push(edge.target);
                adj[edge.target].push(edge.source);
                links.push({'source': nodes[edge.source], 'target': nodes[edge.target], 'type': 0, 'weight': edge.weight});
                linked_by_index = {};
                linked_by_index[edge.source + '-' + edge.target] = 1;
                linked_by_index[edge.target + '-' + edge.source] = 1;
            }
        }
        this.countNodes();
        console.log(adj);
        console.log(nodes);
        console.log(links);
        console.log(linked_by_index);
    };

    this.findEdge = function(source, target) {
        var item = null;
        source = parseInt(source);
        target = parseInt(target);
        for(var i = 0; i < links.length; i++){
            if(links[i].source.id === source && links[i].target.id === target){
                item = links[i];
                return {'dom': $('#link_' + source + '_' + target), 'item': item};
            }else if(links[i].source.id === target && links[i].target.id === source){
                item = links[i];
                return {'dom': $('#link_' + target + '_' + source), 'item': item};
            }
        }
        return null;
    }

    this.highlightEdge = function(source, target){
        var edge = $('#link_' + source + '_' + target);
        if(edge.length === 0)
            edge = $('#link_' + target + '_' + source);
        edge.find('.link-line').css('stroke', 'red');
    }

    this.highlightEdges = function(edges){
        var edge;
        for(var i = highlighted.length - 1; i >= 0; i--){
            edge = this.findEdge(highlighted[i].source, highlighted[i].target);
            if(edge){
                edge.dom.find('.link-line').css('stroke', color(edge.item.type));
            }
            highlighted.pop();
        }
        for(var i = 0; i < edges.length; i++){
            this.highlightEdge(edges[i].source, edges[i].target);
            highlighted.push(edges[i]);
        }
    }

    this.algo = function(name){
        var that = this, data = $('#graph_data').html().replace(/<\/div>/g,'').replace(/\n/g,'').split(/<div[\s\w="-:;]*>/);
        if(name === 'dijkstra'){
            if(data[0] !== '')
                data[0] = data[0] + ' ' + $('#start').val() + ' ' + $('#end').val();
            else
                data[1] = data[1] + ' ' + $('#start').val() + ' ' + $('#end').val();
        }
        data = {
            'name' : name,
            'data' : data
        };
        $.ajax({
            url: window.location.href.split('/')[0] + '/algo/',
            data: data
        }).done(function(data){
            var edges, str1 = "<div>", str2 = "</div>";
            edges = data;
            data = data.join("</div><div>");
            str1 = str1.concat(data, str2);
            for(var i = 0; i < edges.length; i++){
                edges[i].trim();
                edges[i] = {'source': edges[i].split(' ')[0], 'target': edges[i].split(' ')[1]};
            }
            if(name !== 'dijkstra')
                that.highlightEdges(edges);
            $('#highlight_edges').html(str1);
        });
    }

    this.networkGraph = function(name){
        var that = this, data;
        data = {
            'name' : name
        };
        $.ajax({
            url: window.location.href.split('/')[0] + '/graph/',
            data: data
        }).done(function(data){
            var edges, str1 = "<div>", str2 = "</div>";
            edges = data;
            data = data.join("</div><div>");
            str1 = str1.concat(data, str2);
            $('#graph_data').html(str1);
        });
    }

	this.refreshGraph = function() {
		this.constructForceLayout();
		link = container.selectAll('.link')
            .data(force.links())
		    .enter()
            .append('g')
			.attr('class', 'link')
            .attr('id', function(d) { return 'link_' + d.source.id + '_' + d.target.id; })
			.append('line')
			.attr('class', 'link-line')
			.attr('stroke-width', 4)
			.style('stroke', function(d) { return color(d.type); });

		linkText = container.selectAll(".link")
			.append("text")
			.attr("class", "link-label")
			.attr("font-family", "Arial, Helvetica, sans-serif")
			.attr("fill", "Black")
			.style("font", "normal 18px Arial")
			.attr("dy", ".35em")
			.attr("text-anchor", "middle")
			.text(function(d) { return d.weight; });

        node = container.selectAll('.node')
            .data(force.nodes())
            .enter()
            .append('g')
            .attr('class', 'node')
			.on('mouseover', function(d){
                    container.selectAll('#node_' + d.id)
                        .transition()
                        .duration(500)
                        .attr('r', BIG_RAD);
					container.selectAll('.node')
						.transition()
						.duration(500)
						.attr('opacity', function(o){
							return that.neighboring(d.id, o.id) ? 1 : .3;		
						});
					container.selectAll('.link-line')
						.transition()
						.duration(500)
						.attr('opacity', function(o){
							return o.source.id == d.id || o.target.id == d.id ? 1 : .3;
						});
				})
			.on('mouseout', function(d){
                    container.selectAll('#node_' + d.id)
                        .transition()
                        .duration(500)
                        .attr('r', SMALL_RAD);
					container.selectAll('.node')
						.transition()
						.duration(500)
						.attr('opacity', 1);
					container.selectAll('.link-line')
						.transition()
						.duration(500)
						.attr('opacity', 1);
				})
			.call(drag)
            .append("circle")
			.attr("class", "node-circle")
			.attr("r", SMALL_RAD)
			.attr('id', function(d) { return 'node_' + d.id; })
			.style('fill', function(d) { 
                    if(d.group === 1)
                        return '#024dd9';
                    else
                        return '#6c28f7';
                });

        labels = container.selectAll('.node')
            .append('text')
			.attr("class", "node-label")
			.attr("font-family", "Arial, Helvetica, sans-serif")
			.attr("fill", "white")
			.style("font", "normal 18px Arial")
			.attr("dy", ".35em")
			.attr("text-anchor", "middle")
            .text(function(d) { return d.id; });

		force.start();
	};

	this.tick = function(event) {
		container.selectAll('.node-circle').attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; });

		container.selectAll('.link-line').attr('x1', function(d) { return d.source.x; })
			.attr('y1', function(d) { return d.source.y; })
			.attr('x2', function(d) { return d.target.x; })
			.attr('y2', function(d) { return d.target.y; });

        labels.attr("x", function(d) {
                    return d.x;
                })
            .attr("y", function(d) {
                    return d.y;
                });

		linkText.attr("x", function(d) {
					return ((d.source.x + d.target.x)/2 + 15);
				})
			.attr("y", function(d) {
					return ((d.source.y + d.target.y)/2 + 15);
				});
	};

    function dragstarted(d) {
        d3.event.sourceEvent.stopPropagation();
        d3.select(this).classed("dragging", true);
    }

    function dragended(d) {
        d3.select(this).classed("dragging", false);
    }

};

//Create initial graph
var graph = new Graph();

$(document).on('ready', function() {
	var vertex_list = [];
    visualized = 1;
    $('#graph_visualize').hide();
	for(var i = 0; i < 20; i++){
		vertex_list.push({id: i});
	}
	graph.buildNodes(vertex_list, 'tree');
	graph.refreshGraph();
});

$('#graph_build').on('click', function(){
    if($('#graph_type option:selected').hasClass('js_generated')){
        var num, type, vertex_list = [];
        visualized = 0;
        $('#graph_visualize').show();
        num = $('#num_nodes').val();
        type = $('#graph_type').val();
        for(var i = 0; i < num; i++){
            vertex_list.push({id: i});
        }
        graph.buildNodes(vertex_list, type);
    }else{
        graph.networkGraph($('#graph_type').val());
        visualized = 0;
        $('#graph_visualize').show();
    }
});

$('#graph_visualize').on('click', function(){
    if($('#graph_type').val() === 'input' || !$('#graph_type option:selected').hasClass('js_generated')){
        graph.buildGraphFromInput();
        if(graph.inspectLinks().length > EDGE_LIM){
            $('#warning_modal').modal('show');
        }else{
            graph.refreshGraph();
        }
    }else{
        if(visualized !== 1){
            $('#graph_visualize').hide();
            if(graph.inspectLinks().length > EDGE_LIM){
                $('#warning_modal').modal('show');
            }else{
                visualized = 1;
                graph.refreshGraph();
            }
        }
    }
});

$('#continue_visualizing').on('click', function(){
    visualized = 1;
    graph.refreshGraph();
});

$('#graph_highlight').on('click', function(){
    var edges;
    edges = $('#highlight_edges').html().replace(/<\/div>/g,'').replace(/\n/g,'').split(/<div[\s\w="-:;]*>/);
    for(var i = 0; i < edges.length; i++){
        edges[i].trim();
        edges[i] = {'source': edges[i].split(' ')[0], 'target': edges[i].split(' ')[1]};
    }
    graph.highlightEdges(edges);
});

$('#graph_type').on('change', function(){
    visualized = 0;
    if($(this).val() === 'input'){
        $('#graph_visualize').show();
        $('.opt').hide();
    }else if($(this).val() === 'custom'){
        $('#graph_visualize').hide();
        $('.opt').show();
        $('.custom_hide').hide();
        $('.custom_opt').show();
    }else if($('#graph_type option:selected').hasClass('num_fixed')){
        $('.opt').show();
        $('.nx_opt').hide();
        $('.num_opt').hide();
    }else{
        $('#graph_visualize').hide();
        $('.opt').show();
        $('.custom_hide').show();
        $('.custom_opt').hide();
    }
});

$('#graph_run').on('click', function(){
    var algo = $('#graph_algo').val();
    graph.algo(algo);
});

$('#graph_algo').on('change', function(){
    if($(this).val() === 'dijkstra')
        $('#start').closest('.row').show();
    else
       $('#start').closest('.row').hide();
});

return graph;

}();
