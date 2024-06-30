console.log("app.js")
// console.info("app.js")
// console.warn("app.js")
// console.error("app.js")

/******** attach console ********/
const _originalConsoleLog = console.log;
window.console.log = (...args) => {
  const stackTrace = new Error().stack.split('\n')[2].match(/https?:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+/g);
  if(stackTrace){
    _originalConsoleLog(stackTrace[0], ...args)
    window.ipc.postMessage(JSON.stringify({ type: "log", payload:[`[js at ${new URL(stackTrace[0]).pathname}]`, args.reduce((acc, cur) => `${acc} ${cur}`,'')] }));
  }else{
    _originalConsoleLog(...args)
  }
};
// objectとかほいほいconsole.logしてると解放されないでメモリーリークの原因になったりするんで注意


/******** window startup location ********/
(function (){
  // in event loop block
}());

