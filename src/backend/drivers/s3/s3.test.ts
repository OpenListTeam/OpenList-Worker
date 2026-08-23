import { normalizeS3Addition, S3Driver } from "./driver"
import {
  parseListObjectsV1,
  parseListObjectsV2,
  getKey,
  getPlaceholderName,
  joinPath,
  S3Client,
} from "./util"
import {
  sha256Hex,
  hmacSha256Hex,
  formatAmzDates,
  signS3Headers,
  presignS3Url,
} from "./sigv4"

async function test() {
  console.log("Starting S3 driver tests...")

  // 1. SigV4 crypto tests
  const hash = await sha256Hex("hello world")
  console.assert(
    hash === "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    "SHA256 test failed",
  )

  const hmac = await hmacSha256Hex(
    "key",
    "The quick brown fox jumps over the lazy dog",
  )
  console.assert(
    hmac === "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    "HMAC-SHA256 test failed",
  )

  // 2. Dates
  const fixedDate = new Date("2026-08-22T12:30:45Z")
  const { amzDate, dateStamp } = formatAmzDates(fixedDate)
  console.assert(amzDate === "20260822T123045Z", `amzDate mismatch: ${amzDate}`)
  console.assert(dateStamp === "20260822", `dateStamp mismatch: ${dateStamp}`)

  // 3. Path & Key
  console.assert(getKey("/foo/bar/test.txt", false) === "foo/bar/test.txt")
  console.assert(getKey("/foo/bar", true) === "foo/bar/")
  console.assert(getPlaceholderName("") === ".openlist")
  console.assert(getPlaceholderName(".custom") === ".custom")
  console.assert(joinPath("a/b", "/c/d/", "e") === "a/b/c/d/e")

  // 4. Presign S3 URL
  const presigned = await presignS3Url({
    url: "https://mybucket.s3.us-east-1.amazonaws.com/test.txt",
    region: "us-east-1",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    expiresInSeconds: 3600,
    date: fixedDate,
  })
  console.assert(
    presigned.includes("X-Amz-Algorithm=AWS4-HMAC-SHA256"),
    "Algorithm missing",
  )
  console.assert(
    presigned.includes("X-Amz-Credential=AKIAIOSFODNN7EXAMPLE"),
    "Credential missing",
  )
  console.assert(presigned.includes("X-Amz-Signature="), "Signature missing")

  // 5. XML Parsing V1
  const xmlV1 = `
    <ListBucketResult>
      <Name>mybucket</Name>
      <Prefix>photos/</Prefix>
      <CommonPrefixes>
        <Prefix>photos/2026/</Prefix>
      </CommonPrefixes>
      <Contents>
        <Key>photos/cat.jpg</Key>
        <LastModified>2026-08-22T12:00:00.000Z</LastModified>
        <ETag>"9baddb36d0ad21e79da34f4a13f63a0d"</ETag>
        <Size>123456</Size>
      </Contents>
      <Contents>
        <Key>photos/.openlist</Key>
        <LastModified>2026-08-22T12:00:00.000Z</LastModified>
        <ETag>"d41d8cd98f00b204e9800998ecf8427e"</ETag>
        <Size>0</Size>
      </Contents>
      <IsTruncated>false</IsTruncated>
    </ListBucketResult>
  `
  const v1Res = parseListObjectsV1(xmlV1, "photos", "", false)
  console.assert(
    v1Res.files.length === 2,
    `Expected 2 files (1 folder, 1 file without placeholder), got ${v1Res.files.length}`,
  )
  console.assert(
    v1Res.files[0].name === "2026" && v1Res.files[0].isFolder === true,
    "Folder parse failed",
  )
  console.assert(
    v1Res.files[1].name === "cat.jpg" && v1Res.files[1].size === 123456,
    "File parse failed",
  )

  // 6. XML Parsing V2
  const xmlV2 = `
    <ListBucketResult>
      <Name>mybucket</Name>
      <Prefix>documents/</Prefix>
      <KeyCount>2</KeyCount>
      <CommonPrefixes>
        <Prefix>documents/work/</Prefix>
      </CommonPrefixes>
      <Contents>
        <Key>documents/report.pdf</Key>
        <LastModified>2026-08-22T10:00:00.000Z</LastModified>
        <ETag>"abc"</ETag>
        <Size>9999</Size>
      </Contents>
      <IsTruncated>false</IsTruncated>
    </ListBucketResult>
  `
  const v2Res = parseListObjectsV2(xmlV2, "documents", "", false)
  console.assert(
    v2Res.files.length === 2,
    `V2 expected 2 files, got ${v2Res.files.length}`,
  )

  // 7. Client URL handling
  const clientVirtual = new S3Client({
    bucket: "mybucket",
    endpoint: "https://s3.amazonaws.com",
    access_key_id: "test",
    secret_access_key: "test",
  })
  console.assert(
    clientVirtual.getUrl("photos/cat.jpg") ===
      "https://mybucket.s3.amazonaws.com/photos/cat.jpg",
    `Virtual host URL mismatch: ${clientVirtual.getUrl("photos/cat.jpg")}`,
  )

  const clientPath = new S3Client({
    bucket: "mybucket",
    endpoint: "http://127.0.0.1:9000",
    access_key_id: "test",
    secret_access_key: "test",
    force_path_style: true,
  })
  console.assert(
    clientPath.getUrl("photos/cat.jpg") ===
      "http://127.0.0.1:9000/mybucket/photos/cat.jpg",
    `Path style URL mismatch: ${clientPath.getUrl("photos/cat.jpg")}`,
  )

  // 8. Driver normalize
  const norm = normalizeS3Addition({
    bucket: " test_bucket ",
    endpoint: " https://s3.example.com/ ",
    access_key_id: " ak ",
    secret_access_key: " sk ",
  })
  console.assert(norm.bucket === "test_bucket")
  console.assert(norm.endpoint === "https://s3.example.com/")
  console.assert(norm.region === "openlist")
  console.assert(norm.sign_url_expire === 4)

  const driver = new S3Driver(norm)
  console.assert(driver instanceof S3Driver)

  console.log("All S3 driver tests PASSED successfully!")
}

test().catch((e) => {
  console.error("Test failed:", e)
  process.exit(1)
})
