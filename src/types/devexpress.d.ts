import 'jquery';

declare global {
  interface JQuery {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dxCircularGauge(config?: any): JQuery;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dxCircularGauge(command: 'instance'): any;
  }
}

export {};