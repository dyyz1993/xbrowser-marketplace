export interface AppBindings {
  DB?: D1Database
  ASSETS?: { fetch: (request: Request) => Promise<Response> }
  REALTIME_DO?: DurableObjectNamespace
  R2_BUCKET?: R2Bucket
  ENVIRONMENT?: string
}

export interface CreateAppOptions {
  includeRealtime?: boolean
}
