window.DOMHandler = class {
  constructor(b, a) {
    this._iRuntime = b;
    this._componentId = a;
    this._hasTickCallback = !1;
    this._tickCallback = () => this.Tick();
  }
  Attach() {}
  PostToRuntime(b, a, c, d) {
    this._iRuntime.PostToRuntimeComponent(this._componentId, b, a, c, d);
  }
  PostToRuntimeAsync(b, a, c, d) {
    return this._iRuntime.PostToRuntimeComponentAsync(
      this._componentId,
      b,
      a,
      c,
      d
    );
  }
  _PostToRuntimeMaybeSync(b, a, c) {
    this._iRuntime.UsesWorker()
      ? this.PostToRuntime(b, a, c)
      : this._iRuntime
          ._GetLocalRuntime()
          ._OnMessageFromDOM({
            type: "event",
            component: this._componentId,
            handler: b,
            dispatchOpts: c || null,
            data: a,
            responseId: null,
          });
  }
  AddRuntimeMessageHandler(b, a) {
    this._iRuntime.AddRuntimeComponentMessageHandler(this._componentId, b, a);
  }
  AddRuntimeMessageHandlers(b) {
    for (const [a, c] of b) this.AddRuntimeMessageHandler(a, c);
  }
  GetRuntimeInterface() {
    return this._iRuntime;
  }
  GetComponentID() {
    return this._componentId;
  }
  _StartTicking() {
    this._hasTickCallback ||
      (this._iRuntime._AddRAFCallback(this._tickCallback),
      (this._hasTickCallback = !0));
  }
  _StopTicking() {
    this._hasTickCallback &&
      (this._iRuntime._RemoveRAFCallback(this._tickCallback),
      (this._hasTickCallback = !1));
  }
  Tick() {}
};
window.RateLimiter = class {
  constructor(b, a) {
    this._callback = b;
    this._interval = a;
    this._timerId = -1;
    this._lastCallTime = -Infinity;
    this._timerCallFunc = () => this._OnTimer();
    this._canRunImmediate = this._ignoreReset = !1;
  }
  SetCanRunImmediate(b) {
    this._canRunImmediate = !!b;
  }
  Call() {
    if (-1 === this._timerId) {
      var b = Date.now(),
        a = b - this._lastCallTime,
        c = this._interval;
      a >= c && this._canRunImmediate
        ? ((this._lastCallTime = b), this._RunCallback())
        : (this._timerId = self.setTimeout(
            this._timerCallFunc,
            Math.max(c - a, 4)
          ));
    }
  }
  _RunCallback() {
    this._ignoreReset = !0;
    this._callback();
    this._ignoreReset = !1;
  }
  Reset() {
    this._ignoreReset ||
      (this._CancelTimer(), (this._lastCallTime = Date.now()));
  }
  _OnTimer() {
    this._timerId = -1;
    this._lastCallTime = Date.now();
    this._RunCallback();
  }
  _CancelTimer() {
    -1 !== this._timerId &&
      (self.clearTimeout(this._timerId), (this._timerId = -1));
  }
  Release() {
    this._CancelTimer();
    this._timerCallFunc = this._callback = null;
  }
};
("use strict");
class ElementState {
  constructor(b) {
    this._elem = b;
    this._hadFirstUpdate = !1;
    this._isVisibleFlag = !0;
  }
  SetVisibleFlag(b) {
    this._isVisibleFlag = !!b;
  }
  GetVisibleFlag() {
    return this._isVisibleFlag;
  }
  HadFirstUpdate() {
    return this._hadFirstUpdate;
  }
  SetHadFirstUpdate() {
    this._hadFirstUpdate = !0;
  }
  GetElement() {
    return this._elem;
  }
}
window.DOMElementHandler = class extends self.DOMHandler {
  constructor(b, a) {
    super(b, a);
    this._elementMap = new Map();
    this._autoAttach = !0;
    this.AddRuntimeMessageHandlers([
      ["create", (c) => this._OnCreate(c)],
      ["destroy", (c) => this._OnDestroy(c)],
      ["set-visible", (c) => this._OnSetVisible(c)],
      ["update-position", (c) => this._OnUpdatePosition(c)],
      ["update-state", (c) => this._OnUpdateState(c)],
      ["focus", (c) => this._OnSetFocus(c)],
      ["set-css-style", (c) => this._OnSetCssStyle(c)],
      ["set-attribute", (c) => this._OnSetAttribute(c)],
      ["remove-attribute", (c) => this._OnRemoveAttribute(c)],
    ]);
    this.AddDOMElementMessageHandler("get-element", (c) => c);
  }
  SetAutoAttach(b) {
    this._autoAttach = !!b;
  }
  AddDOMElementMessageHandler(b, a) {
    this.AddRuntimeMessageHandler(b, (c) => {
      const d = this.GetElementById(c.elementId);
      return a(d, c);
    });
  }
  _OnCreate(b) {
    const a = b.elementId,
      c = this.CreateElement(a, b),
      d = new ElementState(c);
    this._elementMap.set(a, d);
    c.style.boxSizing = "border-box";
    c.style.display = "none";
    d.SetVisibleFlag(b.isVisible);
    b = this._GetFocusElement(c);
    b.addEventListener("focus", (e) => this._OnFocus(a));
    b.addEventListener("blur", (e) => this._OnBlur(a));
    this._autoAttach && document.body.appendChild(c);
  }
  CreateElement(b, a) {
    throw Error("required override");
  }
  DestroyElement(b) {}
  _OnDestroy(b) {
    b = b.elementId;
    const a = this.GetElementById(b);
    this.DestroyElement(a);
    this._autoAttach && a.parentElement.removeChild(a);
    this._elementMap.delete(b);
  }
  PostToRuntimeElement(b, a, c) {
    c || (c = {});
    c.elementId = a;
    this.PostToRuntime(b, c);
  }
  _PostToRuntimeElementMaybeSync(b, a, c) {
    c || (c = {});
    c.elementId = a;
    this._PostToRuntimeMaybeSync(b, c);
  }
  _OnSetVisible(b) {
    if (this._autoAttach) {
      var a = this._elementMap.get(b.elementId),
        c = a.GetElement();
      a.HadFirstUpdate()
        ? (c.style.display = b.isVisible ? "" : "none")
        : a.SetVisibleFlag(b.isVisible);
    }
  }
  _OnUpdatePosition(b) {
    if (this._autoAttach) {
      var a = this._elementMap.get(b.elementId),
        c = a.GetElement();
      c.style.left = b.left + "px";
      c.style.top = b.top + "px";
      c.style.width = b.width + "px";
      c.style.height = b.height + "px";
      b = b.fontSize;
      null !== b && (c.style.fontSize = b + "em");
      a.HadFirstUpdate() ||
        (a.SetHadFirstUpdate(), a.GetVisibleFlag() && (c.style.display = ""));
    }
  }
  _OnUpdateState(b) {
    const a = this.GetElementById(b.elementId);
    this.UpdateState(a, b);
  }
  UpdateState(b, a) {
    throw Error("required override");
  }
  _GetFocusElement(b) {
    return b;
  }
  _OnFocus(b) {
    this.PostToRuntimeElement("elem-focused", b);
  }
  _OnBlur(b) {
    this.PostToRuntimeElement("elem-blurred", b);
  }
  _OnSetFocus(b) {
    const a = this._GetFocusElement(this.GetElementById(b.elementId));
    b.focus ? a.focus() : a.blur();
  }
  _OnSetCssStyle(b) {
    const a = this.GetElementById(b.elementId),
      c = b.prop;
    b = b.val;
    c.startsWith("--") ? a.style.setProperty(c, b) : (a.style[c] = b);
  }
  _OnSetAttribute(b) {
    this.GetElementById(b.elementId).setAttribute(b.name, b.val);
  }
  _OnRemoveAttribute(b) {
    this.GetElementById(b.elementId).removeAttribute(b.name);
  }
  GetElementById(b) {
    const a = this._elementMap.get(b);
    if (!a) throw Error(`no element with id ${b}`);
    return a.GetElement();
  }
};
("use strict");
const isiOSLike = /(iphone|ipod|ipad|macos|macintosh|mac os x)/i.test(
    navigator.userAgent
  ),
  isAndroid = /android/i.test(navigator.userAgent),
  isSafari =
    /safari/i.test(navigator.userAgent) &&
    !/(chrome|chromium|edg\/|OPR\/|nwjs)/i.test(navigator.userAgent);
let resolveCounter = 0;
function AddScript(b) {
  const a = document.createElement("script");
  a.async = !1;
  a.type = "module";
  return b.isStringSrc
    ? new Promise((c) => {
        const d = "c3_resolve_" + resolveCounter;
        ++resolveCounter;
        self[d] = c;
        a.textContent = b.str + `\n\nself["${d}"]();`;
        document.head.appendChild(a);
      })
    : new Promise((c, d) => {
        a.onload = c;
        a.onerror = d;
        a.src = b;
        document.head.appendChild(a);
      });
}
let didCheckWorkerModuleSupport = !1,
  isWorkerModuleSupported = !1;
function SupportsWorkerTypeModule() {
  if (!didCheckWorkerModuleSupport) {
    try {
      new Worker("blob://", {
        get type() {
          isWorkerModuleSupported = !0;
        },
      });
    } catch (b) {}
    didCheckWorkerModuleSupport = !0;
  }
  return isWorkerModuleSupported;
}
let tmpAudio = new Audio();
const supportedAudioFormats = {
  "audio/webm; codecs=opus": !!tmpAudio.canPlayType("audio/webm; codecs=opus"),
  "audio/ogg; codecs=opus": !!tmpAudio.canPlayType("audio/ogg; codecs=opus"),
  "audio/webm; codecs=vorbis": !!tmpAudio.canPlayType(
    "audio/webm; codecs=vorbis"
  ),
  "audio/ogg; codecs=vorbis": !!tmpAudio.canPlayType(
    "audio/ogg; codecs=vorbis"
  ),
  "audio/mp4": !!tmpAudio.canPlayType("audio/mp4"),
  "audio/mpeg": !!tmpAudio.canPlayType("audio/mpeg"),
};
tmpAudio = null;
async function BlobToString(b) {
  b = await BlobToArrayBuffer(b);
  return new TextDecoder("utf-8").decode(b);
}
function BlobToArrayBuffer(b) {
  return new Promise((a, c) => {
    const d = new FileReader();
    d.onload = (e) => a(e.target.result);
    d.onerror = (e) => c(e);
    d.readAsArrayBuffer(b);
  });
}
const queuedArrayBufferReads = [];
let activeArrayBufferReads = 0;
window.RealFile = window.File;
const domHandlerClasses = [],
  runtimeEventHandlers = new Map(),
  pendingResponsePromises = new Map();
