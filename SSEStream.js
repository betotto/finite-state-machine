import R_trim from 'ramda/src/trim';

let abort;

function SSEStream(conversationId, url) {
  let chunk  = '';
  let progress = 0;
  let xhr;

  const parseData = data => {
    if (!data || data.length === 0) {
      return null;
    }
    let e = { 'id': null, 'retry': null, 'data': '', 'event': 'message' };
    data.split(/\n|\r\n|\r/).forEach(line => {
      line = R_trim(line);
      let index = line.indexOf(':');
      if (index <= 0) {
        // Line was either empty, or started with a separator and is a comment.
        // Either way, ignore.
        return;
      }

      let field = line.substring(0, index);
      if (!(field in e)) {
        return;
      }

      let value = R_trim(line.substring(index + 1));
      if (field === 'data') {
        e[field] += value;
      } else {
        e[field] = value;
      }
    });

    return e;
  };

  const onProgress = () => {
    if (xhr.status !== 200) {
      postMessage(`Not connected, status code: ${xhr.status}`);
      return;
    }
    let data = xhr.responseText.substring(progress);
    progress += data.length;
    data.split(/(\r\n|\r|\n){2}/g).forEach(part => {
      if (R_trim(part).length === 0) {
        let message = parseData(R_trim(chunk));
        if(message) {
          postMessage(['message', message]);
        }
        chunk = '';
      } else {
        chunk += part;
      }
    });
  };

  const onLoad = () => {
    postMessage(['loaded']);
    chunk = '';
  };

  abort = () => {
    if(xhr.readyState !== 2) {
      xhr.abort();
    }
  };

  xhr = new XMLHttpRequest();
  xhr.addEventListener('progress', onProgress);
  xhr.addEventListener('load', onLoad);
  xhr.addEventListener('error', e => {
    postMessage(['error', e]);
  });
  xhr.addEventListener('abort', () => {
    postMessage(['aborted']);
  });
  xhr.open('GET', url, true);
  xhr.setRequestHeader('conversation-id', conversationId);
  postMessage(['connecting']);
  xhr.send();
}

const startSSE = (conversationId, url) => {
  SSEStream(conversationId, url);
}

self.onmessage = e => {
  console.log('Worker: Message received from main script');
  const result = e.data[0] * e.data[1];
  switch(e.data[0]) {
    case 'connect': startSSE(e.data[1], e.data[2]);break;
    case 'disconnect': abort();break;
  }
}
