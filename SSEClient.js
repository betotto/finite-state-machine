import { v1 as uuidv1 } from 'uuid';
import R_keys from 'ramda/src/keys';
import R_mergeRight from 'ramda/src/mergeRight';
import R_clone from 'ramda/src/clone';
import R_find from 'ramda/src/find';
import R_filter from 'ramda/src/filter';
import SimpleFsm from './SimpleFsm';
import SimpleObserver from './SimpleObserver';

let conversationId;
let url;
let eventsSource;
let machine;
let timeout;
let activeTab;
let tabs = {};

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
  MASTER: 'master',
  FAIL: 'fail',
  DONE: 'done'
};

const sseTab = `sse-${uuidv1()}`;

const selectBack = () => {
  const otherTabs = R_filter(t => tabs[t] !== 'active', R_keys(tabs));
  if(otherTabs.length > 0) {
    tabs[otherTabs[0]] = 'back';
  }
}

window.addEventListener('storage', e => {
  if(e.key === 'sse-tab-sync') {
    const ev = e.newValue;
    if(ev) {
      const evt = JSON.parse(atob(ev));
      if(evt.sseTab !== sseTab) {
        switch(evt.event.type) {
          case 'tab-joined':
            tabs[evt.sseTab] = 'ready';
            if(tabs[sseTab] === 'active') {
              const backTab = R_find(t => tabs[t] === 'back')(R_keys(tabs));
              if(backTab) {
                tabs[evt.sseTab] = 'ready';
              } else {
                tabs[evt.sseTab] = 'back';
              }
            } else { 
              tabs[evt.sseTab] = 'ready';
            }
            propagateEvent(Event('tab-exists', tabs));
            break;
          case 'tab-exists':
            tabs = R_clone(evt.event.data);
            const isActive = R_find(t => tabs[t] === 'active')(R_keys(tabs));
            if(isActive) {
              machine.doTransition(sseTransitions.WAIT);
            }
            break;
          case 'tab-origin-selection':
          case 'tab-streaming':
            tabs = R_mergeRight(tabs, evt.event.data);
            machine.doTransition(sseTransitions.WAIT);
            break;
          case 'tab-leave':
            if(tabs[evt.sseTab] === 'active') {
              if(tabs[sseTab] === 'back') {
                tabs[sseTab] = 'active';
                const otherTabs = R_keys(tabs);
                if(otherTabs.length > 0) {
                  tabs[otherTabs[0]] = 'back';
                }
                delete tabs[evt.sseTab];
                propagateEvent(Event('tab-exists', tabs));
                machine.doTransition(sseTransitions.MASTER);
                start();
              }
            } else if(tabs[sseTab] === 'active') {
              if(tabs[evt.sseTab] === 'back') {
                const otherTabs = R_filter(t => tabs[t] !== 'active' && t !== evt.sseTab, R_keys(tabs));
                if(otherTabs.length > 0) {
                  tabs[otherTabs[0]] = 'back';
                }
              }
              delete tabs[evt.sseTab];
              propagateEvent(Event('tab-exists', tabs));
            }
            delete tabs[evt.sseTab];
            break;
          case 'tab-close': stop(true);break;
          case 'message': eventsSource.publish(evt.event);break;
        }
      }
    }
  }
});

window.addEventListener('beforeunload', () => {
  propagateEvent(Event('tab-leave', sseTab));
});

const propagateEvent = event => {
  console.log(event);
  localStorage.setItem('sse-tab-sync', btoa(JSON.stringify({ sseTab, event })));
};

const Event = (type, data) => ({
  type,
  data
});

tabs[sseTab] = 'ready';
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
  machine = SimpleFsm({
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
        { transition: sseTransitions.MASTER, to: sseStates.INITIAL },
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
  eventsSource = new SimpleObserver();
  machine.events(data => {
    console.log('stateChange', data);
  });
  return eventsSource;
};

worker.onmessage = evt => {
  const [eventName, data] = evt.data;
  switch(eventName) {
    case 'aborted': {
      eventsSource.publish(Event(eventName));
      machine.doTransition(sseTransitions.INIT);
      if(activeTab === sseTab) {
        start();
      }
      break;
    }
    case 'message': {
      const event = Event(eventName, data.data);
      propagateEvent(event);
      eventsSource.publish(event);
      break;
    }
  }
};

const start = () => {
  let state = machine.getCurrent();
  if(state === sseStates.INITIAL) {
    activeTab = sseTab;
    tabs[sseTab] = 'active';
    selectBack();
    propagateEvent(Event('tab-streaming', tabs));
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
  R_keys(tabs).forEach(t => tabs[t] = 'ready');
};

export default {
  start,
  init,
  stop
}