let nextResponseId = 0;
const runOnStartupFunctions = [];
self.runOnStartup = function (b) {
  if ("function" !== typeof b)
    throw Error("runOnStartup called without a function");
  runOnStartupFunctions.push(b);
};
const WEBVIEW_EXPORT_TYPES = new Set([
  "cordova",
  "playable-ad",
  "instant-games",
]);
function IsWebViewExportType(b) {
  return WEBVIEW_EXPORT_TYPES.has(b);
}
let isWrapperFullscreen = !1;
window.RuntimeInterface = class b {
  constructor(a) {
    this._useWorker = a.useWorker;
    this._messageChannelPort = null;
    this._runtimeBaseUrl = "";
    this._scriptFolder = a.scriptFolder;
    this._workerScriptURLs = {};
    this._localRuntime = this._worker = null;
    this._domHandlers = [];
    this._canvas = this._runtimeDomHandler = null;
    this._isExportingToVideo = !1;
    this._exportToVideoDuration = 0;
    this._jobScheduler = null;
    this._rafId = -1;
    this._rafFunc = () => this._OnRAFCallback();
    this._rafCallbacks = [];
    this._exportType = a.exportType;
    this._isFileProtocol = "file" === location.protocol.substr(0, 4);
    !this._useWorker ||
      ("undefined" !== typeof OffscreenCanvas &&
        navigator.userActivation &&
        SupportsWorkerTypeModule()) ||
      (this._useWorker = !1);
    this._useWorker && isSafari && (this._useWorker = !1);
    if (
      "playable-ad" === this._exportType ||
      "instant-games" === this._exportType
    )
      this._useWorker = !1;
    if ("cordova" === this._exportType && this._useWorker)
      if (isAndroid) {
        const c = /Chrome\/(\d+)/i.exec(navigator.userAgent);
        (c && 90 <= parseInt(c[1], 10)) || (this._useWorker = !1);
      } else this._useWorker = !1;
    this._localFileStrings = this._localFileBlobs = null;
    "html5" !== this._exportType ||
      window.isSecureContext ||
      console.warn(
        "[Construct] Warning: the browser indicates this is not a secure context. Some features may be unavailable. Use secure (HTTPS) hosting to ensure all features are available."
      );
    this.AddRuntimeComponentMessageHandler(
      "runtime",
      "cordova-fetch-local-file",
      (c) => this._OnCordovaFetchLocalFile(c)
    );
    this.AddRuntimeComponentMessageHandler(
      "runtime",
      "create-job-worker",
      (c) => this._OnCreateJobWorker(c)
    );
    "cordova" === this._exportType
      ? document.addEventListener("deviceready", () => this._Init(a))
      : this._Init(a);
  }
  Release() {
    this._CancelAnimationFrame();
    this._messageChannelPort &&
      (this._messageChannelPort = this._messageChannelPort.onmessage = null);
    this._worker && (this._worker.terminate(), (this._worker = null));
    this._localRuntime &&
      (this._localRuntime.Release(), (this._localRuntime = null));
    this._canvas &&
      (this._canvas.parentElement.removeChild(this._canvas),
      (this._canvas = null));
  }
  GetCanvas() {
    return this._canvas;
  }
  GetRuntimeBaseURL() {
    return this._runtimeBaseUrl;
  }
  UsesWorker() {
    return this._useWorker;
  }
  GetExportType() {
    return this._exportType;
  }
  IsFileProtocol() {
    return this._isFileProtocol;
  }
  GetScriptFolder() {
    return this._scriptFolder;
  }
  IsiOSCordova() {
    return isiOSLike && "cordova" === this._exportType;
  }
  IsiOSWebView() {
    const a = navigator.userAgent;
    return (
      (isiOSLike && IsWebViewExportType(this._exportType)) ||
      navigator.standalone ||
      /crios\/|fxios\/|edgios\//i.test(a)
    );
  }
  IsAndroid() {
    return isAndroid;
  }
  IsAndroidWebView() {
    return isAndroid && IsWebViewExportType(this._exportType);
  }
  async _Init(a) {
    "macos-wkwebview" === this._exportType &&
      this._SendWrapperMessage({ type: "ready" });
    if ("playable-ad" === this._exportType) {
      this._localFileBlobs = self.c3_base64files;
      this._localFileStrings = {};
      await this._ConvertDataUrisToBlobs();
      for (let d = 0, e = a.engineScripts.length; d < e; ++d) {
        var c = a.engineScripts[d];
        this._localFileStrings.hasOwnProperty(c)
          ? (a.engineScripts[d] = {
              isStringSrc: !0,
              str: this._localFileStrings[c],
            })
          : this._localFileBlobs.hasOwnProperty(c) &&
            (a.engineScripts[d] = URL.createObjectURL(this._localFileBlobs[c]));
      }
      a.workerDependencyScripts = [];
    }
    if (
      "nwjs" === this._exportType &&
      self.nw &&
      self.nw.App.manifest["c3-steam-mode"]
    ) {
      let d = 0;
      this._AddRAFCallback(() => {
        d++;
        document.body.style.opacity = 0 === d % 2 ? "1" : "0.999";
      });
    }
    a.runtimeBaseUrl
      ? (this._runtimeBaseUrl = a.runtimeBaseUrl)
      : ((c = location.origin),
        (this._runtimeBaseUrl =
          ("null" === c ? "file:///" : c) + location.pathname),
        (c = this._runtimeBaseUrl.lastIndexOf("/")),
        -1 !== c &&
          (this._runtimeBaseUrl = this._runtimeBaseUrl.substr(0, c + 1)));
    a.workerScripts && (this._workerScriptURLs = a.workerScripts);
    c = new MessageChannel();
    this._messageChannelPort = c.port1;
    this._messageChannelPort.onmessage = (d) =>
      this._OnMessageFromRuntime(d.data);
    window.c3_addPortMessageHandler &&
      window.c3_addPortMessageHandler((d) => this._OnMessageFromDebugger(d));
    this._jobScheduler = new self.JobSchedulerDOM(this);
    await this._jobScheduler.Init();
    "object" === typeof window.StatusBar && window.StatusBar.hide();
    if ("object" === typeof window.AndroidFullScreen)
      try {
        await new Promise((d, e) => {
          window.AndroidFullScreen.immersiveMode(d, e);
        });
      } catch (d) {
        console.error("Failed to enter Android immersive mode: ", d);
      }
    this._useWorker
      ? await this._InitWorker(a, c.port2)
      : await this._InitDOM(a, c.port2);
  }
  _GetWorkerURL(a) {
    a = this._workerScriptURLs.hasOwnProperty(a)
      ? this._workerScriptURLs[a]
      : a.endsWith("/workermain.js") &&
        this._workerScriptURLs.hasOwnProperty("workermain.js")
      ? this._workerScriptURLs["workermain.js"]
      : "playable-ad" === this._exportType &&
        this._localFileBlobs.hasOwnProperty(a)
      ? this._localFileBlobs[a]
      : a;
    a instanceof Blob && (a = URL.createObjectURL(a));
    return a;
  }
  async CreateWorker(a, c, d) {
    if (a.startsWith("blob:")) return new Worker(a, d);
    if ("cordova" === this._exportType && this._isFileProtocol)
      return (
        (a = await this.CordovaFetchLocalFileAsArrayBuffer(
          d.isC3MainWorker ? a : this._scriptFolder + a
        )),
        (a = new Blob([a], { type: "application/javascript" })),
        new Worker(URL.createObjectURL(a), d)
      );
    a = new URL(a, c);
    if (location.origin !== a.origin) {
      a = await fetch(a);
      if (!a.ok) throw Error("failed to fetch worker script");
      a = await a.blob();
      return new Worker(URL.createObjectURL(a), d);
    }
    return new Worker(a, d);
  }
  _GetWindowInnerWidth() {
    return Math.max(window.innerWidth, 1);
  }
  _GetWindowInnerHeight() {
    return Math.max(window.innerHeight, 1);
  }
  _GetCommonRuntimeOptions(a) {
    return {
      runtimeBaseUrl: this._runtimeBaseUrl,
      previewUrl: location.href,
      windowInnerWidth: this._GetWindowInnerWidth(),
      windowInnerHeight: this._GetWindowInnerHeight(),
      devicePixelRatio: window.devicePixelRatio,
      isFullscreen: b.IsDocumentFullscreen(),
      projectData: a.projectData,
      previewImageBlobs: window.cr_previewImageBlobs || this._localFileBlobs,
      previewProjectFileBlobs: window.cr_previewProjectFileBlobs,
      previewProjectFileSWUrls: window.cr_previewProjectFiles,
      swClientId: window.cr_swClientId || "",
      exportType: a.exportType,
      isDebug: new URLSearchParams(self.location.search).has("debug"),
      ife: !!self.ife,
      jobScheduler: this._jobScheduler.GetPortData(),
      supportedAudioFormats,
      opusWasmScriptUrl:
        window.cr_opusWasmScriptUrl || this._scriptFolder + "opus.wasm.js",
      opusWasmBinaryUrl:
        window.cr_opusWasmBinaryUrl || this._scriptFolder + "opus.wasm.wasm",
      isFileProtocol: this._isFileProtocol,
      isiOSCordova: this.IsiOSCordova(),
      isiOSWebView: this.IsiOSWebView(),
      isFBInstantAvailable: "undefined" !== typeof self.FBInstant,
    };
  }
  async _InitWorker(a, c) {
    const d = this._GetWorkerURL(a.workerMainUrl);
    "preview" === this._exportType
      ? ((this._worker = new Worker("previewworker.js", {
          type: "module",
          name: "Runtime",
        })),
        await new Promise((g, k) => {
          const m = (l) => {
            this._worker.removeEventListener("message", m);
            l.data && "ok" === l.data.type ? g() : k();
          };
          this._worker.addEventListener("message", m);
          this._worker.postMessage({
            type: "construct-worker-init",
            import: new URL(d, this._runtimeBaseUrl).toString(),
          });
        }))
      : (this._worker = await this.CreateWorker(d, this._runtimeBaseUrl, {
          type: "module",
          name: "Runtime",
          isC3MainWorker: !0,
        }));
    this._canvas = document.createElement("canvas");
    this._canvas.style.display = "none";
    const e = this._canvas.transferControlToOffscreen();
    document.body.appendChild(this._canvas);
    window.c3canvas = this._canvas;
    self.C3_InsertHTMLPlaceholders && self.C3_InsertHTMLPlaceholders();
    let f = a.workerDependencyScripts || [],
      h = a.engineScripts;
    f = await Promise.all(f.map((g) => this._MaybeGetCordovaScriptURL(g)));
    h = await Promise.all(h.map((g) => this._MaybeGetCordovaScriptURL(g)));
    if ("cordova" === this._exportType)
      for (let g = 0, k = a.projectScripts.length; g < k; ++g) {
        const m = a.projectScripts[g],
          l = m[0];
        if (
          l === a.mainProjectScript ||
          "scriptsInEvents.js" === l ||
          l.endsWith("/scriptsInEvents.js")
        )
          m[1] = await this._MaybeGetCordovaScriptURL(l);
      }
    this._worker.postMessage(
      Object.assign(this._GetCommonRuntimeOptions(a), {
        type: "init-runtime",
        isInWorker: !0,
        messagePort: c,
        canvas: e,
        workerDependencyScripts: f,
        engineScripts: h,
        projectScripts: a.projectScripts,
        mainProjectScript: a.mainProjectScript,
        projectScriptsStatus: self.C3_ProjectScriptsStatus,
      }),
      [c, e, ...this._jobScheduler.GetPortTransferables()]
    );
    this._domHandlers = domHandlerClasses.map((g) => new g(this));
    this._FindRuntimeDOMHandler();
    this._runtimeDomHandler._EnableWindowResizeEvent();
    self.c3_callFunction = (g, k) =>
      this._runtimeDomHandler._InvokeFunctionFromJS(g, k);
    "preview" === this._exportType &&
      (self.goToLastErrorScript = () =>
        this.PostToRuntimeComponent("runtime", "go-to-last-error-script"));
  }
  async _InitDOM(a, c) {
    this._canvas = document.createElement("canvas");
    this._canvas.style.display = "none";
    document.body.appendChild(this._canvas);
    window.c3canvas = this._canvas;
    self.C3_InsertHTMLPlaceholders && self.C3_InsertHTMLPlaceholders();
    this._domHandlers = domHandlerClasses.map((h) => new h(this));
    this._FindRuntimeDOMHandler();
    var d = a.engineScripts.map((h) =>
      "string" === typeof h ? new URL(h, this._runtimeBaseUrl).toString() : h
    );
    Array.isArray(a.workerDependencyScripts) &&
      d.unshift(...a.workerDependencyScripts);
    d = await Promise.all(d.map((h) => this._MaybeGetCordovaScriptURL(h)));
    await Promise.all(d.map((h) => AddScript(h)));
    d = self.C3_ProjectScriptsStatus;
    const e = a.mainProjectScript,
      f = a.projectScripts;
    for (let [h, g] of f)
      if ((g || (g = h), h === e))
        try {
          (g = await this._MaybeGetCordovaScriptURL(g)),
            await AddScript(g),
            "preview" !== this._exportType ||
              d[h] ||
              this._ReportProjectMainScriptError(
                h,
                "main script did not run to completion"
              );
        } catch (k) {
          this._ReportProjectMainScriptError(h, k);
        }
      else if ("scriptsInEvents.js" === h || h.endsWith("/scriptsInEvents.js"))
        (g = await this._MaybeGetCordovaScriptURL(g)), await AddScript(g);
    "preview" === this._exportType &&
    "object" !== typeof self.C3.ScriptsInEvents
      ? (this._RemoveLoadingMessage(),
        console.error(
          "[C3 runtime] Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax."
        ),
        alert(
          "Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax."
        ))
      : ((a = Object.assign(this._GetCommonRuntimeOptions(a), {
          isInWorker: !1,
          messagePort: c,
          canvas: this._canvas,
          runOnStartupFunctions,
        })),
        this._runtimeDomHandler._EnableWindowResizeEvent(),
        this._OnBeforeCreateRuntime(),
        (this._localRuntime = self.C3_CreateRuntime(a)),
        await self.C3_InitRuntime(this._localRuntime, a));
  }
  _ReportProjectMainScriptError(a, c) {
    this._RemoveLoadingMessage();
    console.error(`[Preview] Failed to load project main script (${a}): `, c);
    alert(
      `Failed to load project main script (${a}). Check all your JavaScript code has valid syntax. Press F12 and check the console for error details.`
    );
  }
  _OnBeforeCreateRuntime() {
    this._RemoveLoadingMessage();
  }
  _RemoveLoadingMessage() {
    const a = window.cr_previewLoadingElem;
    a &&
      (a.parentElement.removeChild(a), (window.cr_previewLoadingElem = null));
  }
  async _OnCreateJobWorker(a) {
    a = await this._jobScheduler._CreateJobWorker();
    return { outputPort: a, transferables: [a] };
  }
  _GetLocalRuntime() {
    if (this._useWorker) throw Error("not available in worker mode");
    return this._localRuntime;
  }
  PostToRuntimeComponent(a, c, d, e, f) {
    this._messageChannelPort.postMessage(
      {
        type: "event",
        component: a,
        handler: c,
        dispatchOpts: e || null,
        data: d,
        responseId: null,
      },
      f
    );
  }
  PostToRuntimeComponentAsync(a, c, d, e, f) {
    const h = nextResponseId++,
      g = new Promise((k, m) => {
        pendingResponsePromises.set(h, { resolve: k, reject: m });
      });
    this._messageChannelPort.postMessage(
      {
        type: "event",
        component: a,
        handler: c,
        dispatchOpts: e || null,
        data: d,
        responseId: h,
      },
      f
    );
    return g;
  }
  _OnMessageFromRuntime(a) {
    const c = a.type;
    if ("event" === c) return this._OnEventFromRuntime(a);
    if ("result" === c) this._OnResultFromRuntime(a);
    else if ("runtime-ready" === c) this._OnRuntimeReady();
    else if ("alert-error" === c)
      this._RemoveLoadingMessage(), alert(a.message);
    else if ("creating-runtime" === c) this._OnBeforeCreateRuntime();
    else throw Error(`unknown message '${c}'`);
  }
  _OnEventFromRuntime(a) {
    const c = a.component,
      d = a.handler,
      e = a.data,
      f = a.responseId;
    if ((a = runtimeEventHandlers.get(c)))
      if ((a = a.get(d))) {
        var h = null;
        try {
          h = a(e);
        } catch (g) {
          console.error(`Exception in '${c}' handler '${d}':`, g);
          null !== f && this._PostResultToRuntime(f, !1, "" + g);
          return;
        }
        if (null === f) return h;
        h && h.then
          ? h
              .then((g) => this._PostResultToRuntime(f, !0, g))
              .catch((g) => {
                console.error(`Rejection from '${c}' handler '${d}':`, g);
                this._PostResultToRuntime(f, !1, "" + g);
              })
          : this._PostResultToRuntime(f, !0, h);
      } else console.warn(`[DOM] No handler '${d}' for component '${c}'`);
    else console.warn(`[DOM] No event handlers for component '${c}'`);
  }
  _PostResultToRuntime(a, c, d) {
    let e;
    d && d.transferables && (e = d.transferables);
    this._messageChannelPort.postMessage(
      { type: "result", responseId: a, isOk: c, result: d },
      e
    );
  }
  _OnResultFromRuntime(a) {
    const c = a.responseId,
      d = a.isOk;
    a = a.result;
    const e = pendingResponsePromises.get(c);
    d ? e.resolve(a) : e.reject(a);
    pendingResponsePromises.delete(c);
  }
  AddRuntimeComponentMessageHandler(a, c, d) {
    let e = runtimeEventHandlers.get(a);
    e || ((e = new Map()), runtimeEventHandlers.set(a, e));
    if (e.has(c))
      throw Error(`[DOM] Component '${a}' already has handler '${c}'`);
    e.set(c, d);
  }
  static AddDOMHandlerClass(a) {
    if (domHandlerClasses.includes(a)) throw Error("DOM handler already added");
    domHandlerClasses.push(a);
  }
  _FindRuntimeDOMHandler() {
    for (const a of this._domHandlers)
      if ("runtime" === a.GetComponentID()) {
        this._runtimeDomHandler = a;
        return;
      }
    throw Error("cannot find runtime DOM handler");
  }
  _OnMessageFromDebugger(a) {
    this.PostToRuntimeComponent("debugger", "message", a);
  }
  _OnRuntimeReady() {
    for (const a of this._domHandlers) a.Attach();
  }
  static IsDocumentFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      isWrapperFullscreen
    );
  }
  static _SetWrapperIsFullscreenFlag(a) {
    isWrapperFullscreen = !!a;
  }
  async GetRemotePreviewStatusInfo() {
    return await this.PostToRuntimeComponentAsync(
      "runtime",
      "get-remote-preview-status-info"
    );
  }
  _AddRAFCallback(a) {
    this._rafCallbacks.push(a);
    this._RequestAnimationFrame();
  }
  _RemoveRAFCallback(a) {
    a = this._rafCallbacks.indexOf(a);
    if (-1 === a) throw Error("invalid callback");
    this._rafCallbacks.splice(a, 1);
    this._rafCallbacks.length || this._CancelAnimationFrame();
  }
  _RequestAnimationFrame() {
    -1 === this._rafId &&
      this._rafCallbacks.length &&
      (this._rafId = requestAnimationFrame(this._rafFunc));
  }
  _CancelAnimationFrame() {
    -1 !== this._rafId &&
      (cancelAnimationFrame(this._rafId), (this._rafId = -1));
  }
  _OnRAFCallback() {
    this._rafId = -1;
    for (const a of this._rafCallbacks) a();
    this._RequestAnimationFrame();
  }
  TryPlayMedia(a) {
    this._runtimeDomHandler.TryPlayMedia(a);
  }
  RemovePendingPlay(a) {
    this._runtimeDomHandler.RemovePendingPlay(a);
  }
  _PlayPendingMedia() {
    this._runtimeDomHandler._PlayPendingMedia();
  }
  SetSilent(a) {
    this._runtimeDomHandler.SetSilent(a);
  }
  IsAudioFormatSupported(a) {
    return !!supportedAudioFormats[a];
  }
  async _WasmDecodeWebMOpus(a) {
    a = await this.PostToRuntimeComponentAsync(
      "runtime",
      "opus-decode",
      { arrayBuffer: a },
      null,
      [a]
    );
    return new Float32Array(a);
  }
  SetIsExportingToVideo(a) {
    this._isExportingToVideo = !0;
    this._exportToVideoDuration = a;
  }
  IsExportingToVideo() {
    return this._isExportingToVideo;
  }
  GetExportToVideoDuration() {
    return this._exportToVideoDuration;
  }
  IsAbsoluteURL(a) {
    return (
      /^(?:[a-z\-]+:)?\/\//.test(a) ||
      "data:" === a.substr(0, 5) ||
      "blob:" === a.substr(0, 5)
    );
  }
  IsRelativeURL(a) {
    return !this.IsAbsoluteURL(a);
  }
  async _MaybeGetCordovaScriptURL(a) {
    return "cordova" === this._exportType &&
      (a.startsWith("file:") || (this._isFileProtocol && this.IsRelativeURL(a)))
      ? (a.startsWith(this._runtimeBaseUrl) &&
          (a = a.substr(this._runtimeBaseUrl.length)),
        (a = await this.CordovaFetchLocalFileAsArrayBuffer(a)),
        (a = new Blob([a], { type: "application/javascript" })),
        URL.createObjectURL(a))
      : a;
  }
  async _OnCordovaFetchLocalFile(a) {
    const c = a.filename;
    switch (a.as) {
      case "text":
        return await this.CordovaFetchLocalFileAsText(c);
      case "buffer":
        return await this.CordovaFetchLocalFileAsArrayBuffer(c);
      default:
        throw Error("unsupported type");
    }
  }
  _GetPermissionAPI() {
    const a =
      window.cordova &&
      window.cordova.plugins &&
      window.cordova.plugins.permissions;
    if ("object" !== typeof a) throw Error("Permission API is not loaded");
    return a;
  }
  _MapPermissionID(a, c) {
    a = a[c];
    if ("string" !== typeof a) throw Error("Invalid permission name");
    return a;
  }
  _HasPermission(a) {
    const c = this._GetPermissionAPI();
    return new Promise((d, e) =>
      c.checkPermission(
        this._MapPermissionID(c, a),
        (f) => d(!!f.hasPermission),
        e
      )
    );
  }
  _RequestPermission(a) {
    const c = this._GetPermissionAPI();
    return new Promise((d, e) =>
      c.requestPermission(
        this._MapPermissionID(c, a),
        (f) => d(!!f.hasPermission),
        e
      )
    );
  }
  async RequestPermissions(a) {
    if ("cordova" !== this.GetExportType() || this.IsiOSCordova()) return !0;
    for (const c of a)
      if (
        !(await this._HasPermission(c)) &&
        !1 === (await this._RequestPermission(c))
      )
        return !1;
    return !0;
  }
  async RequirePermissions(...a) {
    if (!1 === (await this.RequestPermissions(a)))
      throw Error("Permission not granted");
  }
  CordovaFetchLocalFile(a) {
    const c = window.cordova.file.applicationDirectory + "www/" + a;
    return new Promise((d, e) => {
      window.resolveLocalFileSystemURL(
        c,
        (f) => {
          f.file(d, e);
        },
        e
      );
    });
  }
  async CordovaFetchLocalFileAsText(a) {
    a = await this.CordovaFetchLocalFile(a);
    return await BlobToString(a);
  }
  _CordovaMaybeStartNextArrayBufferRead() {
    if (queuedArrayBufferReads.length && !(8 <= activeArrayBufferReads)) {
      activeArrayBufferReads++;
      var a = queuedArrayBufferReads.shift();
      this._CordovaDoFetchLocalFileAsAsArrayBuffer(
        a.filename,
        a.successCallback,
        a.errorCallback
      );
    }
  }
  CordovaFetchLocalFileAsArrayBuffer(a) {
    return new Promise((c, d) => {
      queuedArrayBufferReads.push({
        filename: a,
        successCallback: (e) => {
          activeArrayBufferReads--;
          this._CordovaMaybeStartNextArrayBufferRead();
          c(e);
        },
        errorCallback: (e) => {
          activeArrayBufferReads--;
          this._CordovaMaybeStartNextArrayBufferRead();
          d(e);
        },
      });
      this._CordovaMaybeStartNextArrayBufferRead();
    });
  }
  async _CordovaDoFetchLocalFileAsAsArrayBuffer(a, c, d) {
    try {
      const e = await this.CordovaFetchLocalFile(a),
        f = await BlobToArrayBuffer(e);
      c(f);
    } catch (e) {
      d(e);
    }
  }
  _SendWrapperMessage(a) {
    if ("windows-webview2" === this._exportType)
      window.chrome.webview.postMessage(JSON.stringify(a));
    else if ("macos-wkwebview" === this._exportType)
      window.webkit.messageHandlers.C3Wrapper.postMessage(JSON.stringify(a));
    else throw Error("cannot send wrapper message");
  }
  async _ConvertDataUrisToBlobs() {
    const a = [];
    for (const [c, d] of Object.entries(this._localFileBlobs))
      a.push(this._ConvertDataUriToBlobs(c, d));
    await Promise.all(a);
  }
  async _ConvertDataUriToBlobs(a, c) {
    if ("object" === typeof c)
      (this._localFileBlobs[a] = new Blob([c.str], { type: c.type })),
        (this._localFileStrings[a] = c.str);
    else {
      let d = await this._FetchDataUri(c);
      d || (d = this._DataURIToBinaryBlobSync(c));
      this._localFileBlobs[a] = d;
    }
  }
  async _FetchDataUri(a) {
    try {
      return await (await fetch(a)).blob();
    } catch (c) {
      return (
        console.warn(
          "Failed to fetch a data: URI. Falling back to a slower workaround. This is probably because the Content Security Policy unnecessarily blocked it. Allow data: URIs in your CSP to avoid this.",
          c
        ),
        null
      );
    }
  }
  _DataURIToBinaryBlobSync(a) {
    a = this._ParseDataURI(a);
    return this._BinaryStringToBlob(a.data, a.mime_type);
  }
  _ParseDataURI(a) {
    var c = a.indexOf(",");
    if (0 > c) throw new URIError("expected comma in data: uri");
    var d = a.substring(5, c);
    a = a.substring(c + 1);
    c = d.split(";");
    d = c[0] || "";
    const e = c[2];
    a = "base64" === c[1] || "base64" === e ? atob(a) : decodeURIComponent(a);
    return { mime_type: d, data: a };
  }
  _BinaryStringToBlob(a, c) {
    var d = a.length;
    let e = d >> 2,
      f = new Uint8Array(d),
      h = new Uint32Array(f.buffer, 0, e),
      g,
      k;
    for (k = g = 0; g < e; ++g)
      h[g] =
        a.charCodeAt(k++) |
        (a.charCodeAt(k++) << 8) |
        (a.charCodeAt(k++) << 16) |
        (a.charCodeAt(k++) << 24);
    for (d &= 3; d--; ) (f[k] = a.charCodeAt(k)), ++k;
    return new Blob([f], { type: c });
  }
};
("use strict");
const RuntimeInterface$jscomp$1 = self.RuntimeInterface;
function IsCompatibilityMouseEvent(b) {
  return (
    (b.sourceCapabilities && b.sourceCapabilities.firesTouchEvents) ||
    (b.originalEvent &&
      b.originalEvent.sourceCapabilities &&
      b.originalEvent.sourceCapabilities.firesTouchEvents)
  );
}
const KEY_CODE_ALIASES = new Map([
    ["OSLeft", "MetaLeft"],
    ["OSRight", "MetaRight"],
  ]),
  DISPATCH_RUNTIME_AND_SCRIPT = {
    dispatchRuntimeEvent: !0,
    dispatchUserScriptEvent: !0,
  },
  DISPATCH_SCRIPT_ONLY = { dispatchUserScriptEvent: !0 },
  DISPATCH_RUNTIME_ONLY = { dispatchRuntimeEvent: !0 };
