import { h, patch } from 'superfine';
import SSEClient from './SSEClient';

let messages = [];
let numberMessages = 0;
const node = document.getElementById('app');

SSEClient.init('1232312', '/connection').subscribe(e => {
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
