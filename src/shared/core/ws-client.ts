/**
 * @framework-baseline 4437e01c1b0bcabb
 *
 * 此文件属于框架层代码。如需修改，请添加以下说明：
 *
 * @framework-modify
 * @reason WSClientImpl 不再 extends WebSocket，改为动态基类模式兼容 browser/node 环境
 * @impact 所有使用 WSClientImpl 的地方不再需要 WebSocket 类型断言
 */

type WSStatus = 'connecting' | 'open' | 'closed' | 'reconnecting'

interface WSProtocol {
  rpc: Record<string, { in: unknown; out: unknown }>
  events: Record<string, unknown>
}

interface WSClient<T extends WSProtocol = WSProtocol> {
  readonly status: WSStatus
  getSocket(): WebSocket | null
  call<K extends keyof T['rpc']>(
    method: K,
    params: T['rpc'][K] extends { in: infer I } ? I : never,
    timeout?: number
  ): Promise<T['rpc'][K] extends { out: infer O } ? O : never>
  emit<K extends keyof T['events']>(type: K, payload: T['events'][K]): void
  on<K extends keyof T['events']>(type: K, handler: (payload: T['events'][K]) => void): () => void
  onStatusChange(handler: (status: WSStatus) => void): () => void
  close(): void
}

type PendingRequest = {
  resolve: (val: unknown) => void
  reject: (err: unknown) => void
  timer: ReturnType<typeof setTimeout>
}

interface WSMessageBase {
  id?: string
  method?: string
  type?: string
  payload?: unknown
  result?: unknown
  error?: string
}

const _hasWebSocket = typeof globalThis !== 'undefined' && 'WebSocket' in globalThis

const WS_OPEN = _hasWebSocket ? (globalThis.WebSocket as typeof WebSocket).OPEN : 1
const WS_CONNECTING = _hasWebSocket ? (globalThis.WebSocket as typeof WebSocket).CONNECTING : 0

const WebSocketClass: typeof WebSocket | null = _hasWebSocket
  ? (globalThis.WebSocket as typeof WebSocket)
  : null

class StubWebSocket {
  binaryType: BinaryType = 'blob'
  bufferedAmount = 0
  extensions = ''
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onopen: ((ev: Event) => void) | null = null
  protocol = ''
  readyState = 0
  url = ''
  send(_data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    return 0 as never
  }
  close(_code?: number, _reason?: string) {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true
  }
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
}

type WSBaseClass = typeof WebSocket extends undefined ? typeof StubWebSocket : typeof WebSocket

const WSBase: WSBaseClass = (
  _hasWebSocket ? (globalThis.WebSocket as typeof WebSocket) : StubWebSocket
) as WSBaseClass

export class WSClientImpl<P extends WSProtocol = WSProtocol> extends WSBase implements WSClient<P> {
  private socket: WebSocket | null = null
  private handlers = new Map<string, ((payload: unknown) => void)[]>()
  private pendingRequests = new Map<string, PendingRequest>()
  private statusHandlers: ((status: WSStatus) => void)[] = []
  private messageBuffer: string[] = []
  private _status: WSStatus = 'closed'

  get status(): WSStatus {
    return this._status
  }

  getSocket(): WebSocket | null {
    return this.socket
  }

  constructor(url: string | URL, protocols?: string | string[]) {
    super(url.toString(), protocols as string[])
    if (WebSocketClass) {
      this.socket = new WebSocketClass(url.toString(), protocols)
      this.attachSocket()
    }
  }

  override send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    this.socket?.send(data as never)
  }

  override close() {
    this.socket?.close()
  }

  private attachSocket() {
    const ws = this.socket!
    if (ws.readyState === WS_OPEN) {
      this._status = 'open'
    } else if (ws.readyState === WS_CONNECTING) {
      this._status = 'connecting'
    } else {
      this._status = 'closed'
    }
    ws.onmessage = msg => this.handleMessage(msg)
    ws.onclose = () => {
      if (this._status !== 'closed') {
        this.handleClose()
      }
    }
    ws.onerror = () => {
      if (this._status !== 'closed') {
        this.updateStatus('closed')
      }
    }
    ws.onopen = () => {
      if (this._status !== 'open') {
        this.handleOpen()
      }
    }
  }

  private handleOpen() {
    this.updateStatus('open')
    while (this.messageBuffer.length > 0) {
      const msg = this.messageBuffer.shift()
      if (msg) this.send(msg)
    }
  }

  private handleClose() {
    this.updateStatus('closed')
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data: WSMessageBase = JSON.parse(event.data)

      if ('id' in data && !('method' in data)) {
        const pending = this.pendingRequests.get(data.id!)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingRequests.delete(data.id!)
          if (data.error) pending.reject(new Error(data.error))
          else pending.resolve(data.result)
        }
      } else if ('type' in data) {
        const callbacks = this.handlers.get(data.type!)
        callbacks?.forEach(cb => cb(data.payload))
      }
    } catch (e) {
      console.error('Failed to parse WS message', e)
    }
  }

  private updateStatus(status: WSStatus) {
    this._status = status
    this.statusHandlers.forEach(h => h(status))
  }

  async call<K extends keyof P['rpc']>(
    method: K,
    params: P['rpc'][K] extends { in: infer I } ? I : never,
    timeout = 10000
  ): Promise<P['rpc'][K] extends { out: infer O } ? O : never> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2)
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`RPC Timeout: ${String(method)}`))
      }, timeout)

      this.pendingRequests.set(id, {
        resolve: resolve as (val: unknown) => void,
        reject,
        timer,
      })

      this.sendRaw({ id, method, params })
    })
  }

  emit<K extends keyof P['events']>(type: K, payload: P['events'][K]) {
    this.sendRaw({ type, payload })
  }

  on<K extends keyof P['events']>(type: K, handler: (payload: P['events'][K]) => void) {
    const list = this.handlers.get(type as string) || []
    list.push(handler as (payload: unknown) => void)
    this.handlers.set(type as string, list)
    return () => {
      const filtered = (this.handlers.get(type as string) || []).filter(h => h !== handler)
      this.handlers.set(type as string, filtered)
    }
  }

  onStatusChange(handler: (status: WSStatus) => void) {
    this.statusHandlers.push(handler)
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler)
    }
  }

  private sendRaw(data: unknown) {
    const msg = JSON.stringify(data)
    if (this.socket && this.socket.readyState === WS_OPEN) {
      this.socket.send(msg as never)
    } else {
      this.messageBuffer.push(msg)
    }
  }
}

export function createWSClient<P extends WSProtocol>(url: string | URL): WSClient<P> {
  return new WSClientImpl<P>(url) as unknown as WSClient<P>
}