function AddStyleSheet(b) {
  return new Promise((a, c) => {
    const d = document.createElement("link");
    d.onload = () => a(d);
    d.onerror = (e) => c(e);
    d.rel = "stylesheet";
    d.href = b;
    document.head.appendChild(d);
  });
}
function FetchImage(b) {
  return new Promise((a, c) => {
    const d = new Image();
    d.onload = () => a(d);
    d.onerror = (e) => c(e);
    d.src = b;
  });
}
async function BlobToImage(b) {
  b = URL.createObjectURL(b);
  try {
    return await FetchImage(b);
  } finally {
    URL.revokeObjectURL(b);
  }
}
function BlobToString$jscomp$1(b) {
  return new Promise((a, c) => {
    let d = new FileReader();
    d.onload = (e) => a(e.target.result);
    d.onerror = (e) => c(e);
    d.readAsText(b);
  });
}
async function BlobToSvgImage(b, a, c) {
  if (!/firefox/i.test(navigator.userAgent)) return await BlobToImage(b);
  var d = await BlobToString$jscomp$1(b);
  d = new DOMParser().parseFromString(d, "image/svg+xml");
  const e = d.documentElement;
  if (e.hasAttribute("width") && e.hasAttribute("height")) {
    const f = e.getAttribute("width"),
      h = e.getAttribute("height");
    if (!f.includes("%") && !h.includes("%")) return await BlobToImage(b);
  }
  e.setAttribute("width", a + "px");
  e.setAttribute("height", c + "px");
  d = new XMLSerializer().serializeToString(d);
  b = new Blob([d], { type: "image/svg+xml" });
  return await BlobToImage(b);
}
function IsInContentEditable(b) {
  do {
    if (b.parentNode && b.hasAttribute("contenteditable")) return !0;
    b = b.parentNode;
  } while (b);
  return !1;
}
const keyboardInputElementTagNames = new Set([
  "input",
  "textarea",
  "datalist",
  "select",
]);
function IsKeyboardInputElement(b) {
  return (
    keyboardInputElementTagNames.has(b.tagName.toLowerCase()) ||
    IsInContentEditable(b)
  );
}
const canvasOrDocTags = new Set(["canvas", "body", "html"]);
function PreventDefaultOnCanvasOrDoc(b) {
  if (b.target.tagName) {
    var a = b.target.tagName.toLowerCase();
    canvasOrDocTags.has(a) && b.preventDefault();
  }
}
function BlockWheelZoom(b) {
  (b.metaKey || b.ctrlKey) && b.preventDefault();
}
self.C3_GetSvgImageSize = async function (b) {
  b = await BlobToImage(b);
  if (0 < b.width && 0 < b.height) return [b.width, b.height];
  b.style.position = "absolute";
  b.style.left = "0px";
  b.style.top = "0px";
  b.style.visibility = "hidden";
  document.body.appendChild(b);
  const a = b.getBoundingClientRect();
  document.body.removeChild(b);
  return [a.width, a.height];
};
self.C3_RasterSvgImageBlob = async function (b, a, c, d, e) {
  b = await BlobToSvgImage(b, a, c);
  const f = document.createElement("canvas");
  f.width = d;
  f.height = e;
  f.getContext("2d").drawImage(b, 0, 0, a, c);
  return f;
};
let isCordovaPaused = !1;
document.addEventListener("pause", () => (isCordovaPaused = !0));
document.addEventListener("resume", () => (isCordovaPaused = !1));
function ParentHasFocus() {
  try {
    return window.parent && window.parent.document.hasFocus();
  } catch (b) {
    return !1;
  }
}
function KeyboardIsVisible() {
  const b = document.activeElement;
  if (!b) return !1;
  const a = b.tagName.toLowerCase(),
    c = new Set("email number password search tel text url".split(" "));
  return "textarea" === a
    ? !0
    : "input" === a
    ? c.has(b.type.toLowerCase() || "text")
    : IsInContentEditable(b);
}
RuntimeInterface$jscomp$1.AddDOMHandlerClass(
  class extends self.DOMHandler {
    constructor(b) {
      super(b, "runtime");
      this._isFirstSizeUpdate = !0;
      this._enableWindowResizeEvent = !1;
      this._simulatedResizeTimerId = -1;
      this._targetOrientation = "any";
      this._attachedDeviceMotionEvent = this._attachedDeviceOrientationEvent =
        !1;
      this._screenReaderTextWrap = document.createElement("div");
      this._screenReaderTextWrap.className = "c3-screen-reader-text";
      this._screenReaderTextWrap.setAttribute("aria-live", "polite");
      document.body.appendChild(this._screenReaderTextWrap);
      this._debugHighlightElem = null;
      this._isExportToVideo = !1;
      this._exportVideoProgressMessage = "";
      this._exportVideoUpdateTimerId = -1;
      this._enableAndroidVKDetection = !1;
      this._lastWindowWidth = b._GetWindowInnerWidth();
      this._lastWindowHeight = b._GetWindowInnerHeight();
      this._vkTranslateYOffset = this._virtualKeyboardHeight = 0;
      b.AddRuntimeComponentMessageHandler("canvas", "update-size", (d) =>
        this._OnUpdateCanvasSize(d)
      );
      b.AddRuntimeComponentMessageHandler("runtime", "invoke-download", (d) =>
        this._OnInvokeDownload(d)
      );
      b.AddRuntimeComponentMessageHandler("runtime", "load-webfonts", (d) =>
        this._OnLoadWebFonts(d)
      );
      b.AddRuntimeComponentMessageHandler("runtime", "raster-svg-image", (d) =>
        this._OnRasterSvgImage(d)
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "get-svg-image-size",
        (d) => this._OnGetSvgImageSize(d)
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "set-target-orientation",
        (d) => this._OnSetTargetOrientation(d)
      );
      b.AddRuntimeComponentMessageHandler("runtime", "register-sw", () =>
        this._OnRegisterSW()
      );
      b.AddRuntimeComponentMessageHandler("runtime", "post-to-debugger", (d) =>
        this._OnPostToDebugger(d)
      );
      b.AddRuntimeComponentMessageHandler("runtime", "go-to-script", (d) =>
        this._OnPostToDebugger(d)
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "before-start-ticking",
        () => this._OnBeforeStartTicking()
      );
      b.AddRuntimeComponentMessageHandler("runtime", "debug-highlight", (d) =>
        this._OnDebugHighlight(d)
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "enable-device-orientation",
        () => this._AttachDeviceOrientationEvent()
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "enable-device-motion",
        () => this._AttachDeviceMotionEvent()
      );
      b.AddRuntimeComponentMessageHandler("runtime", "add-stylesheet", (d) =>
        this._OnAddStylesheet(d)
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "script-create-worker",
        (d) => this._OnScriptCreateWorker(d)
      );
      b.AddRuntimeComponentMessageHandler("runtime", "alert", (d) =>
        this._OnAlert(d)
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "screen-reader-text",
        (d) => this._OnScreenReaderTextEvent(d)
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "hide-cordova-splash",
        () => this._OnHideCordovaSplash()
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "set-exporting-to-video",
        (d) => this._SetExportingToVideo(d)
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "export-to-video-progress",
        (d) => this._OnExportVideoProgress(d)
      );
      b.AddRuntimeComponentMessageHandler("runtime", "exported-to-video", (d) =>
        this._OnExportedToVideo(d)
      );
      b.AddRuntimeComponentMessageHandler(
        "runtime",
        "exported-to-image-sequence",
        (d) => this._OnExportedToImageSequence(d)
      );
      const a = new Set(["input", "textarea", "datalist"]);
      window.addEventListener("contextmenu", (d) => {
        const e = d.target,
          f = e.tagName.toLowerCase();
        a.has(f) || IsInContentEditable(e) || d.preventDefault();
      });
      const c = b.GetCanvas();
      window.addEventListener("selectstart", PreventDefaultOnCanvasOrDoc);
      window.addEventListener("gesturehold", PreventDefaultOnCanvasOrDoc);
      c.addEventListener("selectstart", PreventDefaultOnCanvasOrDoc);
      c.addEventListener("gesturehold", PreventDefaultOnCanvasOrDoc);
      window.addEventListener("touchstart", PreventDefaultOnCanvasOrDoc, {
        passive: !1,
      });
      "undefined" !== typeof PointerEvent
        ? (window.addEventListener("pointerdown", PreventDefaultOnCanvasOrDoc, {
            passive: !1,
          }),
          c.addEventListener("pointerdown", PreventDefaultOnCanvasOrDoc))
        : c.addEventListener("touchstart", PreventDefaultOnCanvasOrDoc);
      this._mousePointerLastButtons = 0;
      window.addEventListener("mousedown", (d) => {
        1 === d.button && d.preventDefault();
      });
      window.addEventListener("mousewheel", BlockWheelZoom, { passive: !1 });
      window.addEventListener("wheel", BlockWheelZoom, { passive: !1 });
      window.addEventListener("resize", () => this._OnWindowResize());
      window.addEventListener("fullscreenchange", () =>
        this._OnFullscreenChange()
      );
      window.addEventListener("webkitfullscreenchange", () =>
        this._OnFullscreenChange()
      );
      window.addEventListener("mozfullscreenchange", () =>
        this._OnFullscreenChange()
      );
      window.addEventListener("fullscreenerror", (d) =>
        this._OnFullscreenError(d)
      );
      window.addEventListener("webkitfullscreenerror", (d) =>
        this._OnFullscreenError(d)
      );
      window.addEventListener("mozfullscreenerror", (d) =>
        this._OnFullscreenError(d)
      );
      if (b.IsiOSWebView())
        if (window.visualViewport) {
          let d = Infinity;
          window.visualViewport.addEventListener("resize", () => {
            const e = window.visualViewport.height;
            e > d && (document.scrollingElement.scrollTop = 0);
            d = e;
          });
        } else
          window.addEventListener("focusout", () => {
            KeyboardIsVisible() || (document.scrollingElement.scrollTop = 0);
          });
      self.C3WrapperOnMessage = (d) => this._OnWrapperMessage(d);
      this._mediaPendingPlay = new Set();
      this._mediaRemovedPendingPlay = new WeakSet();
      this._isSilent = !1;
    }
    _OnBeforeStartTicking() {
      self.setTimeout(() => {
        this._enableAndroidVKDetection = !0;
      }, 1e3);
      "cordova" === this._iRuntime.GetExportType()
        ? (document.addEventListener("pause", () =>
            this._OnVisibilityChange(!0)
          ),
          document.addEventListener("resume", () =>
            this._OnVisibilityChange(!1)
          ))
        : document.addEventListener("visibilitychange", () =>
            this._OnVisibilityChange(document.hidden)
          );
      return { isSuspended: !(!document.hidden && !isCordovaPaused) };
    }
    Attach() {
      window.addEventListener("focus", () =>
        this._PostRuntimeEvent("window-focus")
      );
      window.addEventListener("blur", () => {
        this._PostRuntimeEvent("window-blur", {
          parentHasFocus: ParentHasFocus(),
        });
        this._mousePointerLastButtons = 0;
      });
      window.addEventListener("focusin", (a) => {
        IsKeyboardInputElement(a.target) &&
          this._PostRuntimeEvent("keyboard-blur");
      });
      window.addEventListener("keydown", (a) => this._OnKeyEvent("keydown", a));
      window.addEventListener("keyup", (a) => this._OnKeyEvent("keyup", a));
      window.addEventListener("dblclick", (a) =>
        this._OnMouseEvent("dblclick", a, DISPATCH_RUNTIME_AND_SCRIPT)
      );
      window.addEventListener("wheel", (a) =>
        this._OnMouseWheelEvent("wheel", a)
      );
      "undefined" !== typeof PointerEvent
        ? (window.addEventListener("pointerdown", (a) => {
            this._HandlePointerDownFocus(a);
            this._OnPointerEvent("pointerdown", a);
          }),
          this._iRuntime.UsesWorker() &&
          "undefined" !== typeof window.onpointerrawupdate &&
          self === self.top
            ? window.addEventListener("pointerrawupdate", (a) =>
                this._OnPointerRawUpdate(a)
              )
            : window.addEventListener("pointermove", (a) =>
                this._OnPointerEvent("pointermove", a)
              ),
          window.addEventListener("pointerup", (a) =>
            this._OnPointerEvent("pointerup", a)
          ),
          window.addEventListener("pointercancel", (a) =>
            this._OnPointerEvent("pointercancel", a)
          ))
        : (window.addEventListener("mousedown", (a) => {
            this._HandlePointerDownFocus(a);
            this._OnMouseEventAsPointer("pointerdown", a);
          }),
          window.addEventListener("mousemove", (a) =>
            this._OnMouseEventAsPointer("pointermove", a)
          ),
          window.addEventListener("mouseup", (a) =>
            this._OnMouseEventAsPointer("pointerup", a)
          ),
          window.addEventListener("touchstart", (a) => {
            this._HandlePointerDownFocus(a);
            this._OnTouchEvent("pointerdown", a);
          }),
          window.addEventListener("touchmove", (a) =>
            this._OnTouchEvent("pointermove", a)
          ),
          window.addEventListener("touchend", (a) =>
            this._OnTouchEvent("pointerup", a)
          ),
          window.addEventListener("touchcancel", (a) =>
            this._OnTouchEvent("pointercancel", a)
          ));
      const b = () => this._PlayPendingMedia();
      window.addEventListener("pointerup", b, !0);
      window.addEventListener("touchend", b, !0);
      window.addEventListener("click", b, !0);
      window.addEventListener("keydown", b, !0);
      window.addEventListener("gamepadconnected", b, !0);
      this._iRuntime.IsAndroid() &&
        !this._iRuntime.IsAndroidWebView() &&
        navigator.virtualKeyboard &&
        ((navigator.virtualKeyboard.overlaysContent = !0),
        navigator.virtualKeyboard.addEventListener("geometrychange", () => {
          this._OnAndroidVirtualKeyboardChange(
            this._GetWindowInnerHeight(),
            navigator.virtualKeyboard.boundingRect.height
          );
        }));
    }
    _OnAndroidVirtualKeyboardChange(b, a) {
      document.body.style.transform = "";
      this._vkTranslateYOffset = 0;
      if (0 < a) {
        var c = document.activeElement;
        c &&
          ((c = c.getBoundingClientRect()),
          (b = (c.top + c.bottom) / 2 - (b - a) / 2),
          b > a && (b = a),
          0 > b && (b = 0),
          0 < b &&
            ((document.body.style.transform = `translateY(${-b}px)`),
            (this._vkTranslateYOffset = b)));
      }
    }
    _PostRuntimeEvent(b, a) {
      this.PostToRuntime(b, a || null, DISPATCH_RUNTIME_ONLY);
    }
    _GetWindowInnerWidth() {
      return this._iRuntime._GetWindowInnerWidth();
    }
    _GetWindowInnerHeight() {
      return this._iRuntime._GetWindowInnerHeight();
    }
    _EnableWindowResizeEvent() {
      this._enableWindowResizeEvent = !0;
      this._lastWindowWidth = this._iRuntime._GetWindowInnerWidth();
      this._lastWindowHeight = this._iRuntime._GetWindowInnerHeight();
    }
    _OnWindowResize() {
      if (!this._isExportToVideo && this._enableWindowResizeEvent) {
        var b = this._GetWindowInnerWidth(),
          a = this._GetWindowInnerHeight();
        if (this._iRuntime.IsAndroidWebView()) {
          if (this._enableAndroidVKDetection) {
            if (this._lastWindowWidth === b && a < this._lastWindowHeight) {
              this._virtualKeyboardHeight = this._lastWindowHeight - a;
              this._OnAndroidVirtualKeyboardChange(
                this._lastWindowHeight,
                this._virtualKeyboardHeight
              );
              return;
            }
            0 < this._virtualKeyboardHeight &&
              ((this._virtualKeyboardHeight = 0),
              this._OnAndroidVirtualKeyboardChange(
                a,
                this._virtualKeyboardHeight
              ));
          }
          this._lastWindowWidth = b;
          this._lastWindowHeight = a;
        }
        this.PostToRuntime("window-resize", {
          innerWidth: b,
          innerHeight: a,
          devicePixelRatio: window.devicePixelRatio,
          isFullscreen: RuntimeInterface$jscomp$1.IsDocumentFullscreen(),
        });
        this._iRuntime.IsiOSWebView() &&
          (-1 !== this._simulatedResizeTimerId &&
            clearTimeout(this._simulatedResizeTimerId),
          this._OnSimulatedResize(b, a, 0));
      }
    }
    _ScheduleSimulatedResize(b, a, c) {
      -1 !== this._simulatedResizeTimerId &&
        clearTimeout(this._simulatedResizeTimerId);
      this._simulatedResizeTimerId = setTimeout(
        () => this._OnSimulatedResize(b, a, c),
        48
      );
    }
    _OnSimulatedResize(b, a, c) {
      const d = this._GetWindowInnerWidth(),
        e = this._GetWindowInnerHeight();
      this._simulatedResizeTimerId = -1;
      d != b || e != a
        ? this.PostToRuntime("window-resize", {
            innerWidth: d,
            innerHeight: e,
            devicePixelRatio: window.devicePixelRatio,
            isFullscreen: RuntimeInterface$jscomp$1.IsDocumentFullscreen(),
          })
        : 10 > c && this._ScheduleSimulatedResize(d, e, c + 1);
    }
    _OnSetTargetOrientation(b) {
      this._targetOrientation = b.targetOrientation;
    }
    _TrySetTargetOrientation() {
      const b = this._targetOrientation;
      if (screen.orientation && screen.orientation.lock)
        screen.orientation
          .lock(b)
          .catch((a) =>
            console.warn("[Construct] Failed to lock orientation: ", a)
          );
      else
        try {
          let a = !1;
          screen.lockOrientation
            ? (a = screen.lockOrientation(b))
            : screen.webkitLockOrientation
            ? (a = screen.webkitLockOrientation(b))
            : screen.mozLockOrientation
            ? (a = screen.mozLockOrientation(b))
            : screen.msLockOrientation && (a = screen.msLockOrientation(b));
          a || console.warn("[Construct] Failed to lock orientation");
        } catch (a) {
          console.warn("[Construct] Failed to lock orientation: ", a);
        }
    }
    _OnFullscreenChange() {
      if (!this._isExportToVideo) {
        var b = RuntimeInterface$jscomp$1.IsDocumentFullscreen();
        b &&
          "any" !== this._targetOrientation &&
          this._TrySetTargetOrientation();
        this.PostToRuntime("fullscreenchange", {
          isFullscreen: b,
          innerWidth: this._GetWindowInnerWidth(),
          innerHeight: this._GetWindowInnerHeight(),
        });
      }
    }
    _OnFullscreenError(b) {
      console.warn("[Construct] Fullscreen request failed: ", b);
      this.PostToRuntime("fullscreenerror", {
        isFullscreen: RuntimeInterface$jscomp$1.IsDocumentFullscreen(),
        innerWidth: this._GetWindowInnerWidth(),
        innerHeight: this._GetWindowInnerHeight(),
      });
    }
    _OnVisibilityChange(b) {
      b
        ? this._iRuntime._CancelAnimationFrame()
        : this._iRuntime._RequestAnimationFrame();
      this.PostToRuntime("visibilitychange", { hidden: b });
    }
    _OnKeyEvent(b, a) {
      "Backspace" === a.key && PreventDefaultOnCanvasOrDoc(a);
      if (!this._isExportToVideo) {
        var c = KEY_CODE_ALIASES.get(a.code) || a.code;
        this._PostToRuntimeMaybeSync(
          b,
          {
            code: c,
            key: a.key,
            which: a.which,
            repeat: a.repeat,
            altKey: a.altKey,
            ctrlKey: a.ctrlKey,
            metaKey: a.metaKey,
            shiftKey: a.shiftKey,
            timeStamp: a.timeStamp,
          },
          DISPATCH_RUNTIME_AND_SCRIPT
        );
      }
    }
    _OnMouseWheelEvent(b, a) {
      this._isExportToVideo ||
        this.PostToRuntime(
          b,
          {
            clientX: a.clientX,
            clientY: a.clientY + this._vkTranslateYOffset,
            pageX: a.pageX,
            pageY: a.pageY + this._vkTranslateYOffset,
            deltaX: a.deltaX,
            deltaY: a.deltaY,
            deltaZ: a.deltaZ,
            deltaMode: a.deltaMode,
            timeStamp: a.timeStamp,
          },
          DISPATCH_RUNTIME_AND_SCRIPT
        );
    }
    _OnMouseEvent(b, a, c) {
      this._isExportToVideo ||
        IsCompatibilityMouseEvent(a) ||
        this._PostToRuntimeMaybeSync(
          b,
          {
            button: a.button,
            buttons: a.buttons,
            clientX: a.clientX,
            clientY: a.clientY + this._vkTranslateYOffset,
            pageX: a.pageX,
            pageY: a.pageY + this._vkTranslateYOffset,
            movementX: a.movementX || 0,
            movementY: a.movementY || 0,
            timeStamp: a.timeStamp,
          },
          c
        );
    }
    _OnMouseEventAsPointer(b, a) {
      if (!this._isExportToVideo && !IsCompatibilityMouseEvent(a)) {
        var c = this._mousePointerLastButtons;
        "pointerdown" === b && 0 !== c
          ? (b = "pointermove")
          : "pointerup" === b && 0 !== a.buttons && (b = "pointermove");
        this._PostToRuntimeMaybeSync(
          b,
          {
            pointerId: 1,
            pointerType: "mouse",
            button: a.button,
            buttons: a.buttons,
            lastButtons: c,
            clientX: a.clientX,
            clientY: a.clientY + this._vkTranslateYOffset,
            pageX: a.pageX,
            pageY: a.pageY + this._vkTranslateYOffset,
            movementX: a.movementX || 0,
            movementY: a.movementY || 0,
            width: 0,
            height: 0,
            pressure: 0,
            tangentialPressure: 0,
            tiltX: 0,
            tiltY: 0,
            twist: 0,
            timeStamp: a.timeStamp,
          },
          DISPATCH_RUNTIME_AND_SCRIPT
        );
        this._mousePointerLastButtons = a.buttons;
        this._OnMouseEvent(a.type, a, DISPATCH_SCRIPT_ONLY);
      }
    }
    _OnPointerEvent(b, a) {
      if (!this._isExportToVideo) {
        var c = 0;
        "mouse" === a.pointerType && (c = this._mousePointerLastButtons);
        this._PostToRuntimeMaybeSync(
          b,
          {
            pointerId: a.pointerId,
            pointerType: a.pointerType,
            button: a.button,
            buttons: a.buttons,
            lastButtons: c,
            clientX: a.clientX,
            clientY: a.clientY + this._vkTranslateYOffset,
            pageX: a.pageX,
            pageY: a.pageY + this._vkTranslateYOffset,
            movementX: a.movementX || 0,
            movementY: a.movementY || 0,
            width: a.width || 0,
            height: a.height || 0,
            pressure: a.pressure || 0,
            tangentialPressure: a.tangentialPressure || 0,
            tiltX: a.tiltX || 0,
            tiltY: a.tiltY || 0,
            twist: a.twist || 0,
            timeStamp: a.timeStamp,
          },
          DISPATCH_RUNTIME_AND_SCRIPT
        );
        "mouse" === a.pointerType &&
          ((c = "mousemove"),
          "pointerdown" === b
            ? (c = "mousedown")
            : "pointerup" === b && (c = "mouseup"),
          this._OnMouseEvent(c, a, DISPATCH_SCRIPT_ONLY),
          (this._mousePointerLastButtons = a.buttons));
      }
    }
    _OnPointerRawUpdate(b) {
      this._OnPointerEvent("pointermove", b);
    }
    _OnTouchEvent(b, a) {
      if (!this._isExportToVideo)
        for (let c = 0, d = a.changedTouches.length; c < d; ++c) {
          const e = a.changedTouches[c];
          this._PostToRuntimeMaybeSync(
            b,
            {
              pointerId: e.identifier,
              pointerType: "touch",
              button: 0,
              buttons: 0,
              lastButtons: 0,
              clientX: e.clientX,
              clientY: e.clientY + this._vkTranslateYOffset,
              pageX: e.pageX,
              pageY: e.pageY + this._vkTranslateYOffset,
              movementX: a.movementX || 0,
              movementY: a.movementY || 0,
              width: 2 * (e.radiusX || e.webkitRadiusX || 0),
              height: 2 * (e.radiusY || e.webkitRadiusY || 0),
              pressure: e.force || e.webkitForce || 0,
              tangentialPressure: 0,
              tiltX: 0,
              tiltY: 0,
              twist: e.rotationAngle || 0,
              timeStamp: a.timeStamp,
            },
            DISPATCH_RUNTIME_AND_SCRIPT
          );
        }
    }
    _HandlePointerDownFocus(b) {
      window !== window.top && window.focus();
      this._IsElementCanvasOrDocument(b.target) &&
        document.activeElement &&
        !this._IsElementCanvasOrDocument(document.activeElement) &&
        document.activeElement.blur();
    }
    _IsElementCanvasOrDocument(b) {
      return (
        !b ||
        b === document ||
        b === window ||
        b === document.body ||
        "canvas" === b.tagName.toLowerCase()
      );
    }
    _AttachDeviceOrientationEvent() {
      this._attachedDeviceOrientationEvent ||
        ((this._attachedDeviceOrientationEvent = !0),
        window.addEventListener("deviceorientation", (b) =>
          this._OnDeviceOrientation(b)
        ),
        window.addEventListener("deviceorientationabsolute", (b) =>
          this._OnDeviceOrientationAbsolute(b)
        ));
    }
    _AttachDeviceMotionEvent() {
      this._attachedDeviceMotionEvent ||
        ((this._attachedDeviceMotionEvent = !0),
        window.addEventListener("devicemotion", (b) =>
          this._OnDeviceMotion(b)
        ));
    }
    _OnDeviceOrientation(b) {
      this._isExportToVideo ||
        this.PostToRuntime(
          "deviceorientation",
          {
            absolute: !!b.absolute,
            alpha: b.alpha || 0,
            beta: b.beta || 0,
            gamma: b.gamma || 0,
            timeStamp: b.timeStamp,
            webkitCompassHeading: b.webkitCompassHeading,
            webkitCompassAccuracy: b.webkitCompassAccuracy,
          },
          DISPATCH_RUNTIME_AND_SCRIPT
        );
    }
    _OnDeviceOrientationAbsolute(b) {
      this._isExportToVideo ||
        this.PostToRuntime(
          "deviceorientationabsolute",
          {
            absolute: !!b.absolute,
            alpha: b.alpha || 0,
            beta: b.beta || 0,
            gamma: b.gamma || 0,
            timeStamp: b.timeStamp,
          },
          DISPATCH_RUNTIME_AND_SCRIPT
        );
    }
    _OnDeviceMotion(b) {
      if (!this._isExportToVideo) {
        var a = null,
          c = b.acceleration;
        c && (a = { x: c.x || 0, y: c.y || 0, z: c.z || 0 });
        c = null;
        var d = b.accelerationIncludingGravity;
        d && (c = { x: d.x || 0, y: d.y || 0, z: d.z || 0 });
        d = null;
        var e = b.rotationRate;
        e &&
          (d = { alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0 });
        this.PostToRuntime(
          "devicemotion",
          {
            acceleration: a,
            accelerationIncludingGravity: c,
            rotationRate: d,
            interval: b.interval,
            timeStamp: b.timeStamp,
          },
          DISPATCH_RUNTIME_AND_SCRIPT
        );
      }
    }
    _OnUpdateCanvasSize(b) {
      var a = this.GetRuntimeInterface();
      a.IsExportingToVideo() ||
        ((a = a.GetCanvas()),
        (a.style.width = b.styleWidth + "px"),
        (a.style.height = b.styleHeight + "px"),
        (a.style.marginLeft = b.marginLeft + "px"),
        (a.style.marginTop = b.marginTop + "px"),
        document.documentElement.style.setProperty(
          "--construct-scale",
          b.displayScale
        ),
        this._isFirstSizeUpdate &&
          ((a.style.display = ""), (this._isFirstSizeUpdate = !1)));
    }
    _OnInvokeDownload(b) {
      const a = b.url;
      b = b.filename;
      const c = document.createElement("a"),
        d = document.body;
      c.textContent = b;
      c.href = a;
      c.download = b;
      d.appendChild(c);
      c.click();
      d.removeChild(c);
    }
    async _OnLoadWebFonts(b) {
      await Promise.all(
        b.webfonts.map(async (a) => {
          a = new FontFace(a.name, `url('${a.url}')`);
          document.fonts.add(a);
          await a.load();
        })
      );
    }
    async _OnRasterSvgImage(b) {
      var a = b.imageBitmapOpts;
      b = await self.C3_RasterSvgImageBlob(
        b.blob,
        b.imageWidth,
        b.imageHeight,
        b.surfaceWidth,
        b.surfaceHeight
      );
      a = a ? await createImageBitmap(b, a) : await createImageBitmap(b);
      return { imageBitmap: a, transferables: [a] };
    }
    async _OnGetSvgImageSize(b) {
      return await self.C3_GetSvgImageSize(b.blob);
    }
    async _OnAddStylesheet(b) {
      await AddStyleSheet(b.url);
    }
    _PlayPendingMedia() {
      var b = [...this._mediaPendingPlay];
      this._mediaPendingPlay.clear();
      if (!this._isSilent)
        for (const a of b)
          (b = a.play()) &&
            b.catch((c) => {
              this._mediaRemovedPendingPlay.has(a) ||
                this._mediaPendingPlay.add(a);
            });
    }
    TryPlayMedia(b) {
      if ("function" !== typeof b.play) throw Error("missing play function");
      this._mediaRemovedPendingPlay.delete(b);
      let a;
      try {
        a = b.play();
      } catch (c) {
        this._mediaPendingPlay.add(b);
        return;
      }
      a &&
        a.catch((c) => {
          this._mediaRemovedPendingPlay.has(b) || this._mediaPendingPlay.add(b);
        });
    }
    RemovePendingPlay(b) {
      this._mediaPendingPlay.delete(b);
      this._mediaRemovedPendingPlay.add(b);
    }
    SetSilent(b) {
      this._isSilent = !!b;
    }
    _OnHideCordovaSplash() {
      navigator.splashscreen &&
        navigator.splashscreen.hide &&
        navigator.splashscreen.hide();
    }
    _OnDebugHighlight(b) {
      if (b.show) {
        this._debugHighlightElem ||
          ((this._debugHighlightElem = document.createElement("div")),
          (this._debugHighlightElem.id = "inspectOutline"),
          document.body.appendChild(this._debugHighlightElem));
        var a = this._debugHighlightElem;
        a.style.display = "";
        a.style.left = b.left - 1 + "px";
        a.style.top = b.top - 1 + "px";
        a.style.width = b.width + 2 + "px";
        a.style.height = b.height + 2 + "px";
        a.textContent = b.name;
      } else
        this._debugHighlightElem &&
          (this._debugHighlightElem.style.display = "none");
    }
    _OnRegisterSW() {
      window.C3_RegisterSW && window.C3_RegisterSW();
    }
    _OnPostToDebugger(b) {
      window.c3_postToMessagePort &&
        ((b.from = "runtime"), window.c3_postToMessagePort(b));
    }
    _InvokeFunctionFromJS(b, a) {
      return this.PostToRuntimeAsync("js-invoke-function", {
        name: b,
        params: a,
      });
    }
    _OnScriptCreateWorker(b) {
      const a = b.port2;
      new Worker(b.url, b.opts).postMessage(
        { type: "construct-worker-init", port2: a },
        [a]
      );
    }
    _OnAlert(b) {
      alert(b.message);
    }
    _OnWrapperMessage(b) {
      "entered-fullscreen" === b
        ? (RuntimeInterface$jscomp$1._SetWrapperIsFullscreenFlag(!0),
          this._OnFullscreenChange())
        : "exited-fullscreen" === b
        ? (RuntimeInterface$jscomp$1._SetWrapperIsFullscreenFlag(!1),
          this._OnFullscreenChange())
        : console.warn("Unknown wrapper message: ", b);
    }
    _OnScreenReaderTextEvent(b) {
      var a = b.type;
      "create" === a
        ? ((a = document.createElement("p")),
          (a.id = "c3-sr-" + b.id),
          (a.textContent = b.text),
          this._screenReaderTextWrap.appendChild(a))
        : "update" === a
        ? (a = document.getElementById("c3-sr-" + b.id))
          ? (a.textContent = b.text)
          : console.warn(
              `[Construct] Missing screen reader text with id ${b.id}`
            )
        : "release" === a
        ? (a = document.getElementById("c3-sr-" + b.id))
          ? a.remove()
          : console.warn(
              `[Construct] Missing screen reader text with id ${b.id}`
            )
        : console.warn(`[Construct] Unknown screen reader text update '${a}'`);
    }
    _SetExportingToVideo(b) {
      this._isExportToVideo = !0;
      const a = document.createElement("h1");
      a.id = "exportToVideoMessage";
      a.textContent = b.message;
      document.body.prepend(a);
      document.body.classList.add("exportingToVideo");
      this.GetRuntimeInterface().GetCanvas().style.display = "";
      this._iRuntime.SetIsExportingToVideo(b.duration);
    }
    _OnExportVideoProgress(b) {
      this._exportVideoProgressMessage = b.message;
      -1 === this._exportVideoUpdateTimerId &&
        (this._exportVideoUpdateTimerId = setTimeout(
          () => this._DoUpdateExportVideoProgressMessage(),
          250
        ));
    }
    _DoUpdateExportVideoProgressMessage() {
      this._exportVideoUpdateTimerId = -1;
      const b = document.getElementById("exportToVideoMessage");
      b && (b.textContent = this._exportVideoProgressMessage);
    }
    _OnExportedToVideo(b) {
      window.c3_postToMessagePort({
        type: "exported-video",
        blob: b.blob,
        time: b.time,
      });
    }
    _OnExportedToImageSequence(b) {
      window.c3_postToMessagePort({
        type: "exported-image-sequence",
        blobArr: b.blobArr,
        time: b.time,
        gif: b.gif,
      });
    }
  }
);
("use strict");
self.JobSchedulerDOM = class {
  constructor(b) {
    this._runtimeInterface = b;
    this._baseUrl = b.GetRuntimeBaseURL();
    "preview" === b.GetExportType()
      ? (this._baseUrl += "workers/")
      : (this._baseUrl += b.GetScriptFolder());
    this._maxNumWorkers = Math.min(navigator.hardwareConcurrency || 2, 16);
    this._dispatchWorker = null;
    this._jobWorkers = [];
    this._outputPort = this._inputPort = null;
  }
  _GetWorkerScriptFolder() {
    return "playable-ad" === this._runtimeInterface.GetExportType()
      ? this._runtimeInterface.GetScriptFolder()
      : "";
  }
  async Init() {
    if (this._hasInitialised) throw Error("already initialised");
    this._hasInitialised = !0;
    var b = this._runtimeInterface._GetWorkerURL(
      this._GetWorkerScriptFolder() + "dispatchworker.js"
    );
    this._dispatchWorker = await this._runtimeInterface.CreateWorker(
      b,
      this._baseUrl,
      { name: "DispatchWorker" }
    );
    b = new MessageChannel();
    this._inputPort = b.port1;
    this._dispatchWorker.postMessage({ type: "_init", "in-port": b.port2 }, [
      b.port2,
    ]);
    this._outputPort = await this._CreateJobWorker();
  }
  async _CreateJobWorker() {
    const b = this._jobWorkers.length;
    var a = this._runtimeInterface._GetWorkerURL(
      this._GetWorkerScriptFolder() + "jobworker.js"
    );
    a = await this._runtimeInterface.CreateWorker(a, this._baseUrl, {
      name: "JobWorker" + b,
    });
    const c = new MessageChannel(),
      d = new MessageChannel();
    this._dispatchWorker.postMessage({ type: "_addJobWorker", port: c.port1 }, [
      c.port1,
    ]);
    a.postMessage(
      {
        type: "init",
        number: b,
        "dispatch-port": c.port2,
        "output-port": d.port2,
      },
      [c.port2, d.port2]
    );
    this._jobWorkers.push(a);
    return d.port1;
  }
  GetPortData() {
    return {
      inputPort: this._inputPort,
      outputPort: this._outputPort,
      maxNumWorkers: this._maxNumWorkers,
    };
  }
  GetPortTransferables() {
    return [this._inputPort, this._outputPort];
  }
};
("use strict");
window.C3_IsSupported &&
  (window.c3_runtimeInterface = new self.RuntimeInterface({
    useWorker: !0,
    workerMainUrl: "workermain.js",
    engineScripts: ["scripts/c3runtime.js"],
    projectScripts: [],
    mainProjectScript: "",
    scriptFolder: "scripts/",
    workerDependencyScripts: ["box2d.wasm.js"],
    exportType: "html5",
  }));
