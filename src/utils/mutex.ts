function createMutex() {
  let locked = false
  let queue: Array<() => void> = []

  return {
    acquire: () => {
      return new Promise<void>((resolve) => {
        if (!locked) {
          locked = true
          resolve()
        } else {
          queue.push(resolve)
        }
      })
    },
    release: () => {
      if (queue.length > 0) {
        const next = queue.shift()
        next!()
      } else {
        locked = false
      }
    },
  }
}

export default createMutex
