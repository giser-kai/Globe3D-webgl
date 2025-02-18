import {Group,Box3,Vector2}  from 'three'
class Util {
	constructor() {

	}
	//纠正物体UV
	reMapUv(obj) {
		let temp = new Group()
		temp.add(obj.clone())
		let box = new Box3().setFromObject(temp)

		var max = box.max,
			min = box.min;
		var offset = new Vector2(0 - min.x, 0 - min.y);
		var range = new Vector2(max.x - min.x, max.y - min.y);

		var uvAttribute = obj.geometry.attributes.uv;
		for (var i = 0; i < uvAttribute.count; i++) {

			var u = uvAttribute.getX(i);
			var v = uvAttribute.getY(i);
			u = (u + offset.x) / range.x
			v = (v + offset.y) / range.y
			uvAttribute.setXY(i, u, v);
		}
		uvAttribute.needsUpdate = true;

	}
}
export {
	Util
}
