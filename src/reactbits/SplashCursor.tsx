"use client";
import { useEffect, useRef } from "react";

interface ColorRGB { r: number; g: number; b: number }

interface SplashCursorProps {
  SIM_RESOLUTION?: number;
  DYE_RESOLUTION?: number;
  CAPTURE_RESOLUTION?: number;
  DENSITY_DISSIPATION?: number;
  VELOCITY_DISSIPATION?: number;
  PRESSURE?: number;
  PRESSURE_ITERATIONS?: number;
  CURL?: number;
  SPLAT_RADIUS?: number;
  SPLAT_FORCE?: number;
  SHADING?: boolean;
  COLOR_UPDATE_SPEED?: number;
  BACK_COLOR?: ColorRGB;
  TRANSPARENT?: boolean;
}

interface Pointer {
  id: number; texcoordX: number; texcoordY: number; prevTexcoordX: number; prevTexcoordY: number; deltaX: number; deltaY: number; down: boolean; moved: boolean; color: ColorRGB;
}

function pointerPrototype(): Pointer {
  return { id: -1, texcoordX: 0, texcoordY: 0, prevTexcoordX: 0, prevTexcoordY: 0, deltaX: 0, deltaY: 0, down: false, moved: false, color: { r: 0, g: 0, b: 0 } };
}

