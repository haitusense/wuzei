//@ts-check

//@ts-ignore
const { createApp, ref, nextTick, onMounted, reactive } = window.Vue;
const { /* from */ /* fromEvent */ of, merge, partition,
  filter, first, delay, map, takeUntil, debounceTime, scan,
  bufferToggle, switchMap, mergeMap,  
  share, tap
//@ts-ignore
} = window.rxjs;
//@ts-ignore
const { from, fromEvent } = window.VueUse;

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

class Rect {
  constructor(start, end) {
    this.start = start
    this.end = end
  }
  static setPos(start, end){
    return new Rect(start, end)
  }
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


  function copyImageToClipboard(canvas, x, y, w, h) {
    const imageData = canvas.getContext('2d').getImageData(x, y, w, h);
    const temp = document.createElement('canvas');
    temp.width = w;
    temp.height = h;
    const ctx = temp.getContext('2d');
    if(ctx == null) return;
    ctx.putImageData(imageData, 0, 0);
    temp.toBlob(async (blob) => { 
      if(blob == null) return;
      await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
    }, 'image/png');
    console.log("clipboard")
  }
  
  // await navigator.clipboard.writeText("このテキストをクリップボードに書き込む");


const canvasEx = {
  template: `
  <div id="canvas" ref="divRef" style="position:absolute; top:0;left:0;right:0;bottom:0;">
    <canvas ref="canvasRef"
      :style= "{ ...styled, 
        left: props.margin*cnvParams.zoomfactor + 'px', 
        top: props.margin*cnvParams.zoomfactor + 'px', 
        backgroundColor: 'lightgray', 
        transform: 'scale(' + cnvParams.zoomfactor + ')', 
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
  },
  watch: {

  },
  methods: {
    zoom(val){ this.cnvParams = { ...this.cnvParams, zoom: Number(val) } },
    resize(w,h){  },
    /**
     * @param {any} image
     */
    redraw(image){
      console.log("redraw")
      const ctx = this.canvasRef.getContext("2d", { alpha: false, willReadFrequently: true, });
      ctx.drawImage(image, 0, 0);
      this.cnvParams = { ...this.cnvParams, width:image.width, height:image.height }
    },
    setSelect(left,top,width,height){
      this.selected = {startPos:{ x: left, y: top }, endPos:{ x:left + width, y: top + height }}
    },
    getSelect(){
      return this.selected.get()
    }
  },
  /*
    emit : on-context, on-move
  */
  setup(props, { emit }) {
    const styled = ref(styledObj.canvas)
    const [divRef, canvasRef, selectRef] = [ref(null), ref(null), ref(null)];
    const [selected] = [ref(Rect.setPos({x:0,y:0}, {x:0,y:0}))]; // real pos
    const cnvParams = ref({ width:320, height:240, zoom:0, zoomfactor:1, rendering : false });

    from(cnvParams).subscribe((e) => { 
      e.zoomfactor = 1.2 ** e.zoom;
      canvasRef.value.style.imageRendering = e.rendering ? "pixelated" : "auto";
    });
    from(selected).subscribe((e) => {
      const ctx = selectRef.value.getContext("2d");
      ctx.beginPath();
      ctx.clearRect(0, 0, selectRef.value.width, selectRef.value.height);
      let {left, top, width, height} = e.get();
      left = left + props.margin;
      top = top + props.margin;

      if(width > 0 && height > 0){
        ctx.fillStyle = "rgb(0, 0, 255, 0.2)";
        ctx.fillRect(left, top, width, height);
        console.log(left, top, width, height)
        ctx.strokeStyle = "rgba(0, 0, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(left + 0.5, top + 0.5, width - 1, height - 1);
        console.log(left + 0.5, top + 0.5, width - 1, height - 1)
      }
      ctx.closePath();
    });
    /******** mouse event ********/
    const mousemove$ = fromEvent(selectRef, 'mousemove').pipe(map(e => e), share());
    const mousemove_0$ = mousemove$.pipe(filter(e => e.buttons == 0 && !e.altKey && !e.shiftKey && !e.ctrlKey), share());
    const mousemove_1$ = mousemove$.pipe(filter(e => e.buttons == 1), share());
    const mousemove_4$ = mousemove$.pipe(filter(e => e.buttons == 4), share());
    const mouseup$ = fromEvent(selectRef, 'mouseup');

    mousemove$.subscribe(e => {
      // console.log(e)
      emit('on-mousemove', e, convertClientToReal(canvasRef.value, e))
    });

    /* move with left click in canvas */
    const mousedownLeft$ = fromEvent(divRef, 'mousedown').pipe(
      filter(e=> e.buttons == 1),
      map(e => convertClientToReal(canvasRef.value, e)),
      tap(e => { 
        // stalkerRef.value.show({unModified : `(${e.realX},${e.realY})`})
        selected.value = Rect.setPos({x:e.x, y:e.y}, {x:e.x, y:e.y})
      }),
      mergeMap(start => mousemove_1$.pipe(
        map(e => convertClientToReal(canvasRef.value, e)),
        tap(end => { 
          // stalkerRef.value.show({unModified : `(${e.end.realX},${e.end.realY})`})
          selected.value = Rect.setPos(start, end)
       }),
        takeUntil(mouseup$),
      ))
    );
    mousedownLeft$.subscribe(e => { /* console.log("drag up", convertSelectedToRect(selected.value)) */ });


    /*** wheel event ***/
    const mousewheel$ = fromEvent(selectRef, 'wheel').pipe(tap(ev => { /* ev.preventDefault() */ } ), share());

    /* alt event */
    mousewheel$.pipe(filter(e=> !e.shiftKey && !e.ctrlKey && e.altKey)).subscribe((e) => {
      cnvParams.value = { ...cnvParams.value, zoom : cnvParams.value.zoom + (e.deltaY > 0 ? -1 : 1)};
      e.preventDefault();
    });

    /* contextmenu */
    fromEvent(divRef, 'contextmenu').subscribe( e => { 
      const real = convertClientToReal(canvasRef.value, e);
      const {left, top, width, height} = selected.value.get();
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
      selected
    }
  }
}

export { canvasEx };

