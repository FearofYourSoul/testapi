export enum HttpCode {
  OK = 200,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

interface WebsocketErrorArgs {
  httpCode: HttpCode;
  msg?: string;
}

export class WebsocketError extends Error {
  public readonly msg: string;
  public readonly httpCode: HttpCode;

  constructor(args: WebsocketErrorArgs) {
    // 'Error' breaks prototype chain here
    super(args.msg);

    // restore prototype chain (Set the prototype explicitly)  
    Object.setPrototypeOf(this, new.target.prototype);

    this.msg = args.msg || 'Error';
    this.httpCode = args.httpCode;

    Error.captureStackTrace(this);
  }
}
