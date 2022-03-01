window.addEventListener('load', async evt => {

	let state = {
		runtime: {
			hosts: [],
			procs: [],
			pipes: [],
			root: {}
		},
		terminal: {
			lines: []
		}
	};
	state.methods = {
		updateRuntime: async runtime => {
			Object.assign(state.runtime, runtime);
			// console.log('runtime updated', state.runtime);
		},
		print: async line => {
			state.terminal.lines.push(line);
		},
		error: async line => {
			state.terminal.lines.push(line);
		}
	}

	// initialize websocket
	let socket = new WebSocket(`ws://${window.location.hostname}:8000`);
	socket.addEventListener('open', () => {
		// console.log('connected');
		socket.addEventListener('message', async msg => {
			let message = JSON.parse(msg.data);
			// console.log(message);

			try {
				if (message instanceof Array){
					let method = state.methods[message[0]];
					
					if (method){
						let result = await method.apply(null, message.slice(1));
						
						if (result){
							socket.send(JSON.stringify(result));
						}
					}
					else {
						throw 'Invalid method';
					}
				}
				else {
					throw 'Invalid message format';
				}
			}
			catch (err) {
				console.error(err);
			}

		});

		socket.send(JSON.stringify([ 'getState' ]));
	});

	Vue.component('tabs', {
		data: () => ({
			activeTab: null,
			tabs: []
		}),
		methods: {
			setTab (tab){
				this.activeTab = tab.label;
				this.$root.$emit('tab-activated', this.activeTab);
			}
		},
		template: `<div class="tabs">
			  <ul>
			    <li v-for="tab in tabs" v-bind:class="{ 'is-active': tab.label === activeTab }">
			    	<a v-on:click="setTab(tab)">{{ tab.label }}</a>
			    </li>
			  </ul>
			  <slot></slot>
			</div>`,
		created: function (){
			let tabs = this.$slots.default.filter(elem => (elem.componentOptions && elem.componentOptions.tag === 'tab')).forEach(elem => {
				this.$data.tabs.push({
					elem: elem,
					label: elem.componentOptions.propsData.label
				});
			});

			this.setTab(this.$data.tabs[0]);
		}
	});

	Vue.component('tab', {
		props: [ 'label' ],
		template: `<div v-show="$parent.activeTab === label"><slot></slot></div>`
	});

	Vue.component('runtime-visualizer-dataflow', {
		data: () => ({
			width: 0,
			height: 0
		}),
		computed: {
			graphs() {
				if (this.$root.runtime && this.$root.runtime.procs){
					let nodeMap = this.$root.runtime.procs.reduce((acc, proc) => {
						acc[proc.id] = { prev: new Set(), next: new Set() };
						return acc;
					}, {});
					this.$root.runtime.pipes.forEach(pipe => {
						nodeMap[pipe.source.id].next.add(String(pipe.sink.id));
						nodeMap[pipe.sink.id].prev.add(String(pipe.source.id));
					});

					let traversed = new Set();
					let traversedEdge = new Set();
					let graphs = [];
					let traceGraph = (nodeId, graphId, x, y) => {
						if (traversed.has(nodeId)) return;

						traversed.add(nodeId);
						graphs[graphId].nodes.push({
							id: nodeId,
							x: x,
							y: y
						});

						nodeMap[nodeId].graph = graphId;
						nodeMap[nodeId].x = x;
						nodeMap[nodeId].y = y;

						let yOffset = 0;
						for (let nextId of nodeMap[nodeId].next){
							traceGraph(nextId, graphId, x + 1, y + (yOffset ++));
							let edgeId = `${nodeId},${nextId}`;
							if (traversedEdge.has(edgeId)) continue;
							traversedEdge.add(edgeId);
							graphs[graphId].edges.push({
								source: nodeId,
								sink: nextId
							});
						}

						yOffset = y;
						for (let prevId of nodeMap[nodeId].prev){
							traceGraph(prevId, graphId, x - 1, y + (yOffset ++));
							let edgeId = `${prevId},${nodeId}`;
							if (traversedEdge.has(edgeId)) continue;
							traversedEdge.add(edgeId);
							graphs[graphId].edges.push({
								source: prevId,
								sink: nodeId
							});
						}
					}

					let startNodes = Object.keys(nodeMap).filter(key => (nodeMap[key].prev.size === 0));
					let graphId = 0;
					for (let nodeId of startNodes){
						let graph = {
							nodes: [],
							edges: []
						};
						graphs.push(graph);
						traceGraph(nodeId, graphId ++, 0, 0);

						graph.edges.forEach(edge => {
							edge.x1 = nodeMap[edge.source].x;
							edge.y1 = nodeMap[edge.source].y
							edge.x2 = nodeMap[edge.sink].x;
							edge.y2 = nodeMap[edge.sink].y
						})
					}

					console.log(graphs);

					return graphs;
				}
				else return [];
			}
		},
		created() {
			this.$root.$on('tab-activated', (activeTab) => {
				this.$nextTick(() => {
					let rect = this.$el.getBoundingClientRect();
					this.width = rect.width;
					this.height = rect.height;
				});
			})
		},
		template: `<svg style="flex: 1;">
			  <defs>
			    <marker id="arrow" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
			      <path d="M0,0 L0,6 L9,3 z" fill="#000" />
			    </marker>
			  </defs>
			<g v-for="(graph, i) in graphs">
				<circle v-for="node in graph.nodes" :cx="node.x * 100 + 50" :cy="i * 100 + node.y * 50 + 50" r="10" stroke="black" stroke-width="1" fill="none"></circle>
				<text v-for="node in graph.nodes" :x="node.x * 100 + 50" :y="i * 100 + node.y * 50 + 55" fill="black" text-anchor="middle" font-family="Open Sans">{{ node.id }}</text>
				<line v-for="edge in graph.edges" :x1="edge.x1 * 100 + 60" :y1="i * 100 + edge.y1 * 50 + 50"
												  :x2="edge.x2 * 100 + 34" :y2="i * 100 + edge.y2 * 50 + 50" style="stroke:black; stroke-width:1;" marker-end="url(#arrow)"></line>
			</g>
		</svg>`
	});

	Vue.component('runtime-visualizer-circular', {
		data: () => ({
			width: 0,
			height: 0
		}),
		computed: {
			centerX () {
				return this.width / 2;
			},
			centerY () {
				return this.height / 2;
			},
			radius () {
				return this.centerY ? this.centerY - 20 : 0;
			},
			hosts() {
				return this.$root.runtime && this.$root.runtime.hosts ? this.$root.runtime.hosts.map((host, i, list) => {
					return {
						id: host.id,
						x1: this.centerX,
						y1: this.centerY,
						x2: this.centerX + this.radius * Math.sin(2*Math.PI*i/list.length),
						y2: this.centerY - this.radius * Math.cos(2*Math.PI*i/list.length),
						color: `hsl(${360 * i/list.length}, 80%, 50%)`,
						labelX: this.centerX + this.radius * Math.sin(2*Math.PI*(i + 0.5)/list.length),
						labelY: this.centerY - this.radius * Math.cos(2*Math.PI*(i + 0.5)/list.length),
						procs: host.procs.map((proc, j, procs) => ({
							id: proc.id,
							centerX: this.centerX + (this.radius - 30) * Math.sin(2*Math.PI*(i + (1 + j) / (procs.length + 1))/list.length),
							centerY: this.centerY - (this.radius - 30) * Math.cos(2*Math.PI*(i + (1 + j) / (procs.length + 1))/list.length),
							labelX: this.centerX + (this.radius - 30) * Math.sin(2*Math.PI*(i + (1 + j) / (procs.length + 1))/list.length),
							labelY: this.centerY - (this.radius - 30) * Math.cos(2*Math.PI*(i + (1 + j) / (procs.length + 1))/list.length)
						}))
					}
				}) : []
			}
		},
		created() {
			this.$root.$on('tab-activated', (activeTab) => {
				this.$nextTick(() => {
					let rect = this.$el.getBoundingClientRect();
					this.width = rect.width;
					this.height = rect.height;
				});
			})
		},
		template: `<svg style="flex: 1;">
			<g>
				<circle :r="radius" :cx="centerX" :cy="centerY" stroke="black" stroke-width="1" fill="none"></circle>
				<line v-for="(line, i) in hosts" :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2" style="stroke:black; stroke-width:1;"></line>
				<text v-for="(host, i) in hosts" :x="host.labelX" :y="host.labelY" fill="black" text-anchor="middle" font-family="Open Sans">{{ host.id }}</text>
			</g>
			<g v-for="(host, i) in hosts">
				<circle v-for="(proc, j) in host.procs" r="10" :cx="proc.centerX" :cy="proc.centerY" stroke="black" stroke-width="1" fill="white"></circle>
			</g>
		</svg>`
	});

	Vue.component('terminal', {
		data: () => ({
			text: '',
			lines: []
		}),
		methods: {
			enter(){
				let line = this.text;
				socket.send(JSON.stringify([ 'evaluate', line ]));

				this.lines.push(line);
				this.text = '';
			}
		},
		mounted() {
			this.$refs.input.focus();

			this.$root.$on('terminal-output', term => {
				this.lines.push(term.lines[term.lines.length - 1]);
			})
		},
		updated () {
			this.$refs.display.scrollTop = this.$refs.display.scrollHeight;
		},
		template: `<div id="terminal">
			<div ref="display">
				<p v-for="line in lines">{{ line }}</p>
			</div>
			<input ref="input" type="text" v-model="text" v-on:keyup.enter="enter()"/>
		</div>`
	});

	Vue.component('code-editor', {
		methods: {
			evaluate(){
				socket.send(JSON.stringify([ 'evaluateFile', this.$editor.getValue() ]));
			}
		},
		mounted () {
			let editor = ace.edit("code-editor");
			editor.setTheme("ace/theme/monokai");
			editor.session.setMode("ace/mode/javascript");
			editor.setOptions({ fontSize: '20px' });

			this.$editor = editor;
		},
		template: `<div style="display:flex; flex-direction:column; flex:1">
			<div id="code-editor" style="flex: 1;"></div>
			<div>
				<button v-on:click="evaluate()">Submit</button>
			</div>
		</div>`
	});

	// initialize Vue app
	let app = new Vue({
		el: '#main',
		data: {
			runtime: state.runtime,
			terminal: state.terminal
		},
		watch: {
			runtime: {
				deep: true,
				handler: function(val){
					// console.log('runtime updated', val);

					// this.$emit('runtime-updated', val);
				}
			},
			terminal: {
				deep: true,
				handler: function(val){
					console.log('terminal updated', val);
					this.$emit('terminal-output', val);
				}
			}
		},
		methods: {
			
		},
		mounted () {
			let editor = ace.edit("code-editor");
			editor.setTheme("ace/theme/monokai");
			editor.session.setMode("ace/mode/javascript");
			editor.setOptions({ fontSize: '20px' });

			this.$editor = editor;
		},
		template: `<div style="display:flex; height: 100vh; width: 100vw;">
			<div style="flex: 1; display: flex; flex-direction: column; padding: 0.5em;">
				<h4>Visualizer</h4>
				<tabs>
					<tab label="Table">

						<table>
							<thead>
								<tr>
									<th>
										Process ID
									</th>
									<th>
										Host
									</th>
									<th>
										Program
									</th>
									<th>
										Pipes
									</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="proc in runtime.procs">
									<td style="text-align:center;">{{ proc.id }}</td>
									<td style="text-align:center;">{{ proc.host }}</td>
									<td>{{ proc.program }}</td>
									<td></td>
								</tr>
							</tbody>
						</table>

					</tab>
					<tab label="Dataflow">
						<runtime-visualizer-dataflow></runtime-visualizer-dataflow>
					</tab>
					<tab label="Radial">
						<runtime-visualizer-circular></runtime-visualizer-circular>
					</tab>
				</tabs>
			</div>
			<div style="flex: 1; display: flex; flex-direction: column; padding: 0.5em;">
				<tabs>
					<tab label="Terminal Mode">
						<terminal></terminal>
					</tab>
					<tab label="Code Editor Mode">
						<code-editor></code-editor>
					</tab>
				</tabs>
			</div>
		</div>`
	});
	// Vue.prototype.$runtime = state.runtime;

});