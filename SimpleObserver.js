function SimpleObserver() {
  this.handler = null;

  this.subscribe = fn => {
    this.handler = fn;
    return () => {
      this.handler = null;
    }
  };

  this.publish = (t, o, thisObj) => {
    const scope = thisObj;
    if(this.handler) {
      this.handler.call(scope, t, o);
    }
  };
}

export default SimpleObserver;
