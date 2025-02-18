import * as THREE from 'three'
import axios from 'axios'
import {earcut} from './earCut.js'
import {MeshLine,MeshLineMaterial} from './MeshLine.js'
import { ShaderChunk } from 'three';
import {CSS3DRenderer,CSS3DObject} from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
class Globe {
	constructor(scene,camera) {
		//省级行政区划文本和图标
		this.FirstObjs=[]
		//室级行政区划文本和图标
		this.SecondObjs=[]
		this.r=6378137//地球长半轴
		this.css3DRenderer=null//文字渲染
		this.matLine=null
		// 添加相机与场景
		this.scene=scene
		this.camera = camera
		this.iTime={
			value:0
		}
		this.init3Drender()
		//创建星球背景
		this.initStars()
		//创建中国各省行政区划
		this.initChina()
		//创建市的行政区划
		this.initCities()
		//创建轨迹线
		this.addTrailLine()
		//创建地球本体
        this.mesh=this.initGlobeMesh()
		this.scene.add(this.mesh)	
	}
	initCities(){
		let mat = new THREE.MeshBasicMaterial({
		  color:'#55aaff',
		  depthTest:false,
		  transparent: true,
		  side:2
		})
		let matLine = new MeshLineMaterial({
			color: "#55ff00",
			map: null,
			useMap: false,
			lineWidth: 3,
			resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
			dashArray: 0, // 破折号之间的长度和间距。(0 -无破折号)
			dashRatio: 0, // 定义可见和不可见之间的比率(0 -更可见，1 -更不可见)。
			dashOffset: 0,
			transparent: true,
			sizeAttenuation: 0, //使线宽不变，不管距离(1个单位是屏幕上的1px)(0 -衰减，1 -不衰减)
			side: 2,
			depthTest: false,
			//blending: THREE.AdditiveBlending,
		})
		
		let matLineProvince = new MeshLineMaterial({
			color: "#00ffff",
			map: null,
			useMap: false,
			lineWidth: 8,
			resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
			dashArray: 0, // 破折号之间的长度和间距。(0 -无破折号)
			dashRatio: 0, // 定义可见和不可见之间的比率(0 -更可见，1 -更不可见)。
			dashOffset: 0,
			transparent: true,
			sizeAttenuation: 0, //使线宽不变，不管距离(1个单位是屏幕上的1px)(0 -衰减，1 -不衰减)
			side: 2,
			depthTest: false,
			//blending: THREE.AdditiveBlending,
		})
		axios.get('./data/chinaCity.json').then(res=>{
			let Datas=res.data.features
			let labelDatas=[]
			let geometrys=[]
			let geometrysLine=[]
			Datas.forEach(item=>{	
				let name=item.properties['地市']
				labelDatas.push({
					name:name,
					position:this.getPosition(this.r,item.properties.Center_X,item.properties.Center_Y)
				})
				if(item.geometry.type==='Polygon'){
					let obj=this.createMultiPolygon(item.geometry.coordinates[0])
					geometrys.push(obj.geometry)
					geometrysLine.push(obj.geometryLine)
				}else{
					item.geometry.coordinates.forEach(geometry=>{
						let obj=this.createMultiPolygon(geometry[0])
						geometrys.push(obj.geometry)
						geometrysLine.push(obj.geometryLine)				
					})
				}
			})
			let objects = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(geometrys), mat);
			let objectsLine = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(geometrysLine), matLine);

			this.scene.add(objects);
			this.scene.add(objectsLine)
			objects.visible=false
			objectsLine.visible=false
			this.SecondObjs.push(objects)
			this.SecondObjs.push(objectsLine)
			//创造标签
			labelDatas.forEach(item=>{
				this.addCssLabel(item.position,{x:0,y:Math.PI+0.3,z:0},item.name,2)
			})
			axios.get('./data/chinaL.json').then(res=>{
				let Datas=res.data.features
				let geometrys=[]
				Datas.forEach(item=>{
					if(item.geometry.type==="LineString"){
						let obj=this.createLine(item.geometry.coordinates)
						geometrys.push(obj)
					}else{
						item.geometry.coordinates.forEach(geometry=>{
							let obj=this.createLine(geometry)
							geometrys.push(obj)
						})
					}
				})
				let objectsLine = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(geometrys), matLineProvince);
				this.scene.add(objectsLine)
				objectsLine.visible=false
				this.SecondObjs.push(objectsLine)
			})
		})
		
		
	}
	createLine(positions){	
			let linepositions=[]
			positions.forEach((position,index)=>{
				let xyz=this.getPosition(this.r,position[0],position[1])
				linepositions.push(new THREE.Vector3(xyz.x,xyz.y,xyz.z))
			})
			//创建边界线
			let geometryLine = new THREE.BufferGeometry().setFromPoints(linepositions);
			let meshLine = new MeshLine()
			meshLine.setGeometry(geometryLine)
			return meshLine.geometry	
	}
	addTrailLine(){
		let textureLoader = new THREE.TextureLoader()
		textureLoader.load('./images/green_line.png', (texture1) => {
			this.matLine = new MeshLineMaterial({
				color: "#00aa00",
				map: texture1,
				useMap: true,
				lineWidth: 6,
				resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
				dashArray:0.98, // 破折号之间的长度和间距。(0 -无破折号)
				dashRatio: 0.02, // 定义可见和不可见之间的比率(0 -更可见，1 -更不可见)。
				dashOffset: 0,
				transparent: true,
				sizeAttenuation: 0, //使线宽不变，不管距离(1个单位是屏幕上的1px)(0 -衰减，1 -不衰减)
				side: 2,
				depthTest: false,
				blending: THREE.AdditiveBlending,
			})
			let beijing=[ 116.4551,40.2539]
			//北京中心
			let positionStart=this.getPosition(this.r,beijing[0],beijing[1])
			//新疆 四川  黑龙江 江苏
			let positions=[{
				//新疆
				position:[84.9023,41.748],
				height:1.2
			},
			{   //四川
				position:[102.9199,30.1904],
				height:1.1
			},{
				//黑龙江
				position:[128.1445,48.5156],
				height:1.3
			},{
				//江苏
				position:[120.0586,32.915],
				height:1.1
			}]
			positions.forEach(item=>{
				let positionEnd=this.getPosition(this.r,item.position[0],item.position[1])
				let curve = new THREE.QuadraticBezierCurve3(
					positionStart,
					new THREE.Vector3((positionStart.x+positionEnd.x)/2, positionStart.y*item.height,(positionStart.z+positionEnd.z)/2),
					positionEnd
				);			
				let points = curve.getPoints(200);
				
				let geometryLine = new THREE.BufferGeometry().setFromPoints(points);
				let meshLine = new MeshLine()
				meshLine.setGeometry(geometryLine)
				let LineGeometry = new THREE.Mesh(meshLine.geometry, this.matLine);
				LineGeometry.layers.enable(1)
				this.scene.add(LineGeometry);
			})
		})	
	}
	init3Drender(){
		this.css3DRenderer = new CSS3DRenderer()
		this.css3DRenderer.setSize(window.innerWidth, window.innerHeight)
		this.css3DRenderer.domElement.style.position = 'absolute'
		this.css3DRenderer.domElement.style.top = 0
		this.css3DRenderer.domElement.style.pointerEvents = "none"
		$("#threeContain").append(this.css3DRenderer.domElement)
	}
	addCssLabel(position, rotation, label,level) {
		let colors={
			1:'yellow',
			2:'red'
		}
		let scales={
			1:5000,
			2:1500
		}
		let style=`text-align: center;border: none;pointer-events:none;cursor:pointer;outline: none;color: ${colors[level]};text-shadow: 0 0 5px #fff, 0 0 20px #00a67c, 0 0 35px #00a67c, 0 0 62px #00a67c;font-size: 18px;padding: 10px;`
		let parentDom =
			$(".boxContainer").append(
				`<div class="panel">${label}</div>`
			)
		const dom = $(".boxContainer").find(".panel:last-child")[0]
		const label3d = new CSS3DObject(dom)
		label3d.element.style =style
		label3d.position.set(position.x, position.y, position.z)
		label3d.scale.set(scales[level],scales[level],scales[level])
		label3d.rotation.set(rotation.x ||0, rotation.y||0, rotation.z||0)
		this.scene.add(label3d)
		switch(level){
			case 1:
			//this.FirstObjs.push(label3d)
			break
			case 2:
			label3d.visible=false
			this.SecondObjs.push(label3d)
			break
		}
		
	}
	createMultiPolygon(positionsArray){
		let positions=positionsArray
		let linepositions=[]
		let polygonPositions=[]
		let indexs=[]
		positions.forEach((position,index)=>{
			let xyz=this.getPosition(this.r,position[0],position[1])
			polygonPositions.push(xyz.x)
			polygonPositions.push(xyz.y)
			polygonPositions.push(xyz.z)
			linepositions.push(new THREE.Vector3(xyz.x,xyz.y,xyz.z))
		})
		polygonPositions.push(polygonPositions[0])
		polygonPositions.push(polygonPositions[1])
		polygonPositions.push(polygonPositions[2])
		let positionsT=earcut(polygonPositions,null,3)
		let vertices = new Float32Array(polygonPositions)
		let geometry = new THREE.BufferGeometry() // 声明一个缓冲几何体对象
		geometry.setIndex(positionsT);
		geometry.attributes.position =new THREE.BufferAttribute(vertices, 3)
		
		//创建边界线
		let geometryLine = new THREE.BufferGeometry().setFromPoints(linepositions);
		let meshLine = new MeshLine()
		meshLine.setGeometry(geometryLine)
		return {
			geometry:geometry,
			geometryLine:meshLine.geometry
		}
	}
	//运用耳切法实现
	createPolygon(positionsArray,color,name,center){
		let positions=positionsArray
		let linepositions=[]
		let polygonPositions=[]
		let indexs=[]
		positions.forEach((position,index)=>{
			let xyz=this.getPosition(this.r*1,position[0],position[1])
			polygonPositions.push(xyz.x)
			polygonPositions.push(xyz.y)
			polygonPositions.push(xyz.z)
			linepositions.push(new THREE.Vector3(xyz.x,xyz.y,xyz.z))
		})
		polygonPositions.push(polygonPositions[0])
		polygonPositions.push(polygonPositions[1])
		polygonPositions.push(polygonPositions[2])
		let positionsT=earcut(polygonPositions,null,3)
		let vertices = new Float32Array(polygonPositions)
		let geometry = new THREE.BufferGeometry() // 声明一个缓冲几何体对象
		geometry.setIndex(positionsT);
		geometry.attributes.position =new THREE.BufferAttribute(vertices, 3)
		let mat = new THREE.MeshBasicMaterial({
		  color,
		  depthTest:false,
		  side:2
		})
		const mesh = new THREE.Mesh(geometry, mat)
		mesh.userData.type='区划面'
		mesh.userData.color=color
		mesh.userData.name=name
		mesh.userData.center=center
        //创建边界线
		let matLine = new MeshLineMaterial({
			color: "#00ffff",
			map: null,
			useMap: false,
			lineWidth: 8,
			resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
			dashArray: 0, // 破折号之间的长度和间距。(0 -无破折号)
			dashRatio: 0, // 定义可见和不可见之间的比率(0 -更可见，1 -更不可见)。
			dashOffset: 0,
			transparent: true,
			sizeAttenuation: 0, //使线宽不变，不管距离(1个单位是屏幕上的1px)(0 -衰减，1 -不衰减)
			side: 2,
			depthTest: false,
			blending: THREE.AdditiveBlending,
		})
		let geometryLine = new THREE.BufferGeometry().setFromPoints(linepositions);
		let meshLine = new MeshLine()
		meshLine.setGeometry(geometryLine)
		let LineGeometry = new THREE.Mesh(meshLine.geometry, matLine);
		this.scene.add(LineGeometry);
		this.FirstObjs.push(mesh)
		this.FirstObjs.push(LineGeometry)
		return mesh 
	}
	//创建中心标签
	createLabel(datas){
		 let geometry=new THREE.CircleBufferGeometry(150000,1000)
		 let VertexShader =ShaderChunk.common + '\n' + ShaderChunk.logdepthbuf_pars_vertex +  `
		         varying vec2 vUv;	
		         void main(){		            
		             vec4 modelPosition=modelMatrix*vec4(position,1.);
		             vec4 viewPosition=viewMatrix*modelPosition;
		             vec4 projectedPosition=projectionMatrix*viewPosition;
		             gl_Position=projectedPosition;			            
		             vUv=uv;
		 			` + ShaderChunk.logdepthbuf_vertex + `
		         }
		 `;
		 
		 let FragmentShader =ShaderChunk.logdepthbuf_pars_fragment + `
		 #define PI 3.14159265359
		 #define TPI 6.28318530718
		 #define HPI 1.57079632679
		 varying vec2 vUv;
		 uniform float iTime;
		 uniform vec2 iResolution;
		 void main(){
		 	vec2 uv = vUv/iResolution;	 	
		 	float ratio = iResolution.x / iResolution.y;
		 	    uv.x *= ratio;
		 	    
		 	    vec2 toCenter = uv - vec2(0.5*ratio, 0.5);
		 	    float progress = fract(iTime*.1-0.2);
		 	    float progress2 = smoothstep(iTime*1., 0., 1.);
		 	    float radius = length(toCenter);
		 	    
		 	    float opacityInner = smoothstep(0., 0.2, progress);
		 	    float opacityInner2 = smoothstep(.52, .2, progress);
		 	    
		 	    float opacityOuter = smoothstep(0., 0.2, progress-0.2);
		 	    float opacityOuter2 = smoothstep(.52, .2, progress-0.2);
		 	   
		 	    float len = smoothstep(0., progress, radius);
		 	    float col = pow(len, 1.5) * smoothstep(1., .99, len);
		 	    
		 	    float len2 = smoothstep(0., progress-.2, radius);
		 	    float col2 = pow(len2, 1.5) * smoothstep(1., .99, len2);
		 	    
		 	    float circle1 = col * opacityInner * opacityInner2;
		 	    float circle2 = col2 * opacityOuter * opacityOuter2;
		 	    float centerDot = 1.-smoothstep(progress2*.07, progress2*.08, radius);
		 	    float highlight = 1.-smoothstep(progress2*.015, progress2*.02, length(toCenter+vec2(.01,-.01)));
		 	    
		 	    vec3 circleColor = vec3(.2, 0.212, 1.0);
		 	    vec3 dotColor1 = vec3(0.0, 1.0, .18);
		 	    vec3 dotColor2 = vec3(.0, 1.0, .118);
		 	    vec3 dotColor = mix(dotColor1, dotColor2, smoothstep(.85, .75, uv.y));
		 	
		 	    float opacity = 0.7;
		 	    vec3 wave = vec3(circle1 + circle2)*circleColor*opacity;
		 	    vec3 dott = vec3(centerDot)*dotColor;
		 	    vec3 highl = vec3(highlight)*0.3;
		 	
		 	    vec3 colFinal = wave + dott + highl;
			if(colFinal.r<0.5 &&colFinal.y<0.5 && colFinal.z<0.5)
			{
				discard;
			}
			else{
				gl_FragColor=vec4(colFinal,1.0);
			}			
		 	` + ShaderChunk.logdepthbuf_fragment + `
		 }
		 `;
		 let Material = new THREE.ShaderMaterial({
		 	vertexShader: VertexShader,
		 	fragmentShader: FragmentShader,
			side:2,
			depthTest:false,
			uniforms:{
				iTime:this.iTime,
				iResolution: {
					value: new THREE.Vector2(1, 1)
				},
			}
			
		 });
		 datas.forEach(item=>{
			 let mesh=new THREE.Mesh(geometry,Material)
			 mesh.position.set(item.position.x,item.position.y-100000,item.position.z)
			 mesh.rotation.x=Math.PI/2
			 this.scene.add(mesh)
			 this.FirstObjs.push(mesh)
			 this.addCssLabel(item.position,{x:0,y:Math.PI+0.3,z:0},item.name,1)
		 })
	}
	initStars(){
		const particleExplodeVertexShader =ShaderChunk.common + '\n' + ShaderChunk.logdepthbuf_pars_vertex +  `
				attribute float size;
				attribute vec3 color;
				attribute vec3 position2;
				varying vec3 Vcolor;
				varying float Vsize;
		        varying vec2 vUv;
				vec3 newPos;	
		        void main(){
					Vsize=size;
					Vcolor=color;
					newPos.x = position.x+position2.x;
					newPos.y = position.y+position2.y;
					newPos.z = position.z+position2.z;
					gl_PointSize=Vsize;			            
		            vec4 modelPosition=modelMatrix*vec4(newPos,1.);
		            vec4 viewPosition=viewMatrix*modelPosition;
		            vec4 projectedPosition=projectionMatrix*viewPosition;
		            gl_Position=projectedPosition;			            
		            vUv=uv;
					` + ShaderChunk.logdepthbuf_vertex + `
		        }
		`;
		
		const particleExplodeFragmentShader =ShaderChunk.logdepthbuf_pars_fragment + `			
		varying vec2 vUv;
		uniform float iTime;
		varying vec3 Vcolor;
		varying float Vsize;
		uniform sampler2D uTexture;
		void main(){
			float u = cos(1.0);
			float v = sin(1.0);
			vec2 uv = vec2(
			  u * (gl_PointCoord.x - 0.5) + v * (gl_PointCoord.y - 0.5) + 0.5, 
			  u * (gl_PointCoord.y - 0.5) - v * (gl_PointCoord.x - 0.5) + 0.5
			);
				float d = distance(gl_PointCoord, vec2(0.5, 0.5));
				if(d<0.5){
					gl_FragColor = vec4(Vcolor,1.0);
				}
				 else { discard; }		
			` + ShaderChunk.logdepthbuf_fragment + `
		}
		`;
		const particleExplodeMaterial = new THREE.ShaderMaterial({
			vertexShader: particleExplodeVertexShader,
			fragmentShader: particleExplodeFragmentShader,
		});
		const pointGeometry = new THREE.SphereBufferGeometry(this.r, 50,50);
		let positionsAr = pointGeometry.attributes.position.array
		const sizeArray = new Float32Array(positionsAr.length)
		//爆炸终点
		var position2 = new Float32Array(positionsAr.length);
		//颜色
		const colorArray = new Float32Array(positionsAr.length)
		for (var i = 0; i < positionsAr.length; i += 3) {
		    let direction=new THREE.Vector3(positionsAr[i], positionsAr[i+1], positionsAr[i+2]).normalize()
			position2[i] = direction.x*(Math.random()+1)*this.r
			position2[i + 1] = direction.y*(Math.random()+1)*this.r
			position2[i + 2] = direction.z*(Math.random()+1)*this.r
			colorArray[i] = Math.random();
			colorArray[i + 1] = Math.random();
			colorArray[i + 2] =Math.random();
			if (i % 9 === 0) {
				sizeArray[i] = 12
				sizeArray[i+1] = 4
				sizeArray[i+2] = 4
				
			}else{
				sizeArray[i] = 4
				sizeArray[i+1] = 4
				sizeArray[i+2] = 4
			}
		}
		pointGeometry.setAttribute('position2', new THREE.BufferAttribute(position2, 3));
		pointGeometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));
		pointGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
		this.starts = new THREE.Points(pointGeometry, particleExplodeMaterial)
		this.starts.position.set(0, 0, 0);
		this.starts.userData.type = 'Points'
		this.starts.layers.enable(1)
		this.scene.add(this.starts);
	}
	async initChina(){
		let res=await axios.get('./data/china.json')
		let chinaDatas=res.data.features
		let labelDatas=[]
		//let radomColors=['#fae0bf','#c7cde7','#fffdd7','#f8c7dc','#c5e4d4']
		let radomColors=['#0070bc','#0070bc','#0070bc','#0070bc','#0070bc',]
		let colors={
			'新疆':radomColors[0],
		    '西藏':radomColors[1],
            '内蒙古':radomColors[2],
            '青海':radomColors[3],
		    '四川':radomColors[0],
		    '黑龙江':radomColors[1],
			'甘肃':radomColors[1],
            '云南':radomColors[4],
			'广西':radomColors[2],
			'湖南':radomColors[4],
			'陕西':radomColors[3],
			'广东':radomColors[3],
			'吉林':radomColors[3],
			'河北':radomColors[3],
            '湖北':radomColors[2],
			'贵州':radomColors[3],
			'山东':radomColors[0],
			'江西':radomColors[1],
			'河南':radomColors[1],
			'辽宁':radomColors[4],
            '山西':radomColors[4],
			'安徽':radomColors[0],
			'福建':radomColors[0],
		    '浙江':radomColors[3],
            '江苏':radomColors[4],
			'重庆':radomColors[1],
			'宁夏':radomColors[0],
            '海南':radomColors[0],
			'台湾':radomColors[4],
			'北京':radomColors[0],
			'天津':radomColors[4],
			'上海':radomColors[0],
			'香港':radomColors[4],
			'澳门':radomColors[0]
		}
		chinaDatas.forEach(item=>{	
			let name=item.properties['name']
			labelDatas.push({
				name:name,
				position:this.getPosition(this.r*1.01,item.properties.cp[0],item.properties.cp[1])
			})
			if(item.geometry.type==='Polygon'){
				this.scene.add(this.createPolygon(item.geometry.coordinates[0],colors[name],name,item.properties.cp))
			}else{
				let Group=new THREE.Group()
				item.geometry.coordinates.forEach(geometry=>{					
					Group.add(this.createPolygon(geometry[0],colors[name],name,item.properties.cp))					
				})
				this.scene.add(Group)
			}
		})
		//创造标签
		this.createLabel(labelDatas)
	}
	changeFirst(val){
		if(this.FirstObjs.length===0){
			return
		}
		if(this.FirstObjs[0].visible===val){
			return
		}
		this.FirstObjs.forEach(item=>{
			item.visible=val
		})
	}
	changeSecond(val){
		if(this.SecondObjs.length===0){
			return
		}
		if(this.SecondObjs[0].visible===val){
			return
		}
		this.SecondObjs.forEach(item=>{
				item.visible=val
		})
	}
	render(){
		//通过相机高度控制一二级行政区划显示隐藏
		let distance=this.camera.position.distanceTo(new THREE.Vector3(0,0,0))
		if(distance<9530000){
			this.changeFirst(false)
			this.changeSecond(true)
		}else{
			this.changeFirst(true)
			this.changeSecond(false)
		}
		this.iTime.value+=0.01
		this.starts.rotation.y+=0.0005
		this.css3DRenderer.render(this.scene, this.camera)
		if (this.matLine) {
			this.matLine.uniforms.dashOffset.value -= 0.005
		}
	}
	getPosition(R,longitude, latitude) {      // 经度，纬度转换为坐标      
	  let lg = (Number(longitude) + 90) * (Math.PI / 180);      
	  let lt = Number(latitude) * (Math.PI / 180);      // 获取x，y，z坐标      
	  let temp = R * Math.cos(lt);      
	  let x = temp * Math.sin(lg);      
	  let y = R * Math.sin(lt);      
	  let z = temp * Math.cos(lg);      
	  return new THREE.Vector3(x, y, z);  
	}
	initGlobeMesh(){
		let globeGeometry=new THREE.SphereBufferGeometry(this.r, 100, 100);
		let texture = new THREE.TextureLoader().load('./images/earth.jpg');
		let textureSpe = new THREE.TextureLoader().load('./images/earthSpec.jpg');
		let textureNormal = new THREE.TextureLoader().load('./images/earthNormal.jpg');
		let materGlobe = new THREE.MeshPhongMaterial({
			map: texture,
			specularMap:textureSpe,
			normalMap: textureNormal,
		})
		let meshGlobe = new THREE.Mesh(globeGeometry, materGlobe)
		
		let Group=new THREE.Group()
		Group.add(meshGlobe);
		
		
		//顶点着色器
		let VSHADER_SOURCE =ShaderChunk.common + '\n' + ShaderChunk.logdepthbuf_pars_vertex + `
		  varying vec2 v_Uv; 
		  void main () {
		    v_Uv = uv;       //顶点纹理坐标
		    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4( position, 1.0 );
			` + ShaderChunk.logdepthbuf_vertex + `
		  }
		`
		
		//片元着色器
		let FSHADER_SOURCE =ShaderChunk.logdepthbuf_pars_fragment + `
		  uniform float time;      //时间变量
		  uniform sampler2D fTexture;    //大气纹理图像
		  uniform sampler2D nTexture;    //噪声纹理图像
		  varying vec2 v_Uv;              //片元纹理坐标
		  void main () {
		    vec2 new_Uv= v_Uv + vec2( 0.01, 0.01 ) * time;   //向量加法，根据时间变量计算新的纹理坐标
		    
		    //利用噪声随机使纹理坐标随机化
		    vec4 noise_Color = texture2D( nTexture, new_Uv );    
		    new_Uv.x += noise_Color.r * 0.2;
		    new_Uv.y += noise_Color.g * 0.2;
		    
		    gl_FragColor = texture2D( fTexture, new_Uv );  //提取大气纹理图像的颜色值（纹素）
			` + ShaderChunk.logdepthbuf_fragment + `
		  }
		`
		
		let flowTexture = new THREE.TextureLoader().load('./images/aerosphere.png')
		flowTexture.wrapS = THREE.RepeatWrapping
		flowTexture.wrapT = THREE.RepeatWrapping
		
		let noiseTexture =new THREE.TextureLoader().load('./images/norse.png')
		noiseTexture.wrapS = THREE.RepeatWrapping
		noiseTexture.wrapT = THREE.RepeatWrapping
		
		//着色器材质
		let flowMaterial = new THREE.ShaderMaterial({
		    uniforms: {
		      fTexture: {
		        value: flowTexture,  
		      },
		      nTexture: {
		        value: noiseTexture,
		      },
		      time: this.iTime,
		    },
		    // 顶点着色器
		    vertexShader: VSHADER_SOURCE,
		    // 片元着色器
		    fragmentShader:FSHADER_SOURCE,
		    transparent: true
		})
		let fgeometry = new THREE.SphereGeometry(this.r*1.01,100,100)   //创建比基础球体略大的球状几何体
		let fsphere = new THREE.Mesh(fgeometry, flowMaterial)    //创建大气球体
		Group.add(fsphere)
		
		let Atgeometry = new THREE.SphereGeometry(this.r*1.01,100,100)   //创建比基础球体略大的球状几何体
		let atMaterial=new THREE.MeshPhongMaterial({
			transparent:true,
			opacity:0.05,
			color:"#00ffff"
		})
		let atphere = new THREE.Mesh(Atgeometry, atMaterial)    //创建大气球体
		Group.add(atphere)            //设置精灵的尺寸
		Group.position.set(0,0,0)
		Group.userData.type = 'Globe'
		return Group
	}
}
export {
	Globe
}
