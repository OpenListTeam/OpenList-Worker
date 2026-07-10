import { Upload, SetUpload } from "./types"
import { r, pathDir } from "~/utils"

// Create a speed calculator using closure
function createSpeedCalculator(throttleMs = 500) {
  let lastLoaded = 0
  let lastTime = Date.now()

  return (loaded: number, setUpload?: SetUpload) => {
    const now = Date.now()
    const timeDiff = (now - lastTime) / 1000

    if (timeDiff >= throttleMs / 1000) {
      const speed = (loaded - lastLoaded) / timeDiff
      setUpload?.("speed", speed)
      lastLoaded = loaded
      lastTime = now
    }
  }
}

export const HttpDirectUpload: Upload = async (
  uploadPath: string,
  file: File,
  setUpload: SetUpload,
  _asTask: boolean,
  overwrite: boolean,
  _rapid: boolean,
) => {
  const path = pathDir(uploadPath)

  // Get direct upload info from backend
  const resp = await r.post(
    "/fs/get_direct_upload_info",
    {
      path,
      file_name: file.name,
      file_size: file.size,
      tool: "HttpDirect",
    },
    {
      headers: {
        Overwrite: overwrite,
      },
    },
  )

  const uploadInfo = resp.data

  // If upload_info is null, direct upload is not supported - fallback to Stream
  if (!uploadInfo) {
    throw new Error("Http Direct Upload not supported")
  }

  // Upload file directly to storage
  const chunkSize = uploadInfo.chunk_size || 0
  const uploadURL = uploadInfo.upload_url
  const method = uploadInfo.method || "PUT"

  if (chunkSize > 0) {
    // Always use chunked upload when chunkSize is provided
    // This ensures Content-Range header is set for all files
    return await uploadChunked(
      file,
      uploadURL,
      chunkSize,
      method,
      uploadInfo.headers,
      setUpload,
    )
  } else {
    // Single upload for drivers that don't support chunking
    return await uploadSingle(
      file,
      uploadURL,
      method,
      uploadInfo.headers,
      setUpload,
    )
  }
}

async function uploadSingle(
  file: File,
  uploadURL: string,
  method: string,
  headers?: Record<string, string>,
  setUpload?: SetUpload,
): Promise<undefined> {
  const xhr = new XMLHttpRequest()
  const calcSpeed = createSpeedCalculator()

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && setUpload) {
        const progress = (e.loaded / e.total) * 100
        setUpload("progress", progress)
        calcSpeed(e.loaded, setUpload)
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(undefined)
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed"))
    })

    xhr.open(method, uploadURL)

    // Set custom headers if provided
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value)
      })
    }

    xhr.send(file)
  })
}

async function uploadChunked(
  file: File,
  uploadURL: string,
  chunkSize: number,
  method: string,
  headers?: Record<string, string>,
  setUpload?: SetUpload,
): Promise<undefined> {
  const totalChunks = Math.ceil(file.size / chunkSize)
  const calcSpeed = createSpeedCalculator()
  let uploadedBytes = 0

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)

    const xhr = new XMLHttpRequest()

    await new Promise<void>((resolve, reject) => {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && setUpload) {
          const totalLoaded = uploadedBytes + e.loaded
          const progress = (totalLoaded / file.size) * 100
          setUpload("progress", progress)
          calcSpeed(totalLoaded, setUpload)
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          uploadedBytes += chunk.size
          resolve()
        } else {
          reject(
            new Error(`Upload chunk ${i + 1} failed with status ${xhr.status}`),
          )
        }
      })

      xhr.addEventListener("error", () => {
        reject(new Error(`Upload chunk ${i + 1} failed`))
      })

      xhr.open(method, uploadURL)

      // Set Content-Range header for chunked upload
      xhr.setRequestHeader(
        "Content-Range",
        `bytes ${start}-${end - 1}/${file.size}`,
      )

      // Set custom headers if provided
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value)
        })
      }

      xhr.send(chunk)
    })
  }

  return undefined
}
