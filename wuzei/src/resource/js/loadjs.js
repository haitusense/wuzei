//@ts-check
console.log("loadjs.js")

/**
 * @param {string} path
 */
async function loadJs(path) {
  const src = (() => {
    const elm = document.querySelector('script[type="importmap"]');
    if(elm){
      const json = JSON.parse(elm.textContent ?? "");
      Object.keys(json.scopes).forEach(scope=> {
        if (scope.indexOf(location.hostname) > 0 && json.scopes[scope][path]) { return json.scopes[scope][path]; }
      })
      return json.imports[path] ?? path;
    }else{
      return path
    }
  })();
  let element = null; 
  // let target = null;
  switch(src.split('.').pop()) {
    case 'js':
      element = document.createElement('script');
      element.src = src;
      break;
    case 'css':
      element = document.createElement('link');
      element.href = src;
      element.rel = 'stylesheet';
      break;
  }
  if(element){
    const promise = new Promise((resolve) => { 
      element.onload = () => {
        console.log("loaded", src); 
        resolve(undefined); 
      };});
    document["head"].appendChild(element);
    await promise;
  }
  return window;
}

/*
<script>
  console.log(`Browser supports importmaps : ${HTMLScriptElement.supports?.("importmap")}`);
</script>
<script type="importmap">
{
  "imports" : { 
    "vue": "https://unpkg.com/vue@3.4.21/dist/vue.global.prod.js",
  },
  "scopes": {
    "http://wuzei.localhost/" : {
      "vue": "http://wuzei.localhost/resource/vue@3.4.12/dist/vue.esm-browser.prod.js"
    }
  }
}
</script>
<script type="module">
  const { createApp } = (await loadJS("vue")).Vue;
  await loadJs("https://unpkg.com/primevue/resources/themes/lara-light-green/theme.css");
</script>
*/

export { loadJs };