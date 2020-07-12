import { ReactWidget, showDialog, Dialog } from '@jupyterlab/apputils';
import { renderText } from '@jupyterlab/rendermime';
import { defaultSanitizer } from '@jupyterlab/apputils';

import React from 'react';

export default class StatusLaunch extends ReactWidget {
  private paths: string[] = null;
  private ws: WebSocket = null;

  constructor() {
    super();
    this.node.title = 'Launch status.';
    this.addClass('jp-ReactWidget');

    this.paths = [];

    this.ws = new WebSocket("ws://"+window.location.host+"/jupyterlab-ros/launch");
    this.ws.onopen = this.onOpen;
    this.ws.onmessage = this.onMessage;
    this.ws.onerror = this.onError;
    this.ws.onclose = this.onClose;
  }

  onOpen = (event) => { } // console.log(event); }
  onError = (event) => { console.error(event); }
  onClose = (event) => { } // console.log(event); }
  onMessage = async (message) => {
    const msg = JSON.parse(message.data);
    let body: HTMLDivElement = null;
    
    switch (msg.code) {
      case 0: this.paths = msg.paths; break;
      case 1: this.paths.push(msg.path); break;
      case 2:
        body = document.createElement('div');
        await renderText({host: body, sanitizer: defaultSanitizer, source: msg.msg });
        showDialog({
          title: "WARNING: " + msg.path,
          body: <div className="jp-About-body" dangerouslySetInnerHTML={{ __html: body.innerHTML }}></div>,
          buttons: [ Dialog.okButton() ]
        });
        break;
      case 3:
      case 4:
        var index = this.paths.indexOf(msg.path);
        if (index !== -1) this.paths.splice(index, 1);

        body = document.createElement('div');
        await renderText({host: body, sanitizer: defaultSanitizer, source: msg.msg });

        showDialog({
          title: (msg.code == 3 ? "FINISHED: " : "ERROR: " ) + msg.path,
          body: <div className="jp-About-body" dangerouslySetInnerHTML={{ __html: body.innerHTML }}></div>,
          buttons: [ Dialog.okButton() ]
        });
        break;
      
      default:
        break;
    }
    this.update();
  }

  launch = (path) => {
    this.ws.send( JSON.stringify({ cmd: 'start', path }) );
  }

  toggle = (path) => {
    showDialog({
      title: path,
      body: <pre className="jp-About-body">This execution will be stoped. Are you sure?</pre>,
      buttons: [ Dialog.okButton(), Dialog.cancelButton() ]
    }).then(res => {
      if (res.button.label != "OK") return;
      this.ws.send( JSON.stringify({ cmd: 'stop', path }) );

    }).catch( e => console.log(e) );
  }
  
  render(): JSX.Element {
    return (
      <a href="#" className="main">
        {
          this.paths.map( (path, i) => {
            return (
              <span key={i} style={{ margin: '3px' }} onClick={() => this.toggle(path)}>
                { path.split('/').pop() }
              </span>
            );
          })
        }
      </a>
    );
  }
}