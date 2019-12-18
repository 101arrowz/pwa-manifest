declare module '@parcel/logger' {
  function log(str: string): void;
  function clear(): void;
  function error(err: string): void;
  function progress(str: string): void;
  function success(str: string): void;
  function warn(str: string): void;
}
