import { createMD5, createSHA1, createSHA256 } from "hash-wasm"

interface WorkerProgressMessage {
  type: "progress"
  progress: number
}

interface WorkerResultMessage {
  type: "result"
  hash: { md5: string; sha1: string; sha256: string }
}

interface WorkerErrorMessage {
  type: "error"
  error: string
}

export type WorkerMessage =
  | WorkerProgressMessage
  | WorkerResultMessage
  | WorkerErrorMessage

self.onmessage = async (e: MessageEvent<{ file: File }>) => {
  const { file } = e.data
  try {
    const [md5Digest, sha1Digest, sha256Digest] = await Promise.all([
      createMD5(),
      createSHA1(),
      createSHA256(),
    ])

    const reader = file.stream().getReader()
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      loaded += value.length
      md5Digest.update(value)
      sha1Digest.update(value)
      sha256Digest.update(value)

      const progress: WorkerProgressMessage = {
        type: "progress",
        progress: (loaded / file.size) * 100,
      }
      self.postMessage(progress)
    }

    const result: WorkerResultMessage = {
      type: "result",
      hash: {
        md5: md5Digest.digest("hex"),
        sha1: sha1Digest.digest("hex"),
        sha256: sha256Digest.digest("hex"),
      },
    }
    self.postMessage(result)
  } catch (error) {
    const err: WorkerErrorMessage = {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(err)
  }
}
