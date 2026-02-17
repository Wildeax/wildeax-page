import { useEffect, useRef } from "react";

class Pixel {
  width: number; height: number; ctx: CanvasRenderingContext2D; x: number; y: number; color: string; speed: number; size: number; sizeStep: number; minSize: number; maxSizeInteger: number; maxSize: number; delay: number; counter: number; counterStep: number; isIdle: boolean; isReverse: boolean; isShimmer: boolean;
  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, x: number, y: number, color: string, speed: number, delay: number){ this.width=canvas.width; this.height=canvas.height; this.ctx=context; this.x=x; this.y=y; this.color=color; this.speed=this.getRandomValue(0.1,0.9)*speed; this.size=0; this.sizeStep=Math.random()*0.4; this.minSize=0.5; this.maxSizeInteger=2; this.maxSize=this.getRandomValue(this.minSize,this.maxSizeInteger); this.delay=delay; this.counter=0; this.counterStep=Math.random()*4 + (this.width+this.height)*0.01; this.isIdle=false; this.isReverse=false; this.isShimmer=false }
  getRandomValue(min:number,max:number){ return Math.random()*(max-min)+min }
  draw(){ const centerOffset=this.maxSizeInteger*0.5 - this.size*0.5; this.ctx.fillStyle=this.color; this.ctx.fillRect(this.x+centerOffset, this.y+centerOffset, this.size, this.size) }
  appear(){ this.isIdle=false; if(this.counter<=this.delay){ this.counter+=this.counterStep; return } if(this.size>=this.maxSize){ this.isShimmer=true } if(this.isShimmer){ this.shimmer() } else { this.size+=this.sizeStep } this.draw() }
  disappear(){ this.isShimmer=false; this.counter=0; if(this.size<=0){ this.isIdle=true; return } else { this.size-=0.1 } this.draw() }
  shimmer(){ if(this.size>=this.maxSize){ this.isReverse=true } else if (this.size<=this.minSize){ this.isReverse=false } if(this.isReverse){ this.size-=this.speed } else { this.size+=this.speed } }
}

function getEffectiveSpeed(value:number, reducedMotion:boolean){ const min=0,max=100,throttle=0.001; if(value<=min || reducedMotion) return min; if(value>=max) return max*throttle; return value*throttle }

interface PixelCardProps { gap?: number; speed?: number; colors?: string; noFocus?: boolean; className?: string; children: React.ReactNode }

export default function PixelCard({ gap = 5, speed = 35, colors = "#f8fafc,#f1f5f9,#cbd5e1", noFocus=false, className = "", children }: PixelCardProps){
  const containerRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null); const pixelsRef = useRef<Pixel[]>([]); const animationRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null); const timePreviousRef = useRef(performance.now()); const reducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches).current;

  const initPixels = () => {
    if (!containerRef.current || !canvasRef.current) return;
    const rect = containerRef.current.getBoundingClientRect(); const width=Math.floor(rect.width); const height=Math.floor(rect.height); const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width=width; canvasRef.current.height=height; canvasRef.current.style.width=`${width}px`; canvasRef.current.style.height=`${height}px`;
    const colorsArray = colors.split(","); const pxs: Pixel[] = [];
    for (let x=0; x<width; x+=parseInt(gap.toString(),10)){
      for (let y=0; y<height; y+=parseInt(gap.toString(),10)){
        const color = colorsArray[Math.floor(Math.random()*colorsArray.length)];
        const dx = x - width/2; const dy = y - height/2; const distance = Math.sqrt(dx*dx + dy*dy); const delay = reducedMotion ? 0 : distance; if (!ctx) return;
        pxs.push(new Pixel(canvasRef.current, ctx, x, y, color, getEffectiveSpeed(speed, reducedMotion), delay));
      }
    }
    pixelsRef.current = pxs;
  }

  const doAnimate = (fnName: keyof Pixel) => {
    animationRef.current = requestAnimationFrame(() => doAnimate(fnName));
    const timeNow = performance.now(); const timePassed = timeNow - timePreviousRef.current; const interval = 1000/60; if (timePassed < interval) return; timePreviousRef.current = timeNow - (timePassed % interval);
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx || !canvasRef.current) return; ctx.clearRect(0,0,canvasRef.current.width, canvasRef.current.height);
    let allIdle = true; for(const p of pixelsRef.current){ // @ts-ignore
      p[fnName](); if(!p.isIdle) allIdle = false }
    if (allIdle && animationRef.current){ cancelAnimationFrame(animationRef.current) }
  }

  const handleAnimation = (name: keyof Pixel) => { if(animationRef.current) cancelAnimationFrame(animationRef.current); animationRef.current = requestAnimationFrame(() => doAnimate(name)) }
  const onMouseEnter = () => handleAnimation("appear");
  const onMouseLeave = () => handleAnimation("disappear");
  const onFocus: React.FocusEventHandler<HTMLDivElement> = (e) => { if (e.currentTarget.contains(e.relatedTarget)) return; handleAnimation("appear") };
  const onBlur: React.FocusEventHandler<HTMLDivElement> = (e) => { if (e.currentTarget.contains(e.relatedTarget)) return; handleAnimation("disappear") };

  useEffect(() => {
    initPixels(); const observer = new ResizeObserver(() => initPixels()); if (containerRef.current) observer.observe(containerRef.current);
    return () => { observer.disconnect(); if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [gap, speed, colors, noFocus]);

  return (
    <div ref={containerRef} className={`h-[400px] w-full relative overflow-hidden grid place-items-center aspect-[4/5] border border-[#27272a] rounded-[25px] isolate transition-colors duration-200 ease-[cubic-bezier(0.5,1,0.89,1)] select-none ${className}`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onFocus={noFocus? undefined : onFocus} onBlur={noFocus? undefined : onBlur} tabIndex={noFocus? -1 : 0}>
      <canvas className="w-full h-full block" ref={canvasRef} />
      {children}
    </div>
  )
}
