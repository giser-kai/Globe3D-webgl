//3D主页面
<template>
	<div class="ThreeDContain">
		<div class="boxContainer">
			<div class="panel" v-for="(item,index) in panels" :key="item.id" :id="item.id">{{item.name}}</div>
		</div>
		<div id="threeContain" />
	</div>
</template>

<script>
	import * as THREE from 'three'
	import {
		ThreeScene
	} from '@/assets/js/scene.js'
	let renderer;

	let animationID = null;
	let pickobj = null
	let scene = null
	export default {
		name: 'BathThree',
		data() {
			return {
				panels: []
			}
		},
		computed: {},
		watch: {},
		beforeDestroy() {
			cancelAnimationFrame(animationID) // 去除animationFrame
			if (scene) {
				scene.destroy()
			}
			renderer.dispose()
			renderer.forceContextLoss()
			let gl = renderer.domElement.getContext('webgl')
			gl && gl.getExtension('WEBGL_lose_context').loseContext()
			renderer = null
			pickobj = null
			scene = null
		},
		mounted() {
			this.initRender() // 创建渲染器
			this.initMouseClick() // 鼠标事件开启
			this.initBaseScene()
			this.render() // 开启场景渲染
		},
		methods: {
			initBaseScene() {
				scene = new ThreeScene(renderer)
				scene.fly({
					x: -2830839.1396753266,
					y: 6489563.651573767,
					z: -8581448.446586402
				}, {
					x: 758859.0205470724,
					y: -168768.41733446065,
					z: -303815.40145511914
				}, 3)
			},
			render() {
				animate()

				function animate() {
					animationID = requestAnimationFrame(animate)
					if (scene) {
						scene.render()
					}
					TWEEN.update()
				}
				// 自适应窗口大小
				window.addEventListener('resize', onResize, false)

				function onResize() {
					if (renderer) {
						scene.camera.aspect = window.innerWidth / window.innerHeight
						scene.camera.updateProjectionMatrix()
						renderer.setSize(window.innerWidth, window.innerHeight)
						scene.globe.css3DRenderer.setSize(window.innerWidth, window.innerHeight)
					}
				}
			},
			initRender() {
				renderer = new THREE.WebGLRenderer({
					logarithmicDepthBuffer: true,
					antialias: true // 抗锯齿
				})
				renderer.setSize(window.innerWidth, window.innerHeight) // 设置渲染区域尺寸
				renderer.setClearColor('rgb(255, 255, 255)', 0) // 设置背景颜色
				renderer.shadowMap.enabled = true
				renderer.shadowMap.type = THREE.PCFSoftShadowMap
				// renderer.toneMapping = THREE.ReinhardToneMapping;
				renderer.setPixelRatio(window.devicePixelRatio)
				// three.js 的色彩空间渲染方式【重要】
				renderer.outputEncoding = THREE.sRGBEncoding
				let dom = document.getElementById('threeContain')
				dom.appendChild(renderer.domElement) // body元素中插入canvas对象
			},
			initMouseClick() {
				// 键盘事件,获取当前相机视点
				document.onkeydown = (e) => {
					let keyCode = window.event ? e.keyCode : e.which
					switch (keyCode) {
						// "E"
						case 69:
							console.log(scene.camera.position, scene.controls.target)
							break
					}
				}
				// 鼠标事件
				var raycaster = new THREE.Raycaster()
				var mouse = new THREE.Vector2()
				var hoverObj =null
				var needUp = false
				var obj = {}
				renderer.domElement.addEventListener('mousedown', (event) => {
					if (event.button === 0) {
						needUp = true
					}
				})
				renderer.domElement.addEventListener('mousemove', (event) => {
					if (event.pageX === obj.x && event.pageY === obj.y) {
						return
				    }
					needUp = false
					renderer.domElement.style.cursor = 'auto'
					mouse.x = (event.clientX / window.innerWidth) * 2 - 1
					mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
					raycaster.setFromCamera(mouse, scene.camera)
					var intersects = raycaster.intersectObjects(scene.globe.FirstObjs, true)
					if (hoverObj) {
						hoverObj.material.color=new THREE.Color(hoverObj.userData.color) 
						hoverObj=null
					}
					if (intersects.length > 0) {
						
						let data=intersects.find(item=>{
							return item.object.userData.type==='区划面'
						})
						if (data) {
							renderer.domElement.style.cursor = 'pointer'
							hoverObj=data.object
							hoverObj.material.color=new THREE.Color('#0055ff') 
						}
					}
				})
				renderer.domElement.addEventListener('mouseup', (event) => {
					obj.x = event.pageX
					obj.y = event.pageY
					if (event.button === 0 && needUp) {
						mouse.x = (event.clientX / window.innerWidth) * 2 - 1
						mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
						raycaster.setFromCamera(mouse, scene.camera)
						var intersects = raycaster.intersectObjects(scene.scene.children, true)
					}
				})
				renderer.domElement.addEventListener('dblclick', (event) => {
					mouse.x = (event.clientX / window.innerWidth) * 2 - 1
					mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
					raycaster.setFromCamera(mouse, scene.camera)
					var intersects = raycaster.intersectObjects(scene.scene.children, true)
					if (intersects.length > 0) {
						let data=intersects.find(item=>{
							return item.object.userData.type==='区划面'
						})
						if (data) {
							let centerPosition=scene.globe.getPosition(scene.globe.r,data.object.userData.center[0],data.object.userData.center[1])
							let cameraPosition=scene.globe.getPosition(scene.globe.r*1.2,data.object.userData.center[0],data.object.userData.center[1]) 
						    scene.fly(cameraPosition,centerPosition,2)
							
						}
					}
				})
			}
		}
	}
</script>

<style lang="less" scoped>
	.ThreeDContain {
		#threeContain {
			width: 100%;
			height: 100%;
			position: relative;
		}

		.boxContainer {
			width: 100%;
			height: 100%;
			position: absolute;
			display: none;

			.panel {
				width: 400px;
				height: 400px;
				text-align: center;
				border: none;
				outline: none;
				color: aqua;
				text-shadow: 0 0 5px #fff, 0 0 20px #00a67c, 0 0 35px #00a67c, 0 0 62px #00a67c;
				font-size: 56px;
				padding: 10px;
			}

			.panel:hover {
				color: blue;
			}
		}
	}
</style>
