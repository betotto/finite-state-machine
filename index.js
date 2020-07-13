import { BehaviorSubject } from 'rxjs';
import { v1 as uuidv1 } from 'uuid';
import RxjsFsm from './RxjsFsm';

let worker = new Worker('/web-worker.js');
    
worker.onmessage = event => {
  console.log(event);
  if(event.data === 'aborted') {
    worker.terminate();
  }
};

worker.postMessage(['connect', 'abcdef', '/connection'])

setTimeout(() => {
  worker.postMessage(['disconnect'])
}, 30000);


const messagesFromTab = new BehaviorSubject('joined');
const sseTab = `sse-${uuidv1()}`;

messagesFromTab.subscribe(ev => {
  console.log('from tab', ev);
}, err => {
  console.log(err);
});

window.addEventListener('storage', e => {
  if(e.key === 'sse-tab-sync') {
    const event = localStorage.getItem('sse-tab-sync');
    if(event) {
      const eventData = JSON.parse(atob(event));
      //if(eventData.origin !== origin) {
        messagesFromTab.next(eventData);
      //}
    }
  }
});

window.addEventListener('beforeunload', () => {
  localStorage.setItem('sse-tab-sync', btoa(JSON.stringify({ sseTab, cosa: 'dying' })));
});

const sseStates = {
  INITIAL: 'initial',
  STREAMING: 'streaming',
  CLOSED: 'closed'
};

const sseTransitions = {
  CONNECT: 'connect',
  FAIL: 'fail',
  DONE: 'done'
};

const sseState = RxjsFsm({
  states: [{
    state: sseStates.INITIAL,
    transitions: [
      { transition: sseTransitions.CONNECT, to: sseStates.STREAMING },
      { transition: sseTransitions.FAIL, to: sseStates.CLOSED }
    ]
  }, {
    state: sseStates.STREAMING,
    transitions: [
      { transition: sseTransitions.DONE, to: sseStates.CLOSED }
    ]
  }, {
    state: sseStates.CLOSED,
    transitions: [
      { transition: sseTransitions.CONNECT, to: sseStates.STREAMING },
      { transition: sseTransitions.FAIL, to: sseStates.CLOSED }
    ]
  }, {
    state: sseStates.CLOSED
  }],
  initial: sseStates.INITIAL
}).events(change => {
  console.log('from stateMachine', change);
}, err => {
  console.log(err);
});