("use strict");
function StopPropagation(b) {
  b.stopPropagation();
}
self.RuntimeInterface.AddDOMHandlerClass(
  class extends self.DOMElementHandler {
    constructor(b) {
      super(b, "button");
    }
    CreateElement(b, a) {
      const c = document.createElement("input");
      var d = c;
      a.isCheckbox
        ? ((c.type = "checkbox"),
          (d = document.createElement("label")),
          d.appendChild(c),
          d.appendChild(document.createTextNode("")),
          (d.style.fontFamily = "sans-serif"),
          (d.style.userSelect = "none"),
          (d.style.webkitUserSelect = "none"),
          (d.style.display = "inline-block"),
          (d.style.color = "black"))
        : (c.type = "button");
      d.style.position = "absolute";
      d.addEventListener("pointerdown", StopPropagation);
      d.addEventListener("pointermove", StopPropagation);
      d.addEventListener("pointerrawupdate", StopPropagation);
      d.addEventListener("pointerup", StopPropagation);
      d.addEventListener("mousedown", StopPropagation);
      d.addEventListener("mouseup", StopPropagation);
      d.addEventListener("keydown", StopPropagation);
      d.addEventListener("keyup", StopPropagation);
      c.addEventListener("click", () =>
        this._PostToRuntimeElementMaybeSync("click", b, {
          isChecked: c.checked,
        })
      );
      a.id && (c.id = a.id);
      a.className && (c.className = a.className);
      this.UpdateState(d, a);
      return d;
    }
    _GetInputElem(b) {
      return "input" === b.tagName.toLowerCase() ? b : b.firstChild;
    }
    _GetFocusElement(b) {
      return this._GetInputElem(b);
    }
    UpdateState(b, a) {
      const c = this._GetInputElem(b);
      c.checked = a.isChecked;
      c.disabled = !a.isEnabled;
      b.title = a.title;
      b === c ? (c.value = a.text) : (b.lastChild.textContent = a.text);
    }
  }
);
("use strict");
function StopPropagation$jscomp$1(b) {
  b.stopPropagation();
}
function StopKeyPropagation(b) {
  13 !== b.which && 27 !== b.which && b.stopPropagation();
}
self.RuntimeInterface.AddDOMHandlerClass(
  class extends self.DOMElementHandler {
    constructor(b) {
      super(b, "text-input");
      this.AddDOMElementMessageHandler("scroll-to-bottom", (a) =>
        this._OnScrollToBottom(a)
      );
    }
    CreateElement(b, a) {
      let c;
      const d = a.type;
      "textarea" === d
        ? ((c = document.createElement("textarea")), (c.style.resize = "none"))
        : ((c = document.createElement("input")), (c.type = d));
      c.style.position = "absolute";
      c.autocomplete = "off";
      c.addEventListener("pointerdown", StopPropagation$jscomp$1);
      c.addEventListener("pointermove", StopPropagation$jscomp$1);
      c.addEventListener("pointerrawupdate", StopPropagation$jscomp$1);
      c.addEventListener("pointerup", StopPropagation$jscomp$1);
      c.addEventListener("mousedown", StopPropagation$jscomp$1);
      c.addEventListener("mouseup", StopPropagation$jscomp$1);
      c.addEventListener("keydown", StopKeyPropagation);
      c.addEventListener("keyup", StopKeyPropagation);
      c.addEventListener("click", (e) => {
        e.stopPropagation();
        this._PostToRuntimeElementMaybeSync("click", b);
      });
      c.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this._PostToRuntimeElementMaybeSync("dblclick", b);
      });
      c.addEventListener("input", () =>
        this.PostToRuntimeElement("change", b, { text: c.value })
      );
      a.id && (c.id = a.id);
      a.className && (c.className = a.className);
      this.UpdateState(c, a);
      return c;
    }
    UpdateState(b, a) {
      b.value = a.text;
      b.placeholder = a.placeholder;
      b.title = a.title;
      b.disabled = !a.isEnabled;
      b.readOnly = a.isReadOnly;
      b.spellcheck = a.spellCheck;
      a = a.maxLength;
      0 > a ? b.removeAttribute("maxlength") : b.setAttribute("maxlength", a);
    }
    _OnScrollToBottom(b) {
      b.scrollTop = b.scrollHeight;
    }
  }
);
("use strict");
self.RuntimeInterface.AddDOMHandlerClass(
  class extends self.DOMHandler {
    constructor(b) {
      super(b, "touch");
      this.AddRuntimeMessageHandler("request-permission", (a) =>
        this._OnRequestPermission(a)
      );
    }
    async _OnRequestPermission(b) {
      b = b.type;
      let a = !0;
      0 === b
        ? (a = await this._RequestOrientationPermission())
        : 1 === b && (a = await this._RequestMotionPermission());
      this.PostToRuntime("permission-result", { type: b, result: a });
    }
    async _RequestOrientationPermission() {
      if (
        !self.DeviceOrientationEvent ||
        !self.DeviceOrientationEvent.requestPermission
      )
        return !0;
      try {
        return (
          "granted" === (await self.DeviceOrientationEvent.requestPermission())
        );
      } catch (b) {
        return (
          console.warn("[Touch] Failed to request orientation permission: ", b),
          !1
        );
      }
    }
    async _RequestMotionPermission() {
      if (!self.DeviceMotionEvent || !self.DeviceMotionEvent.requestPermission)
        return !0;
      try {
        return "granted" === (await self.DeviceMotionEvent.requestPermission());
      } catch (b) {
        return (
          console.warn("[Touch] Failed to request motion permission: ", b), !1
        );
      }
    }
  }
);
("use strict");
function elemsForSelector(b, a) {
  return b
    ? a
      ? Array.from(document.querySelectorAll(b))
      : (b = document.querySelector(b))
      ? [b]
      : []
    : [document.documentElement];
}
function noop() {}
self.RuntimeInterface.AddDOMHandlerClass(
  class extends self.DOMHandler {
    constructor(b) {
      super(b, "browser");
      this._exportType = "";
      this.AddRuntimeMessageHandlers([
        ["get-initial-state", (a) => this._OnGetInitialState(a)],
        ["ready-for-sw-messages", () => this._OnReadyForSWMessages()],
        ["alert", (a) => this._OnAlert(a)],
        ["close", () => this._OnClose()],
        ["set-focus", (a) => this._OnSetFocus(a)],
        ["vibrate", (a) => this._OnVibrate(a)],
        ["lock-orientation", (a) => this._OnLockOrientation(a)],
        ["unlock-orientation", () => this._OnUnlockOrientation()],
        ["navigate", (a) => this._OnNavigate(a)],
        ["request-fullscreen", (a) => this._OnRequestFullscreen(a)],
        ["exit-fullscreen", () => this._OnExitFullscreen()],
        ["set-hash", (a) => this._OnSetHash(a)],
        ["set-document-css-style", (a) => this._OnSetDocumentCSSStyle(a)],
        ["get-document-css-style", (a) => this._OnGetDocumentCSSStyle(a)],
      ]);
      window.addEventListener("online", () => this._OnOnlineStateChanged(!0));
      window.addEventListener("offline", () => this._OnOnlineStateChanged(!1));
      window.addEventListener("hashchange", () => this._OnHashChange());
      document.addEventListener("backbutton", () =>
        this._OnCordovaBackButton()
      );
    }
    _OnGetInitialState(b) {
      this._exportType = b.exportType;
      return {
        location: location.toString(),
        isOnline: !!navigator.onLine,
        referrer: document.referrer,
        title: document.title,
        isCookieEnabled: !!navigator.cookieEnabled,
        screenWidth: screen.width,
        screenHeight: screen.height,
        windowOuterWidth: window.outerWidth,
        windowOuterHeight: window.outerHeight,
        isConstructArcade: "undefined" !== typeof window.is_scirra_arcade,
      };
    }
    _OnReadyForSWMessages() {
      window.C3_RegisterSW &&
        window.OfflineClientInfo &&
        window.OfflineClientInfo.SetMessageCallback((b) =>
          this.PostToRuntime("sw-message", b.data)
        );
    }
    _OnOnlineStateChanged(b) {
      this.PostToRuntime("online-state", { isOnline: b });
    }
    _OnCordovaBackButton() {
      this.PostToRuntime("backbutton");
    }
    GetNWjsWindow() {
      return "nwjs" === this._exportType ? nw.Window.get() : null;
    }
    _OnAlert(b) {
      alert(b.message);
    }
    _OnClose() {
      navigator.app && navigator.app.exitApp
        ? navigator.app.exitApp()
        : navigator.device && navigator.device.exitApp
        ? navigator.device.exitApp()
        : window.close();
    }
    _OnSetFocus(b) {
      b = b.isFocus;
      if ("nwjs" === this._exportType) {
        const a = this.GetNWjsWindow();
        b ? a.focus() : a.blur();
      } else b ? window.focus() : window.blur();
    }
    _OnVibrate(b) {
      navigator.vibrate && navigator.vibrate(b.pattern);
    }
    _OnLockOrientation(b) {
      b = b.orientation;
      if (screen.orientation && screen.orientation.lock)
        screen.orientation
          .lock(b)
          .catch((a) =>
            console.warn("[Construct] Failed to lock orientation: ", a)
          );
      else
        try {
          let a = !1;
          screen.lockOrientation
            ? (a = screen.lockOrientation(b))
            : screen.webkitLockOrientation
            ? (a = screen.webkitLockOrientation(b))
            : screen.mozLockOrientation
            ? (a = screen.mozLockOrientation(b))
            : screen.msLockOrientation && (a = screen.msLockOrientation(b));
          a || console.warn("[Construct] Failed to lock orientation");
        } catch (a) {
          console.warn("[Construct] Failed to lock orientation: ", a);
        }
    }
    _OnUnlockOrientation() {
      try {
        screen.orientation && screen.orientation.unlock
          ? screen.orientation.unlock()
          : screen.unlockOrientation
          ? screen.unlockOrientation()
          : screen.webkitUnlockOrientation
          ? screen.webkitUnlockOrientation()
          : screen.mozUnlockOrientation
          ? screen.mozUnlockOrientation()
          : screen.msUnlockOrientation && screen.msUnlockOrientation();
      } catch (b) {}
    }
    _OnNavigate(b) {
      var a = b.type;
      if ("back" === a)
        navigator.app && navigator.app.backHistory
          ? navigator.app.backHistory()
          : window.history.back();
      else if ("forward" === a) window.history.forward();
      else if ("reload" === a) location.reload();
      else if ("url" === a) {
        a = b.url;
        const c = b.target;
        b = b.exportType;
        self.cordova && self.cordova.InAppBrowser
          ? self.cordova.InAppBrowser.open(a, "_system")
          : "preview" === b || "windows-webview2" === b
          ? window.open(a, "_blank")
          : this._isConstructArcade ||
            (2 === c
              ? (window.top.location = a)
              : 1 === c
              ? (window.parent.location = a)
              : (window.location = a));
      } else
        "new-window" === a &&
          ((a = b.url),
          (b = b.tag),
          self.cordova && self.cordova.InAppBrowser
            ? self.cordova.InAppBrowser.open(a, "_system")
            : window.open(a, b));
    }
    _OnRequestFullscreen(b) {
      if (
        "windows-webview2" === this._exportType ||
        "macos-wkwebview" === this._exportType
      )
        self.RuntimeInterface._SetWrapperIsFullscreenFlag(!0),
          this._iRuntime._SendWrapperMessage({
            type: "set-fullscreen",
            fullscreen: !0,
          });
      else {
        const a = { navigationUI: "auto" };
        b = b.navUI;
        1 === b
          ? (a.navigationUI = "hide")
          : 2 === b && (a.navigationUI = "show");
        b = document.documentElement;
        let c;
        b.requestFullscreen
          ? (c = b.requestFullscreen(a))
          : b.mozRequestFullScreen
          ? (c = b.mozRequestFullScreen(a))
          : b.msRequestFullscreen
          ? (c = b.msRequestFullscreen(a))
          : b.webkitRequestFullScreen &&
            (c =
              "undefined" !== typeof Element.ALLOW_KEYBOARD_INPUT
                ? b.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT)
                : b.webkitRequestFullScreen());
        c instanceof Promise && c.catch(noop);
      }
    }
    _OnExitFullscreen() {
      if (
        "windows-webview2" === this._exportType ||
        "macos-wkwebview" === this._exportType
      )
        self.RuntimeInterface._SetWrapperIsFullscreenFlag(!1),
          this._iRuntime._SendWrapperMessage({
            type: "set-fullscreen",
            fullscreen: !1,
          });
      else {
        let b;
        document.exitFullscreen
          ? (b = document.exitFullscreen())
          : document.mozCancelFullScreen
          ? (b = document.mozCancelFullScreen())
          : document.msExitFullscreen
          ? (b = document.msExitFullscreen())
          : document.webkitCancelFullScreen &&
            (b = document.webkitCancelFullScreen());
        b instanceof Promise && b.catch(noop);
      }
    }
    _OnSetHash(b) {
      location.hash = b.hash;
    }
    _OnHashChange() {
      this.PostToRuntime("hashchange", { location: location.toString() });
    }
    _OnSetDocumentCSSStyle(b) {
      const a = b.prop,
        c = b.value,
        d = b.selector;
      b = b["is-all"];
      try {
        const e = elemsForSelector(d, b);
        for (const f of e)
          a.startsWith("--") ? f.style.setProperty(a, c) : (f.style[a] = c);
      } catch (e) {
        console.warn("[Browser] Failed to set style: ", e);
      }
    }
    _OnGetDocumentCSSStyle(b) {
      const a = b.prop;
      b = b.selector;
      try {
        const c = document.querySelector(b);
        return c
          ? { isOk: !0, result: window.getComputedStyle(c).getPropertyValue(a) }
          : { isOk: !1 };
      } catch (c) {
        return console.warn("[Browser] Failed to get style: ", c), { isOk: !1 };
      }
    }
  }
);
