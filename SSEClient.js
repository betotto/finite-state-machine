import { ReplaySubject } from 'rxjs';
import { v1 as uuidv1 } from 'uuid';
import RxjsFsm from './RxjsFsm';

let conversationId;
let url;
let eventsSource;
let machine;
let timeout;
let activeTab;
const tabs = {};

const worker = new Worker('/web-worker.js');

const sseStates = {
  INITIAL: 'initial',
  WAITING: 'waiting',
  STREAMING: 'streaming',
  CLOSED: 'closed'
};

const sseTransitions = {
  WAIT: 'wait',
  INIT: 'init',
  CONNECTED: 'connected',
  FAIL: 'fail',
  DONE: 'done'
};

const sseTab = `sse-${uuidv1()}`;

window.addEventListener('storage', e => {
  if(e.key === 'sse-tab-sync') {
    const ev = localStorage.getItem('sse-tab-sync');
    if(event) {
      const evt = JSON.parse(atob(ev));
      switch(evt.event.type) {
        case 'tab-joined': tabs[evt.sseTab] = 'other';propagateEvent(Event('tab-exists', sseTab));break;
        case 'tab-exists': tabs[evt.sseTab] = 'other';break;
        case 'tab-streaming': activeTab = evt.sseTab; machine.doTransition(sseTransitions.WAIT);break;
        case 'tab-leave': delete tabs[evt.sseTab];break;
        case 'tab-close': stop(true);break;
      }

      console.log(machine.getCurrent());
      
    }
  }
});

window.addEventListener('beforeunload', () => {
  propagateEvent(Event('tab-leave', sseTab));
});

const propagateEvent = event => {
  localStorage.setItem('sse-tab-sync', btoa(JSON.stringify({ sseTab, event })));
};

const Event = (type, data) => ({
  type,
  data
});

tabs[sseTab] = 'origin';
propagateEvent(Event('tab-joined', sseTab));

const init = (conversation, serviceLocation, maxTime) => {
  conversationId = conversation;
  url = serviceLocation;
  if(maxTime) {
    timeout = (maxTime * 60000) - 2000;
  } else {
    //timeout = (3 * 60000) - 2000;
    timeout = 20000;
  }
  machine = RxjsFsm({
    states: [{
      state: sseStates.INITIAL,
      transitions: [
        { transition: sseTransitions.WAIT, to: sseStates.WAITING },
        { transition: sseTransitions.CONNECTED, to: sseStates.STREAMING },
        { transition: sseTransitions.FAIL, to: sseStates.CLOSED }
      ]
    }, {
      state: sseStates.WAITING,
      transitions: [
        { transition: sseTransitions.DONE, to: sseStates.CLOSED },
        { transition: sseTransitions.FAIL, to: sseStates.CLOSED }
      ]
    }, {
      state: sseStates.STREAMING,
      transitions: [
        { transition: sseTransitions.DONE, to: sseStates.CLOSED },
        { transition: sseTransitions.INIT, to: sseStates.INITIAL }
      ]
    }, {
      state: sseStates.CLOSED
    }],
    initial: sseStates.INITIAL
  });
  const initEvent = Event(machine.getCurrent());
  eventsSource = new ReplaySubject(initEvent);
  machine.events(data => {
    console.log(data);
  });
  return eventsSource;
};

worker.onmessage = event => {
  const [eventName, data] = event.data;
  switch(eventName) {
    case 'aborted': {
      eventsSource.next(Event(eventName));
      machine.doTransition(sseTransitions.INIT);
      if(activeTab === sseTab) {
        start();
      }
      break;
    }
    case 'message': {
      const event = Event(eventName, data);
      propagateEvent(event);
      eventsSource.next(event);
      break;
    }
  }
};

const start = () => {
  let state = machine.getCurrent();
  if(state === sseStates.INITIAL) {
    activeTab = sseTab;
    propagateEvent(Event('tab-streaming', sseTab));
    setTimeout(() => {
      worker.postMessage(['disconnect'])
    }, timeout);
    machine.doTransition(sseTransitions.CONNECTED);
    worker.postMessage(['connect', conversationId, url])
  }
};

const stop = isFromTab => {
  let state = machine.getCurrent();
  switch(state) {
    case sseStates.STREAMING: {
      machine.doTransition(sseTransitions.DONE);
      if(isFromTab !== true) {
        propagateEvent(Event('tab-close', sseTab));
      }
      activeTab = null;
      worker.postMessage(['abort']);
      worker.terminate();
      break;
    }
    case sseStates.WAITING: {
      activeTab = null;
      if(isFromTab !== true) {
        propagateEvent(Event('tab-close', sseTab));
      }
      machine.doTransition(sseTransitions.DONE);
      worker.terminate();
      break;
    }
  }
};

export default {
  start,
  init,
  stop
}