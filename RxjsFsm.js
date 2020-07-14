import R_clone from 'ramda/src/clone';
import R_find from 'ramda/src/find';

function basicObserver() {
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

function RxjsFsm(config) {
  let currentState = R_clone(config.states[0]);
  const observer = new basicObserver();
  if (config.initial) {
    currentState = R_find(s => s.state === config.initial)(config.states);
  }

  return {
    reset: () => currentState = R_clone(config.states[0]),
    events: (fn) => {
      return observer.subscribe(fn);
    },
    getCurrent: () => currentState.state,
    doTransition: transitionName => {
      const currentTransition = R_find(t => t.transition === transitionName)(currentState.transitions);
      if (currentTransition) {
        const nextState = R_find(s => s.state === currentTransition.to)(config.states);
        observer.publish(nextState)
        if (nextState) {
          currentState = nextState
        }
      }
    }
  }
};


export default RxjsFsm;

