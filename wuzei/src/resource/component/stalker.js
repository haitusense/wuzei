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
    borderRadius: "50%", zIndex: "90"
  },
  label : {
    position: "fixed", pointerEvents: "none", userSelect: "none",
    width: "100px", height: "45px",
    overflow: "hidden",
    fontSize:" x-small", whiteSpace: "pre-line", zIndex: "90"
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
    intext(key, val){ this.text = ({ ...this.text, [key]: val }); }
  },
  setup(props) {
    const circleStyle = ref(styled.circle)
    const labelStyle = ref(styled.label)

    const transform = ref({transform : "translate(-100px, -100px)"})
    const origin = ref({ left: "10px", top: "10px" })
    const keystate = ref({ mouse:0, shiftKey: false, ctrlKey: false, altKey : false })
    const showtext = ref({ })
    const text = ref({
      "0" : "null",
      "1" : "1",
      "shift+0" : "shift",
      "ctrl+0" : "ctrl",
      "alt+0" : "alt"
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
        keystate.value = { ...keystate.value, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey : e.altKey }
      });
    merge(fromEvent(document, 'mouseup'), fromEvent(document, 'mousedown'))
      .subscribe(e => {
        keystate.value = { ...keystate.value, mouse: e.buttons }
      });

    merge(from(text), from(keystate)).subscribe(e => {
      const key = keystate.value;
      const keys = `${key.shiftKey ? "shift+": ""}${key.ctrlKey ? "ctrl+" : ""}${key.altKey ? "alt+" : ""}${key.mouse}`
      showtext.value = text.value[keys];
    });

    return { circleStyle, transform, origin, labelStyle, showtext, text, visually }
  },
}

export { stalker };