const { ref, onMounted } = window.Vue;
const { /* from */ /* fromEvent */ of, merge, partition,
  filter, first, delay, map, takeUntil, debounceTime, scan,
  bufferToggle, switchMap, mergeMap,  
  share, tap
} = window.rxjs;
const { fromEvent } = window.VueUse;

const contextmenu = {
  template: `
    <div
      class="contextmenu"
      style="position: absolute;" 
      :style="{ left: left, top: top, display: display }" >
      <template v-for="{type, value, action} in contextitems">
        <div v-if="type === 'div'" @click="onClickMenu($event, action)" >{{ value }}</div>
        <hr v-if="type === 'hr'">
      </template>
    </div>
  `,
  props: {
    items: { type: Object, required: true }
  },
  methods: {
    show(left, top, key) { 
      this.contextitems = this.props.items[key]
      this.left = `${left}px`;
      this.top = `${top}px`;
      this.display = "block";
    },
    close() { this.display = "none"; },
  },
  /*
    emit : on-click
  */
  setup(props, { emit }) {
    const [left, top, display] = [ref("100px"), ref("100px"), ref("none")]
    const contextitems = ref({})

    // click outside
    fromEvent(document, 'mousedown').subscribe(e=>{ 
      if(!e.target.closest('.contextmenu')){
        display.value = "none"
      }
    });
    // click inside / @click="$emit('callback', key)"から変更
    const onClickMenu = (e, action) => {
      // emit("on-click", e, key);
      if(action) { action(e) }
      display.value = "none";
    }

    return { props, left, top, display, contextitems, onClickMenu }
  }
}

export { contextmenu };
