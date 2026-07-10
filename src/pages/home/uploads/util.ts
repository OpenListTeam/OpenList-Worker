import { UploadFileProps } from "./types"
import type { WorkerMessage } from "./hash-worker"
import HashWorker from "./hash-worker?worker&inline"

export const traverseFileTree = async (entry: FileSystemEntry) => {
  const res: File[] = []

  const internalProcess = async (entry: FileSystemEntry, path: string) => {
    await new Promise<void>((resolve, reject) => {
      const errorCallback: ErrorCallback = (e) => {
        console.error(e)
        reject(e)
      }
      if (entry.isFile) {
        ;(entry as FileSystemFileEntry).file((file) => {
          const newFile = new File([file], path + file.name, {
            type: file.type,
          })
          res.push(newFile)
          console.log(newFile)
          resolve()
        }, errorCallback)
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader()
        const readEntries = () => {
          dirReader.readEntries(async (entries) => {
            for (let i = 0; i < entries.length; i++) {
              await internalProcess(entries[i], path + entry.name + "/")
            }
            if (entries.length > 0) {
              readEntries()
            } else {
              resolve()
            }

            /**
            why? https://stackoverflow.com/questions/3590058/does-html5-allow-drag-drop-upload-of-folders-or-a-folder-tree/53058574#53058574
            Unfortunately none of the existing answers are completely correct because 
            readEntries will not necessarily return ALL the (file or directory) entries for a given directory. 
            This is part of the API specification (see Documentation section below).
            
            To actually get all the files, we'll need to call readEntries repeatedly (for each directory we encounter) 
            until it returns an empty array. If we don't, we will miss some files/sub-directories in a directory 
            e.g. in Chrome, readEntries will only return at most 100 entries at a time.
            
            */
          }, errorCallback)
        }
        readEntries()
      }
    })
  }
  await internalProcess(entry, "")
  return res
}

export const File2Upload = (file: File): UploadFileProps => {
  return {
    name: file.name,
    path: file.webkitRelativePath || file.name,
    size: file.size,
    progress: 0,
    speed: 0,
    status: "pending",
  }
}

export const calculateHash = async (
  file: File,
  onProgress?: (progress: number) => void,
) => {
  return new Promise<{ md5: string; sha1: string; sha256: string }>(
    (resolve, reject) => {
      const worker = new HashWorker()

      const terminate = (fn: () => void) => {
        worker.terminate()
        fn()
      }

      worker.postMessage({ file })

      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const data = e.data
        switch (data.type) {
          case "progress":
            onProgress?.(data.progress)
            break
          case "result":
            terminate(() => resolve(data.hash))
            break
          case "error":
            terminate(() => reject(new Error(data.error)))
            break
        }
      }

      worker.onerror = (e) => terminate(() => reject(e))
    },
  )
}