export default function SplashCursor({
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 720,
  CAPTURE_RESOLUTION = 512,
  DENSITY_DISSIPATION = 4.5,
  VELOCITY_DISSIPATION = 2.5,
  PRESSURE = 0.12,
  PRESSURE_ITERATIONS = 18,
  CURL = 3,
  SPLAT_RADIUS = 0.18,
  SPLAT_FORCE = 1200,
  SHADING = false,
  COLOR_UPDATE_SPEED = 2,
  BACK_COLOR = { r: 0.0, g: 0.0, b: 0.0 },
  TRANSPARENT = true
}: SplashCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let pointers: Pointer[] = [pointerPrototype()];
    let config = { SIM_RESOLUTION, DYE_RESOLUTION, CAPTURE_RESOLUTION, DENSITY_DISSIPATION, VELOCITY_DISSIPATION, PRESSURE, PRESSURE_ITERATIONS, CURL, SPLAT_RADIUS, SPLAT_FORCE, SHADING, COLOR_UPDATE_SPEED, PAUSED: false, BACK_COLOR, TRANSPARENT };

    const { gl, ext } = getWebGLContext(canvas); if (!gl || !ext) return;
    if (!ext.supportLinearFiltering) { config.DYE_RESOLUTION = 256; config.SHADING = false; }

    function getWebGLContext(canvas: HTMLCanvasElement) {
      const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
      let gl = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;
      if (!gl) { gl = (canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params)) as WebGL2RenderingContext | null; }
      if (!gl) throw new Error("Unable to initialize WebGL.");
      const isWebGL2 = "drawBuffers" in gl;
      let supportLinearFiltering = false; let halfFloat: any = null;
      if (isWebGL2) { (gl as WebGL2RenderingContext).getExtension("EXT_color_buffer_float"); supportLinearFiltering = !!(gl as WebGL2RenderingContext).getExtension("OES_texture_float_linear"); }
      else { halfFloat = (gl as any).getExtension("OES_texture_half_float"); supportLinearFiltering = !!(gl as any).getExtension("OES_texture_half_float_linear"); }
      // Make canvas fully transparent so it doesn't darken the page background
      (gl as any).clearColor(0,0,0,0);
      const halfFloatTexType = isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES) || 0;
      let formatRGBA: any, formatRG: any, formatR: any;
      if (isWebGL2) {
        const gl2 = gl as WebGL2RenderingContext;
        formatRGBA = getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, halfFloatTexType);
        formatRG   = getSupportedFormat(gl2, gl2.RG16F,  gl2.RG,   halfFloatTexType);
        formatR    = getSupportedFormat(gl2, gl2.R16F,   gl2.RED,  halfFloatTexType);
      } else {
        formatRGBA = getSupportedFormat(gl as any, (gl as any).RGBA, (gl as any).RGBA, halfFloatTexType);
        formatRG   = getSupportedFormat(gl as any, (gl as any).RGBA, (gl as any).RGBA, halfFloatTexType);
        formatR    = getSupportedFormat(gl as any, (gl as any).RGBA, (gl as any).RGBA, halfFloatTexType);
      }
      return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
    }

    function getSupportedFormat(gl: WebGLRenderingContext | WebGL2RenderingContext, internalFormat: number, format: number, type: number) {
      if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        if ("drawBuffers" in gl) {
          const gl2 = gl as WebGL2RenderingContext;
          switch (internalFormat) {
            case gl2.R16F: return getSupportedFormat(gl2, gl2.RG16F, gl2.RG, type);
            case gl2.RG16F: return getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, type);
            default: return null;
          }
        }
        return null;
      }
      return { internalFormat, format };
    }

    function supportRenderTextureFormat(gl: WebGLRenderingContext | WebGL2RenderingContext, internalFormat: number, format: number, type: number) {
      const texture = gl.createTexture(); if (!texture) return false;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
      const fbo = gl.createFramebuffer(); if (!fbo) return false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    }

    function hashCode(s: string){ let h=0; for (let i=0;i<s.length;i++){ h=(h<<5)-h + s.charCodeAt(i); h|=0;} return h }
    function addKeywords(source: string, keywords: string[] | null){ if(!keywords) return source; return keywords.map(k=>`#define ${k}\n`).join("") + source }
    function compileShader(type: number, source: string, keywords: string[] | null = null){ const shaderSource = addKeywords(source, keywords); const shader = gl.createShader(type)!; gl.shaderSource(shader, shaderSource); gl.compileShader(shader); return shader }
    function createProgram(vs: WebGLShader | null, fs: WebGLShader | null){ if(!vs||!fs) return null; const p = gl.createProgram()!; gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p); return p }
    function getUniforms(program: WebGLProgram){ const uniforms: Record<string, WebGLUniformLocation | null> = {}; const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); for(let i=0;i<count;i++){ const info = gl.getActiveUniform(program,i); if(info) uniforms[info.name] = gl.getUniformLocation(program, info.name);} return uniforms }

    class Program { program: WebGLProgram | null; uniforms: Record<string, WebGLUniformLocation | null>; constructor(vs: WebGLShader | null, fs: WebGLShader | null){ this.program = createProgram(vs, fs); this.uniforms = this.program ? getUniforms(this.program) : {} } bind(){ if(this.program) gl.useProgram(this.program) } }
    class Material { vertexShader: WebGLShader | null; fragmentShaderSource: string; programs: Record<number, WebGLProgram | null> = {}; activeProgram: WebGLProgram | null = null; uniforms: Record<string, WebGLUniformLocation | null> = {}; constructor(vs: WebGLShader | null, fsSrc: string){ this.vertexShader = vs; this.fragmentShaderSource = fsSrc } setKeywords(kw: string[]){ let hash = 0; for(const k of kw) hash += hashCode(k); let program = this.programs[hash]; if(program == null){ const fs = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, kw); program = createProgram(this.vertexShader, fs)!; this.programs[hash] = program } if(program !== this.activeProgram){ this.uniforms = program ? getUniforms(program) : {}; this.activeProgram = program } } bind(){ if(this.activeProgram) gl.useProgram(this.activeProgram) } }

    const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
      precision highp float; attribute vec2 aPosition; varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform vec2 texelSize; void main () { vUv = aPosition * 0.5 + 0.5; vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0); vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y); gl_Position = vec4(aPosition, 0.0, 1.0); }
    `);
    const copyShader = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; uniform sampler2D uTexture; void main(){ gl_FragColor = texture2D(uTexture, vUv);} `);
    const clearShader = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value; void main(){ gl_FragColor = value * texture2D(uTexture, vUv);} `);
    const displayShaderSource = `precision highp float; precision highp sampler2D; varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uTexture; uniform sampler2D uDithering; uniform vec2 ditherScale; uniform vec2 texelSize; vec3 linearToGamma(vec3 color){ color=max(color,vec3(0)); return max(1.055*pow(color,vec3(0.416666667))-0.055, vec3(0)); } void main(){ vec3 c = texture2D(uTexture, vUv).rgb; #ifdef SHADING vec3 lc = texture2D(uTexture, vL).rgb; vec3 rc = texture2D(uTexture, vR).rgb; vec3 tc = texture2D(uTexture, vT).rgb; vec3 bc = texture2D(uTexture, vB).rgb; float dx = length(rc) - length(lc); float dy = length(tc) - length(bc); vec3 n = normalize(vec3(dx, dy, length(texelSize))); vec3 l = vec3(0.0, 0.0, 1.0); float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0); c *= diffuse; #endif float a = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c, a);} `;
    const splatShader = compileShader(gl.FRAGMENT_SHADER, `precision highp float; precision highp sampler2D; varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius; void main(){ vec2 p = vUv - point.xy; p.x *= aspectRatio; vec3 splat = exp(-dot(p,p)/radius)*color; vec3 base = texture2D(uTarget, vUv).xyz; gl_FragColor = vec4(base + splat, 1.0);} `);
    const advectionShader = compileShader(gl.FRAGMENT_SHADER, `precision highp float; precision highp sampler2D; varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation; vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize){ vec2 st = uv/tsize - 0.5; vec2 iuv=floor(st); vec2 fuv=fract(st); vec4 a=texture2D(sam,(iuv+vec2(0.5,0.5))*tsize); vec4 b=texture2D(sam,(iuv+vec2(1.5,0.5))*tsize); vec4 c=texture2D(sam,(iuv+vec2(0.5,1.5))*tsize); vec4 d=texture2D(sam,(iuv+vec2(1.5,1.5))*tsize); return mix(mix(a,b,fuv.x), mix(c,d,fuv.x), fuv.y);} void main(){ #ifdef MANUAL_FILTERING vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize; vec4 result = bilerp(uSource, coord, dyeTexelSize); #else vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize; vec4 result = texture2D(uSource, coord); #endif float decay = 1.0 + dissipation * dt; gl_FragColor = result / decay; } `, ext.supportLinearFiltering ? null : ["MANUAL_FILTERING"]);
    const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uVelocity; void main(){ float L=texture2D(uVelocity,vL).x; float R=texture2D(uVelocity,vR).x; float T=texture2D(uVelocity,vT).y; float B=texture2D(uVelocity,vB).y; vec2 C=texture2D(uVelocity,vUv).xy; if (vL.x<0.0){L=-C.x;} if (vR.x>1.0){R=-C.x;} if (vT.y>1.0){T=-C.y;} if (vB.y<0.0){B=-C.y;} float div=0.5*(R-L+T-B); gl_FragColor = vec4(div,0.0,0.0,1.0);} `);
    const curlShader = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uVelocity; void main(){ float L=texture2D(uVelocity,vL).y; float R=texture2D(uVelocity,vR).y; float T=texture2D(uVelocity,vT).x; float B=texture2D(uVelocity,vB).x; float vorticity = R - L - T + B; gl_FragColor = vec4(0.5*vorticity,0.0,0.0,1.0);} `);
    const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `precision highp float; precision highp sampler2D; varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt; void main(){ float L=texture2D(uCurl,vL).x; float R=texture2D(uCurl,vR).x; float T=texture2D(uCurl,vT).x; float B=texture2D(uCurl,vB).x; float C=texture2D(uCurl,vUv).x; vec2 force=0.5*vec2(abs(T)-abs(B), abs(R)-abs(L)); force/=length(force)+0.0001; force*=curl*C; force.y*=-1.0; vec2 velocity = texture2D(uVelocity,vUv).xy; velocity += force*dt; velocity = min(max(velocity,-1000.0),1000.0); gl_FragColor = vec4(velocity,0.0,1.0);} `);
    const pressureShader = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uPressure; uniform sampler2D uDivergence; void main(){ float L=texture2D(uPressure,vL).x; float R=texture2D(uPressure,vR).x; float T=texture2D(uPressure,vT).x; float B=texture2D(uPressure,vB).x; float C=texture2D(uPressure,vUv).x; float divergence = texture2D(uDivergence,vUv).x; float pressure = (L+R+B+T - divergence) * 0.25; gl_FragColor = vec4(pressure,0.0,0.0,1.0);} `);
    const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uPressure; uniform sampler2D uVelocity; void main(){ float L=texture2D(uPressure,vL).x; float R=texture2D(uPressure,vR).x; float T=texture2D(uPressure,vT).x; float B=texture2D(uPressure,vB).x; vec2 velocity = texture2D(uVelocity,vUv).xy; velocity.xy -= vec2(R-L, T-B); gl_FragColor = vec4(velocity,0.0,1.0);} `);

    const blit = (() => {
      const buffer = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
      const elem = gl.createBuffer()!; gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elem); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0); gl.enableVertexAttribArray(0);
      return (target: any, doClear=false) => { if(!gl) return; if(!target){ gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER,null);} else { gl.viewport(0,0,target.width,target.height); gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);} if(doClear){ gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);} gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0); };
    })();

    interface FBO { texture: WebGLTexture; fbo: WebGLFramebuffer; width: number; height: number; texelSizeX: number; texelSizeY: number; attach: (id:number)=>number }
    interface DoubleFBO { width:number; height:number; texelSizeX:number; texelSizeY:number; read:FBO; write:FBO; swap:()=>void }

    let dye: DoubleFBO; let velocity: DoubleFBO; let divergence: FBO; let curl: FBO; let pressure: DoubleFBO;
    const copyProgram = new Program(baseVertexShader, copyShader);
    const clearProgram = new Program(baseVertexShader, clearShader);
    const splatProgram = new Program(baseVertexShader, splatShader);
    const advectionProgram = new Program(baseVertexShader, advectionShader);
    const divergenceProgram = new Program(baseVertexShader, divergenceShader);
    const curlProgram = new Program(baseVertexShader, curlShader);
    const vorticityProgram = new Program(baseVertexShader, vorticityShader);
    const pressureProgram = new Program(baseVertexShader, pressureShader);
    const gradientSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);

    const displayMaterial = new Material(baseVertexShader, displayShaderSource);
    function createFBO(w:number,h:number,internalFormat:number,format:number,type:number,param:number):FBO{ gl.activeTexture(gl.TEXTURE0); const texture=gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texImage2D(gl.TEXTURE_2D,0,internalFormat,w,h,0,format,type,null); const fbo=gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0); gl.viewport(0,0,w,h); gl.clear(gl.COLOR_BUFFER_BIT); const texelSizeX = 1/w; const texelSizeY = 1/h; return { texture, fbo, width:w, height:h, texelSizeX, texelSizeY, attach(id:number){ gl.activeTexture(gl.TEXTURE0+id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } } }
    function createDoubleFBO(w:number,h:number,internalFormat:number,format:number,type:number,param:number):DoubleFBO{ const a=createFBO(w,h,internalFormat,format,type,param); const b=createFBO(w,h,internalFormat,format,type,param); return { width:w, height:h, texelSizeX:a.texelSizeX, texelSizeY:a.texelSizeY, read:a, write:b, swap(){ const t=this.read; this.read=this.write; this.write=t; } } }
    function resizeFBO(target:FBO,w:number,h:number,internalFormat:number,format:number,type:number,param:number){ const newFBO=createFBO(w,h,internalFormat,format,type,param); copyProgram.bind(); if (copyProgram.uniforms.uTexture) gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0)); blit(newFBO,false); return newFBO }
    function resizeDoubleFBO(target:DoubleFBO,w:number,h:number,internalFormat:number,format:number,type:number,param:number){ if(target.width===w && target.height===h) return target; target.read = resizeFBO(target.read,w,h,internalFormat,format,type,param); target.write = createFBO(w,h,internalFormat,format,type,param); target.width=w; target.height=h; target.texelSizeX=1/w; target.texelSizeY=1/h; return target }

    function initFramebuffers(){ const simRes=getResolution(config.SIM_RESOLUTION!); const dyeRes=getResolution(config.DYE_RESOLUTION!); const texType=ext.halfFloatTexType; const rgba=ext.formatRGBA; const rg=ext.formatRG; const r=ext.formatR; const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST; (gl as any).disable((gl as any).BLEND);
      if (!dye) dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering); else dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
      if (!velocity) velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering); else velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
      divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, (gl as any).NEAREST);
      curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, (gl as any).NEAREST);
      pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, (gl as any).NEAREST);
    }

    function updateKeywords(){ const displayKeywords: string[] = []; if (config.SHADING) displayKeywords.push("SHADING"); displayMaterial.setKeywords(displayKeywords); }
    function getResolution(res:number){ const w=gl.drawingBufferWidth, h=gl.drawingBufferHeight; const aspect=w/h; const min=Math.round(res); const max=Math.round(res * (aspect<1 ? 1/aspect : aspect)); return w>h ? {width:max, height:min} : {width:min, height:max} }
    function scaleByPixelRatio(v:number){ const pr = window.devicePixelRatio || 1; return Math.floor(v*pr) }

    updateKeywords(); initFramebuffers();
    let lastUpdateTime = Date.now(); let colorUpdateTimer = 0.0;
    function updateFrame(){ const dt = calcDeltaTime(); if (resizeCanvas()) initFramebuffers(); updateColors(dt); applyInputs(); step(dt); render(null); requestAnimationFrame(updateFrame); }
    function calcDeltaTime(){ const now=Date.now(); let dt=(now-lastUpdateTime)/1000; dt=Math.min(dt,0.016666); lastUpdateTime=now; return dt }
    function resizeCanvas(){ const width=scaleByPixelRatio(canvas!.clientWidth); const height=scaleByPixelRatio(canvas!.clientHeight); if (canvas!.width!==width || canvas!.height!==height){ canvas!.width=width; canvas!.height=height; return true } return false }
    function updateColors(dt:number){ colorUpdateTimer+=dt*config.COLOR_UPDATE_SPEED!; if(colorUpdateTimer>=1){ colorUpdateTimer=wrap(colorUpdateTimer,0,1); pointers.forEach(p=>{ p.color = generateColor() }) } }
    function applyInputs(){ for(const p of pointers){ if(p.moved){ p.moved=false; splatPointer(p) } } }

    function step(dt:number){ (gl as any).disable((gl as any).BLEND);
      curlProgram.bind(); if (curlProgram.uniforms.texelSize) (gl as any).uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); if (curlProgram.uniforms.uVelocity) (gl as any).uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0)); blit(curl);
      vorticityProgram.bind(); if (vorticityProgram.uniforms.texelSize) (gl as any).uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); if (vorticityProgram.uniforms.uVelocity) (gl as any).uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0)); if (vorticityProgram.uniforms.uCurl) (gl as any).uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1)); if (vorticityProgram.uniforms.curl) (gl as any).uniform1f(vorticityProgram.uniforms.curl, config.CURL!); if (vorticityProgram.uniforms.dt) (gl as any).uniform1f(vorticityProgram.uniforms.dt, dt); blit(velocity.write); velocity.swap();
      divergenceProgram.bind(); if (divergenceProgram.uniforms.texelSize) (gl as any).uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); if (divergenceProgram.uniforms.uVelocity) (gl as any).uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0)); blit(divergence);
      clearProgram.bind(); if (clearProgram.uniforms.uTexture) (gl as any).uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0)); if (clearProgram.uniforms.value) (gl as any).uniform1f(clearProgram.uniforms.value, config.PRESSURE!); blit(pressure.write); pressure.swap();
      pressureProgram.bind(); if (pressureProgram.uniforms.texelSize) (gl as any).uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); if (pressureProgram.uniforms.uDivergence) (gl as any).uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
      for (let i=0;i<config.PRESSURE_ITERATIONS!;i++){ if (pressureProgram.uniforms.uPressure) (gl as any).uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }
      gradientSubtractProgram.bind(); if (gradientSubtractProgram.uniforms.texelSize) (gl as any).uniform2f(gradientSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY); if (gradientSubtractProgram.uniforms.uPressure) (gl as any).uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.read.attach(0)); if (gradientSubtractProgram.uniforms.uVelocity) (gl as any).uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.read.attach(1)); blit(velocity.write); velocity.swap();
      advectionProgram.bind(); if (advectionProgram.uniforms.texelSize) (gl as any).uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      if (!ext.supportLinearFiltering && (advectionProgram.uniforms as any).dyeTexelSize) (gl as any).uniform2f((advectionProgram.uniforms as any).dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
      const velId = velocity.read.attach(0); if (advectionProgram.uniforms.uVelocity) (gl as any).uniform1i(advectionProgram.uniforms.uVelocity, velId); if (advectionProgram.uniforms.uSource) (gl as any).uniform1i(advectionProgram.uniforms.uSource, velId); if (advectionProgram.uniforms.dt) (gl as any).uniform1f(advectionProgram.uniforms.dt, dt); if (advectionProgram.uniforms.dissipation) (gl as any).uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION!); blit(velocity.write); velocity.swap();
      if (!ext.supportLinearFiltering && (advectionProgram.uniforms as any).dyeTexelSize) (gl as any).uniform2f((advectionProgram.uniforms as any).dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      if (advectionProgram.uniforms.uVelocity) (gl as any).uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0)); if (advectionProgram.uniforms.uSource) (gl as any).uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1)); if (advectionProgram.uniforms.dissipation) (gl as any).uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION!); blit(dye.write); dye.swap();
    }

    function render(target:any){ (gl as any).blendFunc((gl as any).ONE, (gl as any).ONE_MINUS_SRC_ALPHA); (gl as any).enable((gl as any).BLEND); drawDisplay(target) }
    function drawDisplay(target:any){ const width = target ? target.width : (gl as any).drawingBufferWidth; const height = target ? target.height : (gl as any).drawingBufferHeight; displayMaterial.bind(); if (config.SHADING && displayMaterial.uniforms.texelSize) (gl as any).uniform2f(displayMaterial.uniforms.texelSize, 1/width, 1/height); if (displayMaterial.uniforms.uTexture) (gl as any).uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0)); blit(target, false) }
    function splatPointer(p:Pointer){ const dx=p.deltaX*config.SPLAT_FORCE!; const dy=p.deltaY*config.SPLAT_FORCE!; splat(p.texcoordX, p.texcoordY, dx, dy, p.color) }
    function clickSplat(p:Pointer){ const c=generateColor(); c.r*=10; c.g*=10; c.b*=10; const dx=10*(Math.random()-0.5); const dy=30*(Math.random()-0.5); splat(p.texcoordX, p.texcoordY, dx, dy, c) }
    function splat(x:number,y:number,dx:number,dy:number,color:ColorRGB){ splatProgram.bind(); if (splatProgram.uniforms.uTarget) (gl as any).uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0)); if (splatProgram.uniforms.aspectRatio) (gl as any).uniform1f(splatProgram.uniforms.aspectRatio, canvas!.width/canvas!.height); if (splatProgram.uniforms.point) (gl as any).uniform2f(splatProgram.uniforms.point, x, y); if (splatProgram.uniforms.color) (gl as any).uniform3f(splatProgram.uniforms.color, dx, dy, 0); if (splatProgram.uniforms.radius) (gl as any).uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS!/100)!); blit(velocity.write); velocity.swap(); if (splatProgram.uniforms.uTarget) (gl as any).uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0)); if (splatProgram.uniforms.color) (gl as any).uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b); blit(dye.write); dye.swap(); }
    function correctRadius(radius:number){ const aspect = canvas!.width/canvas!.height; if (aspect>1) radius*=aspect; return radius }
    function updatePointerDownData(p:Pointer,id:number,x:number,y:number){ p.id=id; p.down=true; p.moved=false; p.texcoordX=x/canvas!.width; p.texcoordY=1 - y/canvas!.height; p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY; p.deltaX=0; p.deltaY=0; p.color=generateColor() }
    function updatePointerMoveData(p:Pointer,x:number,y:number,color:ColorRGB){ p.prevTexcoordX=p.texcoordX; p.prevTexcoordY=p.texcoordY; p.texcoordX=x/canvas!.width; p.texcoordY=1 - y/canvas!.height; p.deltaX=correctDeltaX(p.texcoordX - p.prevTexcoordX)!; p.deltaY=correctDeltaY(p.texcoordY - p.prevTexcoordY)!; p.moved = Math.abs(p.deltaX)>0 || Math.abs(p.deltaY)>0; p.color=color }
    function updatePointerUpData(p:Pointer){ p.down=false }
    function correctDeltaX(d:number){ const aspect = canvas!.width/canvas!.height; if (aspect<1) d*=aspect; return d }
    function correctDeltaY(d:number){ const aspect = canvas!.width/canvas!.height; if (aspect>1) d/=aspect; return d }
    function generateColor(): ColorRGB {
      // Wildeax brand teal, very subtle
      // #06b6d4 -> normalized approx (0.024, 0.713, 0.831)
      const base: ColorRGB = { r: 0.024, g: 0.713, b: 0.831 };
      const intensity = 0.18; // keep low so the alpha stays subtle
      return { r: base.r * intensity, g: base.g * intensity, b: base.b * intensity };
    }
    // helper used by generateColor (kept for reference)
    /* function HSVtoRGB(h:number,s:number,v:number): ColorRGB { let r=0,g=0,b=0; const i=Math.floor(h*6); const f=h*6-i; const p=v*(1-s); const q=v*(1-f*s); const t=v*(1-(1-f)*s); switch(i%6){ case 0: r=v; g=t; b=p; break; case 1: r=q; g=v; b=p; break; case 2: r=p; g=v; b=t; break; case 3: r=p; g=q; b=v; break; case 4: r=t; g=p; b=v; break; case 5: r=v; g=p; b=q; break;} return {r,g,b} } */
    function wrap(value:number,min:number,max:number){ const range=max-min; if(range===0) return min; return ((value-min)%range)+min }

    window.addEventListener("mousedown", (e)=>{ const p=pointers[0]; const x=scaleByPixelRatio(e.clientX); const y=scaleByPixelRatio(e.clientY); updatePointerDownData(p,-1,x,y); clickSplat(p) });
    function handleFirstMouseMove(e:MouseEvent){ const p=pointers[0]; const x=scaleByPixelRatio(e.clientX); const y=scaleByPixelRatio(e.clientY); const color=generateColor(); updateFrame(); updatePointerMoveData(p,x,y,color); document.body.removeEventListener("mousemove", handleFirstMouseMove) }
    document.body.addEventListener("mousemove", handleFirstMouseMove);
    window.addEventListener("mousemove", (e)=>{ const p=pointers[0]; const x=scaleByPixelRatio(e.clientX); const y=scaleByPixelRatio(e.clientY); const color=p.color; updatePointerMoveData(p,x,y,color) });
    function handleFirstTouchStart(e:TouchEvent){ const touches=e.targetTouches; const p=pointers[0]; for(let i=0;i<touches.length;i++){ const x=scaleByPixelRatio(touches[i].clientX); const y=scaleByPixelRatio(touches[i].clientY); updateFrame(); updatePointerDownData(p,touches[i].identifier,x,y) } document.body.removeEventListener("touchstart", handleFirstTouchStart) }
    document.body.addEventListener("touchstart", handleFirstTouchStart);
    window.addEventListener("touchstart", (e)=>{ const touches=e.targetTouches; const p=pointers[0]; for(let i=0;i<touches.length;i++){ const x=scaleByPixelRatio(touches[i].clientX); const y=scaleByPixelRatio(touches[i].clientY); updatePointerDownData(p,touches[i].identifier,x,y) } }, false);
    window.addEventListener("touchmove", (e)=>{ const touches=e.targetTouches; const p=pointers[0]; for(let i=0;i<touches.length;i++){ const x=scaleByPixelRatio(touches[i].clientX); const y=scaleByPixelRatio(touches[i].clientY); updatePointerMoveData(p,x,y,p.color) } }, false);
    window.addEventListener("touchend", (e)=>{ const touches=e.changedTouches; const p=pointers[0]; for(let i=0;i<touches.length;i++){ updatePointerUpData(p) } });

    // removed duplicate implementation

    return () => { /* cleanup handled by GC */ };
  }, [SIM_RESOLUTION, DYE_RESOLUTION, CAPTURE_RESOLUTION, DENSITY_DISSIPATION, VELOCITY_DISSIPATION, PRESSURE, PRESSURE_ITERATIONS, CURL, SPLAT_RADIUS, SPLAT_FORCE, SHADING, COLOR_UPDATE_SPEED, BACK_COLOR, TRANSPARENT]);

  return (
    <div className="fixed top-0 left-0 z-50 pointer-events-none w-full h-full">
      <canvas ref={canvasRef} id="fluid" className="w-screen h-screen block"></canvas>
    </div>
  );
}
