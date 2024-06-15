//@ts-check

//@ts-ignore
const [ Vue, rxjs, VueUse ] = [ window.Vue, window.rxjs, window.VueUse ];

const { ref, nextTick, onMounted, computed } = Vue;
const { /* from */ /* fromEvent */ of, merge, partition,
  filter, first, delay, map, takeUntil, debounceTime, scan,
  bufferToggle, switchMap, mergeMap,  
  share, tap
} = rxjs;
const { from, fromEvent } = VueUse;

/**
 * @param {any} target
 * @param {any} event
 * @returns {object}
 */
const convertClientToReal = (target, event) => {
  // canvas自体で拡大縮小する
  // target.parentNode.style.transform.match(/scale\((.+?)\)/)[1]
  const zoomfactor = parseFloat(target.style.transform.match(/scale\((.+?)\)/)[1]); // size.value.zoomfactor
  const {clientX, clientY} = event;
  const realX = Math.floor((clientX - target.getBoundingClientRect().left)/zoomfactor);
  const realY = Math.floor((clientY - target.getBoundingClientRect().top)/zoomfactor);
  const cnv = target
  const isInCanvas = (0 <= realX && realX < cnv.width && 0 <= realY && realY < cnv.height);
  return { x:realX, y:realY, isIn:isInCanvas };
}

const drawRect = (ref, margin, left, top, right, bottom) => {
  const ctx = ref.value.getContext("2d");
  ctx.beginPath();
  ctx.clearRect(0, 0, ref.value.width, ref.value.height);
  const width = right - left
  const height = bottom - top;
  left = left + margin;
  top = top + margin;

  if(width > 0 && height > 0){
    ctx.fillStyle = "rgb(0, 0, 255, 0.2)";
    ctx.fillRect(left, top, width, height);
    ctx.strokeStyle = "rgba(0, 0, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, top + 0.5, width - 1, height - 1);
    // console.log(left, top, width, height)
    // console.log(left + 0.5, top + 0.5, width - 1, height - 1)
  }
  ctx.closePath();
}

/**
 * @class
 */
class Rect {

  constructor(start, end) {
    this.start = start
    this.end = end
  }

  get left() { return this.start.x < this.end.x ? this.start.x : this.end.x; }
  get top() { return this.start.y < this.end.y ? this.start.y : this.end.y; }
  get right() { return  this.start.x > this.end.x ? this.start.x : this.end.x; }
  get bottom() { return this.start.y > this.end.y ? this.start.y : this.end.y; }

  /**
   * @returns {Rect}
   */
  static new(){
    return new Rect(
      {x:0, y:0}, 
      {x:0, y:0}
    );
  }

  /**
   * @param {number} left
   * @param {number} top
   * @param {number} right
   * @param {number} bottom
   * @returns {Rect}
   */
  static set4point(left, top, right, bottom){
    return new Rect(
      {x:left, y:top}, 
      {x:right, y:bottom}
    );
  }

  /**
   * @param {{x:number, y:number}} start
   * @param {{x:number, y:number}} end
   * @returns {Rect}
   */
  static set2postion(start, end){ return new Rect(start, end); }

  /**
   * @returns {any}
   */
  get(){
    const left = this.start.x < this.end.x ? this.start.x : this.end.x;
    const top = this.start.y < this.end.y ? this.start.y : this.end.y;
    const right = this.start.x > this.end.x ? this.start.x : this.end.x;
    const bottom = this.start.y > this.end.y ? this.start.y : this.end.y;
    return { 
      left: left,
      top: top,
      right: right,
      bottom: bottom,
      width: right - left,
      height: bottom - top,
    }
  }

  /**
   * @returns {string}
   */
  to_json(){
    return JSON.stringify({
      left: this.left,
      top: this.top,
      right: this.right,
      bottom: this.bottom,
    })
  }
}

const styledObj = {
  canvas : {
    position: "absolute",
    // pointerEvents: "none",
    imageRendering:"pixelated",
    backgroundColor: "lightgray",
    transformOrigin: "top left"
  }
}

/**
 * props : margin, zoom, select, rendering \
 * methods : redraw, clip \
 * emit : on-context, on-move, on-drop, update:zoom, update:select \
 */
