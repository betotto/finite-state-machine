import RxFsm from './finiteMachie';

const machine = RxFsm({
  states: [{
    state: 'active',
    transitions: [
      { transition: 'activate', to: 'inactive'},
    ]
  }, {
    state: 'inactive',
    transitions: [
      { transition: 'deactivate', to: 'active'},
    ]
  }],
  initial: 'active'
});

machine.events( o => {
  console.log('from observer', o)
}, err => {
  console.log(err)
})

console.log(machine.getCurrent());

machine.doTransition('activate');

console.log(machine.getCurrent());

machine.doTransition('deactivate');

machine.doTransition('deactivate');

console.log(machine.getCurrent());

machine.events( o => {
  console.log('from observer 2', o)
}, err => {
  console.log(err)
})
