/**
 * context.js
 */
//@ts-check

//@ts-ignore
const [ Vue, rxjs, VueUse ] = [ window.Vue, window.rxjs, window.VueUse ]
const { ref } = Vue;
const {     } = rxjs;
const { fromEvent } = VueUse;

/**
 * props   : items \
 * methods : show, close \
 * emit    : on-click \
 */
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
      try {
        if(action) { action(e) }
      } catch (e) {
        console.error(e);
      } finally {
        display.value = "none";
      }
    }

    return { props, left, top, display, contextitems, onClickMenu }
  }
}

export { contextmenu };
