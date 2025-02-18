import * as THREE from 'three'
import {
	OrbitControls
} from 'three/examples/jsm/controls/OrbitControls.js'
import {
	FXAAShader
} from 'three/examples/jsm/shaders/FXAAShader.js'
import {
	ShaderPass
} from 'three/examples/jsm/postprocessing/ShaderPass.js'
import {
	EffectComposer
} from 'three/examples/jsm/postprocessing/EffectComposer.js'
import {
	RenderPass
} from 'three/examples/jsm/postprocessing/RenderPass.js'
import {
	UnrealBloomPass
} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import {
	OutlinePass
} from 'three/examples/jsm/postprocessing/OutlinePass.js'
import {Globe} from './globe'
class ThreeScene {
	constructor(renderer, options = {}) {
		// 添加相机与场景
		this.renderer = renderer
		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 6378137*2.0)
		this.scene.add(this.camera)
		//初始化控制器
		this.controls = this.initControls(this.renderer, options.position, options.center)

		//添加天空
		this.initSky()
    //初始化地球
		this.globe=new Globe(this.scene,this.camera)
		
		//初始化灯光
		this.initLights()
		//创建后处理
		this.initPostrender(this.renderer)
		//创建相交判断几何体
		this.checkeMeshs = []
		this.outlinePass.selectedObjects.push(this.globe.mesh.children[2])
		
	}
	initLights(){
     // 添加环境光与平行光
		var ambient = new THREE.AmbientLight('rgb(255, 255, 255)', 0.14)
		this.scene.add(ambient)
		// 添加半球光
		var hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xabb2b7, 0.08)
		this.scene.add(hemisphereLight)

		this.addDirectionalLight(0, 700000000, 0, 0.4)
		this.addDirectionalLight(700000000, 0, 0, 0.6)
		this.addDirectionalLight(-700000000, 0, 0, 0.6)
		this.addDirectionalLight(0, 0, 700000000, 0.6)
		this.addDirectionalLight(0, 0, -700000000, 0.6)
	}
	//创建循环
	render() {
		let T = this	
		this.renderer.render(this.scene, this.camera)
		this.globe.render()
		this.scene.traverse(darkenNonBloomed)
		this.bloomComposer.render()
		this.scene.traverse(restoreMaterial)
		this.finalComposer.render()
		
		this.controls.update()
		function darkenNonBloomed(obj) {
			if (obj instanceof THREE.Scene) { // 此处忽略Scene，否则场景背景会被影响
				T.materials.scene = obj.background;
				obj.background = null;
				return;
			}
			if (T.bloomLayer.test(obj.layers) === false) {
				T.materials[obj.uuid] = obj.material
				obj.material = T.darkMaterial
			}
		}

		function restoreMaterial(obj) {
			if (obj instanceof THREE.Scene) {
				obj.background = T.materials.scene;
				delete T.materials.scene;
				return;
			}
			if (T.materials[obj.uuid]) {
				obj.material = T.materials[obj.uuid]
				delete T.materials[obj.uuid]
			}
		}
	}
	//创建后处理
	initPostrender(renderer) {
		// 局部泛光相关
		this.outlinePass = null
		this.materials = {} // 存放局部泛光材质
		this.bloomLayer = new THREE.Layers()
		this.bloomLayer.set(1) // 局部泛光对照图层
		this.darkMaterial = new THREE.MeshBasicMaterial({
			color: 'black',
			//transparent: true,
			//opacity: 0
		}) // 局部泛光默认材质
		this.finalComposer = null // 后期渲染最终通道
		this.bloomComposer = null // 后期渲染泛光通道
		let effectFXAA = new ShaderPass(FXAAShader)
		effectFXAA.uniforms['resolution'].value.set(
			1 / window.innerWidth,
			1 / window.innerHeight
		) // 渲染区域Canvas画布宽高度  不一定是全屏，也可以是区域值
		effectFXAA.renderToScreen = true
		let renderScene = new RenderPass(this.scene, this.camera)
		this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this
			.camera)
		this.outlinePass.renderToScreen = false
		this.outlinePass.edgeStrength = 1.5// 粗
		this.outlinePass.edgeGlow = 4 // 发光
		this.outlinePass.edgeThickness = 1.5 // 光晕粗
		this.outlinePass.pulsePeriod = 0 // 闪烁
		this.outlinePass.usePatternTexture = false // 是否使用贴图
		this.outlinePass.visibleEdgeColor.set('#00ffff') // 设置显示的颜色
		this.outlinePass.hiddenEdgeColor.set('#55ff7f') // 设置隐藏的颜色
		let bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight))
		bloomPass.threshold = 0
		bloomPass.strength = 1.4
		bloomPass.radius = 0.1

		this.bloomComposer = new EffectComposer(renderer)
		this.bloomComposer.renderToScreen = false
		this.bloomComposer.addPass(renderScene)
		this.bloomComposer.addPass(this.outlinePass)
		this.bloomComposer.addPass(bloomPass)

		this.bloomComposer.addPass(effectFXAA) // 去掉锯齿
		let finalPass = new ShaderPass(
			new THREE.ShaderMaterial({
				uniforms: {
					baseTexture: {
						value: null
					},
					bloomTexture: {
						value: this.bloomComposer.renderTarget2.texture
					}
				},
				vertexShader: `varying vec2 vUv;
	void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	}`,
				fragmentShader: `uniform sampler2D baseTexture;
	uniform sampler2D bloomTexture;
	varying vec2 vUv;
	void main() {
	gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.5) * texture2D( bloomTexture, vUv ) );
	}`,
				defines: {}
			}), 'baseTexture'
		)
		finalPass.needsSwap = true
		this.finalComposer = new EffectComposer(renderer)
		this.finalComposer.addPass(renderScene)
		this.finalComposer.addPass(finalPass)
		this.finalComposer.addPass(effectFXAA)
	}
	//移除某个物体
	removeObj(obj) {
		let index = this.checkeMeshs.indexOf(obj)
		this.checkeMeshs.splice(index, 1)
		if (obj.geometry) obj.geometry.dispose()

		if (obj.material) {
			// in case of map, bumpMap, normalMap, envMap ...
			Object.keys(obj.material).forEach(prop => {
				if (!obj.material[prop]) {
					return
				}
				if (typeof obj.material[prop].dispose === 'function') {
					obj.material[prop].dispose()
				}
			})
			obj.material.dispose()
		}
		this.scene.remove(obj)
	}
	//初始化天空盒子
	initSky() {
		const loader = new THREE.CubeTextureLoader()
		const texture = loader.load([
			'./images/星空/px.png',
			'./images/星空/nx.png',
			'./images/星空/py.png',
			'./images/星空/ny.png',
			'./images/星空/pz.png',
			'./images/星空/nz.png'
		])
		this.scene.background = texture
	}
	
	//销毁场景
	destroy() {
		clearThree(this.scene)

		function clearThree(obj) {
			while (obj.children.length > 0) {
				clearThree(obj.children[0])
				obj.remove(obj.children[0])
			}
			if (obj.geometry) obj.geometry.dispose()

			if (obj.material) {
				// in case of map, bumpMap, normalMap, envMap ...
				Object.keys(obj.material).forEach(prop => {
					if (!obj.material[prop]) {
						return
					}
					if (typeof obj.material[prop].dispose === 'function') {
						obj.material[prop].dispose()
					}
				})
				obj.material.dispose()
			}
		}
		this.outlinePass.dispose()
		this.scene = null
		this.camera = null
		this.controls = null
		this.outlinePass = null
		this.finalComposer.reset()
		this.bloomComposer.reset()
		this.darkMaterial.dispose()
		for (var key in this.materials) {
			if (this.materials[key]) {
				this.materials[key].dispose()
			}
		}
		this.materials = {} // 存放局部泛光材质
		this.bloomLayer = null
		this.darkMaterial = null
		this.finalComposer = null // 后期渲染最终通道
		this.bloomComposer = null // 后期渲染泛光通道
		this.renderer.dispose()
		this.renderer.forceContextLoss()
		let gl = renderer.domElement.getContext('webgl')
		gl && gl.getExtension('WEBGL_lose_context').loseContext()
		this.renderer = null
	}
	//相机移动动画
	fly(position, center, duration, callback) {
		let current = {
			positionX: this.camera.position.x,
			positionY: this.camera.position.y,
			positionZ: this.camera.position.z,
			centerX: this.controls.target.x,
			centerY: this.controls.target.y,
			centerZ: this.controls.target.z
		}
		var tween = new TWEEN.Tween(current)
		tween.to({
			positionX: position.x,
			positionY: position.y,
			positionZ: position.z,
			centerX: center.x,
			centerY: center.y,
			centerZ: center.z
		}, duration * 1000)
		tween.onUpdate(() => {
			if (this.camera && this.controls) {
				this.camera.position.set(current.positionX, current.positionY, current.positionZ)
				this.controls.target.set(current.centerX, current.centerY, current.centerZ)
			}
		})
		tween.easing(TWEEN.Easing.Quintic.InOut)
		tween.onComplete(function () {
			if (callback) {
				callback()
			}
		})
		tween.start()
	}
	//设置相机参数
	setCamera(position, center) {
		this.camera.position.set(position.x, position.y, position.z)
		this.controls.target.set(center.x, center.y, center.z)
	}
	//添加灯
	addPointLight(x, y, z, instance, notShadow) {
		var PointLight = new THREE.PointLight('#ffffff', instance || 1.05, 100000)
		this.scene.add(PointLight)
		PointLight.castShadow = !notShadow
		PointLight.position.set(x, y, z)
		PointLight.shadow.mapSize.width = 4096 // default
		PointLight.shadow.mapSize.height = 4096 // default
	}
	//初始化相机控制器
	initControls(renderer, position, center) {
		let locationPosition = position || {
			x: -4026312.015628185,
			y: 11013174.926500259,
			z: -13215573.72673924
		}
		let locationCenter = center || {
			x: 419584.2036204523,
			y: -217092.47868811156,
			z: -151656.06970733873
		}
		let controls = new OrbitControls(this.camera, renderer.domElement)
		// 使动画循环使用时阻尼或自转 意思是否有惯性
		controls.enableDamping = true
		// 动态阻尼系数 就是鼠标拖拽旋转灵敏度
		// controls.dampingFactor = 0.25;
		// 是否可以缩放
		controls.maxDistance=6378137*2.3
		controls.enableZoom = true
		// 是否自动旋转
		// controls.autoRotate = true;
		// controls.autoRotateSpeed = 0.5;
		// 设置相机距离原点的最远距离
		// 是否开启右键拖拽
		controls.enablePan = true
		this.camera.position.set(locationPosition.x, locationPosition.y, locationPosition.z)
		controls.target.set(locationCenter.x, locationCenter.y, locationCenter.z)
		return controls
	}
	//添加平行光
	addDirectionalLight(x, y, z, instance) {
		var directionalLight = new THREE.DirectionalLight(
			0xffffff,
			instance || 0.6
		) // 平行光
		directionalLight.position.set(x, y, z)
		var target = new THREE.Object3D()
		target.position.set(0, 5, 0)
		directionalLight.shadow.camera.near = 2
		directionalLight.shadow.camera.far = 2800
		directionalLight.shadow.camera.left = 6000
		directionalLight.shadow.camera.right = -6000
		directionalLight.shadow.camera.top = 6000
		directionalLight.shadow.camera.bottom = -6000
		directionalLight.shadow.mapSize.width = 10048
		directionalLight.shadow.mapSize.height = 10048
		directionalLight.shadow.mapSize.width = 3250
		directionalLight.shadow.mapSize.height = 3250
		directionalLight.shadowCascade = true
		directionalLight.shadowCascadeCount = 1000
		directionalLight.shadowCascadeBias = 0.45
		directionalLight.shadowCascadeWidth = 1024
		directionalLight.shadowCascadeHeight = 1024
		directionalLight.shadow.radius = 4
		directionalLight.shadow.bias = -0.001
		directionalLight.target = target
		this.scene.add(directionalLight)
	}
}
export {
	ThreeScene
}
