import { h, patch } from 'superfine';
import SSEClient from './SSEClient';

let messages = [];
let numberMessages = 0;
const node = document.getElementById('app');

SSEClient.init({
    headers: {
        conversationId: 'vacaciones'
    },
    serviceLocation: '/connection',
    workerLocation: '/web-worker.js',
    maxTime: 1,
    retries: 5,
    retryTimeout: 1
}).subscribe(e => {
    if(e.type === 'message') {
        numberMessages++;
        messages.push(e.data);
        const content = messages.map(m => h('p', {}, m));
        if(content.length > 0) {
            patch(
                node,
                h('div', {}, [h('div', {}, numberMessages), content])
            );
        }
    }
});

window.doClick = () => SSEClient.start();

window.doClickDos = () => SSEClient.stop();
