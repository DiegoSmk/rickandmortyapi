export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
  };
  meta: ApiMeta;
}
