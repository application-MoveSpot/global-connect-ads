// Stub declarations for packages whose dirs are empty in the CI container.
// Real packages have proper types on the Lovable platform.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _Any = any;

declare module "@tanstack/react-router" {
  export const createFileRoute: _Any;
  export const createRootRoute: _Any;
  export const createRootRouteWithContext: _Any;
  export const createRouter: _Any;
  export const useNavigate: _Any;
  export const useParams: _Any;
  export const useSearch: _Any;
  export const useLoaderData: _Any;
  export const useRouteContext: _Any;
  export const useRouter: _Any;
  export const useLocation: _Any;
  export const Link: _Any;
  export const Outlet: _Any;
  export const RouterProvider: _Any;
  export const ClientOnly: _Any;
  export const redirect: _Any;
  export const notFound: _Any;
  export const HeadContent: _Any;
  export const Scripts: _Any;
  export type AnyRouter = _Any;
  export type RegisteredRouter = _Any;
  export type ParsedLocation = _Any;
  export type RouterOptions = _Any;
  export type RouteComponent = _Any;
  export type FileRoutesByPath = _Any;
}

declare module "@tanstack/react-start" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type _A = any;
  interface _HandlerArgs {
    data: _A;
    context: _A;
    next: _A;
    input: _A;
  }
  interface ServerFnBuilder {
    handler(fn: (args: _HandlerArgs) => _A): (...a: _A[]) => Promise<_A>;
    middleware(arr: _A[]): ServerFnBuilder;
    inputValidator(fn: (d: _A) => _A): ServerFnBuilder;
    validator(schema: _A): ServerFnBuilder;
    method(m: string): ServerFnBuilder;
  }
  interface MiddlewareBuilder {
    server(fn: (args: _HandlerArgs) => _A): _A;
    client(fn: (args: _HandlerArgs) => _A): _A;
  }
  export function createServerFn(opts?: _A): ServerFnBuilder;
  export function createMiddleware(opts?: _A): MiddlewareBuilder;
  export const useServerFn: _A;
  export const createStartHandler: _A;
  export const defaultStreamHandler: _A;
  export const createStart: _A;
}

declare module "@tanstack/react-start/server" {
  export const getWebRequest: _Any;
  export const getRequest: _Any;
  export const setResponseStatus: _Any;
}

declare module "@lovable.dev/mcp-js" {
  export const auth: _Any;
  export const defineMcp: _Any;
  export const defineTool: _Any;
  export type ToolContext = _Any;
  export const lovableMcp: _Any;
  const _default: _Any;
  export default _default;
}

declare module "@lovable.dev/mcp-js/stacks/tanstack" {
  export const createTanStackInvokeToolHandler: _Any;
  export const createTanStackListToolsHandler: _Any;
  export const createTanStackOAuthProtectedResourceMetadataHandler: _Any;
  export const createTanStackMcpHandler: _Any;
  const _default: _Any;
  export default _default;
}

declare module "@lovable.dev/mcp-js/stacks/tanstack/vite" {
  export const mcpPlugin: _Any;
  const _default: _Any;
  export default _default;
}

declare module "@stripe/react-stripe-js" {
  export const Elements: _Any;
  export const CardElement: _Any;
  export const PaymentElement: _Any;
  export const EmbeddedCheckout: _Any;
  export const EmbeddedCheckoutProvider: _Any;
  export const useStripe: _Any;
  export const useElements: _Any;
}

declare module "@stripe/stripe-js" {
  export const loadStripe: _Any;
  export type Stripe = _Any;
  export type StripeElements = _Any;
}

declare module "leaflet" {
  namespace L {
    type Map = _Any;
    type Layer = _Any;
    type Marker = _Any;
    type Polygon = _Any;
    type LatLngExpression = _Any;
    type LatLngBoundsExpression = _Any;
    type MapOptions = _Any;
    const map: _Any;
    const marker: _Any;
    const polygon: _Any;
    const polyline: _Any;
    const tileLayer: _Any;
    const latLng: _Any;
    const latLngBounds: _Any;
    const icon: _Any;
    const Icon: _Any;
    const divIcon: _Any;
    const control: _Any;
    const DomEvent: _Any;
  }
  export = L;
}

declare module "qrcode" {
  export function toDataURL(text: string, opts?: _Any): Promise<string>;
  export function toString(text: string, opts?: _Any): Promise<string>;
  const _default: _Any;
  export default _default;
}

declare module "papaparse" {
  export function parse(input: string | File, config?: _Any): _Any;
  export function unparse(data: _Any, config?: _Any): string;
  const _default: _Any;
  export default _default;
}

declare module "stripe" {
  class Stripe {
    constructor(key: string, opts?: _Any);
    static createFetchHttpClient(): _Any;
    [k: string]: _Any;
  }
  namespace Stripe {
    type Event = _Any;
    namespace Checkout {
      type Session = _Any;
    }
    namespace Subscription {
      type Status = _Any;
    }
    type Subscription = _Any;
    type Invoice = _Any;
    type Customer = _Any;
    type PaymentIntent = _Any;
    type Account = _Any;
    type ApiList<T> = { data: T[]; has_more: boolean };
  }
  export = Stripe;
}

declare module "web-push" {
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string | Buffer,
    options?: Record<string, unknown>,
  ): Promise<{ statusCode: number }>;
  export default {
    setVapidDetails,
    sendNotification,
  };
}
