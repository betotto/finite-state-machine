import R_trim from 'ramda/src/trim';
import R_keys from 'ramda/src/keys';

let abort;

function SSEStream(headers, url, errorHandler) {
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
  xhr.addEventListener('error', errorHandler);
  xhr.addEventListener('abort', () => {
    postMessage(['aborted']);
  });
  xhr.open('GET', url, true);
  R_keys(headers).forEach(h => xhr.setRequestHeader(h, headers[h]));
  xhr.send();
}

const startSSE = (headers, url, retries, retryTimeout) => {
  if(retries > 0) {
    postMessage(['connecting']);
    SSEStream(headers, url, () => {
      postMessage(['re-connecting', `Retries left: ${retries}`]);
      setTimeout(() => startSSE(headers, url, retries - 1), retryTimeout);
    });
  } else {
    postMessage(['error', 'Can\'t connect']);
  }
};

self.onmessage = e => {
  const headers = e.data[1] || {};
  const retries = e.data[3] || 3;
  const retryTimeout = (e.data[4] * 1000) || 0;
  console.log(headers, retries, retryTimeout);
  switch(e.data[0]) {
    case 'connect': startSSE(headers, e.data[2], retries, retryTimeout);break;
    case 'disconnect': abort();break;
  }
};
