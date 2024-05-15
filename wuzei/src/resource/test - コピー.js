console.log("test.js")
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

async function loadJs(path) {
  const src = (() => {
    const json = JSON.parse(document.querySelector('script[type="importmap"]').textContent);
    Object.keys(json.scopes).forEach(scope=> {
      if (scope.indexOf(location.hostname) > 0 && json.scopes[scope][path]) { return json.scopes[scope][path]; }
    })
    return json.imports[path] ?? path;
  })();
  let element = null; 
  let target = null;
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
  const promise = new Promise((resolve) => { element.onload = () => { console.log("loaded", src); resolve(); };});
  document["head"].appendChild(element);
  await promise;
  return window;
}

const convertClientToReal = (target, selectTarget, event) => {
  // canvas自体で拡大縮小する
  const zoomfactor = parseFloat(target.parentNode.style.transform.match(/scale\((.+?)\)/)[1]); // size.value.zoomfactor
  const {clientX, clientY} = event;
  const realX = Math.floor((clientX - target.getBoundingClientRect().left)/zoomfactor);
  const realY = Math.floor((clientY - target.getBoundingClientRect().top)/zoomfactor);
  const cnv = target
  const s = convertSelectedToRect(selectTarget);
  const isInSelected = (s.left < realX && realX < s.left + s.width && s.top < realY && realY < s.top + s.height);
  const isInCanvas = (0 <= realX && realX < cnv.width && 0 <= realY && realY < cnv.height);
  event.realX = realX;
  event.realY = realY;
  event.isInSelected = isInSelected;
  event.isInCanvas = isInCanvas;
  return event;
}
const convertSelectedToRect = (n) => {
  const left = n.startPos.x < n.endPos.x ? n.startPos.x: n.endPos.x + 1;
  const top = n.startPos.y < n.endPos.y ? n.startPos.y: n.endPos.y + 1;
  const width = Math.abs(n.startPos.x - n.endPos.x);
  const height = Math.abs(n.startPos.y - n.endPos.y);
  return {left, top, width, height};
};

export { sleep, loadJs, convertClientToReal, convertSelectedToRect };