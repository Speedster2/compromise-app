export function explode(
  promise: Promise<any>,
  callback: (resolved: any, rejected: any) => void,
): void {
  let resolve: any, reject: any;
  promise
    .then((res) => {
      resolve = res;
    })
    .catch((rej) => {
      reject = rej;
    })
    .finally(() => {
      callback(resolve, reject);
    });
}
