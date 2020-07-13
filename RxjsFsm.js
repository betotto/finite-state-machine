import { ReplaySubject } from 'rxjs';
import R_clone from 'ramda/src/clone';
import R_find from 'ramda/src/find';

function RxjsFsm(config) {
  let currentState = R_clone(config.states[0]);
  if (config.initial) {
    currentState = R_find(s => s.state === config.initial)(config.states);
  }

  let emitter = new ReplaySubject(currentState);

  return {
    reset: () => currentState = R_clone(config.states[0]),
    events: (fn, err) => {
      emitter.subscribe(fn, err)
    },
    getCurrent: () => currentState.state,
    doTransition: transitionName => {
      const currentTransition = R_find(t => t.transition === transitionName)(currentState.transitions);
      if (currentTransition) {
        const nextState = R_find(s => s.state === currentTransition.to)(config.states);
        emitter.next(nextState)
        if (nextState) {
          currentState = nextState
        }
      }
    }
  }
};


export default RxjsFsm;

