// Photos and videos waiting to upload, kept in the browser's IndexedDB so they survive the app
// being closed while there's no signal. Each is removed once it's attached to the check.
// Browser-only.

export type QueuedUpload = {
  id: string;
  inspectionId: string;
  itemId: string;
  kind: "photo" | "video";
  blob: Blob;
  createdAt: number;
};

const STORE = "uploads";

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("watchpointpro", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" }).createIndex("inspectionId", "inspectionId");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = op(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export const keepUpload = (upload: QueuedUpload) => run("readwrite", (s) => s.put(upload));
export const forgetUpload = (id: string) => run("readwrite", (s) => s.delete(id));
export const pendingUploads = (inspectionId: string) =>
  run<QueuedUpload[]>("readonly", (s) => s.index("inspectionId").getAll(inspectionId) as IDBRequest<QueuedUpload[]>);
