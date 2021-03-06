import '../style/index.css';
import { Widget, PanelLayout, Panel } from '@lumino/widgets';
import { WidgetTracker, ReactWidget } from '@jupyterlab/apputils';
import { Message, MessageLoop } from '@lumino/messaging';
import { PromiseDelegate } from '@lumino/coreutils';
import { ArrayExt } from '@lumino/algorithm';

/**
 * The class name for confirmation box
 */
const CONFIRM_CLASS = 'jp-undo-delete';

/**
 * Create and show a dialog.
 *
 * @param options - The dialog setup options.
 *
 * @returns A promise that resolves with whether the dialog was accepted.
 */
export function showUndoMessage<T>(
  options: Partial<UndoDelete.IOptions<T>> = {}
): Promise<void> {
  console.log(options);
  const confirmMessage = new UndoDelete(options);
  return confirmMessage.launch();
}

/**
 * A widget used to show undo delete message.
 */
export class UndoDelete<T> extends Widget {
  constructor(options: Partial<UndoDelete.IOptions<T>> = {}) {
    super();
    this.addClass(CONFIRM_CLASS);
    const renderer = UndoDelete.defaultRenderer;

    this._host = options.host || document.body;
    const layout = (this.layout = new PanelLayout());
    const content = new Panel();
    content.addClass('jp-undo-delete-content');
    layout.addWidget(content);

    const body = renderer.createBody(options.body || '');
    // body.addClass('jp-Message-body');
    // const icon = renderer.createIcon();
    // content.addWidget(icon);
    content.addWidget(body);

    if (UndoDelete.tracker.size > 0) {
      console.log('hihihihi');
      const previous = UndoDelete.tracker.currentWidget;
      previous.reject();
      UndoDelete.tracker.dispose();
    }

    void UndoDelete.tracker.add(this);
  }
  /**
   * Launch the dialog as a modal window.
   *
   * @returns a promise that resolves with the result of the dialog.
   */
  launch(): Promise<void> {
    // Return the existing dialog if already open.
    if (this._promise) {
      return this._promise.promise;
    }
    const promise = (this._promise = new PromiseDelegate<void>());
    const promises = Promise.all(Private.launchQueue);
    Private.launchQueue.push(this._promise.promise);
    console.log(Private.launchQueue);
    return promises.then(() => {
      console.log('here44');
      Widget.attach(this, this._host);
      return promise.promise;
    });
  }

  /**
   * Resolve the current dialog.
   *
   * @param index - An optional index to the button to resolve.
   *
   * #### Notes
   * Will default to the defaultIndex.
   * Will resolve the current `show()` with the button value.
   * Will be a no-op if the dialog is not shown.
   */
  resolve(): void {
    if (!this._promise) {
      return;
    }
    this._resolve();
  }

  /**
   * Reject the current dialog with a default reject value.
   *
   * #### Notes
   * Will be a no-op if the dialog is not shown.
   */
  reject(): void {
    if (!this._promise) {
      return;
    }
    this._resolve();
  }

  /**
   * Resolve a button item.
   */
  private _resolve(): void {
    // Prevent loopback.
    const promise = this._promise;
    if (!promise) {
      this.dispose();
      return;
    }
    this._promise = null;
    ArrayExt.removeFirstOf(Private.launchQueue, promise.promise);
    this.dispose();
    promise.resolve();
  }

  /**
   * Dispose of the resources used by the dialog.
   */
  dispose(): void {
    const promise = this._promise;
    if (promise) {
      this._promise = null;
      promise.reject(void 0);
      ArrayExt.removeFirstOf(Private.launchQueue, promise.promise);
    }
    super.dispose();
  }

  /**
   * A message handler invoked on a `'close-request'` message.
   */
  protected onCloseRequest(msg: Message): void {
    if (this._promise) {
      this.reject();
    }
    super.onCloseRequest(msg);
  }

  private _promise: PromiseDelegate<void> | null;
  private _host: HTMLElement;
}

export namespace UndoDelete {
  /**
   * The body input types.
   */
  export type Body<T> = IBodyWidget<T> | React.ReactElement<any> | string;
  /**
   * The options used to create a dialog.
   */
  /**
   * A widget used as a dialog body.
   */
  export interface IBodyWidget<T = string> extends Widget {
    /**
     * Get the serialized value of the widget.
     */
    getValue?(): T;
  }

  export interface IOptions<T> {
    /**
     * The main body element for the dialog or a message to display.
     * Defaults to an empty string.
     *
     * #### Notes
     * If a widget is given as the body, it will be disposed after the
     * dialog is resolved.  If the widget has a `getValue()` method,
     * the method will be called prior to disposal and the value
     * will be provided as part of the dialog result.
     * A string argument will be used as raw `textContent`.
     * All `input` and `select` nodes will be wrapped and styled.
     */
    body: Body<T>;

    /**
     * The host element for the dialog. Defaults to `document.body`.
     */
    host: HTMLElement;

    /**
     * When "true", renders a close button for the dialog
     */
    hasClose: boolean;

    /**
     * An optional renderer for dialog items.  Defaults to a shared
     * default renderer.
     */
    renderer: IRenderer;
  }

  export interface IRenderer {
    /**
     * Create the body of the dialog.
     *
     * @param value - The input value for the body.
     *
     * @returns A widget for the body.
     */
    createBody(body: Body<any>): Widget;
    createIcon(): Widget;
  }

  export class Renderer {
    /**
     * Create the body of the dialog.
     *
     * @param value - The input value for the body.
     *
     * @returns A widget for the body.
     */
    createBody(value: Body<any>): Widget {
      let body: Widget;
      if (typeof value === 'string') {
        body = new Widget({ node: document.createElement('span') });
        body.node.textContent = value;
      } else if (value instanceof Widget) {
        body = value;
      } else {
        body = ReactWidget.create(value) as Widget;
        // Immediately update the body even though it has not yet attached in
        // order to trigger a render of the DOM nodes from the React element.
        MessageLoop.sendMessage(body, Widget.Msg.UpdateRequest);
      }
      // const iconNode = new Widget({ node: document.createElement('div') });
      // iconNode.title.icon = checkIcon;
      // body.
      body.addClass('jp-undo-delete-body');
      // Styling.styleNode(body.node);
      return body;
    }

    // createIcon(): Widget {
    //   let iconWidget: Widget;
    //   iconWidget = new Widget({ node: document.createElement('img') });
    //   console.log(checkSVGstr);
    //   const checkIcon = new LabIcon( { name: "checkIcon", svgstr: checkSVGstr} );

    //   <img src={`data:image/svg+xml;utf8,${image}` />

    //   iconWidget.title.icon = checkIcon;
    //   console.log(iconWidget.title.icon instanceof LabIcon);
    //   iconWidget.addClass('jp-confirm-icon');
    //   return iconWidget
    // }
  }
  /**
   * The default renderer instance.
   */
  export const defaultRenderer = new Renderer();

  /**
   * The dialog widget tracker.
   */
  export const tracker = new WidgetTracker<UndoDelete<any>>({
    namespace: '@jupyterlab/code_snippet:UndoDeleteWidget'
  });
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The queue for launching dialogs.
   */
  export const launchQueue: Promise<void>[] = [];
}
