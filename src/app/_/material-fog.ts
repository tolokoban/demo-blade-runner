import {
	type ArrayNumber3,
	type ArrayNumber4,
	type TgdCodeBloc,
	type TgdLight,
	TgdMaterial,
	type TgdMaterialContext,
	TgdTexture2D,
	TgdTextureCube,
	TgdVec3,
	TgdVec4,
	tgdCanvasCreateFill,
	tgdCodeFunction_mapRange,
	tgdCodeFunction_perlinNoise,
	type WebglAttributeType,
	type WebglUniformType,
} from "@tolokoban/tgd";

export type MaterialFogOptions = Partial<{
	color: TgdVec4 | ArrayNumber4 | TgdTexture2D;
	lights: TgdLight[];
	ambientColor: TgdVec3 | ArrayNumber3 | TgdTextureCube;
	ambientIntensity: number;
	specularExponent: number;
	specularIntensity: number;
	normalMap: TgdTexture2D;
}>;

const DEFAULT_COLOR = new TgdVec4(0.05, 0.09, 0.1, 1);
const DEFAULT_AMBIENT = new TgdVec3(0.8, 0.8, 0.8);

export class MaterialFog extends TgdMaterial {
	public specularExponent = 2.2;
	public specularIntensity = 5;

	private textureColor: TgdTexture2D | null = null;
	private mustDeleteTextureColor = false;
	private textureAmbient: TgdTextureCube | null = null;
	private mustDeleteTextureAmbient = false;

	constructor(private readonly options: MaterialFogOptions = {}) {
		const uniforms: { [name: string]: WebglUniformType } = {
			uniTransfoMatrix: "mat4",
			uniSpecularExponent: "float",
			uniSpecularIntensity: "float",
			texColor: "sampler2D",
			texAmbient: "samplerCube",
			uniCameraPosition: "vec3",
			uniTime: "float",
		};
		const fragmentShaderCode: TgdCodeBloc = [
			"vec3 N = normalize(varNormal);",
			"vec3 L = normalize(varPosition.xyz - uniCameraPosition);",
			"vec3 R = reflect(L, N);",
			"vec3 color = texture(texAmbient, R).rgb;",
			"color = pow(color, vec3(uniSpecularExponent));",
			"color *= uniSpecularIntensity;",
			// "color = varFog > 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0);",
			"float fog = varFog + .2 * perlinNoise(vec3(gl_FragCoord.xy * .005, uniTime));",
			"fog = clamp(fog, 0.0, 1.0);",
			"vec4 final = mix(",
			[
				"vec4(color, 1) * texture(texColor, varUV),",
				"vec4(1, .667, 0, 1),",
				"fog",
			],
			");",
			"return final;",
		];
		const varyings: { [name: string]: WebglAttributeType } = {
			varUV: "vec2",
			varNormal: "vec3",
			varPosition: "vec4",
			varFog: "float",
		};
		const vertexShaderCode = () => {
			const code: TgdCodeBloc = [
				`varUV = ${this.attUV};`,
				`varNormal = mat3(uniTransfoMatrix) * ${this.attNormal};`,
				`varPosition = uniTransfoMatrix * ${this.attPosition};`,
				"varFog = clamp(mapRange(gl_Position.w, 50.0, 200.0, 0.0, 1.0), 0.0, 1.0);",
			];
			return code;
		};

		super({
			delete: () => {
				if (this.mustDeleteTextureAmbient) this.textureAmbient?.delete();
				if (this.mustDeleteTextureColor) this.textureColor?.delete();
			},
			uniforms,
			varyings,
			extraVertexShaderFunctions: {
				...tgdCodeFunction_mapRange(),
			},
			vertexShaderCode,
			extraFragmentShaderFunctions: {
				...tgdCodeFunction_perlinNoise(),
			},
			fragmentShaderCode,
			setUniforms: ({ program, context, time }: TgdMaterialContext) => {
				if (!this.textureColor) {
					// Lazy creation of a texture from an unique color.
					this.textureColor = new TgdTexture2D(context);
					const color = this.options.color ?? DEFAULT_COLOR;
					if (!(color instanceof TgdTexture2D)) {
						this.textureColor.loadBitmap(tgdCanvasCreateFill(1, 1, color));
					}
					this.mustDeleteTextureColor = true;
				}
				if (!this.textureAmbient) {
					// Lazy creation of a texture from an unique color.
					const color = this.options.ambientColor ?? DEFAULT_AMBIENT;
					const canvas = tgdCanvasCreateFill(
						1,
						1,
						color instanceof TgdTextureCube ? DEFAULT_AMBIENT : color,
					);
					this.textureAmbient = new TgdTextureCube(program, {
						imagePosX: canvas,
						imagePosY: canvas,
						imagePosZ: canvas,
						imageNegX: canvas,
						imageNegY: canvas,
						imageNegZ: canvas,
					});
					this.mustDeleteTextureAmbient = true;
				}
				this.textureColor.activate(0, program, "texColor");
				this.textureAmbient.activate(1, program, "texAmbient");
				program.uniform3fv(
					"uniCameraPosition",
					context.camera.transfo.actualPosition,
				);
				program.uniform1f("uniSpecularExponent", this.specularExponent);
				program.uniform1f("uniSpecularIntensity", this.specularIntensity);
				program.uniform1f("uniTime", time * 0.5);
			},
		});

		// if (options.light) {
		//     this.light = options.light
		// }
		// if (options.ambient) {
		//     this.ambient = options.ambient
		// }
		if (typeof options.specularExponent === "number") {
			this.specularExponent = options.specularExponent;
		}
		if (typeof options.specularIntensity === "number") {
			this.specularIntensity = options.specularIntensity;
		}
		if (options.color instanceof TgdTexture2D) {
			this.textureColor = options.color;
		}
		if (options.ambientColor instanceof TgdTextureCube) {
			this.textureAmbient = options.ambientColor;
		}
	}
}
