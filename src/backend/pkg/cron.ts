/**
 * Simple cron-like task scheduler for OpenListNext.
 */

export type CronJob = () => Promise<void> | void

export class CronManager {
  private jobs: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Schedule a recurring job
   * @param name Unique name for the job
   * @param intervalInSeconds Interval in seconds
   * @param fn Function to execute
   */
  public schedule(name: string, intervalInSeconds: number, fn: CronJob) {
    this.stop(name)
    const timeout = setInterval(async () => {
      try {
        await fn()
      } catch (e) {
        console.error(`Cron job ${name} failed:`, e)
      }
    }, intervalInSeconds * 1000)
    this.jobs.set(name, timeout)
  }

  public stop(name: string) {
    const timeout = this.jobs.get(name)
    if (timeout) {
      clearInterval(timeout)
      this.jobs.delete(name)
    }
  }

  public stopAll() {
    for (const name of Array.from(this.jobs.keys())) {
      this.stop(name)
    }
  }
}

export const GlobalCronManager = new CronManager()
