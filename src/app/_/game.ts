import {
    tgdActionCreateCameraInterpolation,
    tgdCalcRandom,
    TgdCameraPerspective,
    TgdContext,
    TgdControllerCameraOrbit,
    tgdEasingFunctionOutBack,
    TgdGeometryBox,
    tgdLoadAssets,
    TgdMaterialGlobal,
    TgdMaterialNormals,
    TgdPainterClear,
    TgdPainterMesh,
    TgdPainterMeshGltf,
    TgdPainterState,
    TgdQuat,
    TgdTextureCube,
    webglPresetCull,
    webglPresetDepth,
} from "@tolokoban/tgd"

import SuzanneURL from "@/assets/mesh/suzanne.glb"
import PosX from "@/assets/cubemap/sky-lowres/posX.webp"
import PosY from "@/assets/cubemap/sky-lowres/posY.webp"
import PosZ from "@/assets/cubemap/sky-lowres/posZ.webp"
import NegX from "@/assets/cubemap/sky-lowres/negX.webp"
import NegY from "@/assets/cubemap/sky-lowres/negY.webp"
import NegZ from "@/assets/cubemap/sky-lowres/negZ.webp"

export function useGameHandler() {
    return (canvas: HTMLCanvasElement | null) => {
        if (!canvas) return

        const camera = new TgdCameraPerspective({
            transfo: {
                distance: 3,
                position: [0, 0, 0],
                orientation: new TgdQuat()
                    .face("+Y+Z+X")
                    .rotateAroundX(tgdCalcRandom(2 * Math.PI))
                    .rotateAroundY(tgdCalcRandom(2 * Math.PI)),
            },
            far: 1000,
            near: 0.1,
            fovy: Math.PI / 4,
            zoom: 0.1,
        })
        const context = new TgdContext(canvas, { camera })
        context.paint()
        loadMesh(context)
        return () => context.delete()
    }
}

async function loadMesh(context: TgdContext) {
    const assets = await tgdLoadAssets({
        glb: {
            suzanne: SuzanneURL,
        },
        img: {
            posX: PosX,
            posY: PosY,
            posZ: PosZ,
            negX: NegX,
            negY: NegY,
            negZ: NegZ,
        },
    })
    const material = new TgdMaterialGlobal({
        ambientColor: new TgdTextureCube(context, {
            imagePosX: assets.img.posX,
            imagePosY: assets.img.posY,
            imagePosZ: assets.img.posZ,
            imageNegX: assets.img.negX,
            imageNegY: assets.img.negY,
            imageNegZ: assets.img.negZ,
        }),
    })
    const mesh = new TgdPainterMeshGltf(context, {
        asset: assets.glb.suzanne,
        material,
    })
    const state = new TgdPainterState(context, {
        depth: webglPresetDepth.lessOrEqual,
        cull: webglPresetCull.back,
        children: [
            new TgdPainterClear(context, {
                color: [0, 0.1, 0.2, 1],
                depth: 1,
            }),
            mesh,
        ],
    })
    context.add(state)
    context.paint()
    state.add(mesh)
    context.animSchedule({
        action: tgdActionCreateCameraInterpolation(context.camera, {
            zoom: 1,
            orientation: new TgdQuat(),
        }),
        duration: 2,
        easingFunction: tgdEasingFunctionOutBack,
        onEnd() {
            new TgdControllerCameraOrbit(context, {
                inertiaOrbit: 900,
            })
        },
    })
}
