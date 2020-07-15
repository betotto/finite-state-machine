function SimpleObserver() {
  this.handlers = [];

  this.subscribe = fn => {
    this.handlers.push(fn);
    return () => {
      this.handlers = this.handlers.filter(item => item !== fn);
    }
  };

  this.publish = (t, o, thisObj) => {
    const scope = thisObj;
    this.handlers.forEach(item => item.call(scope, t, o));
  };
}

export default SimpleObserver;
