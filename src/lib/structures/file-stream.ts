import { File, FileMode } from "expo-file-system";
import { logError } from "../log";

export function createFileReadStream(file: File, chunkSize?: number) {
  chunkSize ??= 1024 * 8;

  const handle = file.open(FileMode.ReadOnly);
  let closed = false;
  let pulling = false;

  const close = (
    controller: ReadableStreamController<Uint8Array<ArrayBuffer>>,
  ) => {
    if (!closed) {
      controller.close();
      closed = true;
      handle.close();
    }
  };

  const source: UnderlyingSource<Uint8Array<ArrayBuffer>> = {
    pull(controller) {
      if (closed || pulling) {
        return;
      }

      pulling = true;

      handle
        .readBytes(chunkSize)
        .then((chunk) => {
          pulling = false;

          if (chunk.length == 0) {
            close(controller);
            return;
          }

          controller.enqueue(chunk);
        })
        .catch((err) => {
          logError(err);
          close(controller);
        });
    },
    cancel() {
      handle.close();
    },
  };

  const queuingStrategy = new CountQueuingStrategy({ highWaterMark: 1 });

  return new ReadableStream(source, queuingStrategy);
}
