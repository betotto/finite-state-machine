import SSEClient from './SSEClient';

SSEClient.init('1232312', '/connection').subscribe(e => {
    console.log(e.type, e.data);
});

window.doClick = () => SSEClient.start();

window.doClickDos = () => SSEClient.stop();
