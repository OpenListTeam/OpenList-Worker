import { Hono } from "hono"
import { getDb } from "../internal/model/db"
import { generateS3BucketListingXml } from "../pkg/utils"

export const s3Router = new Hono()

s3Router.get("/status", async (c) => {
  const db = await getDb()

  const s3AccessKeyId = db.settings.find((s: any) => s.key === "s3_access_key_id")?.value || ""
  const s3BucketsRaw = db.settings.find((s: any) => s.key === "s3_buckets")?.value || "[]"
  
  let buckets = []
  try {
    buckets = JSON.parse(s3BucketsRaw)
  } catch (e) {
    buckets = []
  }

  return c.json({
    code: 200,
    message: "success",
    data: {
      running: true,
      service_name: "OpenList S3 Compatibility Layer",
      access_key_id: s3AccessKeyId ? `${s3AccessKeyId.substring(0, 4)}***` : "Not Configured",
      buckets_count: buckets.length,
      buckets: buckets.map((b: any) => b.name),
    },
  })
})

s3Router.get("/:bucket", async (c) => {
  const bucketName = c.req.param("bucket")
  const db = await getDb()
  
  const s3BucketsRaw = db.settings.find((s: any) => s.key === "s3_buckets")?.value || "[]"
  let buckets = []
  try {
    buckets = JSON.parse(s3BucketsRaw)
  } catch (e) {
    buckets = []
  }

  const bucket = buckets.find((b: any) => b.name === bucketName)
  if (!bucket) {
    c.status(404)
    return c.text(`<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist</Message><BucketName>${bucketName}</BucketName></Error>`, 404, {
      "Content-Type": "application/xml",
    })
  }

  const items = [
    { name: "documents", size: 0, isFolder: true, modified: new Date().toISOString() },
    { name: "photos", size: 0, isFolder: true, modified: new Date().toISOString() },
    { name: "README.md", size: 1240, isFolder: false, modified: new Date().toISOString() },
  ]

  const xml = generateS3BucketListingXml(bucketName, items)
  c.header("Content-Type", "application/xml")
  return c.text(xml)
})
