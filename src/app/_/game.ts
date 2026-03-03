import {
	TgdCameraPerspective,
	TgdContext,
	TgdControllerCameraOrbit,
	TgdMaterialGlobal,
	TgdPainterClear,
	TgdPainterMeshGltf,
	TgdPainterState,
	TgdTextureCube,
	tgdCalcDegToRad,
	tgdCalcRandom,
	tgdLoadAssets,
	webglPresetCull,
	webglPresetDepth,
} from "@tolokoban/tgd";
import NegX from "@/assets/cubemap/sky-lowres/negX.webp";
import NegY from "@/assets/cubemap/sky-lowres/negY.webp";
import NegZ from "@/assets/cubemap/sky-lowres/negZ.webp";
import PosX from "@/assets/cubemap/sky-lowres/posX.webp";
import PosY from "@/assets/cubemap/sky-lowres/posY.webp";
import PosZ from "@/assets/cubemap/sky-lowres/posZ.webp";
import CityURL from "@/assets/mesh/city.glb";
import { MaterialFog } from "./material-fog";

export function useGameHandler() {
	return (canvas: HTMLCanvasElement | null) => {
		if (!canvas) return;

		const camera = new TgdCameraPerspective({
			transfo: {
				position: [0, 0, 0.1],
			},
			far: 400,
			near: 10,
			fovy: tgdCalcDegToRad(30),
			zoom: 0.1,
		});
		camera.spaceWidthAtTarget = 160;
		const context = new TgdContext(canvas, { camera });
		const orbit = new TgdControllerCameraOrbit(context, {
			geo: {
				lat: tgdCalcDegToRad(30),
				lng: tgdCalcDegToRad(tgdCalcRandom(360)),
				minLat: tgdCalcDegToRad(20),
				maxLat: tgdCalcDegToRad(30),
			},
			maxZoom: 1,
			minZoom: 1,
			inertiaOrbit: 3000,
		});
		context.paint();
		loadMesh(context);
		return () => context.delete();
	};
}

async function loadMesh(context: TgdContext) {
	const assets = await tgdLoadAssets({
		glb: {
			suzanne: CityURL,
		},
		img: {
			posX: PosX,
			posY: PosY,
			posZ: PosZ,
			negX: NegX,
			negY: NegY,
			negZ: NegZ,
		},
	});
	const material = new MaterialFog({
		ambientColor: new TgdTextureCube(context, {
			imagePosX: assets.img.posX,
			imagePosY: assets.img.posY,
			imagePosZ: assets.img.posZ,
			imageNegX: assets.img.negX,
			imageNegY: assets.img.negY,
			imageNegZ: assets.img.negZ,
		}),
	});
	const mesh = new TgdPainterMeshGltf(context, {
		asset: assets.glb.suzanne,
		material,
	});
	const state = new TgdPainterState(context, {
		depth: webglPresetDepth.lessOrEqual,
		cull: webglPresetCull.back,
		children: [
			new TgdPainterClear(context, {
				color: [1, 0.667, 0, 1],
				depth: 1,
			}),
			mesh,
		],
	});
	context.add(state);
	state.add(mesh);
	context.play();
}
