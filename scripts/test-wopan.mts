import {
  WoPanCrypto,
  WoPanClient,
  WoPanDriver,
  normalizeWoPanAddition,
  DefaultClientSecret,
  SortRules,
} from "../src/backend/drivers/wopan"

async function runTests() {
  console.log("=== Testing WoPan TypeScript Driver ===")

  // 1. Test Crypto (AES-128-CBC + PKCS7 padding)
  console.log("1. Testing AES encryption & decryption...")
  const crypto = new WoPanCrypto()
  const plainText =
    '{"userId":"186****5244","headUrl":"https://panservice.mail.wo.cn/upload/headPortrait/person_1600762418973144.png","userName":"wo_Kbc7Hb","sex":"","birthday":"","isModify":"0","isHeadModify":"0","isSetPassword":"1","registerTime":"20220221185416"}'

  const encrypted = crypto.userEncrypt(plainText)
  if (!encrypted || typeof encrypted !== "string") {
    throw new Error("Encryption failed, returned empty string")
  }
  const decrypted = crypto.userDecrypt(encrypted)
  if (decrypted !== plainText) {
    throw new Error(
      `Decryption mismatch: expected ${plainText}, got ${decrypted}`,
    )
  }
  console.log("  ✓ AES UserEncrypt / UserDecrypt roundtrip passed!")

  // 2. Test WoHome Encrypt with access token
  console.log("2. Testing WoHome crypto with access token...")
  const testAccessToken = "91d4b94689012345abcdef6789012345"
  const woCrypto = new WoPanCrypto(testAccessToken)
  const woHomePlain = '{"spaceType":"0","directoryId":"0"}'
  const woEnc = woCrypto.woHomeEncrypt(woHomePlain)
  const woDec = woCrypto.woHomeDecrypt(woEnc)
  if (woDec !== woHomePlain) {
    throw new Error(`WoHome decrypt mismatch: expected ${woHomePlain}, got ${woDec}`)
  }
  console.log("  ✓ WoHomeEncrypt / WoHomeDecrypt roundtrip passed!")

  // 3. Test Header generation & MD5 Sign
  console.log("3. Testing Header calculation...")
  const header = crypto.calHeader("wohome", "QueryAllFiles")
  if (!header.sign || header.sign.length !== 32) {
    throw new Error(`Invalid header sign: ${header.sign}`)
  }
  if (!header.resTime || !header.reqSeq) {
    throw new Error("Missing header resTime or reqSeq")
  }
  console.log(`  ✓ Header calculation passed (sign=${header.sign}, reqSeq=${header.reqSeq})`)

  // 4. Test normalizeWoPanAddition
  console.log("4. Testing normalizeWoPanAddition...")
  const norm = normalizeWoPanAddition({
    refresh_token: "  my-refresh-token  ",
  })
  if (norm.root_folder_id !== "0" || norm.refresh_token !== "my-refresh-token" || norm.sort_rule !== "name_asc") {
    throw new Error(`Invalid normalized addition: ${JSON.stringify(norm)}`)
  }
  console.log("  ✓ Addition normalization passed!")

  // 5. Test WoPanDriver instantiation
  console.log("5. Testing WoPanDriver instantiation...")
  const driver = new WoPanDriver({
    refresh_token: "test-token",
  })
  if (typeof driver.list !== "function" || typeof driver.get !== "function" || typeof driver.put !== "function") {
    throw new Error("WoPanDriver does not implement StorageDriver interface properly")
  }
  console.log("  ✓ WoPanDriver interface passed!")

  console.log("\n All WoPan tests passed successfully! 🎉")
}

runTests().catch((err) => {
  console.error("Test failed with error:", err)
  process.exit(1)
})
