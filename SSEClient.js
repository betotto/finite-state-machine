import { ReplaySubject } from 'rxjs';
import { v1 as uuidv1 } from 'uuid';
import RxjsFsm from './RxjsFsm';
import R_keys from 'ramda/src/keys';
import R_mergeRight from 'ramda/src/mergeRight';
import R_clone from 'ramda/src/clone';

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
  const otherTabs = R_keys(tabs).filter(t => tabs[t] !== 'active');
  if(otherTabs.length > 0) {
    tabs[otherTabs[0]] = 'back';
  }
}

window.addEventListener('storage', e => {
  if(e.key === 'sse-tab-sync') {
    const ev = localStorage.getItem('sse-tab-sync');
    if(event) {
      const evt = JSON.parse(atob(ev));
      if(evt.sseTab !== sseTab) {
        switch(evt.event.type) {
          case 'tab-joined':
            tabs[evt.sseTab] = 'ready';

            if(tabs[sseTab] === 'active') {
              const backTab = R_keys(tabs).find(t => tabs[t] === 'back');
              if(backTab) {
                tabs[evt.sseTab] = 'ready';
              } else {
                tabs[evt.sseTab] = 'back';
              }
            } else { 
              tabs[evt.sseTab] = 'ready';
            }
            propagateEvent(Event('tab-exists', tabs));
            console.log('tab-joined', JSON.stringify(tabs));
            break;
          case 'tab-exists':
            tabs = R_clone(evt.event.data);
            const isActive = R_keys(tabs).find(t => tabs[t] === 'active');
            if(isActive) {
              machine.doTransition(sseTransitions.WAIT);
            }
            console.log('tab-exits', sseTab, JSON.stringify(tabs));
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
                propagateEvent(Event('tab-exists', tabs));
                machine.doTransition(sseTransitions.MASTER);
                start();
              }
            }
            delete tabs[evt.sseTab];break;
          case 'tab-close': stop(true);break;
          case 'message': console.log('from tab', evt.event.type);break;
        }
      }
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
  eventsSource = new ReplaySubject(initEvent);
  machine.events(data => {
    console.log('stateChange', data);
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