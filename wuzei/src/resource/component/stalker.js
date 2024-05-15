const { createApp, ref, nextTick, onMounted, reactive } = window.Vue;
const { /* from */ /* fromEvent */ of, merge, partition,
  filter, first, delay, map, takeUntil, debounceTime, scan,
  bufferToggle, switchMap, mergeMap,  
  share, tap
} = window.rxjs;
const { from, fromEvent } = window.VueUse;

const styled = {
  circle : {
    position: "fixed", pointerEvents: "none", userSelect: "none",
    top: "-2.5px", left: "-2.5px", 
    width: "6px", height: "6px",
    border: "solid 0.8px #FFF", outline: "solid 0.6px #000", outlineOffset: "0px",
    borderRadius: "50%", zIndex: "98"
  },
  label : {
    position: "fixed", pointerEvents: "none", userSelect: "none",
    width: "100px", height: "45px",
    overflow: "hidden",
    fontSize:" x-small", whiteSpace: "pre-line", zIndex: "98"
  }
}

/*

*/

const stalker = {
  template: `
    <div v-if="visually">
      <div :style="{...circleStyle, ...transform}"></div>
      <div :style="{...labelStyle, ...transform, ...origin, '-webkit-text-stroke': '2px white'}">{{showtext}}</div>
      <div :style="{...labelStyle, ...transform, ...origin, color: 'black'}">{{showtext}}</div>
    </div>
  `,
  props: ['target'],
  methods: {
    intext(src){ this.text = src }
  },
  setup(props) {
    const circleStyle = ref(styled.circle)
    const labelStyle = ref(styled.label)

    const transform = ref({transform : "translate(-100px, -100px)"})
    const origin = ref({ left: "10px", top: "10px" })
    const modifier = ref({ shiftKey: false, ctrlKey: false, altKey : false })
    const showtext = ref({ })
    const text = ref({
      unModified : "null",
      shiftKey : "shift",
      ctrlKey : "ctrl",
      altKey : "alt",
    })
    const visually = ref(false)

    fromEvent(document.getElementById(props.target), "mouseenter").subscribe(e => { visually.value = true; });
    fromEvent(document.getElementById(props.target), "mouseleave").subscribe(e => { visually.value = false });
    fromEvent(document, 'mousemove').subscribe(e => {
      // 親要素の取り方再考
      // origin.value.left = window.innerWidth > e.clientX + 100 ?  20 : -90;
      // origin.value.top = window.innerHeight > e.clientY + 30 ? 20 : -30;
      transform.value = {transform : `translate(${e.clientX}px, ${e.clientY}px)`};
    });
    merge(fromEvent(document, 'keydown'), fromEvent(document, 'keyup'))
      .pipe(filter(e => e.repeat === false && ["Shift","Control","Alt"].includes(e.key)))
      .subscribe(e => {
        modifier.value = { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey : e.altKey }
      });
    merge(from(text), from(modifier)).subscribe(e => {
      const key = modifier.value;
      switch(true){
        case key.shiftKey && !key.ctrlKey && !key.altKey:
          showtext.value = text.value.shiftKey;
          break;
        case !key.shiftKey && key.ctrlKey && !key.altKey:
          showtext.value = text.value.ctrlKey;
          break;
        case !key.shiftKey && !key.ctrlKey && key.altKey:
          showtext.value = text.value.altKey;
          break;
        default:
          showtext.value = text.value.unModified;
          // showtext.value = `${text.value.x} ${text.value.y}`
          break;
      }
    });

    return { circleStyle, transform, origin, labelStyle, showtext, text, visually }
  },
}

export { stalker };