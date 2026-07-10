/**
 * Load an external script dynamically
 * @returns Promise that resolves when the script is loaded
 */
export const loadScriptIIFE = (src: string, id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.id = id
    script.type = "text/javascript"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

/**
 * Load an external CSS file dynamically
 * @returns Promise that resolves when the CSS is loaded
 */
export const loadCSS = (href: string, id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    link.id = id
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`))
    document.head.appendChild(link)
  })
}