const canvasEx = {
  template: `
    <div id="canvas" ref="divRef" style="position:absolute; top:0;left:0;right:0;bottom:0;">
      <canvas ref="canvasRef"
        :style= "{ ...styled, 
          left: props.margin*cnvParams.zoomfactor + 'px', 
          top: props.margin*cnvParams.zoomfactor + 'px', 
          transform: 'scale(' + cnvParams.zoomfactor + ')', 
          imageRendering: props.rendering
        }"
        :width="cnvParams.width"
        :height="cnvParams.height"
      ></canvas>
      <canvas ref="selectRef" 
        :style= "{ ...styled, left: '0px', top:'0px', backgroundColor: 'transparent', transform: 'scale(' + cnvParams.zoomfactor + ')', }"
        :width="cnvParams.width + props.margin * 2" 
        :height="cnvParams.height + props.margin * 2"
      ></canvas>
    </div>
  `,
  props: {
    margin: { type: Number, default: 10, required: false },
    zoom: { type: Number, default: 1, required: false },
    select: { type: Object, default: Rect.new(), required: false },
    rendering: { type: String, default: 'pixelated', required: false },
  },
  watch: {

  },
  methods: {
    /**
     * @param {any} image
     */
    redraw(image){
      console.log("redraw")
      this.cnvParams = { ...this.cnvParams, width:image.width, height:image.height }
      nextTick(()=>{
        const ctx = this.canvasRef.getContext("2d", { alpha: false, willReadFrequently: true, });
        ctx.drawImage(image, 0, 0);
      });
    },
    clip(selectflag){
      const scaleFactor = this.cnvParams.zoomfactor;
      const x = selectflag ? this.select.left : 0
      const y = selectflag ? this.select.top : 0
      const w = selectflag ? this.select.right - this.select.left : this.canvasRef.width
      const h = selectflag ? this.select.bottom - this.select.top : this.canvasRef.height

      const temp = document.createElement('canvas');
      temp.width = w * scaleFactor;
      temp.height = h * scaleFactor;
      const ctx = temp.getContext('2d');
      if(ctx == null) return;
      ctx.imageSmoothingEnabled = false;
      // const imageData = this.canvasRef.getContext('2d').getImageData(x, y, w, h);
      // ctx.putImageData(imageData, 0, 0);
      ctx.drawImage(this.canvasRef, x, y, w, h, 0, 0, w * scaleFactor, h * scaleFactor);

      temp.toBlob(async (blob) => { 
        if(blob == null) return;
        await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
      }, 'image/png');
      console.log("clipboard")
    }
  },
  setup(props, { emit }) {
    const styled = ref(styledObj.canvas)
    const [divRef, canvasRef, selectRef] = [ref(null), ref(null), ref(null)];

    const cnvParams = ref({ width:320, height:240, zoomfactor:1 });

    const zoom = computed({ get: () => props.zoom, set: (val) => emit("update:zoom", val) });
    const select = computed({ get: () => props.select, set: (val) => emit("update:select", val) });
    // const [select] = [ref(Rect.set2postion({x:0,y:0}, {x:0,y:0}))]; // real pos
    from(zoom).subscribe(e => { cnvParams.value = { ...cnvParams.value, zoomfactor : 1.2 ** e }; });
    from(select).subscribe(e => { 
      drawRect(selectRef, props.margin, e.left, e.top, e.right, e.bottom) 
    });

    from(cnvParams).subscribe((e) => {  });

    /******** mouse event ********/
    const mousemove$ = fromEvent(selectRef, 'mousemove').pipe(map(e => e), share());
    const mousemove_0$ = mousemove$.pipe(filter(e => e.buttons == 0 && !e.altKey && !e.shiftKey && !e.ctrlKey), share());
    const mousemove_1$ = mousemove$.pipe(filter(e => e.buttons == 1), share());
    const mousemove_4$ = mousemove$.pipe(filter(e => e.buttons == 4), share());
    const mouseup$ = fromEvent(selectRef, 'mouseup');

    /* move move */
    mousemove$.pipe(
      filter(e => e.buttons === 0),
      tap(e => { emit('on-mousemove', e, convertClientToReal(canvasRef.value, e), false) }),
      debounceTime(120)
    ).subscribe(e => {
      emit('on-mousemove', e, convertClientToReal(canvasRef.value, e), true)
    });

    /* move with left click in canvas */
    const mousedownLeft$ = fromEvent(divRef, 'mousedown').pipe(
      filter(e=> e.buttons == 1),
      map(e => convertClientToReal(canvasRef.value, e)),
      tap(e => { 
        // stalkerRef.value.show({unModified : `(${e.realX},${e.realY})`})
        select.value = Rect.set2postion({x:e.x, y:e.y}, {x:e.x, y:e.y})
      }),
      mergeMap(start => mousemove_1$.pipe(
        map(e => convertClientToReal(canvasRef.value, e)),
        tap(end => { 
          // stalkerRef.value.show({unModified : `(${e.end.realX},${e.end.realY})`})
          select.value = Rect.set2postion(start, end)
        }),
        takeUntil(mouseup$),
      ))
    );
    mousedownLeft$.subscribe(e => { /* console.log("drag up", convertSelectedToRect(selected.value)) */ });

    /*** wheel event ***/
    const mousewheel$ = fromEvent(divRef, 'wheel').pipe(tap(ev => { /* ev.preventDefault() */ } ));
    
    mousewheel$.pipe(filter(e=> e.shiftKey && !e.ctrlKey && !e.altKey)).subscribe((e) => {
      emit('on-wheel', e)
      e.preventDefault();
    });

    // canvasRef.value.style.imageRendering = e.rendering ? "pixelated" : "auto";

    /* shift event : default 横スクロール -> disable */
    // const [wheelShiftIsBusy$, wheelShiftIsNotBusy$] = partition(mousewheel$.pipe(
    //   filter(e => e.shiftKey && !e.ctrlKey && !e.altKey),
    //   tap(e => e.preventDefault() )
    // ), _ => busy.value);
    // wheelShiftIsNotBusy$.subscribe(e => {
    //   if(e.deltaY != 0){
    //     rawParams.value = {...rawParams.value, bitshift : rawParams.value.bitshift + (e.deltaY > 0 ? -1 : 1) }
    //   }
    // });
    // wheelShiftIsBusy$.pipe(bufferToggle(isBusy$, ()=>isBusy$ ),filter(e => e.length > 0)).subscribe(e => {
    //   const dst = e.reduce((acc, curr) => acc + (curr.deltaY > 0 ? -1 :1), rawParams.value.bitshift)
    //   rawParams.value = {...rawParams.value, bitshift : dst }
    // });

    /* zoom event */
    mousewheel$.pipe(filter(e=> e.shiftKey && e.ctrlKey && !e.altKey)).subscribe((e) => {
      zoom.value = zoom.value + (e.deltaY > 0 ? -1 : 1);
      e.preventDefault();
    });
    
    /* drop */
    {
      fromEvent(divRef, 'dragenter').subscribe(e => {
        e.preventDefault();
        canvasRef.value.style.opacity = 0.65
      });
      fromEvent(divRef, 'dragleave').subscribe(e => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget)) {
          canvasRef.value.style.opacity = 1
        }
      });
      fromEvent(divRef, 'dragover').subscribe(e => {
        e.stopPropagation();
        e.preventDefault();
      });
      fromEvent(divRef, 'drop').subscribe(e => {
        emit('on-drop', e)
        canvasRef.value.style.opacity = 1
      });
    }

    /* contextmenu */
    fromEvent(divRef, 'contextmenu').subscribe( e => { 
      const real = convertClientToReal(canvasRef.value, e);
      const {left, top, width, height} = select.value.get();
      const x = left < real.x && real.x < left + width;
      const y = top < real.y && real.y < top + height;
      emit('on-context', e, {
        x: e.x,
        y: e.y,
        screenX: e.screenX,
        screenY: e.screenY,
        realX : real.x,
        realY : real.y,
        inSelected: x && y
      });
      // e.preventDefault();
    });
    
    onMounted(async () => {
      console.log('canvas mounted')
      nextTick(() => { console.log('canvas rendered'); });
    })
    return { 
      props, 
      cnvParams,
      divRef, canvasRef, selectRef, styled,
      select,
    }
  }
}

export { canvasEx, Rect };
